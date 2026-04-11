// plugins/owner/setchanel.js
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

  // Paso 1: obtener JID con invite
  const info = await bot.newsletterMetadata('invite', channelCode).catch(() => null)
  if (!info?.id) return reply('❌ No se pudo obtener el JID del canal. Verifica el enlace.')

  // Paso 2: obtener metadata completa con JID real
  const fullInfo = await bot.newsletterMetadata('jid', info.id).catch(() => null)

  await reply(
    `🔍 *Debug fullInfo:*\n\`\`\`${JSON.stringify({
      id: fullInfo?.id,
      name: fullInfo?.name,
      description: fullInfo?.description,
      subscriberCount: fullInfo?.subscriberCount,
      picture: fullInfo?.picture,
    }, null, 2).slice(0, 800)}\`\`\``
  )

  const anteriorLink = config.channelInviteLink
  const anteriorName = config.channelName

  config.channelJid = info.id
  config.channelName = fullInfo?.name || info?.name || config.channelName
  config.channelInviteLink = link
  config.channelThumb = null
  config.channelThumbUrl = null

  try {
    let picUrl = null

    if (fullInfo?.picture?.directPath) {
      picUrl = `https://mmg.whatsapp.net${fullInfo.picture.directPath}`
    }

    if (!picUrl) {
      picUrl = await bot.profilePictureUrl(info.id, 'image').catch(() => null)
    }

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