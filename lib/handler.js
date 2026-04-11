// lib/handler.js - Manejo central de mensajes
import chalk from 'chalk'
import config from '../config.js'
import { db, getUser, saveDB } from './database.js'
import { getMessageContent, getJid, print, simple } from './utils.js'

// Anti-spam: mapa de cooldowns por usuario
const cooldowns = new Map()

// Normaliza números eliminando todo excepto dígitos
function normalizeNumber(n) {
  return String(n).replace(/[^0-9]/g, '').replace(/^0+/, '')
}

export async function handleMessage(bot, msg, plugins) {
  try {
    const from = msg.key.remoteJid
    if (!from) return

    const isGroup = from.endsWith('@g.us')

    const rawSenderJid = isGroup ? msg.key.participant : from
    if (!rawSenderJid) return

    const senderNumber = rawSenderJid.split('@')[0].split(':')[0]
    if (!senderNumber || !/^\d+$/.test(senderNumber)) return

    const senderJidClean = `${senderNumber}@s.whatsapp.net`

    // ── Detección de owner normalizada ───────────────────────────────────
    const isOwner = config.ownerNumber.some(n =>
      normalizeNumber(n) === normalizeNumber(senderNumber)
    )

    const user = getUser(senderNumber)
    if (msg.pushName && user.name !== msg.pushName) {
      user.name = msg.pushName
    }

    if (user.banned && !isOwner) return

    const { body, type, isMedia } = getMessageContent(msg)

    user.messages++
    db.stats.totalMessages++

    for (const [name, plugin] of Object.entries(plugins)) {
      if (typeof plugin.before === 'function') {
        try {
          const result = await plugin.before(bot, msg, {
            from,
            senderJid: senderJidClean,
            senderNumber,
            isGroup,
            isOwner,
            user,
            body,
            type,
          })
          if (result === false) return
        } catch (e) {
          console.error(chalk.red(`[BEFORE ERROR] ${name}: ${e.message}`))
        }
      }
    }

    if (!body) return
    const prefix = config.prefix
    const isCommand = body.startsWith(prefix)
    if (!isCommand) return

    const args = body.slice(prefix.length).trim().split(/\s+/)
    const command = args.shift().toLowerCase()
    const text = args.join(' ')

    const now = Date.now()
    const userCooldowns = cooldowns.get(senderNumber) || []
    const recentMessages = userCooldowns.filter((t) => now - t < 60000)
    if (recentMessages.length >= config.rateLimit && !isOwner) {
      return
    }
    cooldowns.set(senderNumber, [...recentMessages, now])

    for (const [name, plugin] of Object.entries(plugins)) {
      const commands = plugin.command || []
      if (!commands.includes(command)) continue

      if (plugin.owner && !isOwner) {
        await bot.sendMessage(from, { text: '❌ Solo el owner puede usar esto.' }, { quoted: msg })
        return
      }

      try {
        const ctx = {
          bot,
          msg,
          from,
          senderJid: senderJidClean,
          senderNumber,
          isGroup,
          isOwner,
          user,
          args,
          text,
          command,
          prefix,
          body,
          type,
          isMedia,
          db,
          saveDB,
          sock: bot,
          reply: (content) => {
            if (typeof content === 'string') {
              return bot.sendMessage(from, { text: content }, { quoted: msg })
            }
            return bot.sendMessage(from, content, { quoted: msg })
          },
        }

        print(command, senderNumber, name)
        await plugin(ctx)
      } catch (e) {
        console.error(chalk.red(`[PLUGIN ERROR] ${name} (${command}): ${e.stack || e.message}`))
        try {
          await bot.sendMessage(
            from,
            { text: `❌ Error ejecutando *${command}*:\n\`\`\`${e.message}\`\`\`` },
            { quoted: msg }
          )
        } catch {}
      }
      break
    }

  } catch (e) {
    console.error(chalk.red(`[HANDLER ERROR] ${e.stack || e.message}`))
  }
}