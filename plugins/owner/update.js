import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { fileURLToPath } from 'url'

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../../')

// ← Cambia esto con tu usuario y repo
const GITHUB_USER = 'DuarteXV'
const GITHUB_REPO = 'Bot-prueba'
const GITHUB_BRANCH = 'main'
const API = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}`
const RAW = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}`

async function getLatestCommit() {
  const res = await fetch(`${API}/commits/${GITHUB_BRANCH}`)
  const json = await res.json()
  return {
    sha: json.sha,
    message: json.commit?.message || 'Sin mensaje',
    date: json.commit?.author?.date || '',
  }
}

async function getChangedFiles(localSha) {
  const res = await fetch(`${API}/compare/${localSha}...${GITHUB_BRANCH}`)
  const json = await res.json()
  return json.files || []
}

async function downloadFile(filePath) {
  const res = await fetch(`${RAW}/${filePath}`)
  if (!res.ok) throw new Error(`No se pudo descargar: ${filePath}`)
  return res.text()
}

async function getLocalSha() {
  try {
    const { stdout } = await execAsync('git rev-parse HEAD')
    return stdout.trim()
  } catch {
    return null
  }
}

const handler = async ({ reply }) => {
  try {
    await reply('⏳ Verificando actualizaciones...')

    const localSha = await getLocalSha()
    const latest = await getLatestCommit()

    if (localSha && localSha === latest.sha) {
      return reply(
        `✅ *Ya estás al día*\n\n` +
        `› Rama: *${GITHUB_BRANCH}*\n` +
        `› Commit: ${latest.message}\n` +
        `› No hay nada nuevo para actualizar.`
      )
    }

    // Obtener archivos cambiados
    const files = localSha ? await getChangedFiles(localSha) : []
    const changed = files.filter(f => f.status !== 'removed')
    const removed = files.filter(f => f.status === 'removed')

    if (files.length === 0) {
      return reply(
        `✅ *Ya estás al día*\n\n` +
        `› No hay archivos nuevos.`
      )
    }

    await reply(`📥 Descargando ${changed.length} archivo(s)...`)

    // Descargar y escribir cada archivo
    for (const file of changed) {
      try {
        const content = await downloadFile(file.filename)
        const fullPath = path.join(ROOT, file.filename)
        const dir = path.dirname(fullPath)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(fullPath, content, 'utf-8')
      } catch (e) {
        console.error(`[UPDATE] Error descargando ${file.filename}: ${e.message}`)
      }
    }

    // Eliminar archivos borrados
    for (const file of removed) {
      try {
        const fullPath = path.join(ROOT, file.filename)
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)
      } catch {}
    }

    // Actualizar SHA local
    try {
      await execAsync(`git fetch --all && git reset --hard origin/${GITHUB_BRANCH}`)
    } catch {}

    const fileList = changed.slice(0, 10).map(f => `› ${f.filename}`).join('\n')
    const extra = changed.length > 10 ? `\n› ...y ${changed.length - 10} más` : ''

    await reply(
      `🔄 *Bot actualizado*\n\n` +
      `› Rama: *${GITHUB_BRANCH}*\n` +
      `› Commit: ${latest.message}\n\n` +
      `📋 *Archivos actualizados:*\n${fileList}${extra}`
    )

  } catch (e) {
    await reply(`❌ Error al actualizar:\n\`\`\`${e.message}\`\`\``)
  }
}

handler.command = ['update', 'actualizar']
handler.tags = ['owner']
handler.owner = true

export default handler