const handler = async ({ sock, reply }) => {
  const jid = global._config.channelJid
  if (!jid) return reply('❌ No hay channelJid configurado en config.js')

  await reply('⏳ Obteniendo datos del canal...')

  try {
    const meta = await sock.newsletterMetadata('jid', jid)
    if (!meta) return reply('❌ No se pudo obtener info del canal.')

    const thread = meta.thread_metadata

    global._config.channelName = thread.name?.text || global._config.channelName
    global._config.channelInviteLink = thread.invite
      ? `https://whatsapp.com/channel/${thread.invite}`
      : global._config.channelInviteLink
    global._config.channelThumbUrl = thread.picture?.direct_path
      ? `https://mmg.whatsapp.net${thread.picture.direct_path}`
      : global._config.channelThumbUrl

    await reply(`✅ *Canal actualizado!*

📛 *Nombre:* ${global._config.channelName}
🔗 *Link:* ${global._config.channelInviteLink}
🖼️ *Foto:* ${global._config.channelThumbUrl}`)

  } catch (err) {
    await reply(`❌ Error: ${err.message}`)
  }
}

handler.command = ['setchannel', 'setcanal']
handler.owner = true
handler.tags = ['owner']
handler.help = ['setchannel']

export default handler