// lib/handler.js - Manejo central de mensajes
import chalk from 'chalk'
import config from '../config.js'
import { db, getUser, saveDB } from './database.js'
import { getMessageContent, getJid, print, simple } from './utils.js'

// Anti-spam: mapa de cooldowns por usuario
const cooldowns = new Map()

export async function handleMessage(bot, msg, plugins) {
  try {
    // Extraer info básica del mensaje
    const from = msg.key.remoteJid
    if (!from) return

    const isGroup = from.endsWith('@g.us')

    // ── Obtener JID real del sender ───────────────────────────────────────
    // En grupos: msg.key.participant tiene el JID real (ej: 573135180876:10@s.whatsapp.net)
    // En privado: from ya es el JID del sender
    const rawSenderJid = isGroup ? msg.key.participant : from
    if (!rawSenderJid) return

    // Limpiar número: eliminar el device suffix (:X) y el dominio
    const senderNumber = rawSenderJid.split('@')[0].split(':')[0]
    if (!senderNumber || !/^\d+$/.test(senderNumber)) return

    const senderJidClean = `${senderNumber}@s.whatsapp.net`
    const isOwner = config.ownerNumber.includes(senderJidClean)

    // Obtener o crear usuario en DB
    const user = getUser(senderNumber)
    if (msg.pushName && user.name !== msg.pushName) {
      user.name = msg.pushName
    }

    // Verificar si está baneado
    if (user.banned && !isOwner) return

    // Extraer contenido del mensaje
    const { body, type, isMedia } = getMessageContent(msg)

    // Actualizar stats
    user.messages++
    db.stats.totalMessages++

    // Ejecutar handlers de tipo 'before' (interceptores)
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
          if (result === false) return // Plugin canceló el procesamiento
        } catch (e) {
          console.error(chalk.red(`[BEFORE ERROR] ${name}: ${e.message}`))
        }
      }
    }

    // Verificar si es un comando
    if (!body) return
    const prefix = config.prefix
    const isCommand = body.startsWith(prefix)
    if (!isCommand) return

    // Parsear comando
    const args = body.slice(prefix.length).trim().split(/\s+/)
    const command = args.shift().toLowerCase()
    const text = args.join(' ')

    // Anti-spam / rate limit
    const now = Date.now()
    const userCooldowns = cooldowns.get(senderNumber) || []
    const recentMessages = userCooldowns.filter((t) => now - t < 60000)
    if (recentMessages.length >= config.rateLimit && !isOwner) {
      return // Silenciosamente ignorar spam
    }
    cooldowns.set(senderNumber, [...recentMessages, now])

    // Buscar plugin que maneje este comando
    let matched = false
    for (const [name, plugin] of Object.entries(plugins)) {
      const commands = plugin.command || []
      if (!commands.includes(command)) continue

      matched = true

      // Verificar permisos
      if (plugin.owner && !isOwner) {
        await bot.sendMessage(from, { text: '❌ Solo el owner puede usar esto.' }, { quoted: msg })
        return
      }

      // Ejecutar plugin
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
          sock: bot, // alias para plugins que usen sock (como info.js)
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
      break // Solo ejecutar el primer plugin que coincida
    }

    if (isCommand && !matched) {
      // Comando no encontrado - silencioso para no hacer spam
    }
  } catch (e) {
    console.error(chalk.red(`[HANDLER ERROR] ${e.stack || e.message}`))
  }
}
