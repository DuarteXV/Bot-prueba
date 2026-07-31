import { db } from '../../database/db.js'
import { activeBots } from '../../core/subbotManager.js'

function resolveDisplay(numOrJid, groupMeta) {
  const num = numOrJid.split('@')[0]
  const participant = groupMeta?.participants?.find(
    (p) => p.id?.split(':')[0].split('@')[0] === num || p.lid?.split('@')[0] === num
  )
  if (participant?.username) return `@${participant.username}`
  const jid = `${num}@s.whatsapp.net`
  const pushName = db.getPushName(jid)
  if (pushName) return `@${pushName}`
  return `@${num}`
}

export default {
  name: ['delprimary', 'quitarprincipal'],
  description: 'Quita el bot primario del grupo',
  category: 'grupos',
  groupOnly: true,
  adminOnly: true,

  async run({ from, msg, react, reply, botJid, groupMeta }) {
    const primary = db.getPrimary(from)

    if (!primary) {
      return await reply({
        text:
          `⚠️ *Este grupo no tiene bot primario establecido.*\n\n` +
          `💡 Usa *.setprimary* para establecer uno.\n\n` +
          `⚔️ _Yuta Okotsu MD | DuarteXV_`
      })
    }

    const parseNum = (jid) => jid ? jid.split(':')[0].split('@')[0] : null
    const myNum = parseNum(botJid)

    if (myNum !== primary) {
      return;
    }

    if (msg.key.fromMe) {
       return;
    }

    const displayName = resolveDisplay(primary, groupMeta)

    await react('🗑️')
    db.delPrimary(from)

    await reply({
      text:
        `✅ *Bot primario eliminado*\n\n` +
        `🤖 El bot ${displayName} ya no es el principal.\n` +
        `Todos los bots y sub-bots responderán en este grupo ahora.\n\n` +
        `⚔️ _Yuta Okotsu MD | DuarteXV_`
    })
  }
}