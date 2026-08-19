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

async function convertirWebp(buffer, esVideo = false) {
  const id = crypto.randomBytes(8).toString('hex')
  const ext = esVideo ? 'mp4' : 'png'

  const inputP = path.join(tmp, `stk_${id}.${ext}`)
  const outP = path.join(tmp, `stk_${id}.webp`)

  fs.writeFileSync(inputP, buffer)

  try {
    if (esVideo) {
      await execAsync(
        `ffmpeg -i "${inputP}" -t 15 -vf "fps=15,scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -c:v libwebp -lossless 0 -q:v 70 -loop 0 -an -vsync 0 "${outP}" -y`
      )
    } else {
      await execAsync(
        `ffmpeg -i "${inputP}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -c:v libwebp -lossless 0 -q:v 80 "${outP}" -y`
      )
    }

    return fs.readFileSync(outP)
  } finally {
    try { fs.unlinkSync(inputP) } catch {}
    try { fs.unlinkSync(outP) } catch {}
  }
}

export default {
  name: ['brat', 'bratv', 'qc'],
  description: 'Crea stickers estilo brat (texto en fondo blanco) o una cita con foto de perfil',
  category: 'stickers',
  ownerOnly: false,

  async run({ sock, from, msg, senderNum, args, command, react, reply }) {
    try {
      await react('🕒')

      const packname = '⚔️ Yuta Okotsu MD'
      const author = `@${msg.pushName || senderNum}`

      const quotedText = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation

      if (command === 'brat' || command === 'bratv') {
        const txt = quotedText || args.join(' ')
        if (!txt) {
          return reply({ text: `❌ Escribe un texto para crear el sticker.\n\n💡 *.${command} <texto>*` })
        }

        const buffer = command === 'brat'
          ? await fetchBratImage(txt)
          : await fetchBratVideo(txt)

        // 🐛 DEBUG: mandamos al chat qué llegó realmente de la API
        const preview = buffer.slice(0, 200).toString('utf-8').replace(/[^\x20-\x7E]/g, '.')
        await reply({
          text: `🐛 *DEBUG*\nTamaño buffer: ${buffer.length} bytes\nPrimeros bytes:\n\`\`\`${preview}\`\`\``
        })

        const webpBuffer = await convertirWebp(buffer, command === 'bratv')
        const stickerFinal = await addExif(webpBuffer, packname, author)

        await sock.sendMessage(from, { sticker: stickerFinal }, { quoted: msg })
        await react('✅')
        return
      }

      if (command === 'qc') {
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

        // 🐛 DEBUG
        await reply({ text: `🐛 *DEBUG qc*\nTamaño buffer: ${buffer.length} bytes` })

        const webpBuffer = await convertirWebp(buffer, false)
        const stickerFinal = await addExif(webpBuffer, packname, author)

        await sock.sendMessage(from, { sticker: stickerFinal }, { quoted: msg })
        await react('✅')
      }

    } catch (error) {
      await react('❌')
      await reply({ text: `❌ *Error:* ${error.message}\n\n🐛 *Stack:*\n\`\`\`${error.stack?.slice(0, 500)}\`\`\`` })
    }
  }
}