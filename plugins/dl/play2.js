import axios from 'axios'
import yts from 'yt-search'
const LIMIT_MB = 80
export default {
  name: ['play2'],
  description: 'Descarga video de YouTube',
  category: 'dl',
  ownerOnly: false,

  async run({ sock, from, msg, react, reply, text }) {
    try {
      if (!text) return reply({ text: '✧ Ingresa un nombre o link' })

      await react('🔍')

      let videoUrl = text

      if (!text.includes('youtube.com') && !text.includes('youtu.be')) {
        const search = await yts(text)
        if (!search.videos.length) return reply({ text: '❌ Sin resultados' })
        videoUrl = search.videos[0].url
      }

      const apis = [
        `https://api.lempi.lat/dl/ytv?url=${encodeURIComponent(videoUrl)}&apikey=Duarte-1311`,
      ]

      let data = null

      for (const api of apis) {
        for (let i = 0; i < 3; i++) {
          try {
            const res = await axios.get(api, { timeout: 30000 })
            if (res.data?.status && res.data?.datos?.url) {
  data = res.data
              break
            }
          } catch {}
        }
        if (data) break
      }

      if (!data) return reply({ text: '❌ Error API' })

      const title = data.titulo
      const mp4 = datos.url

      const head = await axios.head(mp4)
      const size = Number(head.headers['content-length']) || 0
      const sizeMB = size / 1024 / 1024

      await sock.sendMessage(from, {
        text: `🎬 ${title}\n📦 ${sizeMB.toFixed(2)} MB`
      }, { quoted: msg })

      if (sizeMB >= LIMIT_MB) {
        await sock.sendMessage(from, {
          document: { url: mp4 },
          mimetype: 'video/mp4',
          fileName: `${title}.mp4`
        }, { quoted: msg })
      } else {
        await sock.sendMessage(from, {
          video: { url: mp4 },
          mimetype: 'video/mp4',
          fileName: `${title}.mp4`,
          caption: title
        }, { quoted: msg })
      }

      await react('✅')

    } catch (error) {
      await react('❌')
      await reply({ text: `❌ Error: ${error.message}` })
    }
  }
}
