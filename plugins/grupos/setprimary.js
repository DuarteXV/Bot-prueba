import { db } from '../../database/db.js'
import { activeBots } from '../../core/subbotManager.js'

function cleanJid(jid = "") {
  if (!jid) return "";
  const atIndex = jid.lastIndexOf("@");
  if (atIndex === -1) return jid.split(":")[0];
  const userPart = jid.slice(0, atIndex).split(":")[0];
  const domainPart = jid.slice(atIndex + 1);
  return `${userPart}@${domainPart}`;
}

export default {
  name: ['setprimary', 'botprincipal'],
  description: 'Establece un bot como primario del grupo',
  category: 'grupos',
  groupOnly: true,
  adminOnly: true,

  async run({ from, msg, react, reply, resolveLid }) {
    const parseNum = (jid) => jid ? jid.split('@')[0] : null

    const quoted = msg.message?.extendedTextMessage?.contextInfo || msg.message?.imageMessage?.contextInfo || msg.message?.videoMessage?.contextInfo

    const quotedRaw = quoted?.participant ? cleanJid(quoted.participant) : null

    let quotedSender = null
    if (quotedRaw) {
      const resolved = await resolveLid(quotedRaw)
      quotedSender = parseNum(cleanJid(resolved))
    }

    if (!quotedSender) {
      const botsActivos = [...activeBots.entries()]
        .filter(([, bot]) => bot.status === 'online')

      let texto = `🤖 *¿A qué bot quieres como primario?*\n\n`
      for (const [, bot] of botsActivos) {
        const num = parseNum(cleanJid(bot.jid)) || 'N/A'
        texto += `  ✦ *${bot.label || 'Sub-Bot'}* → @${num}\n`
      }
      texto += `\n💡 Responde a un mensaje de ese bot y ejecuta *.setprimary* de nuevo.\n\n`
      texto += `⚔️ _Yuta Okotsu MD | DuarteXV_`

      const mentionJids = botsActivos.map(([, bot]) => cleanJid(bot.jid)).filter(Boolean)
      return await reply({ text: texto, mentions: mentionJids })
    }

    const whoNum = quotedSender
    const whoJid = cleanJid(`${whoNum}@s.whatsapp.net`)

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