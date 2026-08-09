import { db } from "../../database/db.js";

function cleanJid(jid = "") {
  if (!jid) return "";
  const atIndex = jid.lastIndexOf("@");
  if (atIndex === -1) return jid.split(":")[0];
  const userPart = jid.slice(0, atIndex).split(":")[0];
  const domainPart = jid.slice(atIndex + 1);
  return `${userPart}@${domainPart}`;
}

export default {
  name: ['delwarn', 'unwarn', 'quitarwarn'],
  description: 'Quita una advertencia a un miembro del grupo',
  category: 'grupos',
  groupOnly: true,
  adminOnly: true,

  async run({ sock, from, msg, groupMeta, reply }) {
    try {
      const participants = groupMeta?.participants || []

      const contextInfo = msg.message?.extendedTextMessage?.contextInfo || msg.message?.imageMessage?.contextInfo || msg.message?.videoMessage?.contextInfo
      const mentioned = contextInfo?.mentionedJid || []

      let targetRaw = contextInfo?.participantAlt || contextInfo?.participant || mentioned[0]
      if (!targetRaw) return await reply({ text: `⚠️ Menciona o responde al usuario para quitarle una advertencia.` })

      const cleanTarget = targetRaw.split(':')[0]
      let targetJid = cleanJid(cleanTarget)
      if (cleanTarget.endsWith('@lid')) {
        const match = participants.find(p => p.lid === cleanTarget)
        if (match) targetJid = cleanJid(match.id)
      }

      const groupData = db.getGroup(from) || {}
      const currentWarns = groupData.warns || {}
      const userWarns = currentWarns[targetJid] || []

      if (userWarns.length === 0) {
        return await sock.sendMessage(from, {
          text: `👤 El usuario @${targetJid.split('@')[0]} no tiene advertencias activas en este grupo.`,
          mentions: [targetJid]
        }, { quoted: msg })
      }

      userWarns.pop()
      currentWarns[targetJid] = userWarns
      db.setGroup(from, { ...groupData, warns: currentWarns })

      await sock.sendMessage(from, {
        text: `✅ Se ha removido una advertencia a @${targetJid.split('@')[0]}.\n📊 *Advertencias restantes:* ${userWarns.length}/3`,
        mentions: [targetJid]
      }, { quoted: msg })

    } catch (err) {
      console.error("Error en comando delwarn:", err)
      await reply({ text: "❌ Ocurrió un error interno al ejecutar el comando." })
    }
  }
}