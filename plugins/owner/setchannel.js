const handler = async ({ sock, reply, args }) => {
  const input = args[0]
  if (!input) return reply('❌ Usa: .setchannel <link del canal>')

  const match = input.match(/channel\/([a-zA-Z0-9_-]+)/)
  if (!match) return reply('❌ Link inválido.')

  const inviteCode = match[1]
  await reply('⏳ Obteniendo datos del canal...')

  try {
    const metaInvite = await sock.newsletterMetadata('invite', inviteCode)
    if (!metaInvite) return reply('❌ No se pudo obtener info del canal.')

    const jid = metaInvite.id

    // Bypassear caché usando newsletterQuery directo
    const result = await sock.newsletterQuery(jid, 'get', [
      { tag: 'metadata', attrs: {} }
    ])

    await reply(`DEBUG result: ${JSON.stringify(result).slice(0, 500)}`)

  } catch (err) {
    await reply(`❌ Error: ${err.message}\n${err.stack?.slice(0, 200)}`)
  }
}

handler.command = ['setchannel', 'setcanal']
handler.owner = true
handler.tags = ['owner']
handler.help = ['setchannel <link>']

export default handler