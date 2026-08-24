import axios from 'axios'
import yts from 'yt-search'
import { AIRich } from '@whiskeysockets/baileys'

const LIMIT_MB = 80
const API = 'https://api.lempi.lat/dl/ytv'
const APIKEY = 'Duarte-1311-2026'
const ID_RE = /(?:youtu\.be\/|v=|shorts\/)([\w-]{11})/

const fetchData = async url => {
  for (let i = 0; i < 3; i++) {
    try {
      const { data } = await axios.get(API, { params: { url, apikey: APIKEY }, timeout: 30000 })
      if (data?.status && data?.datos?.url) return data
    } catch {}
  }
  return null
}

export default {
  name: ['play2'],
  description: 'Descarga video de YouTube',
  category: 'dl',
  ownerOnly: false,

  async run({ sock, from, msg, react, reply, text }) {
    try {
      if (!text) return reply({ text: '✧ Ingresa un nombre o link' })

      await react('🔍')

      const id = text.match(ID_RE)?.[1]
      const info = id ? await yts({ videoId: id }).catch(() => null) : (await yts(text)).videos[0]
      if (!info && !id) return reply({ text: '❌ Sin resultados' })

      const data = await fetchData(info?.url ?? text)
      if (!data) return reply({ text: '❌ Error API' })

      const mp4 = data.datos.url
      const title = data.titulo ?? info?.title ?? 'video'

      const head = await axios.head(mp4).catch(() => null)
      const size = Number(head?.headers['content-length']) || 0
      const sizeMB = size / 1024 / 1024

      await sock.sendMessage(from, { text: `🎬 ${title}\n📦 ${sizeMB.toFixed(2)} MB` }, { quoted: msg })

      if (sizeMB >= LIMIT_MB) {
        await sock.sendMessage(
          from,
          { document: { url: mp4 }, mimetype: 'video/mp4', fileName: `${title}.mp4` },
          { quoted: msg }
        )
      } else {
        await new AIRich(sock)
          .setTitle('© Downloaded With Yotsuba')
          .addVideo(
            {
              url: mp4,
              file_length: size,
              duration: info?.seconds,
              thumbnail: info?.thumbnail ?? info?.image
            },
            { autoFill: !info }
          )
          .send(from, { quoted: msg })
      }

      await react('✅')
    } catch (error) {
      await react('❌')
      await reply({ text: `❌ Error: ${error.message}` })
    }
  }
}
