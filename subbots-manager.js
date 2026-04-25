// subbot-manager.js
// Gestiona instancias Baileys independientes para cada subbot.
// El bot principal llama aquí para crear/destruir subbots.

import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys"
import pino from "pino"
import fs from "fs"
import path from "path"
import { addSubbot, removeSubbot, readDB, isSubbot } from "./db.js"
import { loadSubbotHandler } from "./subbot-handler.js"

const logger = pino({ level: "silent" })

// Instancias activas: número → sock
export const subbotInstances = new Map()

// ── Inicia una instancia de subbot ──────────────────────────────────
export async function startSubbotInstance(number, mainSock = null) {
  if (subbotInstances.has(number)) return // ya está corriendo

  const sessionPath = `./subbots/${number}`
  if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    browser: ["Malachar", "Chrome", "1.0.0"],
    getMessage: async () => undefined,
    shouldSyncHistoryMessage: () => false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    retryRequestDelayMs: 250,
    maxMsgRetryCount: 3,
    connectTimeoutMs: 20_000,
    keepAliveIntervalMs: 15_000,
    generateHighQualityLinkPreview: false,
  })

  subbotInstances.set(number, sock)

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === "open") {
      const rawJid = sock.user?.id || ""
      const subbotNumber = rawJid.replace(/@.+/, "").replace(/:\d+$/, "")
      const subbotJid = `${subbotNumber}@s.whatsapp.net`

      console.log(`  ◈ Subbot conectado → ${subbotNumber}`)

      // Registrar en DB
      addSubbot(subbotJid, {
        number: subbotNumber,
        name: sock.user?.name || subbotNumber,
      })

      // Seguir canal del principal
      const db = readDB()
      if (db.config?.channelJid) {
        try { await sock.followNewsletter(db.config.channelJid) } catch {}
      }

      // Notificar al usuario en el grupo
      if (mainSock && db.config?.subbotGroup) {
        try {
          await mainSock.sendMessage(db.config.subbotGroup, {
            text: `░▒▓ MALACHAR — SUBBOT ▓▒░\n\n◈ @${subbotNumber} vinculado con éxito.\n◈ Bienvenido a los subbots, ya puedes usar los comandos.\n\n◦ Para desvincular usa */stop*`,
            mentions: [subbotJid],
          })
        } catch {}
      }
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode
      const loggedOut = code === DisconnectReason.loggedOut

      console.log(`  ◈ Subbot ${number} desconectado (${code})`)

      if (loggedOut) {
        // Sesión cerrada — limpiar todo
        await stopSubbotInstance(number)
      } else {
        // Reconectar automático
        subbotInstances.delete(number)
        setTimeout(() => startSubbotInstance(number, mainSock), 3000)
      }
    }
  })

  // Mensajes del subbot — usa su propio handler
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return
    for (const m of messages) {
      if (!m.message) continue
      try {
        await loadSubbotHandler(sock, m, number)
      } catch (e) {
        console.error(`  ✗ subbot ${number} handler:`, e.message)
      }
    }
  })

  return sock
}

// ── Genera pairing code para un número ─────────────────────────────
export async function generatePairingCode(number, mainSock = null) {
  // Si ya hay instancia corriendo, no crear otra
  if (subbotInstances.has(number)) return null

  const sock = await startSubbotInstance(number, mainSock)
  if (!sock) return null

  // Espera a que el socket esté listo para pedir el code
  await sleep(2000)

  try {
    const code = await sock.requestPairingCode(number)
    return code?.match(/.{1,4}/g)?.join("-") || code
  } catch (e) {
    console.error(`  ✗ Error generando pairing code para ${number}:`, e.message)
    subbotInstances.delete(number)
    return null
  }
}

// ── Detiene y limpia un subbot ──────────────────────────────────────
export async function stopSubbotInstance(number) {
  const sock = subbotInstances.get(number)
  if (sock) {
    try { sock.end() } catch {}
    subbotInstances.delete(number)
  }

  // Borrar carpeta de sesión
  const sessionPath = `./subbots/${number}`
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true })
  }

  // Borrar de DB
  removeSubbot(`${number}@s.whatsapp.net`)

  console.log(`  ◈ Subbot ${number} detenido y eliminado`)
}

// ── Arranca todos los subbots guardados en DB al iniciar ────────────
export async function startAllSubbots(mainSock = null) {
  const subbotDir = "./subbots"
  if (!fs.existsSync(subbotDir)) return

  const dirs = fs.readdirSync(subbotDir).filter(d =>
    fs.statSync(path.join(subbotDir, d)).isDirectory()
  )

  for (const dir of dirs) {
    console.log(`  ◈ Reanudando subbot: ${dir}`)
    await startSubbotInstance(dir, mainSock)
    await sleep(1500)
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}
