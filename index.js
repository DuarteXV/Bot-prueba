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
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import readline from 'readline'
import { loadPlugins, watchPlugins } from './lib/loader.js'
import { handleMessage } from './lib/handler.js'
import { db, saveDB, loadDB } from './lib/database.js'
import { cleanTmp, fetchBuffer } from './lib/utils.js'
import { connectSubBots } from './lib/subbots.js'
import config from './config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))
const logger = pino({ level: 'silent' })

let bot = null
let plugins = {}
let reconnectAttempts = 0
const MAX_RECONNECT = 10

async function loadChannelThumb() {
  if (!config.channelJid) return
  try {
    let picUrl = null

    if (typeof bot.profilePictureUrl === 'function') {
      picUrl = await bot.profilePictureUrl(config.channelJid, 'image').catch(() => null)
    }

    if (!picUrl && config.channelThumbUrl) {
      picUrl = config.channelThumbUrl
    }

    if (picUrl) {
      const buf = await fetchBuffer(picUrl)
      config.channelThumb = buf.toString('base64')
      console.log(chalk.green('[CANAL] Foto del canal cargada ✓'))
    } else {
      console.log(chalk.yellow('[CANAL] Sin foto de canal configurada'))
    }
  } catch (e) {
    console.log(chalk.yellow(`[CANAL] Sin foto: ${e.message}`))
  }
}

async function startBot() {
  await loadDB()

  const { state, saveCreds } = await useMultiFileAuthState(
    path.join(__dirname, 'sessions/main')
  )
  const { version } = await fetchLatestBaileysVersion()

  console.log(chalk.cyan(`\n┌─────────────────────────────────┐`))
  console.log(chalk.cyan(`│`) + chalk.white(`  🤖 ${config.botName} arrancando...   `) + chalk.cyan(`│`))
  console.log(chalk.cyan(`│`) + chalk.gray(`  Baileys v${version.join('.')}              `) + chalk.cyan(`│`))
  console.log(chalk.cyan(`└─────────────────────────────────┘\n`))

  let usePairingCode = false
  if (!state.creds.registered) {
    console.log(chalk.yellow(`¿Cómo deseas vincular el bot?`))
    console.log(chalk.white(`  1. Código de 8 dígitos (Pairing Code)`))
    console.log(chalk.white(`  2. Código QR tradicional`))
    const option = await question(chalk.cyan('\nSelecciona una opción (1/2): '))
    usePairingCode = option.trim() === '1'
  }

  plugins = await loadPlugins()

  watchPlugins(async () => {
    plugins = await loadPlugins()
    return plugins
  })

  bot = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: !usePairingCode,
    browser: ['Ubuntu', 'Chrome', '120.0'],
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    getMessage: async (key) => ({ conversation: '' }),
    connectTimeoutMs: 30_000,
    defaultQueryTimeoutMs: 15_000,
    keepAliveIntervalMs: 15_000,
    emitOwnEvents: false,
    fireInitQueries: false,
    shouldIgnoreJid: (jid) => jid === 'status@broadcast',
    newsletterMetadataCacheTtlMs: 0, // 👈 caché deshabilitado
  })

  if (usePairingCode && !state.creds.registered) {
    let phoneNumber = await question(chalk.cyan('\nIntroduce tu número (ej: 573001234567): '))
    phoneNumber = phoneNumber.replace(/[^0-9]/g, '').trim()

    if (!phoneNumber) {
      console.log(chalk.red('❌ Número inválido. Reinicia el bot.'))
      process.exit(1)
    }

    setTimeout(async () => {
      try {
        const code = await bot.requestPairingCode(phoneNumber)
        const formatted = code?.match(/.{1,4}/g)?.join('-') || code
        console.log(chalk.cyan('\n┌──────────────────────────────┐'))
        console.log(chalk.cyan('│') + chalk.white('   🔑 CÓDIGO DE VINCULACIÓN    ') + chalk.cyan('│'))
        console.log(chalk.cyan('│') + chalk.green.bold(`        ${formatted}        `) + chalk.cyan('│'))
        console.log(chalk.cyan('└──────────────────────────────┘\n'))
      } catch (e) {
        console.error(chalk.red(`\n[ERROR PAIRING] No se pudo generar el código.`))
      }
    }, 3000)
  }

  bot.ev.on('creds.update', saveCreds)

  bot.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      console.log(chalk.red(`[DESCONECTADO] Razón: ${reason}`))

      if (reason !== DisconnectReason.loggedOut && reconnectAttempts < MAX_RECONNECT) {
        reconnectAttempts++
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000)
        console.log(chalk.yellow(`[RECONECTANDO] Intento ${reconnectAttempts} en ${delay}ms...`))
        setTimeout(startBot, delay)
      } else {
        console.log(chalk.red('[BOT] Sesión cerrada o máximo de reconexiones alcanzado.'))
        process.exit(1)
      }
    }

    if (connection === 'open') {
      reconnectAttempts = 0
      const jid = jidNormalizedUser(bot.user.id)
      console.log(chalk.green(`\n✅ Conectado como: +${jid.split('@')[0]}`))
      console.log(chalk.green(`📦 Plugins cargados: ${Object.keys(plugins).length}`))

      if (config.channelJid) {
        if (typeof bot.followNewsletter === 'function') {
          await bot.followNewsletter(config.channelJid).catch(() => {})
        }
        await loadChannelThumb()
      }

      await connectSubBots(bot, plugins)
      setInterval(() => cleanTmp(), 60 * 60 * 1000)
    }
  })

  bot.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const msg of messages) {
      if (!msg.message) continue
      try {
        await handleMessage(bot, msg, plugins)
      } catch (e) {
        console.error(chalk.red(`[ERROR HANDLER] ${e.message}`))
      }
    }
  })

  global.reloadPlugins = async () => {
    plugins = await loadPlugins()
    return Object.keys(plugins).length
  }

  return bot
}

process.on('uncaughtException', (err) => {
  console.error(chalk.red(`\n[UNCAUGHT EXCEPTION]\n${err}\n`))
})

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red(`\n[UNHANDLED REJECTION]\n${reason}\n`))
})

process.on('SIGINT', async () => {
  await saveDB()
  process.exit(0)
})

startBot()