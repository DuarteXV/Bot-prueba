import fetch from 'node-fetch'
import FormData from 'form-data'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import config from '../../config.js'

const CDN_URL = 'https://api.alyacore.xyz/cdn/upload'
const CDN_TOKEN = '76ab5d4a4e97c41f697d47037ffe3a591d6b1cc53cd880112426df1edffeebb0'

async function uploadToCDN(fileBuffer, fileName) {
  const form = new FormData()
  form.append('file', fileBuffer, { filename: fileName, contentType: 'image/jpeg' })

  const res = await fetch(CDN_URL, {
    method: 'POST',
    headers: {
      'x-cdn-token': CDN_TOKEN,
      ...form.getHeaders(),
    },
    body: form,
  })

  const rawText = await res.text()

  let json
  try {
    json = JSON.parse(rawText)
  } catch (e) {
    throw new Error(`No es JSON (HTTP ${res.status}):\n${rawText.slice(0, 300)}`)
  }

  if (!json.status) throw new Error(json.message || 'Error desconocido')
  return { data: json.data, debug: { status: res.status, raw: rawText } }
}

const handler = async ({ bot, msg, from, reply }) => {
  const contextInfo = msg.message?.extendedTextMessage?.contextInfo
  const quotedMsg = contextInfo?.quotedMessage

  const imageMsg = quotedMsg?.imageMessage
  if (!imageMsg) {
    return reply('❌ Responde a una *imagen* para usarla como ícono del canal.')
  }

  await bot.sendMessage(from, { react: { text: '🕓', key: msg.key } })

  const fileBuffer = await downloadMediaMessage(
    { message: quotedMsg, key: msg.key },
    'buffer',
    {}
  )
  if (!fileBuffer) return reply('❌ No se pudo descargar la imagen.')

  await reply(
    `🔍 *Debug CDN*\n\n` +
    `› URL: ${CDN_URL}\n` +
    `› Token: ${CDN_TOKEN.slice(0, 10)}...\n` +
    `› Buffer: ${fileBuffer.length} bytes\n` +
    `› Archivo: icono_canal_${Date.now()}.jpg`
  )

  const result = await uploadToCDN(fileBuffer, `icono_canal_${Date.now()}.jpg`)

  await reply(
    `📡 *Respuesta CDN*\n\n` +
    `› HTTP: ${result.debug.status}\n` +
    `› Raw:\n\`\`\`${result.debug.raw.slice(0, 500)}\`\`\``
  )

  config.channelThumbUrl = result.data.url
  config.channelThumb = fileBuffer.toString('base64')

  await bot.sendMessage(from, { react: { text: '✅', key: msg.key } })
  await reply(
    `✅ *Ícono del canal actualizado*\n\n` +
    `› URL: ${result.data.url}\n\n` +
    `_Para que persista al reiniciar, guarda esta URL en config.js como channelThumbUrl_`
  )
}

handler.command = ['seticono']
handler.tags = ['owner']
handler.owner = true

export default handler