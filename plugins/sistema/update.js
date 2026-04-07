import { exec } from 'child_process'

let handler = async (m, { bot, conn }) => {
  await m.reply('📥 *Actualizando bot...*')
  
  exec('git pull', async (err, stdout) => {
    if (err) return m.reply(`❌ Error: ${err.message}`)
    
    if (stdout.includes('Already up to date')) {
      return m.reply('✅ El bot ya está en su versión más reciente.')
    }
    
    await m.reply(`✅ *Resultado:* ${stdout}\n\nReiniciando para aplicar cambios...`)
    process.exit(0)
  })
}

handler.help = ['update']
handler.tags = ['owner']
handler.command = ['update', 'actualizar'] // Aquí está el handler.command que mencionaste
handler.rowner = true // Solo el dueño del bot

export default handler
