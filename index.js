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

  // Pide número antes de crear el socket
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
    connectTimeoutMs: 20_000,
    keepAliveIntervalMs: 15_000,
    generateHighQualityLinkPreview: false,
    patchMessageBeforeSending: (msg) => {
      const needs = !!(msg.buttonsMessage || msg.listMessage || msg.templateMessage)
      if (needs) msg.messageContextInfo = { deviceListMetadataVersion: 2, deviceListMetadata: {} }
      return msg
    },
  })

  sock.ev.on("creds.update", saveCreds)

  // Genera el pairing code cuando el socket está en estado "connecting"
  // que es el único momento válido para pedirlo
  let codeSent = false
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update

    // Aprovecha el primer evento para generar el code (antes de "open")
    if (!codeSent && needsAuth && phoneNumber && connection !== "open") {
      codeSent = true
      try {
        const code = await sock.requestPairingCode(phoneNumber)
        const fmt = code?.match(/.{1,4}/g)?.join("-") || code
        console.log(`\n  ◈ Código → ${fmt}\n  ◦ WhatsApp → Dispositivos vinculados → Vincular con código\n`)
      } catch (e) {
        console.error("  ✗ Error generando código:", e.message)
      }
    }

    if (connection === "open") {
      console.log(`\n  ░▒▓ MALACHAR conectado ▓▒░\n  ◈ ${sock.user?.id}\n`)
      cleanTmp()
      await startAllSubbots(sock)
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode
      const reconnect = code !== DisconnectReason.loggedOut
      console.log(`  ◈ Desconectado (${code}) — ${reconnect ? "reconectando..." : "sesión cerrada"}`)
      if (reconnect) setTimeout(startMain, 3000)
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
