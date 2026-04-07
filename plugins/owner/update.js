import { exec } from 'child_process'

/**
 * Plugin de Actualización vía Git
 */
const handler = async (ctx) => {
  const { reply, saveDB } = ctx
  
  await reply('📥 *Buscando actualizaciones en el repositorio...*')

  exec('git pull', async (err, stdout) => {
    if (err) {
      return reply(`❌ *Error de Git:* \n\`\`\`${err.message}\`\`\``)
    }

    if (stdout.includes('Already up to date')) {
      return reply('✅ *El bot ya está actualizado.*')
    }

    await reply(`✅ *Actualización exitosa:*\n\n${stdout}\n\n*Reiniciando...*`)
    
    // Guardar cambios antes de salir
    await saveDB()
    
    setTimeout(() => {
      process.exit(0)
    }, 2000)
  })
}

handler.command = ['update', 'actualizar']
handler.owner = true

export default handler
