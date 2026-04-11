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
    return reply('❌ Link inválido. Debe ser un canal de WhatsApp.')
  }

  await reply('⏳ Obteniendo información del canal...')

  const info = await bot.newsletterMetadata('invite', channelCode).catch(() => null)
  if (!info) return reply('❌ No se pudo obtener info del canal. Verifica el enlace.')

  const anteriorLink = config.channelInviteLink
  const anteriorName = config.channelName

  // Actualizar singleton global
  global._config.channelJid = info.id
  global._config.channelName = info.name || config.channelName
  global._config.channelInviteLink = link
  global._config.channelThumb = null
  global._config.channelThumbUrl = null

  // Obtener foto
  try {
    let picUrl = null

    if (info.picture?.directPath) {
      picUrl = `https://mmg.whatsapp.net${info.picture.directPath}`
    }

    if (!picUrl) {
      picUrl = await bot.profilePictureUrl(info.id, 'image').catch(() => null)
    }

    if (picUrl) {
      const buf = await fetchBuffer(picUrl)
      global._config.channelThumb = buf.toString('base64')
      global._config.channelThumbUrl = picUrl
    }
  } catch (e) {
    console.log('[CANAL] Sin foto:', e.message)
  }

  await reply(
    `✅ *Canal actualizado*\n\n` +
    `› JID: ${global._config.channelJid}\n` +
    `› Nombre anterior: ${anteriorName || 'Ninguno'}\n` +
    `› Nombre nuevo: *${global._config.channelName}*\n` +
    `› Link anterior: ${anteriorLink || 'Ninguno'}\n` +
    `› Link nuevo: ${global._config.channelInviteLink}\n` +
    `› Foto: ${global._config.channelThumb ? '✅ Cargada' : '❌ No disponible'}\n\n` +
    `_Para persistir al reiniciar, actualiza config.js_`
  )
}

handler.command = ['setchanel', 'setcanal']
handler.tags = ['owner']
handler.owner = true

export default handler