const handler = async ({ sock, reply, args }) => {
  const input = args[0]
  if (!input) return reply('❌ Usa: .setchannel <link del canal>')

  // Extraer el invite code del link
  const match = input.match(/channel\/([a-zA-Z0-9_-]+)/)
  if (!match) return reply('❌ Link inválido. Usa el link del canal de WhatsApp.')

  const inviteCode = match[1]

  await reply('⏳ Obteniendo datos del canal...')

  try {
    const meta = await sock.newsletterMetadata('invite', inviteCode)
    if (!meta) return reply('❌ No se pudo obtener info del canal.')

    const thread = meta.thread_metadata

    global._config.channelJid = meta.id
    global._config.channelName = thread.name?.text || global._config.channelName
    global._config.channelInviteLink = input
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
handler.help = ['setchannel <link>']

export default handler