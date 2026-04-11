const handler = async ({ sock, reply }) => {
  const jid = global._config.channelJid

  try {
    const meta = await sock.newsletterMetadata('jid', jid)
    await reply(`DEBUG:\n${JSON.stringify(meta, null, 2)}`)
  } catch (err) {
    await reply(`❌ Error: ${err.message}`)
  }
}

handler.command = ['setchannel', 'setcanal']
handler.owner = true
handler.tags = ['owner']
handler.help = ['setchannel']

export default handler