import { randomUUID } from 'crypto'
import { proto, generateWAMessageFromContent } from '@whiskeysockets/baileys'

const CTA_TYPES = ['OPEN_URL', 'COPY', 'CALL', 'QUICK_REPLY']

const buildSections = (items) => {
  const submessages = []
  const sections = []

  for (const i of items) {
    if (i.text !== undefined) {
      submessages.push({
        messageType: proto.AIRichResponseSubMessageType.AI_RICH_RESPONSE_TEXT,
        messageText: i.text
      })
      sections.push({
        view_model: {
          primitive: { text: i.text, __typename: 'GenAIMarkdownTextUXPrimitive' },
          __typename: 'GenAISingleLayoutViewModel'
        }
      })
      continue
    }

    if (i.image !== undefined) {
      const media = {
        url: i.image,
        mime_type: i.mimetype || 'image/png',
        __typename: 'GenAIMediaItem'
      }
      sections.push({
        view_model: {
          primitive: {
            preview_image: media,
            full_image: media,
            __typename: 'GenAIImagePrimitive'
          },
          __typename: 'GenAISingleLayoutViewModel'
        }
      })
      continue
    }

    if (i.cta_button) {
      const type = (i.cta_button.type || 'OPEN_URL').toUpperCase()
      if (!CTA_TYPES.includes(type)) throw new Error(`cta_type inválido: ${type}`)
      sections.push({
        view_model: {
          primitive: {
            cta_text: i.cta_button.text,
            cta_type: type,
            cta_url: i.cta_button.url,
            __typename: 'GenAIFooterActionPrimitive'
          },
          __typename: 'GenAISingleLayoutViewModel'
        }
      })
      continue
    }

    throw new Error(`item no soportado: ${JSON.stringify(i)}`)
  }

  return { submessages, sections }
}

export const sendMetaMsg = async (sock, jid, items, quoted, disclaimer) => {
  const { submessages, sections } = buildSections(items)
  const data = Buffer.from(JSON.stringify({ response_id: randomUUID(), sections })).toString('base64')

  const content = {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,
      botMetadata: {
        pluginMetadata: {},
        messageDisclaimerText: disclaimer || `Enviado por ${global.botname || 'Yuta Bot'}`
      }
    },
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: proto.AIRichResponseMessageType.AI_RICH_RESPONSE_TYPE_STANDARD,
          submessages,
          unifiedResponse: { data },
          contextInfo: {
            isForwarded: true,
            forwardingScore: 1,
            forwardedAiBotMessageInfo: { botJid: '0@bot' },
            forwardOrigin: proto.ContextInfo.ForwardOrigin.META_AI
          }
        }
      }
    }
  }

  const m = generateWAMessageFromContent(jid, content, { quoted, userJid: sock.user.id })
  await sock.relayMessage(jid, m.message, { messageId: m.key.id })
  return m
}

export default {
  name: ['randm'],
  description: 'Envía un mensaje estilo Meta AI con texto, imagen y botón',
  category: 'owner',

  async run({ sock, from, msg, text, usedPrefix, command, reply }) {
    if (!text) {
      return await reply({
        text: `> *🦖 Falta el contenido.*\n\n🍀 *Uso:* ${usedPrefix || '.'}${command} texto | imagen | boton | url | disclaimer\n\n☔ *Ejemplo:*\n${usedPrefix || '.'}${command} Hola desde Yuta | https://github.com/naut21.png | Visitar | https://api.lempi.lat | Powered by Yuta\n\n_El disclaimer es el texto chiquito de abajo. Podés omitir partes dejando el espacio vacío entre las barras._`
      })
    }

    const [body, image, btnText, btnUrl, disclaimer] = text.split('|').map((s) => s.trim())

    const items = []
    if (body) items.push({ text: body })
    if (image) items.push({ image })
    if (btnText && btnUrl) items.push({ cta_button: { text: btnText, type: 'OPEN_URL', url: btnUrl } })

    if (!items.length) return await reply({ text: '🍡 Lo sentimos, no hay nada que enviar.' })

    try {
      await sendMetaMsg(sock, from, items, msg, disclaimer)
    } catch (e) {
      console.error(e)
      await reply({ text: `${e.message}` })
    }
  }
}
