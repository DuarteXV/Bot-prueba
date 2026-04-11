const handler = async ({ sock, reply }) => {
  const jid = global._config.channelJid
  if (!jid) return reply('❌ No hay channelJid configurado en config.js')

  await reply('⏳ Obteniendo datos del canal...')

  try {
    const meta = await sock.newsletterMetadata('jid', jid)
    if (!meta) return reply('❌ No se pudo obtener info del canal.')

    global._config.channelName = meta.name || global._config.channelName
    global._config.channelInviteLink = meta.invite
      ? `https://whatsapp.com/channel/${meta.invite}`
      : global._config.channelInviteLink
    global._config.channelThumbUrl = meta.picture || global._config.channelThumbUrl

    await reply(`✅ *Canal actualizado!*\n\n📛 *Nombre:* ${global._config.channelName}\n🔗 *Link:* ${global._config.channelInviteLink}\n🖼️ *Foto:* ${global._config.channelThumbUrl}`)
  } catch (err) {
    await reply(`❌ Error: ${err.message}`)
  }
}

handler.command = ['setchannel', 'setcanal']
handler.owner = true
handler.tags = ['owner']
handler.help = ['setchannel']

export default handler