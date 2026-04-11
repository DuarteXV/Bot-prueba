import config from '../../config.js'

const handler = async ({ sock, reply, isOwner }) => {
  if (!isOwner) return reply('❌ Solo el owner puede usar este comando.')

  const jid = global._config.channelJid
  if (!jid) return reply('❌ No hay channelJid configurado en config.js')

  await reply('⏳ Obteniendo datos del canal...')

  try {
    // Obtener metadata real del canal via Baileys
    const meta = await sock.newsletterMetadata('jid', jid)

    if (!meta) return reply('❌ No se pudo obtener info del canal.')

    // Actualizar global._config en tiempo real
    global._config.channelName = meta.name || global._config.channelName
    global._config.channelInviteLink = meta.invite
      ? `https://whatsapp.com/channel/${meta.invite}`
      : global._config.channelInviteLink
    global._config.channelThumbUrl = meta.picture || global._config.channelThumbUrl

    await reply(`✅ *Canal actualizado!*

📛 *Nombre:* ${global._config.channelName}
🔗 *Link:* ${global._config.channelInviteLink}
🖼️ *Foto:* ${global._config.channelThumbUrl}

> El menú ya refleja los cambios automáticamente.`)

  } catch (err) {
    await reply(`❌ Error: ${err.message}`)
  }
}

handler.command = ['setchannel', 'setcanal']
handler.tags = ['owner']
handler.help = ['setchannel']

export default handler