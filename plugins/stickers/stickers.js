import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { db } from '../../database/db.js'
import config from '../../config.js'

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const tmp = path.join(__dirname, '../../tmp')

if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })

const clean = (value) => typeof value === 'string' ? value.trim() : ''

function getStickerMeta(senderNum, pushName) {
  const user = db.getUser(senderNum) || {}

  const userPack = clean(user.text1)
  const userAuthor = clean(user.text2)

  const hasUserMeta = Boolean(userPack || userAuthor)

  const nombre = pushName || senderNum

  return {
    hasUserMeta,
    packname: userPack || clean(config.botname) || '⚔️ Yuta Okotsu MD',
    author: userAuthor || `@${nombre}`
  }
}

function parseTempMeta(args, packname, author) {
  if (!args.length) return { packname, author }

  const texto = args.join(' ').trim()
  if (!texto) return { packname, author }

  if (texto.includes('|')) {
    const [p, a] = texto.split('|').map(s => s.trim())
    return {
      packname: p || packname,
      author: a || author
    }
  }

  return {
    packname: texto,
    author: texto
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

async function convertirWebp(buffer, esVideo = false) {
  const id = crypto.randomBytes(8).toString('hex')
  const ext = esVideo ? 'mp4' : 'jpg'

  const inputP = path.join(tmp, `stk_${id}.${ext}`)
  const outP = path.join(tmp, `stk_${id}.webp`)

  fs.writeFileSync(inputP, buffer)

  try {
    if (esVideo) {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputP}"`
      )

      const dur = parseFloat(stdout.trim())

      if (dur > 15) {
        throw new Error(`El video dura *${dur.toFixed(1)}s*, máximo *15 segundos*`)
      }

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

async function limpiarSticker(buffer) {
  const id = crypto.randomBytes(8).toString('hex')

  const inputP = path.join(tmp, `stk_${id}.webp`)
  const outP = path.join(tmp, `stk_${id}_out.webp`)

  fs.writeFileSync(inputP, buffer)

  try {
    try {
      await execAsync(`ffmpeg -i "${inputP}" -vcodec copy "${outP}" -y`)
    } catch {
      try {
        await execAsync(
          `ffmpeg -i "${inputP}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -c:v libwebp -lossless 0 -q:v 70 -loop 0 -an -vsync 0 "${outP}" -y`
        )
      } catch {
        fs.writeFileSync(outP, buffer)
      }
    }

    return fs.readFileSync(outP)
  } finally {
    try { fs.unlinkSync(inputP) } catch {}
    try { fs.unlinkSync(outP) } catch {}
  }
}

export default {
  name: ['s', 'sticker', 'stik'],
  description: 'Crea stickers desde imagen, video o sticker',
  category: 'stickers',
  ownerOnly: false,

  async run({ sock, from, msg, senderNum, args, usedPrefix, react, reply }) {
    try {
      await react('🕒')

      const pushName = msg.pushName || senderNum
      let { hasUserMeta, packname, author } = getStickerMeta(senderNum, pushName)

      if (!hasUserMeta) {
        const tempMeta = parseTempMeta(args, packname, author)
        packname = tempMeta.packname
        author = tempMeta.author
      }

      const msgType = Object.keys(msg.message || {})[0]

      const contextInfo = msg.message?.extendedTextMessage?.contextInfo
      const quoted = contextInfo?.quotedMessage
      const quotedType = quoted ? Object.keys(quoted)[0] : null

      const validTypes = ['imageMessage', 'videoMessage', 'stickerMessage']

      const mediaMsg = validTypes.includes(msgType) ? msg : null

      const quotedMsg = quoted && validTypes.includes(quotedType)
        ? {
            key: {
              remoteJid: from,
              id: contextInfo?.stanzaId,
              participant: contextInfo?.participant
            },
            message: quoted
          }
        : null

      const targetMsg = mediaMsg || quotedMsg
      const targetType = mediaMsg ? msgType : quotedType

      if (!targetMsg) {
        return await reply({
          text:
            `❌ Envía o responde una imagen, video máx 15s o sticker.\n\n` +
            `💡 *${usedPrefix}s* ➔ sticker normal\n` +
            `💡 *${usedPrefix}s MiMarca* ➔ marca temporal\n` +
            `💡 *${usedPrefix}setmeta MiMarca* ➔ marca fija`
        })
      }

      const buffer = await downloadMediaMessage(targetMsg, 'buffer', {}, { sock })

      const esVideo = targetType === 'videoMessage'
      const esSticker = targetType === 'stickerMessage'

      const webpBuffer = esSticker
        ? await limpiarSticker(buffer)
        : await convertirWebp(buffer, esVideo)

      const stickerFinal = await addExif(webpBuffer, packname, author)

      await sock.sendMessage(from, { sticker: stickerFinal }, { quoted: msg })

      await react('✅')
    } catch (error) {
      await react('❌')
      await reply({ text: `❌ ${error.message}` })
      console.error('Error en sticker:', error)
    }
  }
}