import { db } from '../../database/db.js'
import { activeBots } from '../../core/subbotManager.js'

export default {
  name: ['setprimary', 'botprincipal'],
  description: 'Establece un bot como primario del grupo',
  category: 'grupos',
  groupOnly: true,
  adminOnly: true,

  async run({ from, msg, react, reply, groupMeta }) {
    const parseJid = (jid) => jid ? jid.split(':')[0].split('@')[0] : null

    const quoted = msg.message?.extendedTextMessage?.contextInfo || msg.message?.imageMessage?.contextInfo || msg.message?.videoMessage?.contextInfo

    const quotedRaw = quoted?.participant || null

    let quotedSender = null
    if (quotedRaw) {
      const cleanRaw = quotedRaw.split(':')[0]
      if (cleanRaw.endsWith('@lid') && groupMeta?.participants) {
        const match = groupMeta.participants.find(p => p.lid === cleanRaw)
        quotedSender = match ? parseJid(match.id) : parseJid(cleanRaw)
      } else {
        quotedSender = parseJid(cleanRaw)
      }
    }

    if (!quotedSender) {
      const botsActivos = [...activeBots.entries()]
        .filter(([, bot]) => bot.status === 'online')

      let texto = `🤖 *¿A qué bot quieres como primario?*\n\n`
      for (const [, bot] of botsActivos) {
        const num = parseJid(bot.jid) || 'N/A'
        texto += `  ✦ *${bot.label || 'Sub-Bot'}* → @${num}\n`
      }
      texto += `\n💡 Responde a un mensaje de ese bot y ejecuta *.setprimary* de nuevo.\n\n`
      texto += `⚔️ _Yuta Okotsu MD | DuarteXV_`

      return await reply({
        text: texto,
        mentions: botsActivos.map(([, bot]) => bot.jid).filter(Boolean)
      })
    }

    const whoNum = quotedSender
    const whoJid = `${whoNum}@s.whatsapp.net`

    const current = db.getPrimary(from)
    if (current === whoNum) {
      return;
    }

    db.setPrimary(from, whoNum)

    await react('✅')
    await reply({
      text:
        `✅ *Bot primario establecido*\n\n` +
        `🤖 @${whoNum} es ahora el bot principal.\n` +
        `Los demás bots no responderán en este grupo.\n\n` +
        `⚔️ _Yuta Okotsu MD | DuarteXV_`,
      mentions: [whoJid]
    })
  }
}