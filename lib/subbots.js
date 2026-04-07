// lib/subbots.js - Sistema de subbots
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidNormalizedUser,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import path from 'path'
import fs from 'fs'
import chalk from 'chalk'
import config from '../config.js'
import { handleMessage } from './handler.js'

const logger = pino({ level: 'silent' })

// Mapa de subbots activos: name -> socket
export const subBots = new Map()

export async function connectSubBots(mainBot, plugins) {
  if (!config.subBots || config.subBots.length === 0) return

  for (const subConfig of config.subBots) {
    await connectSubBot(mainBot, subConfig, plugins)
  }
}

async function connectSubBot(mainBot, subConfig, plugins, attempt = 0) {
  const { name, sessionPath } = subConfig
  const sessionDir = path.resolve(sessionPath)

  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true })
  }

  console.log(chalk.cyan(`[SUBBOT] Conectando: ${name}...`))

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
    const { version } = await fetchLatestBaileysVersion()

    const sub = makeWASocket({
      version,
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      printQRInTerminal: true,
      browser: ['Ubuntu', 'Chrome', '120.0'],
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      connectTimeoutMs: 30_000,
      defaultQueryTimeoutMs: 15_000,
      keepAliveIntervalMs: 15_000,
      emitOwnEvents: false,
      fireInitQueries: false,
      getMessage: async () => ({ conversation: '' }),
    })

    sub.ev.on('creds.update', saveCreds)

    sub.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        console.log(chalk.yellow(`[SUBBOT QR] ${name}: Escanea el código QR`))
      }

      if (connection === 'open') {
        const jid = jidNormalizedUser(sub.user.id)
        const number = jid.split('@')[0]
        console.log(chalk.green(`[SUBBOT] ${name} conectado como +${number}`))

        subBots.set(name, sub)

        // Suscribir al canal si está configurado
        if (config.channelJid) {
          try {
            await sub.followNewsletter(config.channelJid)
            console.log(chalk.cyan(`[SUBBOT] ${name} suscrito al canal`))
          } catch (e) {
            console.log(chalk.yellow(`[SUBBOT] ${name} no pudo suscribirse: ${e.message}`))
          }
        }
      }

      if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
        subBots.delete(name)

        if (reason !== DisconnectReason.loggedOut && attempt < 5) {
          const delay = Math.min(1000 * 2 ** attempt, 30000)
          console.log(chalk.yellow(`[SUBBOT] ${name} reconectando en ${delay/1000}s...`))
          setTimeout(() => connectSubBot(mainBot, subConfig, plugins, attempt + 1), delay)
        } else {
          console.log(chalk.red(`[SUBBOT] ${name} desconectado permanentemente`))
        }
      }
    })

    // Los subbots también procesan mensajes con los mismos plugins
    sub.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return
      for (const msg of messages) {
        if (!msg.message) continue
        try {
          await handleMessage(sub, msg, plugins)
        } catch (e) {
          console.error(chalk.red(`[SUBBOT ERROR] ${name}: ${e.message}`))
        }
      }
    })

    return sub
  } catch (e) {
    console.error(chalk.red(`[SUBBOT ERROR] ${name}: ${e.message}`))
    if (attempt < 5) {
      setTimeout(() => connectSubBot(mainBot, subConfig, plugins, attempt + 1), 5000)
    }
  }
}

// Enviar mensaje desde el bot principal a través de un subbot
export async function sendViaSubBot(subName, jid, content, options = {}) {
  const sub = subBots.get(subName)
  if (!sub) throw new Error(`SubBot "${subName}" no está conectado`)
  return sub.sendMessage(jid, content, options)
}

// Obtener todos los subbots conectados
export function getConnectedSubBots() {
  return [...subBots.keys()]
}
