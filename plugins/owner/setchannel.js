import config from '../../config.js'
import { fetchBuffer } from '../../lib/utils.js'

const handler = async ({ bot, reply, text }) => {
  if (!text) {
    return reply(
      `❌ Uso: *.setchanel <link del canal>*\n\n` +
      `› Canal actual: ${config.channelInviteLink || 'No configurado'}\n` +
      `› Nombre actual: ${config.channelName || 'No configurado'}\n\n` +
      `Ejemplo: .setchanel https://whatsapp.com/channel/XXXXXX`
    )
  }

  const link = text.trim()
  const channelCode = link.match(/(?:https?:\/\/)?(?:whatsapp\.com\/channel\/)([0-9A-Za-z@.]+)/i)?.[1]

  if (!channelCode) {
    return reply('❌ Link inválido. Debe ser un canal de WhatsApp.\nEjemplo: https://whatsapp.com/channel/XXXXXX')
  }

  await reply('⏳ Obteniendo información del canal...')

  // Obtener metadata real del canal
  const info = await bot.newsletterMetadata('invite', channelCode).catch(() => null)
  if (!info) return reply('❌ No se pudo obtener info del canal. Verifica el enlace.')

  const anteriorLink = config.channelInviteLink
  const anteriorName = config.channelName

  // Actualizar config con datos reales
  config.channelJid = info.id
  config.channelName = info.name || config.channelName
  config.channelInviteLink = link

  // Obtener foto del canal
  config.channelThumb = null
  config.channelThumbUrl = null
  try {
    const picUrl = info.picture?.directPath
      ? `https://mmg.whatsapp.net${info.picture.directPath}`
      : null
    if (picUrl) {
      const buf = await fetchBuffer(picUrl)
      config.channelThumb = buf.toString('base64')
      config.channelThumbUrl = picUrl
      console.log('[CANAL] Foto actualizada ✓')
    }
  } catch (e) {
    console.log('[CANAL] Sin foto:', e.message)
  }

  await reply(
    `✅ *Canal actualizado*\n\n` +
    `› JID: ${config.channelJid}\n` +
    `› Nombre anterior: ${anteriorName || 'Ninguno'}\n` +
    `› Nombre nuevo: *${config.channelName}*\n` +
    `› Link anterior: ${anteriorLink || 'Ninguno'}\n` +
    `› Link nuevo: ${config.channelInviteLink}\n` +
    `› Foto: ${config.channelThumb ? '✅ Cargada' : '❌ No disponible'}\n\n` +
    `_Para persistir al reiniciar, actualiza config.js_`
  )
}

handler.command = ['setchanel', 'setcanal']
handler.tags = ['owner']
handler.owner = true

export default handler