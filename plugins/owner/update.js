import { exec } from 'child_process'
import { saveDB } from '../../lib/database.js'

/**
 * @type {import('../../lib/handler').Handler}
 */
const handler = async (bot, m) => {
  await bot.sendMessage(m.key.remoteJid, { text: '📥 *Buscando actualizaciones en GitHub...*' }, { quoted: m })

  exec('git pull', async (err, stdout, stderr) => {
    if (err) {
      return bot.sendMessage(m.key.remoteJid, { text: `❌ *Error al actualizar:*\n${err.message}` }, { quoted: m })
    }

    if (stdout.includes('Already up to date')) {
      return bot.sendMessage(m.key.remoteJid, { text: '✅ *El bot ya está actualizado a la última versión.*' }, { quoted: m })
    }

    await bot.sendMessage(m.key.remoteJid, { 
      text: `✅ *Actualizado con éxito:*\n\n${stdout}\n\n*Reiniciando para aplicar cambios...*` 
    }, { quoted: m })

    await saveDB()
    
    setTimeout(() => {
      process.exit(0)
    }, 2000)
  })
}

handler.command = ['update', 'actualizar']
handler.owner = true

export default handler
