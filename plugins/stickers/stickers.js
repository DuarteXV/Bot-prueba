import fs from 'fs'
import os from 'os'
import path from 'path'
import crypto from 'crypto'
import { execSync } from 'child_process'
import sharp from 'sharp'
import webpmux from 'node-webpmux'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { db } from '../../database/db.js'

const toWebpImage = async (buffer) =>
  sharp(buffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 80 })
    .toBuffer()

const toWebpVideo = (buffer) => {
  const tmpDir = os.tmpdir()
  const id = crypto.randomBytes(6).toString('hex')
  const inputPath = path.join(tmpDir, `sticker_in_${id}.mp4`)
  const outputPath = path.join(tmpDir, `sticker_out_${id}.webp`)

  fs.writeFileSync(inputPath, buffer)

  try {
    execSync(
      `ffmpeg -i "${inputPath}" -vcodec libwebp -filter:v "fps=15,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=white@0.0,setsar=1" -loop 0 -ss 0 -t 6 -preset default -an -vsync 0 -s 512:512 -y "${outputPath}"`,
      { stdio: 'ignore', timeout: 60000 }
    )
    return fs.readFileSync(outputPath)
  } finally {
    try { fs.unlinkSync(inputPath) } catch {}
    try { fs.unlinkSync(outputPath) } catch {}
  }
}

async function addExif(webpBuffer, packname, author) {
  const img = new webpmux.Image()
  await img.load(webpBuffer)

  const json = {
    'sticker-pack-id': 'com.duarte.stickers',
    'sticker-pack-name': packname,
    'sticker-pack-publisher': author,
    emojis: ['🎭']
  }

  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00,
    0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00
  ])
  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
  const exif = Buffer.concat([exifAttr, jsonBuffer])
  exif.writeUIntLE(jsonBuffer.length, 14, 4)

  img.exif = exif
  return img.save(null)
}

export default {
  name: ['sticker', 's'],
  description: 'Convierte una imagen o video/gif en sticker',
  category: 'stickers',
  ownerOnly: false,

  async run({ sock, from, msg, quoted, senderNum, reply, react }) {
    try {
      const mediaMsg =
        quoted?.message?.imageMessage || quoted?.message?.videoMessage
          ? quoted
          : msg.message?.imageMessage || msg.message?.videoMessage
          ? msg
          : null

      if (!mediaMsg) {
        return await reply({
          text: 'Responde a una imagen o video/gif con *.sticker*, o envíalo con el comando como descripción.'
        })
      }

      const isVideo = !!mediaMsg.message?.videoMessage

      if (isVideo) {
        const seconds = mediaMsg.message.videoMessage.seconds || 0
        if (seconds > 10) {
          return await reply({ text: 'El video/gif no puede durar más de 10 segundos.' })
        }
      }

      await react('⏳')

      const buffer = await downloadMediaMessage(mediaMsg, 'buffer', {})
      const webp = isVideo ? toWebpVideo(buffer) : await toWebpImage(buffer)

      const user = db.getUser(senderNum) || {}
      const packname = user.text1 || global.packname || 'Yuta Pack'
      const author = user.text2 || `@${senderNum}`

      const finalSticker = await addExif(webp, packname, author)

      await sock.sendMessage(from, { sticker: finalSticker }, { quoted: msg })

      await react('✅')
    } catch (error) {
      console.error('Error en sticker:', error)
      await react('❌')
      await reply({ text: `Error al crear el sticker: ${error.message}` })
    }
  }
}