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

async function fetchBratVideo(text) {
  const response = await axios.get('https://skyzxu-brat.hf.space/brat-animated', {
    params: { text },
    responseType: 'arraybuffer'
  })
  return Buffer.from(response.data)
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

async function convertirWebpVideo(buffer) {
  const id = crypto.randomBytes(8).toString('hex')
  const inputP = path.join(tmp, `stk_${id}.mp4`)
  const outP = path.join(tmp, `stk_${id}.webp`)

  fs.writeFileSync(inputP, buffer)

  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputP}"`
    )
    const dur = parseFloat(stdout.trim())
    if (dur > 15) {
      throw new Error(`El video dura ${dur.toFixed(1)}s, máximo 15 segundos`)
    }

    await execAsync(
      `ffmpeg -i "${inputP}" -t 15 -vf "fps=15,scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -c:v libwebp -lossless 0 -q:v 70 -loop 0 -an -vsync 0 "${outP}" -y`
    )
    return fs.readFileSync(outP)
  } finally {
    try { fs.unlinkSync(inputP) } catch {}
    try { fs.unlinkSync(outP) } catch {}
  }
}

export default {
  name: ['bratv'],
  description: 'Crea sticker animado estilo brat (texto en fondo blanco)',
  category: 'stickers',
  ownerOnly: false,

  async run({ sock, from, msg, senderNum, args, react, reply }) {
    try {
      await react('🕒')

      const quotedText = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation
      const txt = quotedText || args.join(' ')

      if (!txt) {
        return reply({ text: '❌ Escribe un texto para crear el sticker animado.\n\n💡 *.bratv <texto>*' })
      }

      const botJid = sock.user?.id ? sock.user.id.split(':')[0].split('@')[0] + '@s.whatsapp.net' : ''
      const packname = getBotLabel(botJid) || config.botname

      const buffer = await fetchBratVideo(txt)
      const webpBuffer = await convertirWebpVideo(buffer)
      const stickerFinal = await addExif(webpBuffer, packname, `@${msg.pushName || senderNum}`)

      await sock.sendMessage(from, { sticker: stickerFinal }, { quoted: msg })
      await react('✅')

    } catch (error) {
      console.error('🔴 Error en bratv:', error)
      await react('❌')
      await reply({ text: `❌ *Error:* ${error.message}` })
    }
  }
}