/**
 * Plugin de Reinicio para el sistema de plugins dinámicos
 */
const handler = async (ctx) => {
  const { bot, from, msg, reply, saveDB } = ctx
  
  await reply('🔄 *Reiniciando el sistema...*')
  
  // Guardamos la base de datos antes de cerrar
  await saveDB()
  
  // Esperamos un momento para asegurar que el mensaje se envíe
  setTimeout(() => {
    process.exit(0)
  }, 2000)
}

handler.command = ['restart', 'reinicio']
handler.owner = true // Tu handler ya valida esto automáticamente

export default handler
