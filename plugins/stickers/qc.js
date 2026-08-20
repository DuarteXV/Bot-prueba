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
  name: ['qc'],
  description: 'Crea un sticker de cita con la foto de perfil',
  category: 'stickers',
  ownerOnly: false,

  async run({ sock, from, msg, senderNum, args, react, reply }) {
    try {
      await react('🕒')

      const quotedText = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation
      const txt = args.join(' ') || quotedText

      if (!txt) {
        return reply({ text: '❌ Escribe el mensaje que quieres convertir en sticker.' })
      }
      if (txt.length > 30) {
        return reply({ text: '❌ El texto es muy largo, máximo 30 caracteres.' })
      }

      const contextInfo = msg.message?.extendedTextMessage?.contextInfo
      const target = contextInfo?.participant || msg.key.participant || msg.key.remoteJid
      const pp = await sock.profilePictureUrl(target, 'image').catch(() => 'https://telegra.ph/file/24fa902ead26340f3df2c.png')
      const nombre = msg.pushName || senderNum

      const quoteObj = {
        type: 'quote',
        format: 'png',
        backgroundColor: '#000000',
        width: 512,
        height: 768,
        scale: 2,
        messages: [{
          entities: [],
          avatar: true,
          from: { id: 1, name: nombre, photo: { url: pp } },
          text: txt,
          replyMessage: {}
        }]
      }

      const json = await axios.post('https://bot.lyo.su/quote/generate', quoteObj)
      const buffer = Buffer.from(json.data.result.image, 'base64')

      const webpBuffer = await convertirWebp(buffer)
      const stickerFinal = await addExif(webpBuffer, '⚔️ Yuta Okotsu MD', `@${msg.pushName || senderNum}`)

      await sock.sendMessage(from, { sticker: stickerFinal }, { quoted: msg })
      await react('✅')

    } catch (error) {
      console.error('🔴 Error en qc:', error)
      await react('❌')
      await reply({ text: `❌ *Error:* ${error.message}` })
    }
  }
}