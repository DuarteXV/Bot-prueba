import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
} from "@whiskeysockets/baileys"
import pino from "pino"
import fs from "fs"
import readline from "readline"
import config from "./config.js"
import { handler } from "./handler.js"
import { startAllSubbots } from "./subbot-manager.js"

const logger = pino({ level: "silent" })

for (const dir of [config.tmpFolder, config.sessionFolder, "./subbots", "./data"]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

async function askNumber() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question("  ◈ Número del bot: ", (ans) => {
      rl.close()
      resolve(ans.trim().replace(/\D/g, ""))
    })
  })
}

async function startMain() {
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionFolder)
  const { version } = await fetchLatestBaileysVersion()
  const needsAuth = !state.creds?.registered

  let phoneNumber = null
  if (needsAuth) {
    phoneNumber = await askNumber()
  }

  const sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    browser: Browsers.macOS("Safari"),
    getMessage: async () => undefined,
    shouldSyncHistoryMessage: () => false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    retryRequestDelayMs: 250,
    maxMsgRetryCount: 3,
    connectTimeoutMs: 60_000,
    keepAliveIntervalMs: 15_000,
    generateHighQualityLinkPreview: false,
    patchMessageBeforeSending: (msg) => {
      const needs = !!(msg.buttonsMessage || msg.listMessage || msg.templateMessage)
      if (needs) msg.messageContextInfo = { deviceListMetadataVersion: 2, deviceListMetadata: {} }
      return msg
    },
  })

  sock.ev.on("creds.update", saveCreds)

  let codeSent = false
  let authenticated = false

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update

    // Genera el code una sola vez cuando el socket está conectando
    if (!codeSent && needsAuth && phoneNumber) {
      codeSent = true
      try {
        const code = await sock.requestPairingCode(phoneNumber)
        const fmt = code?.match(/.{1,4}/g)?.join("-") || code
        console.log(`\n  ◈ Código → ${fmt}\n  ◦ WhatsApp → Dispositivos vinculados → Vincular con código\n  ◦ Tienes 60 segundos...\n`)
      } catch (e) {
        console.error("  ✗ Error generando código:", e.message)
      }
    }

    if (connection === "open") {
      authenticated = true
      console.log(`\n  ░▒▓ MALACHAR conectado ▓▒░\n  ◈ ${sock.user?.id}\n`)
      cleanTmp()
      await startAllSubbots(sock)
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      const loggedOut = statusCode === DisconnectReason.loggedOut

      // Si nunca se autenticó, no reconectar en loop — solo avisar
      if (!authenticated) {
        if (loggedOut) {
          console.log("  ✗ Sesión rechazada. Borra la carpeta session/ y vuelve a intentar.")
        }
        // Si cerró antes de autenticar (timeout, etc) sí reconectar una vez
        else {
          console.log(`  ◈ Conexión cerrada antes de autenticar (${statusCode}). Reconectando...`)
          setTimeout(startMain, 4000)
        }
        return
      }

      // Ya estaba autenticado — reconexión normal
      console.log(`  ◈ Desconectado (${statusCode}) — ${!loggedOut ? "reconectando..." : "sesión cerrada"}`)
      if (!loggedOut) setTimeout(startMain, 3000)
    }
  })

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return
    for (const msg of messages) {
      if (!msg.message) continue
      try {
        await handler(sock, msg)
      } catch (e) {
        console.error("  ✗ error:", e.message)
      }
    }
  })
}

function cleanTmp() {
  try {
    fs.readdirSync(config.tmpFolder).forEach(f =>
      fs.unlinkSync(`${config.tmpFolder}/${f}`)
    )
  } catch {}
}

console.log(`\n  ░▒▓ MALACHAR v${config.botVersion} ▓▒░\n`)
await startMain()
