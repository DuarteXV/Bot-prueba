const handler = async ({ bot, from, reply, saveDB }) => {
  await reply('🔄 *Reiniciando el sistema...*')
  
  // Guardamos la base de datos
  await saveDB()
  
  // Esperamos 2 segundos y cerramos el proceso
  setTimeout(() => {
    process.exit(0)
  }, 2000)
}

handler.command = ['restart', 'reinicio']
handler.tags = ['owner']
handler.help = ['restart - Reinicia el bot']
handler.owner = true

export default handler
