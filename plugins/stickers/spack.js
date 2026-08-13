import axios from 'axios'
import sharp from 'sharp'
import { crc32 } from 'zlib'
import {
  MEDIA_PATH_MAP,
  MEDIA_HKDF_KEY_MAPPING,
  encryptedStream,
  generateWAMessageFromContent,
  generateMessageIDV2,
  unixTimestampSeconds,
  sha256,
  proto
} from '@whiskeysockets/baileys'
import { db } from '../../database/db.js'

MEDIA_PATH_MAP['sticker-pack'] = '/mms/document'
MEDIA_HKDF_KEY_MAPPING['sticker-pack'] = 'Sticker Pack'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

const toBuffer = async (url) =>
  Buffer.from((await axios.get(url, { responseType: 'arraybuffer' })).data)

const isWebp = (b) =>
  b.length >= 12 &&
  b.toString('ascii', 0, 4) === 'RIFF' &&
  b.toString('ascii', 8, 12) === 'WEBP'

const isAnimatedWebp = (b) => {
  if (!isWebp(b)) return false
  let o = 12
  while (o < b.length - 8) {
    const tag = b.toString('ascii', o, o + 4)
    const sz = b.readUInt32LE(o + 4)
    if (tag === 'VP8X' && b[o + 8] & 0x02) return true
    if (tag === 'ANIM' || tag === 'ANMF') return true
    o += 8 + sz + (sz % 2)
  }
  return false
}

const toWebp = async (buffer, animated = false) =>
  sharp(buffer, animated ? { animated: true } : {})
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 80, ...(animated ? { loop: 0 } : {}) })
    .toBuffer()

const makeZip = (files) => {
  const locals = []
  const centrals = []
  let offset = 0
  for (const [name, data] of Object.entries(files)) {
    const n = Buffer.from(name, 'utf8')
    const crc = crc32(data)
    const local = Buffer.alloc(30 + n.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(n.length, 26)
    n.copy(local, 30)
    locals.push(local, data)
    const central = Buffer.alloc(46 + n.length)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(n.length, 28)
    central.writeUInt32LE(offset, 42)
    n.copy(central, 46)
    centrals.push(central)
    offset += local.length + data.length
  }
  const cd = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(centrals.length, 8)
  end.writeUInt16LE(centrals.length, 10)
  end.writeUInt32LE(cd.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, cd, end])
}

const withRetry = async (fn, attempt = 1) => {
  try {
    return await fn()
  } catch (e) {
    if (e.response?.status === 429 && attempt <= 3) {
      await delay((e.response.headers['retry-after'] || 5) * 1000)
      return withRetry(fn, attempt + 1)
    }
    throw e
  }
}

const searchStickerly = (query) =>
  withRetry(async () => {
    const { data } = await axios.get('https://api.alyacore.xyz/stickerly/search', {
      params: { query, key: 'Duarte-zz12' }
    })
    return data
  })

const getPackDetail = (url) =>
  withRetry(async () => {
    const { data } = await axios.get('https://api.alyacore.xyz/stickerly/detail', {
      params: { url, key: 'Duarte-zz12' }
    })
    return data
  })

const sendStickerPack = async (sock, jid, { name, publisher, description, stickers, cover, quoted }) => {
  if (!stickers.length) throw new Error('Pack vacío')
  if (stickers.length > 60) throw new Error('Máximo 60 stickers por pack')

  const packId = generateMessageIDV2()
  const files = {}

  const meta = stickers.map((s) => {
    if (s.sticker.length > 1024 * 1024) throw new Error('Un sticker supera 1MB')
    const fileName = sha256(s.sticker).toString('base64').replace(/\//g, '-') + '.webp'
    files[fileName] = s.sticker
    return {
      fileName,
      mimetype: 'image/webp',
      isAnimated: !!s.isAnimated,
      emojis: s.emojis?.length ? s.emojis : ['🎭'],
      accessibilityLabel: ''
    }
  })

  const trayIconFileName = `${packId}.webp`
  files[trayIconFileName] = cover

  const zipBuffer = makeZip(files)

  const up = await encryptedStream(zipBuffer, 'sticker-pack', { logger: sock.logger })
  const { directPath } = await sock.waUploadToServer(up.encFilePath, {
    fileEncSha256B64: up.fileEncSha256.toString('base64'),
    mediaType: 'sticker-pack'
  })

  const content = {
    stickerPackMessage: {
      name,
      publisher,
      packDescription: description,
      stickerPackId: packId,
      stickerPackOrigin: proto.Message.StickerPackMessage.StickerPackOrigin.THIRD_PARTY,
      stickerPackSize: zipBuffer.length,
      stickers: meta,
      fileSha256: up.fileSha256,
      fileEncSha256: up.fileEncSha256,
      mediaKey: up.mediaKey,
      directPath,
      fileLength: up.fileLength,
      mediaKeyTimestamp: unixTimestampSeconds(),
      trayIconFileName
    }
  }

  const m = generateWAMessageFromContent(jid, content, { quoted, userJid: sock.user.id })
  await sock.relayMessage(jid, m.message, { messageId: m.key.id })
  return m
}

export default {
  name: ['stickersearch', 'buscars', 'spack'],
  description: 'Busca packs de stickers en Sticker.ly',
  category: 'stickers',
  ownerOnly: false,

  async run({ sock, from, msg, text, usedPrefix, senderNum, reply, react }) {
    try {
      if (!text) {
        return await reply({
          text: `❌ Debes escribir el término a buscar.\n\n💡 *Uso:* ${usedPrefix || '.'}spack gatos`
        })
      }

      await react('⏳')

      const search = await searchStickerly(text)
      const resultados = search.resultados || search.result || []
      const freePacks = resultados.filter((p) => !p.isPaid)

      if (!freePacks.length) {
        await react('❌')
        return await reply({ text: `❌ No se encontraron packs para *${text}*.` })
      }

      const user = db.getUser(senderNum) || {}
      const packName = user.text1 || global.packname || 'Yuta Pack'
      const authorName = user.text2 || global.author || `@${senderNum}`

      const detail = await getPackDetail(freePacks[0].url)

      if (!detail.status || !detail.detalles?.stickers?.length) {
        await react('❌')
        return await reply({ text: '❌ No se pudo obtener el contenido del paquete.' })
      }

      const { detalles } = detail
      const raw = detalles.stickers.slice(0, 30)

      await reply({
        text: `📦 *Pack:* ${detalles.name}\n🖼️ *Stickers:* ${raw.length}\n⏳ _Procesando paquete..._`
      })

      const stickers = (
        await Promise.allSettled(
          raw.map(async (s) => {
            const buf = await toBuffer(s.imageUrl)
            const animated = s.isAnimated || isAnimatedWebp(buf)
            const webp = isWebp(buf) ? buf : await toWebp(buf, animated)
            return { sticker: webp, isAnimated: animated, emojis: ['🎭'] }
          })
        )
      )
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value)

      if (!stickers.length) {
        await react('❌')
        return await reply({ text: '❌ No se pudo procesar ningún sticker.' })
      }

      const cover = await sharp(await toBuffer(detalles.thumbnailUrl))
        .resize(96, 96, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer()

      await sendStickerPack(sock, from, {
        name: packName,
        publisher: authorName,
        description: `${detalles.name} • ${global.botname || 'Yuta Bot'}`,
        stickers,
        cover,
        quoted: msg
      })

      await react('✅')
    } catch (error) {
      console.error(error)
      await react('❌')
      await reply({ text: `❌ *Error:* ${error.message}` })
    }
  }
}
