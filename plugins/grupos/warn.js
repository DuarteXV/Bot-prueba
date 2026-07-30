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
  name: ['warn', 'advertir'],
  description: 'Advierte a un miembro del grupo',
  category: 'grupos',
  groupOnly: true,
  adminOnly: true,

  async run({ sock, from, msg, groupMeta, args, reply }) {
    try {
      const participants = groupMeta?.participants || []

      const contextInfo = msg.message?.extendedTextMessage?.contextInfo || msg.message?.imageMessage?.contextInfo || msg.message?.videoMessage?.contextInfo
      const mentioned = contextInfo?.mentionedJid || []

      let targetRaw = contextInfo?.participantAlt || contextInfo?.participant || mentioned[0]
      if (!targetRaw) return await reply({ text: `⚠️ Menciona o responde al usuario que deseas advertir.` })

      const cleanTarget = targetRaw.split(':')[0]
      let targetJid = cleanJid(cleanTarget)
      if (cleanTarget.endsWith('@lid')) {
        const match = participants.find(p => p.lid === cleanTarget)
        if (match) targetJid = cleanJid(match.id)
      }

      const targetParticipant = participants.find(p => cleanJid(p.id) === targetJid)
      if (targetParticipant?.admin === 'admin' || targetParticipant?.admin === 'superadmin') {
        return await reply({ text: `❌ No puedes advertir a otro administrador.` })
      }

      const groupData = db.getGroup(from) || {}
      const currentWarns = groupData.warns || {}
      if (!currentWarns[targetJid]) currentWarns[targetJid] = []

      const adminName = msg.pushName || "Admin"
      const razon = args.join(" ") || "No se especificó una razón."
      const targetNum = targetJid.split('@')[0]

      currentWarns[targetJid].push({
        razon,
        fecha: new Date().toLocaleDateString("es-CO"),
        by: adminName,
        targetNum: targetNum
      })

      db.setGroup(from, { ...groupData, warns: currentWarns })

      const totalWarns = currentWarns[targetJid].length

      let texto = `⚠️ *¡USUARIO ADVERTIDO!* ⚠️\n\n`
      texto += `👤 *Usuario:* @${targetNum}\n`
      texto += `👮‍♂️ *Por:* ${adminName}\n`
      texto += `📝 *Razón:* ${razon}\n`
      texto += `📊 *Advertencias:* ${totalWarns}/3\n\n`

      if (totalWarns >= 3) {
        texto += `❗ *Nota:* Este usuario ha alcanzado el límite de 3 advertencias.`
      }

      await sock.sendMessage(from, {
        text: texto,
        mentions: [targetJid]
      }, { quoted: msg })

    } catch (err) {
      console.error("Error en comando warn:", err)
      await reply({ text: "❌ Ocurrió un error interno al ejecutar el comando." })
    }
  }
}