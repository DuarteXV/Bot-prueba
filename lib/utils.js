import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import config from '../config.js'

// ─── Logger ──────────────────────────────────────────────────────────────────

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

export function simple(label, ...args) {
  const time = new Date().toLocaleTimeString('es-CO', { hour12: false })
  console.log(chalk.gray(`[${time}]`), chalk.white(`[${label}]`), ...args)
}

// ─── Extraer contenido del mensaje ───────────────────────────────────────────

export function getMessageContent(msg) {
  const m = msg.message
  if (!m) return { body: '', type: 'unknown', isMedia: false }

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

// ─── JID helpers ─────────────────────────────────────────────────────────────

export function getJid(jid) {
  if (!jid) return null
  return jid.split(':')[0].split('@')[0] + '@s.whatsapp.net'
}

export function getNumber(jid) {
  if (!jid) return null
  return jid.split(':')[0].split('@')[0]
}

// ─── Tmp ──────────────────────────────────────────────────────────────────────

export function cleanTmp() {
  const cfg = global._config || config
  const tmpDir = path.resolve(cfg.tmpDir)
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true })
    return
  }
  let deleted = 0
  for (const file of fs.readdirSync(tmpDir)) {
    const filePath = path.join(tmpDir, file)
    try {
      if (Date.now() - fs.statSync(filePath).mtimeMs > 30 * 60 * 1000) {
        fs.unlinkSync(filePath)
        deleted++
      }
    } catch (e) {}
  }
  if (deleted > 0) simple('TMP', `${deleted} archivos eliminados`)
}

export function tmpFile(ext = '') {
  const cfg = global._config || config
  const tmpDir = path.resolve(cfg.tmpDir)
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
  return path.join(tmpDir, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
}

// ─── Fetch buffer ─────────────────────────────────────────────────────────────

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

// ─── Canal: contextInfo con newsletter ───────────────────────────────────────

export function channelContext(overrides = {}) {
  // Siempre leer el estado más reciente
  const cfg = global._config || config
  if (!cfg.channelJid) return {}

  let thumbnail
  if (overrides.thumbnail) {
    thumbnail = overrides.thumbnail
  } else if (cfg.channelThumb) {
    thumbnail = Buffer.from(cfg.channelThumb, 'base64')
  }

  return {
    contextInfo: {
      externalAdReply: {
        title: overrides.title || cfg.botName,
        body: overrides.body || cfg.channelName,
        thumbnailUrl: overrides.thumbnailUrl || '',
        thumbnail,
        sourceUrl: overrides.sourceUrl || cfg.channelInviteLink,
        mediaType: 1,
        renderLargerThumbnail: overrides.renderLargerThumbnail ?? false,
      },
      forwardingScore: 1,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: cfg.channelJid,
        newsletterName: cfg.channelName,
        serverMessageId: -1,
      },
    },
    ...overrides.extra,
  }
}

// ─── Helpers de envío ────────────────────────────────────────────────────────

export function makeReply(bot, from, msg) {
  return {
    reply: (content) => {
      if (typeof content === 'string') {
        return bot.sendMessage(from, { text: content }, { quoted: msg })
      }
      return bot.sendMessage(from, content, { quoted: msg })
    },

    replyChannel: (content, overrides = {}) => {
      const ctx = channelContext(overrides)
      if (typeof content === 'string') {
        return bot.sendMessage(from, { text: content, ...ctx }, { quoted: msg })
      }
      return bot.sendMessage(from, { ...content, ...ctx }, { quoted: msg })
    },

    sendChannel: (content, overrides = {}) => {
      const ctx = channelContext(overrides)
      if (typeof content === 'string') {
        return bot.sendMessage(from, { text: content, ...ctx })
      }
      return bot.sendMessage(from, { ...content, ...ctx })
    },

    send: (content) => {
      if (typeof content === 'string') {
        return bot.sendMessage(from, { text: content })
      }
      return bot.sendMessage(from, content)
    },
  }
}