import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'
import axios from 'axios'

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const tmp = path.join(__dirname, '../../tmp')

if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })

console.log('🟢 brat.js cargado correctamente')

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchBratImage(text, attempt = 1) {
  try {
    const response = await axios.get('https://skyzxu-brat.hf.space/brat', {
      params: { text },
      responseType: 'arraybuffer'
    })
    return Buffer.from(response.data)
  } catch (error) {
    if (error.response?.status === 429 && attempt <= 3) {
      const retryAfter = error.response.headers['retry-after'] || 5
      await delay(retryAfter * 1000)
      return fetchBratImage(text, attempt + 1)
    }
    throw error
  }
}

export default {
  name: ['brat'],
  description: 'Crea sticker estilo brat (texto en fondo blanco) — MODO TEST',
  category: 'stickers',
  ownerOnly: false,

  async run({ sock, from, msg, senderNum, args, command, react, reply }) {
    console.log('🟡 Comando ejecutado:', command, '| args:', args)

    try {
      await react('🕒')

      const quotedText = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation
      const txt = quotedText || args.join(' ')

      if (!txt) {
        return reply({ text: '❌ Escribe un texto para crear el sticker.\n\n💡 *.brat <texto>*' })
      }

      const buffer = await fetchBratImage(txt)

      console.log('🟣 Buffer recibido:', buffer.length, 'bytes')

      // 🐛 TEST: manda la imagen cruda, sin convertir a sticker
      await sock.sendMessage(from, {
        image: buffer,
        caption: `🐛 Buffer recibido: ${buffer.length} bytes`
      }, { quoted: msg })

      await react('✅')

    } catch (error) {
      console.error('🔴 Error completo:', error)
      await react('❌')
      await reply({ text: `❌ *Error:* ${error.message}\n\n🐛 *Stack:*\n\`\`\`${error.stack?.slice(0, 500)}\`\`\`` })
    }
  }
}