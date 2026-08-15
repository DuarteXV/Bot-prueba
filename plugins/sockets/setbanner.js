import { downloadMediaMessage } from '@whiskeysockets/baileys'
import axios from 'axios'
import { FormData, Blob } from 'formdata-node'
import { fileTypeFromBuffer } from 'file-type'
import { db } from '../../database/db.js'

const API_URL = 'https://cdn.dix.lat'

async function subirDix(buffer, filename, mimetype) {
  const form = new FormData()
  const blob = new Blob([buffer], { type: mimetype })
  form.append('file', blob, filename)

  const { data } = await axios.post(`${API_URL}/upload`, form, {
    timeout: 120000,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    headers: { 'User-Agent': 'Drive-Client' }
  })

  return data
}

export default {
  name: ['setbanner', 'cambiarbanner'],
  description: 'Cambia el banner de un subbot o del bot principal',
  category: 'owner',
  ownerOnly: false,

  async run({ sock, from, msg, reply, sender, resolveLid }) {
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
      let quotedMessage = quotedContext?.quotedMessage
      if (quotedMessage?.ephemeralMessage) quotedMessage = quotedMessage.ephemeralMessage.message

      let targetBotJid = null

      if (esOwnerGlobal) {
        const mentioned = quotedContext?.mentionedJid || []
        const targetRaw = quotedContext?.participant || mentioned[0]

        if (targetRaw) {
          const resolved = await resolveLid(targetRaw)
          targetBotJid = cleanJid(resolved)
        } else {
          targetBotJid = currentBotJid
        }
      } else {
        targetBotJid = currentBotJid
      }

      const esBotRegistrado = db.getAllBots().some(b => cleanJid(b.jid) === targetBotJid)

      if (esOwnerGlobal && !esBotRegistrado && targetBotJid !== currentBotJid) {
        return await reply({ text: '❌ El usuario seleccionado no está registrado como un bot (principal o subbot) en la base de datos.' })
      }

      const msgType = rawMessage?.imageMessage ? 'imageMessage' : null
      const quotedType = quotedMessage?.imageMessage ? 'imageMessage' : null

      let targetMsg = null

      if (msgType) {
        targetMsg = msg
      } else if (quotedMessage && quotedType) {
        targetMsg = {
          key: {
            remoteJid: from,
            id: quotedContext.stanzaId,
            participant: quotedContext.participant || quotedContext.remoteJid
          },
          message: quotedMessage
        }
      }

      if (!targetMsg) {
        return await reply({ text: '❌ Responde a una imagen o envía una junto al comando para establecer el banner.' })
      }

      const buffer = await downloadMediaMessage(targetMsg, 'buffer', {}, { sock })
      if (!buffer || buffer.length === 0) throw new Error('Buffer vacío')

      const detected = await fileTypeFromBuffer(buffer)
      const ext = detected?.ext || 'jpg'
      const mime = detected?.mime || 'image/jpeg'
      const filename = `banner_${Date.now()}.${ext}`

      const uploadResult = await subirDix(buffer, filename, mime)

      if (!uploadResult || !uploadResult.status || !uploadResult.data?.url) {
        throw new Error('El servidor de Dix rechazó la subida.')
      }

      const bannerUrl = uploadResult.data.url

      db.setBot(targetBotJid, { banner: bannerUrl })

      await reply({ text: `✅ *Banner actualizado con éxito*\n\n🤖 *Bot:* @${targetBotJid.split('@')[0]}\n🔗 *URL del Banner:* \n${bannerUrl}`, mentions: [targetBotJid] })
    } catch (err) {
      console.error(err)
      await reply({ text: `❌ *Error:* ${err.message}` })
    }
  }
}