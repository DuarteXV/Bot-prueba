import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const handler = async ({ reply, isOwner }) => {
  try {
    await reply('⏳ Actualizando repositorio...')

    // Detectar rama principal (main o master)
    const { stdout: branch } = await execAsync('git remote show origin | grep "HEAD branch" | cut -d" " -f5')
    const rama = branch.trim() || 'main'

    await execAsync(`git fetch --all`)
    await execAsync(`git reset --hard origin/${rama}`)

    const { stdout: log } = await execAsync('git log -1 --pretty=format:"%s (%cr)"')

    await reply(
      `✅ *Bot actualizado*\n\n` +
      `› Rama: ${rama}\n` +
      `› Último commit: ${log.trim()}`
    )
  } catch (e) {
    await reply(`❌ Error al actualizar:\n\`\`\`${e.message}\`\`\``)
  }
}

handler.command = ['update', 'actualizar']
handler.tags = ['owner']
handler.owner = true

export default handler