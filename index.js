import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidNormalizedUser,
  getAggregateVotesInPollMessage,
  proto,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import readline from 'readline'
import { loadPlugins } from './lib/loader.js'
import { handleMessage } from './lib/handler.js'
import { db, saveDB, loadDB } from './lib/database.js'
import { cleanTmp } from './lib/utils.js'
import { connectSubBots } from './lib/subbots.js'
import config from './config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Interfaz para lectura de terminal
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

// Logger silencioso para mejor latencia
const logger = pino({ level: 'silent' })

let bot = null
let plugins = {}
let reconnectAttempts = 0
const MAX_RECONNECT = 10

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

  // Lógica para decidir método de conexión
  let usePairingCode = false
  if (!state.creds.registered) {
    console.log(chalk.yellow(`¿Cómo deseas vincular el bot?`))
    console.log(chalk.white(`1. Código de 8 dígitos (Pairing Code)`))
    console.log(chalk.white(`2. Código QR tradicional`))
    const option = await question(chalk.cyan('\nSelecciona una opción (1/2): '))
    usePairingCode = option === '1'
  }

  plugins = await loadPlugins()

  bot = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: !usePairingCode, // Solo imprime QR si no se usa Pairing Code
    browser: ['Ubuntu', 'Chrome', '120.0'],
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    getMessage: async (key) => {
      return { conversation: '' }
    },
    // Optimizaciones de latencia (tus ajustes originales)
    connectTimeoutMs: 30_000,
    defaultQueryTimeoutMs: 15_000,
    keepAliveIntervalMs: 15_000,
    emitOwnEvents: false,
    fireInitQueries: false,
    shouldIgnoreJid: (jid) => {
      return jid === 'status@broadcast'
    },
  })

  // Generación del Pairing Code si se seleccionó
  if (usePairingCode && !state.creds.registered) {
    let phoneNumber = await question(chalk.cyan('\nIntroduce tu número de WhatsApp (ej: 573001234567): '))
    phoneNumber = phoneNumber.replace(/[^0-9]/g, '')

    if (!phoneNumber) {
      console.log(chalk.red('Número inválido. Reinicia el bot.'))
      process.exit(1)
    }

    setTimeout(async () => {
      try {
        const code = await bot.requestPairingCode(phoneNumber)
        console.log(chalk.white(`\nTu código de vinculación es: `) + chalk.black.bgGreen.bold(` ${code} `) + `\n`)
      } catch (e) {
        console.error(chalk.red('[ERROR PAIRING]') + ' No se pudo generar el código.')
      }
    }, 3000)
  }

  // Guardar credenciales
  bot.ev.on('creds.update', saveCreds)

  // Manejo de conexión
  bot.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr && !usePairingCode) {
      console.log(chalk.yellow('[QR] Escanea el código QR para conectarte'))
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      const shouldReconnect = reason !== DisconnectReason.loggedOut

      console.log(chalk.red(`[DESCONECTADO] Razón: ${reason}`))

      if (shouldReconnect && reconnectAttempts < MAX_RECONNECT) {
        reconnectAttempts++
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000)
        console.log(chalk.yellow(`[RECONECTANDO] Intento ${reconnectAttempts}/${MAX_RECONNECT} en ${delay/1000}s...`))
        setTimeout(startBot, delay)
      } else if (reason === DisconnectReason.loggedOut) {
        console.log(chalk.red('[SESIÓN] Sesión cerrada. Borra la carpeta sessions/main y reinicia.'))
        process.exit(1)
      } else {
        console.log(chalk.red('[ERROR] Demasiados intentos de reconexión. Reinicia el bot.'))
        process.exit(1)
      }
    }

    if (connection === 'open') {
      reconnectAttempts = 0
      const jid = jidNormalizedUser(bot.user.id)
      const number = jid.split('@')[0]

      console.log(chalk.green(`\n✅ Conectado como: +${number}`))
      console.log(chalk.green(`📦 Plugins cargados: ${Object.keys(plugins).length}`))
      console.log(chalk.green(`👥 Usuarios en DB: ${Object.keys(db.users).length}\n`))

      // Suscribir al canal configurado
      if (config.channelJid) {
        try {
          await bot.followNewsletter(config.channelJid)
          console.log(chalk.cyan(`📢 Suscrito al canal: ${config.channelJid}`))
        } catch (e) {
          console.log(chalk.yellow(`[CANAL] No se pudo suscribir: ${e.message}`))
        }
      }

      // Conectar subbots
      await connectSubBots(bot, plugins)

      // Limpiar tmp cada hora
      setInterval(() => cleanTmp(), 60 * 60 * 1000)
      cleanTmp()
    }
  })

  // Manejo de mensajes
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

  // Recargar plugins en caliente
  global.reloadPlugins = async () => {
    plugins = await loadPlugins()
    return Object.keys(plugins).length
  }

  return bot
}

// Capturar errores no manejados
process.on('uncaughtException', (err) => {
  console.error(chalk.red(`\n[UNCAUGHT EXCEPTION]\n${err.stack || err}\n`))
})

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red(`\n[UNHANDLED REJECTION]\n${reason?.stack || reason}\n`))
})

// Guardar DB al cerrar
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n[SHUTDOWN] Guardando DB y cerrando...'))
  await saveDB()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await saveDB()
  process.exit(0)
})

startBot()
