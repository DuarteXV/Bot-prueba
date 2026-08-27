import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import crypto from 'crypto'

function validateFacebookUrl(url) {
  try {
    url = url.trim().replace(/[^\x00-\x7F]/g, "")

    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?facebook\.com\/.+\/videos\/\d+/,
      /(?:https?:\/\/)?(?:www\.)?facebook\.com\/watch\/?\?v=\d+/,
      /(?:https?:\/\/)?(?:www\.)?facebook\.com\/reel\/\d+/,
      /(?:https?:\/\/)?fb\.watch\/[A-Za-z0-9_-]+/,
      /(?:https?:\/\/)?(?:m\.)?facebook\.com\/.+\/videos\/\d+/,
      /(?:https?:\/\/)?(?:www\.)?facebook\.com\/share\/[rv]\/[A-Za-z0-9_-]+/
    ]

    for (const pattern of patterns) {
      if (pattern.test(url)) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url
        }
        return url
      }
    }

    return null
  } catch (error) {
    console.error('Error validating Facebook URL:', error)
    return null
  }
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

async function downloadFacebookVideo(url) {
  try {
    const apiKey = 'Duarte-zz12'
    const endpoint = `https://api.alyacore.xyz/dl/facebook?url=${encodeURIComponent(url)}&key=${apiKey}`

    const { data } = await axios.get(endpoint, { timeout: 25000 })

    if (data.status !== true || !data.resultados?.length) {
      throw new Error('No se encontraron formatos disponibles en la respuesta de la API')
    }

    const formatos = data.resultados
    const mejorFormato =
      formatos.find(f => f.quality?.includes('1080p') && f.url !== '/') ||
      formatos.find(f => f.quality?.includes('720p') && f.url !== '/') ||
      formatos.find(f => f.quality?.includes('540p') && f.url !== '/') ||
      formatos.find(f => f.url !== '/')

    if (!mejorFormato) {
      throw new Error('No se encontró un enlace de descarga de video válido')
    }

    let duration = null
    if (mejorFormato.url.includes('duration_s%22%3A')) {
      const match = mejorFormato.url.match(/duration_s%22%3A(\d+)/)
      if (match) duration = parseInt(match[1], 10)
    }

    return {
      videoUrl: mejorFormato.url,
      title: mejorFormato.filename || 'Video de Facebook',
      duration
    }
  } catch (error) {
    throw new Error(`Facebook API error: ${error.message}`)
  }
}

async function descargarBuffer(url) {
  const { data } = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 60000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })

  const buffer = Buffer.from(data)
  if (!buffer.length) {
    throw new Error('El servidor devolvió un archivo de video vacío')
  }
  return buffer
}

function reencodearVideo(bufferEntrada) {
  const tmpDir = '/tmp'
  const id = crypto.randomBytes(6).toString('hex')
  const inputPath = path.join(tmpDir, `fb_in_${id}.mp4`)
  const outputPath = path.join(tmpDir, `fb_out_${id}.mp4`)

  fs.writeFileSync(inputPath, bufferEntrada)

  try {
    execSync(
      `ffmpeg -i "${inputPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -movflags +faststart -y "${outputPath}"`,
      { stdio: 'ignore', timeout: 120000 }
    )

    return fs.readFileSync(outputPath)
  } finally {
    try { fs.unlinkSync(inputPath) } catch {}
    try { fs.unlinkSync(outputPath) } catch {}
  }
}

export default {
  name: ['facebook', 'fb'],
  description: 'Descarga videos de Facebook',
  category: 'dl',
  groupOnly: false,

  async run({ sock, from, msg, args, usedPrefix, cmdName, reply, react }) {
    if (!args[0]) {
      return await reply({
        text: `📘 Por favor, ingresa un enlace de Facebook.\n\n📝 *Ejemplo:* ${usedPrefix}${cmdName} https://www.facebook.com/watch?v=1234567890`
      })
    }

    const facebookUrl = validateFacebookUrl(args[0])
    if (!facebookUrl) {
      return await reply({
        text: `❌ URL de Facebook inválida. Por favor verifica el enlace.\n\n✅ *URLs válidas:*\n• https://www.facebook.com/.../videos/...\n• https://www.facebook.com/watch?v=...\n• https://www.facebook.com/reel/...\n• https://www.facebook.com/share/v/...\n• https://fb.watch/...`
      })
    }

    await react('🔄')
    await reply({ text: `> ✎...Descargando video.` })

    try {
      const result = await downloadFacebookVideo(facebookUrl)
      const bufferOriginal = await descargarBuffer(result.videoUrl)
      const bufferFinal = reencodearVideo(bufferOriginal)

      const caption = `✅ *Video de Facebook descargado*\n\n` +
        `📹 *Título:* ${result.title}\n` +
        `⏱️ *Duración:* ${result.duration ? formatDuration(result.duration) : 'N/A'}`

      await sock.sendMessage(from, {
        video: bufferFinal,
        mimetype: 'video/mp4',
        fileName: 'facebook.mp4',
        caption
      }, { quoted: msg })

      await react('✅')

    } catch (error) {
      console.error('Error en Facebook download:', error)
      await react('❌')
      await reply({
        text: `❌ Error al procesar la descarga: ${error.message}\n\n💡 *Consejos:*\n• Verifica que el video sea público\n• Intenta con un enlace diferente`
      })
    }
  }
}