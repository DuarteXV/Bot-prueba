let handler = async (m, { bot, conn }) => {
  await m.reply('🔄 *Reiniciando sistema...*')
  await new Promise(resolve => setTimeout(resolve, 2000)) // Pausa para que alcance a enviar el mensaje
  process.exit(0)
}

handler.help = ['restart']
handler.tags = ['owner']
handler.command = ['restart', 'reiniciar'] // Tu propiedad handler.command
handler.rowner = true

export default handler
