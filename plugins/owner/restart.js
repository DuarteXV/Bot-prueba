const handler = async (ctx) => {
  const { reply, saveDB } = ctx
  await reply('🔄 *Reiniciando el sistema...*')
  await saveDB()
  setTimeout(() => { process.exit(0) }, 2000)
}

handler.command = ['restart', 'reinicio']
handler.owner = true

export default handler
