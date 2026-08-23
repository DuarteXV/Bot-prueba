import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'
import axios from 'axios'
import config from '../../config.js'
import { db } from '../../database/db.js'

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const tmp = path.join(__dirname, '../../tmp')

if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function getBotLabel(botJid) {
  const bot = db.getBot(botJid)
  if (
    bot?.label &&
    bot.label !== 'Subbot' &&
    bot.label !== 'MAIN' &&
    !bot.label.startsWith('SUB_')
  ) {
    return bot.label
  }
  return null
}

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

async function addExif(webpBuffer, packname, author) {
  const { default: webp } = await import('node-webpmux')
  const img = new webp.Image()

  const json = {
    'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
    'sticker-pack-name': packname,
    'sticker-pack-publisher': author,
    emojis: ['⚔️']
  }

  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2A, 0x00,
    0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00,
    0x00, 0x00
  ])

  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
  const exif = Buffer.concat([exifAttr, jsonBuffer])
  exif.writeUIntLE(jsonBuffer.length, 14, 4)

  await img.load(webpBuffer)
  img.exif = exif

  return await img.save(null)
}

async function convertirWebp(buffer) {
  const id = crypto.randomBytes(8).toString('hex')
  const inputP = path.join(tmp, `stk_${id}.png`)
  const outP = path.join(tmp, `stk_${id}.webp`)

  fs.writeFileSync(inputP, buffer)

  try {
    await execAsync(
      `ffmpeg -i "${inputP}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -c:v libwebp -lossless 0 -q:v 80 "${outP}" -y`
    )
    return fs.readFileSync(outP)
  } finally {
    try { fs.unlinkSync(inputP) } catch {}
    try { fs.unlinkSync(outP) } catch {}
  }
}

export default {
  name: ['brat'],
  description: 'Crea sticker estilo brat (texto en fondo blanco)',
  category: 'stickers',
  ownerOnly: false,

  async run({ sock, from, msg, senderNum, args, react, reply }) {
    try {
      await react('🕒')

      const quotedText = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation
      const txt = quotedText || args.join(' ')

      if (!txt) {
        return reply({ text: '❌ Escribe un texto para crear el sticker.\n\n💡 *.brat <texto>*' })
      }

      const botJid = sock.user?.id ? sock.user.id.split(':')[0].split('@')[0] + '@s.whatsapp.net' : ''
      const packname = getBotLabel(botJid) || config.botname

      const buffer = await fetchBratImage(txt)
      const webpBuffer = await convertirWebp(buffer)
      const stickerFinal = await addExif(webpBuffer, packname, `@${msg.pushName || senderNum}`)

      await sock.sendMessage(from, { sticker: stickerFinal }, { quoted: msg })
      await react('✅')

    } catch (error) {
      console.error('🔴 Error en brat:', error)
      await react('❌')
      await reply({ text: `❌ *Error:* ${error.message}` })
    }
  }
}