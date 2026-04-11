// plugins/owner/seticono.js
import FormData from 'form-data'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import config from '../../config.js'

const CDN_URL = 'https://api.alyacore.xyz/cdn/upload'
const CDN_TOKEN = '76ab5d4a4e97c41f697d47037ffe3a591d6b1cc53cd880112426df1edffeebb0'

async function uploadToCDN(fileBuffer, fileName) {
  const form = new FormData()
  form.append('file', fileBuffer, { filename: fileName })

  const res = await fetch(CDN_URL, {
    method: 'POST',
    headers: {
      'x-cdn-token': CDN_TOKEN,
      ...form.getHeaders(),
    },
    body: form,
  })

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(`Error del servidor (HTTP ${res.status})`)
  }

  const json = await res.json()
  if (!json.status) throw new Error(json.message || 'Error desconocido')
  return json.data
}

const handler = async ({ bot, msg, from, reply }) => {
  // Obtener imagen citada
  const contextInfo = msg.message?.extendedTextMessage?.contextInfo
  const quotedMsg = contextInfo?.quotedMessage

  const imageMsg = quotedMsg?.imageMessage
  if (!imageMsg) {
    return reply('❌ Responde a una *imagen* para usarla como ícono del canal.')
  }

  await bot.sendMessage(from, { react: { text: '🕓', key: msg.key } })

  // Descargar imagen
  const fileBuffer = await downloadMediaMessage(
    { message: quotedMsg, key: msg.key },
    'buffer',
    {}
  )
  if (!fileBuffer) return reply('❌ No se pudo descargar la imagen.')

  // Subir al CDN
  const fileName = `icono_canal_${Date.now()}.jpg`
  const data = await uploadToCDN(fileBuffer, fileName)

  // Actualizar config en memoria (instantáneo, sin reiniciar)
  config.channelThumbUrl = data.url
  config.channelThumb = fileBuffer.toString('base64')

  await bot.sendMessage(from, { react: { text: '✅', key: msg.key } })
  await reply(
    `✅ *Ícono del canal actualizado*\n\n` +
    `› URL: ${data.url}\n\n` +
    `_El cambio ya está activo. Para que persista al reiniciar, guarda esta URL en config.js_`
  )
}

handler.command = ['seticono']
handler.tags = ['owner']
handler.owner = true

export default handler