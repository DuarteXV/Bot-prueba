import config from '../../config.js'
import { fetchBuffer } from '../../lib/utils.js'

const handler = async ({ reply, args, text }) => {
  if (!text) {
    return reply(
      `❌ Uso: *.setchanel <link> | <nombre>*\n\n` +
      `› Canal actual: ${config.channelInviteLink || 'No configurado'}\n` +
      `› Nombre actual: ${config.channelName || 'No configurado'}\n\n` +
      `Ejemplo: .setchanel https://whatsapp.com/channel/XXXXXX | Blue Lock Club`
    )
  }

  // Separar link y nombre por "|"
  const [linkPart, namePart] = text.split('|').map(s => s.trim())

  if (!linkPart.includes('whatsapp.com/channel/')) {
    return reply('❌ El link debe ser de un canal de WhatsApp.\nEjemplo: .setchanel https://whatsapp.com/channel/XXXXXX | Nombre Canal')
  }

  const anteriorLink = config.channelInviteLink
  const anteriorName = config.channelName

  config.channelInviteLink = linkPart

  if (namePart) {
    config.channelName = namePart
  }

  // Resetear foto para que se descargue la nueva con .seticono
  config.channelThumb = null
  config.channelThumbUrl = null

  await reply(
    `✅ *Canal actualizado*\n\n` +
    `› Link anterior: ${anteriorLink || 'Ninguno'}\n` +
    `› Link nuevo: ${config.channelInviteLink}\n\n` +
    `› Nombre anterior: ${anteriorName || 'Ninguno'}\n` +
    `› Nombre nuevo: *${config.channelName}*\n\n` +
    `_Usa .seticono para actualizar la foto del canal_\n` +
    `_Para que persista al reiniciar, actualiza config.js_`
  )
}

handler.command = ['setchanel', 'setcanal']
handler.tags = ['owner']
handler.owner = true

export default handler