import { exec } from 'child_process'

const handler = async ({ bot, from, reply, saveDB }) => {
  await reply('📥 *Buscando actualizaciones en GitHub...*')

  exec('git pull', async (err, stdout) => {
    if (err) {
      return reply(`❌ *Error al actualizar:*\n\`\`\`${err.message}\`\`\``)
    }

    if (stdout.includes('Already up to date')) {
      return reply('✅ *El bot ya está actualizado a la última versión.*')
    }

    await reply(`✅ *Actualización descargada:*\n\n${stdout}\n\n*Reiniciando...*`)
    
    await saveDB()
    
    setTimeout(() => {
      process.exit(0)
    }, 2000)
  })
}

handler.command = ['update', 'actualizar']
handler.tags = ['owner']
handler.help = ['update - Actualiza el bot desde el repositorio']
handler.owner = true

export default handler
