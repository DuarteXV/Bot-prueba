// plugins/owner/seticono.js
import fetch from 'node-fetch'
import FormData from 'form-data'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import config from '../../config.js'

async function uploadToCDN(fileBuffer, fileName) {
  const form = new FormData()
  form.append('file', fileBuffer, { filename: fileName, contentType: 'image/jpeg' })

  const res = await fetch('https://api.dix.lat/upload1', {
    method: 'POST',
    headers: {
      'User-Agent': 'Drive-Client',
      ...form.getHeaders(),
    },
    body: form,
  })

  const json = await res.json()
  if (!json.status || !json.data) throw new Error(JSON.stringify(json))
  return json.data
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

  const fileName = `icono_canal_${Date.now()}.jpg`
  const data = await uploadToCDN(fileBuffer, fileName)

  config.channelThumbUrl = data.url
  config.channelThumb = fileBuffer.toString('base64')

  await bot.sendMessage(from, { react: { text: '✅', key: msg.key } })
  await reply(
    `✅ *Ícono del canal actualizado*\n\n` +
    `› URL: ${data.url}\n\n` +
    `_Para que persista al reiniciar, guarda esta URL en config.js como channelThumbUrl_`
  )
}

handler.command = ['seticono']
handler.tags = ['owner']
handler.owner = true

export default handler