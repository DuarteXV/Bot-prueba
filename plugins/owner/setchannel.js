import config from '../../config.js'

const handler = async ({ reply, text }) => {
  if (!text) {
    return reply(
      `❌ Uso: *.setchanel <link> | <nombre>*\n\n` +
      `› Canal actual: ${config.channelInviteLink || 'No configurado'}\n` +
      `› Nombre actual: ${config.channelName || 'No configurado'}\n\n` +
      `Ejemplo: .setchanel https://whatsapp.com/channel/XXXXXX | Blue Lock Club`
    )
  }

  const [linkPart, namePart] = text.split('|').map(s => s.trim())

  if (!linkPart.includes('whatsapp.com/channel/')) {
    return reply('❌ Link inválido. Debe ser un canal de WhatsApp.')
  }

  config.channelInviteLink = linkPart
  if (namePart) config.channelName = namePart
  config.channelThumb = null
  config.channelThumbUrl = null

  await reply(
    `✅ *Canal actualizado*\n\n` +
    `› Link: ${config.channelInviteLink}\n` +
    `› Nombre: *${config.channelName}*\n\n` +
    `⚠️ Usa *.seticono* para actualizar la foto\n` +
    `_Para persistir, actualiza config.js_`
  )
}

handler.command = ['setchanel', 'setcanal']
handler.tags = ['owner']
handler.owner = true

export default handler