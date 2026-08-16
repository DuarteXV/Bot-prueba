import { gotScraping } from 'got-scraping'
import { CookieJar } from 'tough-cookie'
import { Buffer } from 'node:buffer'

const BASE = 'https://redvid.io'
const REDDIT_REGEX = /reddit\.com\/|redd\.it\//i
const DOWNLOAD_MAX_RETRIES = 8
const RETRY_DELAY = 2000

const cookieJar = new CookieJar()

const http = gotScraping.extend({
  cookieJar,
  timeout: { request: 30000 },
  retry: { limit: 1 },
  throwHttpErrors: false,
  headerGeneratorOptions: {
    browsers: [{ name: 'chrome', minVersion: 120 }],
    devices: ['desktop'],
    operatingSystems: ['windows'],
    locales: ['es-419', 'es', 'en-US']
  }
})

export default {
  name: ['reddit', 'redditdl', 'rddl'],
  description: 'Descarga videos, audio o imágenes desde un enlace de Reddit usando RedVid',
  category: 'download',
  ownerOnly: false,

  async run({ sock, from, msg, args, react, reply }) {
    try {
      const url = args.find((a) => REDDIT_REGEX.test(a))
      const wantAudio = args.some((a) => {
        const low = a.toLowerCase()
        return low === 'mp3' || low === 'audio'
      })

      if (!url) {
        return reply({
          text: '❌ Debes darme un enlace de Reddit válido.\n\n*Ejemplos:*\n`.reddit https://www.reddit.com/r/...` (video)\n`.reddit https://www.reddit.com/r/... mp3` (solo audio)'
        })
      }

      await react('🕒')

      const info = await fetchMedia(url)
      console.log('[reddit]', info.mediaType, '| video:', !!info.videoToken, '| audio:', !!info.audioToken, '| pidió audio:', wantAudio)

      if (info.mediaType === 'image' && info.images.length) {
        for (const img of info.images.slice(0, 10)) {
          await sock.sendMessage(from, { image: { url: img } }, { quoted: msg })
        }
        await react('✔️')
        return
      }

      // si pidió mp3 y hay audio disponible, mandar solo el audio
      if (wantAudio && info.audioToken) {
        const buffer = await downloadWithRetry(info.audioToken)
        await sock.sendMessage(from, {
          audio: buffer,
          fileName: `${info.filename || 'reddit'}.mp3`,
          mimetype: 'audio/mpeg'
        }, { quoted: msg })
        await react('✔️')
        return
      }

      if (info.videoToken) {
        const buffer = await downloadWithRetry(info.videoToken)
        await sock.sendMessage(from, {
          video: buffer,
          fileName: `${info.filename || 'reddit'}.mp4`,
          mimetype: 'video/mp4',
          caption: info.title ? `*${info.title}*` : undefined
        }, { quoted: msg })
        await react('✔️')
        return
      }

      if (info.audioToken) {
        const buffer = await downloadWithRetry(info.audioToken)
        await sock.sendMessage(from, {
          audio: buffer,
          fileName: `${info.filename || 'reddit'}.mp3`,
          mimetype: 'audio/mpeg'
        }, { quoted: msg })
        await react('✔️')
        return
      }

      throw new Error('No se encontró contenido descargable')
    } catch (e) {
      console.error('[reddit]', e?.message || e)
      await react('❌')
      await reply({ text: `❌ *Error:* ${e?.message || 'falló la descarga'}` })
    }
  }
}

async function fetchMedia(url) {
  const res = await http.post(`${BASE}/fetch`, {
    headers: {
      accept: '*/*',
      'content-type': 'application/json',
      origin: BASE,
      referer: `${BASE}/`
    },
    body: JSON.stringify({ url, lang: 'en' })
  })

  if (res.statusCode !== 200) throw new Error(`no se pudo procesar el enlace (HTTP ${res.statusCode})`)

  let data = null
  try { data = JSON.parse(String(res.body)) } catch {}
  if (!data?.success) throw new Error(data?.message || 'el enlace no es válido')

  const view = data.view || ''

  const tokens = [...view.matchAll(/href="https:\/\/redvid\.io\/download\?token=([^"]+)"/g)]
    .map(mm => decodeURIComponent(mm[1] || ''))

  const images = [...view.matchAll(/<img[^>]+src="([^"]+)"/g)]
    .map(mm => mm[1] || '')
    .filter(src => src.startsWith('http') && !src.includes('icon') && !src.includes('logo'))

  const titleMatch = view.match(/<h[12][^>]*>([^<]+)<\/h[12]>/)
  const title = titleMatch ? (titleMatch[1] || '').trim() : ''

  return {
    mediaType: data.media_type || 'video',
    videoToken: tokens[0] || '',
    audioToken: tokens[1] || '',
    images,
    title,
    filename: sanitize(title) || 'reddit'
  }
}

async function downloadWithRetry(token) {
  for (let i = 0; i < DOWNLOAD_MAX_RETRIES; i++) {
    const res = await http.get(`${BASE}/download?token=${encodeURIComponent(token)}`, {
      headers: { referer: `${BASE}/` },
      responseType: 'buffer'
    })

    if (res.statusCode === 200) {
      const buffer = Buffer.from(res.rawBody)
      if (buffer.length > 1024) return buffer
    }

    if (res.statusCode === 503 || res.statusCode === 202) {
      await sleep(RETRY_DELAY)
      continue
    }

    if (res.statusCode >= 400) throw new Error(`descarga falló (HTTP ${res.statusCode})`)
  }

  throw new Error('la descarga no estuvo lista a tiempo')
}

function sanitize(s) {
  return (s || '').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_').slice(0, 80).toLowerCase()
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}