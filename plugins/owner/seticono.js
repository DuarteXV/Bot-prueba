// plugins/owner/seticono.js
import fetch from 'node-fetch'
import FormData from 'form-data'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import config from '../../config.js'

const CDN_URL = 'https://cdn.dev-ander.xyz/upload'

async function uploadToCDN(fileBuffer, fileName) {
  const form = new FormData()
  form.append('file', fileBuffer, { filename: fileName, contentType: 'image/jpeg' })

  const res = await fetch(CDN_URL, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, */*',
      ...form.getHeaders(),
    },
    body: form,
  })

  const rawText = await res.text()
  await reply(`📡 Raw: \`\`\`${rawText.slice(0, 500)}\`\`\``)

  let json
  try {
    json = JSON.parse(rawText)
  } catch (e) {
    throw new Error(`No es JSON (HTTP ${res.status}):\n${rawText.slice(0, 300)}`)
  }

  return json
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
  const json = await uploadToCDN(fileBuffer, fileName)

  await reply(`📡 *Respuesta CDN:*\n\`\`\`${JSON.stringify(json, null, 2).slice(0, 500)}\`\`\``)
}

handler.command = ['seticono']
handler.tags = ['owner']
handler.owner = true

export default handler