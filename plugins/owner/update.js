import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const handler = async ({ reply }) => {
  try {
    await reply('⏳ Verificando actualizaciones...')

    // Detectar rama principal
    const { stdout: branchRaw } = await execAsync('git remote show origin | grep "HEAD branch" | cut -d" " -f5')
    const rama = branchRaw.trim() || 'main'

    // Traer cambios remotos
    await execAsync('git fetch --all')

    // Comparar local vs remoto
    const { stdout: localHash } = await execAsync('git rev-parse HEAD')
    const { stdout: remoteHash } = await execAsync(`git rev-parse origin/${rama}`)

    if (localHash.trim() === remoteHash.trim()) {
      return reply(
        `✅ *Ya estás al día*\n\n` +
        `› Rama: *${rama}*\n` +
        `› No hay nada nuevo para actualizar.`
      )
    }

    // Obtener lista de commits nuevos antes de aplicar
    const { stdout: commits } = await execAsync(
      `git log HEAD..origin/${rama} --pretty=format:"› %s (%cr)" --no-merges`
    )

    // Aplicar hard reset
    await execAsync(`git reset --hard origin/${rama}`)

    const { stdout: lastLog } = await execAsync('git log -1 --pretty=format:"%s (%cr)"')

    await reply(
      `🔄 *Bot actualizado*\n\n` +
      `› Rama: *${rama}*\n` +
      `› Último commit: ${lastLog.trim()}\n\n` +
      `📋 *Cambios aplicados:*\n${commits.trim() || '› Sin detalles'}`
    )
  } catch (e) {
    await reply(`❌ Error al actualizar:\n\`\`\`${e.message}\`\`\``)
  }
}

handler.command = ['update', 'actualizar']
handler.tags = ['owner']
handler.owner = true

export default handler