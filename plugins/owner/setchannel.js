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
    const meta = await sock.newsletterMetadata('jid', jid)
    const thread = meta?.thread_metadata

    await reply(`DEBUG picture: ${JSON.stringify(thread?.picture)}`)

  } catch (err) {
    await reply(`❌ Error: ${err.message}`)
  }
}

handler.command = ['setchannel', 'setcanal']
handler.owner = true
handler.tags = ['owner']
handler.help = ['setchannel <link>']

export default handler