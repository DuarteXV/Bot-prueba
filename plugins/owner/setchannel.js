const handler = async ({ sock, reply, args }) => {
  const input = args[0]
  if (!input) return reply('❌ Usa: .setchannel <link del canal>')

  const match = input.match(/channel\/([a-zA-Z0-9_-]+)/)
  if (!match) return reply('❌ Link inválido.')

  const inviteCode = match[1]
  await reply('⏳ Obteniendo datos del canal...')

  try {
    const meta = await sock.newsletterMetadata('invite', inviteCode)
    if (!meta) return reply('❌ No se pudo obtener info del canal.')

    const thread = meta.thread_metadata

    global._config.channelJid = meta.id
    global._config.channelName = thread.name?.text || global._config.channelName
    global._config.channelInviteLink = input

    try {
      const picUrl = await sock.profilePictureUrl(meta.id, 'image')
      const res = await fetch(picUrl)
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer())
        global._config.channelThumb = buffer.toString('base64')
        global._config.channelThumbUrl = picUrl
      }
    } catch (e) {
      await reply(`⚠️ Error foto: ${e.message}`)
    }

    await reply(`✅ *Canal actualizado!*\n\n📛 *Nombre:* ${global._config.channelName}\n🔗 *Link:* ${global._config.channelInviteLink}`)

  } catch (err) {
    await reply(`❌ Error: ${err.message}`)
  }
}

handler.command = ['setchannel', 'setcanal']
handler.owner = true
handler.tags = ['owner']
handler.help = ['setchannel <link>']

export default handler