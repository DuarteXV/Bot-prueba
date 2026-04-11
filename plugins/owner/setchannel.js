import config from '../../config.js'
import { fetchBuffer } from '../../lib/utils.js'
import { extractNewsletterMetadata } from '@whiskeysockets/baileys'

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
  if (!channelCode) return reply('❌ Link inválido.')

  await reply('⏳ Obteniendo información del canal...')

  // Obtener node raw para poder usar extractNewsletterMetadata
  let info
  try {
    info = await bot.newsletterMetadata('invite', channelCode)
  } catch (e) {
    return reply(`❌ Error: ${e.message}`)
  }

  if (!info?.id) return reply('❌ No se pudo obtener el JID. Verifica el enlace.')

  const anteriorLink = config.channelInviteLink
  const anteriorName = config.channelName

  // Usar los campos que sí devuelve el fork
  config.channelJid = info.id
  config.channelName = info.name || info.thread_metadata?.name?.text || namePart || config.channelName
  config.channelInviteLink = link
  config.channelThumb = null
  config.channelThumbUrl = null

  // Intentar foto
  try {
    const picUrl = info.picture ||
      (info.thread_metadata?.picture?.direct_path
        ? `https://mmg.whatsapp.net${info.thread_metadata.picture.direct_path}`
        : null) ||
      await bot.profilePictureUrl(info.id, 'image').catch(() => null)

    if (picUrl) {
      const buf = await fetchBuffer(picUrl)
      config.channelThumb = buf.toString('base64')
      config.channelThumbUrl = picUrl
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
    `› Foto: ${config.channelThumb ? '✅ Cargada' : '❌ No disponible (usa .seticono)'}\n\n` +
    `_Para persistir al reiniciar, actualiza config.js_`
  )
}

handler.command = ['setchanel', 'setcanal']
handler.tags = ['owner']
handler.owner = true

export default handler