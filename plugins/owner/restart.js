import { saveDB } from '../../lib/database.js'

/**
 * @type {import('../../lib/handler').Handler}
 */
const handler = async (bot, m) => {
  await bot.sendMessage(m.key.remoteJid, { text: '🔄 *Reiniciando el sistema...*' }, { quoted: m })
  
  // Guardamos la base de datos antes de matar el proceso
  await saveDB()
  
  // Un pequeño delay para que el mensaje se envíe correctamente
  setTimeout(() => {
    process.exit(0)
  }, 2000)
}

handler.command = ['restart', 'reinicio']
handler.owner = true // Esto depende de si tu lib/handler.js lo valida

export default handler
