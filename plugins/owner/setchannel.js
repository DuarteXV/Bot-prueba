// plugins/owner/setchanel.js
import config from '../../config.js'
import { fetchBuffer } from '../../lib/utils.js'

function extractChannelInfo(node) {
  try {
    const result = node?.content?.[0]?.content?.toString()
    if (!result) return null
    const parsed = JSON.parse(result)
    const meta = parsed?.data?.xwa2_newsletter_metadata || parsed?.data?.newsletter
    if (!meta) return null
    const getUrl = (p) => p ? `https://mmg.whatsapp.net${p}` : ''
    return {
      id: meta?.id,
      name: meta?.thread_metadata?.name?.text,
      description: meta?.thread_metadata?.description?.text,
      picture: getUrl(meta?.thread_metadata?.picture?.direct_path || ''),
      subscribers: +meta?.thread_metadata?.subscribers_count,
    }
  } catch {
    return null
  }
}

const handler = async ({ bot, reply, text }) => {
  if (!text) {
    return reply(
      `❌ Uso: *.setchanel <link> | <nombre>*\n\n` +
      `› Canal actual: ${config.channelInviteLink || 'No configurado'}\n` +
      `› Nombre actual: ${config.channelName || 'No configurado'}\n\n` +
      `Ejemplo: .setchanel https://whatsapp.com/channel/XXXXXX | Blue Lock Club\n` +
      `_El nombre es opcional si el canal lo devuelve automáticamente_`
    )
  }

  const [linkPart, namePart] = text.split('|').map(s => s.trim())

  const channelCode = linkPart?.match(/(?:https?:\/\/)?(?:whatsapp\.com\/channel\/)([0-9A-Za-z@.]+)/i)?.[1]
  if (!channelCode) return reply('❌ Link inválido. Debe ser un canal de WhatsApp.')

  await reply('⏳ Obteniendo información del canal...')

  const info = await bot.newsletterMetadata('invite', channelCode).catch(() => null)
  if (!info?.id) return reply('❌ No se pudo obtener el JID. Verifica el enlace.')

  // Intentar extraer nombre y foto del node raw
  const extracted = extractChannelInfo(info)

  const anteriorLink = config.channelInviteLink
  const anteriorName = config.channelName

  config.channelJid = info.id
  config.channelName = namePart || extracted?.name || config.channelName
  config.channelInviteLink = linkPart
  config.channelThumb = null
  config.channelThumbUrl = null

  // Intentar foto
  try {
    const picUrl = extracted?.picture ||
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