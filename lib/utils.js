// lib/utils.js - Utilidades generales
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import config from '../config.js'

// ─── Logger visual de comandos ───────────────────────────────────────────────

export function print(command, sender, plugin) {
  const time = new Date().toLocaleTimeString('es-CO', { hour12: false })
  console.log(
    chalk.gray(`[${time}]`) +
    chalk.cyan(` +${sender}`) +
    chalk.white(` → `) +
    chalk.yellow(`${config.prefix}${command}`) +
    chalk.gray(` (${plugin})`)
  )
}

// Versión simple para loggear cualquier evento
export function simple(label, ...args) {
  const time = new Date().toLocaleTimeString('es-CO', { hour12: false })
  console.log(chalk.gray(`[${time}]`), chalk.white(`[${label}]`), ...args)
}

// ─── Extraer contenido del mensaje ───────────────────────────────────────────

export function getMessageContent(msg) {
  const m = msg.message
  if (!m) return { body: '', type: 'unknown', isMedia: false }

  // Tipos de mensaje en orden de prioridad
  const types = [
    'conversation',
    'extendedTextMessage',
    'imageMessage',
    'videoMessage',
    'audioMessage',
    'documentMessage',
    'stickerMessage',
    'buttonsResponseMessage',
    'listResponseMessage',
    'templateButtonReplyMessage',
    'ephemeralMessage',
    'viewOnceMessage',
    'editedMessage',
  ]

  let type = 'unknown'
  for (const t of types) {
    if (m[t]) { type = t; break }
  }

  // Extraer texto/body según tipo
  let body = ''
  if (type === 'conversation') {
    body = m.conversation
  } else if (type === 'extendedTextMessage') {
    body = m.extendedTextMessage.text
  } else if (type === 'buttonsResponseMessage') {
    body = m.buttonsResponseMessage.selectedButtonId
  } else if (type === 'listResponseMessage') {
    body = m.listResponseMessage.singleSelectReply.selectedRowId
  } else if (type === 'templateButtonReplyMessage') {
    body = m.templateButtonReplyMessage.selectedId
  } else if (type === 'imageMessage') {
    body = m.imageMessage.caption || ''
  } else if (type === 'videoMessage') {
    body = m.videoMessage.caption || ''
  } else if (type === 'editedMessage') {
    const edited = m.editedMessage.message?.protocolMessage?.editedMessage
    body = edited?.conversation || edited?.extendedTextMessage?.text || ''
  }

  const isMedia = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'].includes(type)

  return { body: body?.trim() || '', type, isMedia }
}

// ─── Obtener JID limpio ───────────────────────────────────────────────────────

export function getJid(jid) {
  if (!jid) return null
  return jid.split(':')[0].split('@')[0] + '@s.whatsapp.net'
}

// Obtener solo el número
export function getNumber(jid) {
  if (!jid) return null
  return jid.split(':')[0].split('@')[0]
}

// ─── Limpiar carpeta tmp ──────────────────────────────────────────────────────

export function cleanTmp() {
  const tmpDir = path.resolve(config.tmpDir)
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true })
    return
  }

  const files = fs.readdirSync(tmpDir)
  let deleted = 0

  for (const file of files) {
    const filePath = path.join(tmpDir, file)
    try {
      const stat = fs.statSync(filePath)
      // Borrar archivos más viejos de 30 minutos
      if (Date.now() - stat.mtimeMs > 30 * 60 * 1000) {
        fs.unlinkSync(filePath)
        deleted++
      }
    } catch (e) {
      // Ignorar errores individuales
    }
  }

  if (deleted > 0) {
    simple('TMP', `${deleted} archivos eliminados`)
  }
}

// ─── Descargar buffer desde URL ───────────────────────────────────────────────

export async function fetchBuffer(url, options = {}) {
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

// ─── Formatear tiempo ─────────────────────────────────────────────────────────

export function formatDuration(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ${h % 24}h`
  if (h > 0) return `${h}h ${m % 60}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

// ─── Generar nombre temporal ──────────────────────────────────────────────────

export function tmpFile(ext = '') {
  const tmpDir = path.resolve(config.tmpDir)
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
  return path.join(tmpDir, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
}
