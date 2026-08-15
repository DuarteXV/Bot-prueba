import { db } from '../../database/db.js'
export default {
  name: ['setname', 'cambiarnombre'],
  description: 'Cambia el nombre/label de un bot (principal o subbot)',
  category: 'owner',
  ownerOnly: false,

  async run({ sock, from, msg, args, reply, sender, resolveLid }) {
    try {
      const cleanJid = (id) => id ? id.split('@')[0].split(':')[0] + '@s.whatsapp.net' : ''
      const senderJid = cleanJid(sender) // ya resuelto por el handler, no recalcular desde msg.key.participant
      const currentBotJid = cleanJid(sock.user?.id)

      const esOwnerGlobal = db.hasRole(senderJid, 'owner')
      const esMismoSubbot = senderJid === currentBotJid

      if (!esOwnerGlobal && !esMismoSubbot) {
        return await reply({ text: '❌ No tienes permisos para usar este comando.' })
      }

      let rawMessage = msg.message
      if (rawMessage?.ephemeralMessage) rawMessage = rawMessage.ephemeralMessage.message

      const quotedContext = rawMessage?.extendedTextMessage?.contextInfo

      let targetBotJid = null
      let textoBruto = args.join(" ")

      if (esOwnerGlobal) {
        const mentioned = quotedContext?.mentionedJid || []
        const targetRaw = quotedContext?.participant || mentioned[0]

        if (targetRaw) {
          // el JID citado también puede venir como @lid, hay que resolverlo
          const resolved = await resolveLid(targetRaw)
          targetBotJid = cleanJid(resolved)
        } else {
          targetBotJid = currentBotJid
        }
      } else {
        targetBotJid = currentBotJid
      }

      let nuevoNombre = textoBruto.replace(/@\d+/g, '').trim()

      if (!nuevoNombre || nuevoNombre === '') {
        return await reply({ text: '⚠️ Especifica el nuevo nombre para el bot (solo texto limpio).' })
      }

      const esBotRegistrado = db.getAllBots().some(b => cleanJid(b.jid) === targetBotJid)

      if (esOwnerGlobal && !esBotRegistrado && targetBotJid !== currentBotJid) {
        return await reply({ text: '❌ El usuario seleccionado no está registrado como un bot (principal o subbot) en la base de datos.' })
      }

      db.setBot(targetBotJid, { label: nuevoNombre })

      const targetNum = targetBotJid.split('@')[0]
      let textoConfirmacion = `✅ *Nombre actualizado con éxito*\n\n🤖 *Bot:* @${targetNum}\n📝 *Nuevo Nombre:* ${nuevoNombre}`

      await sock.sendMessage(from, {
        text: textoConfirmacion,
        mentions: [targetBotJid]
      }, { quoted: msg })

    } catch (err) {
      console.error(err)
      await reply({ text: `❌ *Error:* ${err.message}` })
    }
  }
}