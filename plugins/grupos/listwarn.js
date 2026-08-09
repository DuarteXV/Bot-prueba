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
  name: ['listwarn', 'listawarn', 'warns'],
  description: 'Muestra la lista de advertencias del grupo',
  category: 'grupos',
  groupOnly: true,
  adminOnly: true,

  async run({ sock, from, msg, reply }) {
    try {
      const groupData = db.getGroup(from) || {};
      const currentWarns = groupData.warns || {};

      const users = Object.entries(currentWarns)
        .filter(([_, warns]) => Array.isArray(warns) && warns.length > 0);

      if (users.length === 0) {
        return await reply({
          text: `📋 *LISTA DE ADVERTENCIAS*\n\n✅ No hay usuarios con advertencias activas en este grupo.`
        });
      }

      let texto = `📋 *LISTA DE ADVERTENCIAS*\n`;
      texto += `━━━━━━━━━━━━━━━━━━\n\n`;

      const mentions = [];

      users.forEach(([jid, warns], index) => {
        const cleanJidUser = cleanJid(jid);
        const number = warns[0]?.targetNum || cleanJidUser.split('@')[0];

        mentions.push(cleanJidUser);

        texto += `👤 *${index + 1}. @${number}*\n`;
        texto += `📊 *Advertencias:* ${warns.length}/3\n`;

        warns.forEach((warn, warnIndex) => {
          texto += `\n   ⚠️ *Warn #${warnIndex + 1}*\n`;
          texto += `   📝 *Razón:* ${warn.razon || "No especificada"}\n`;
          texto += `   📅 *Fecha:* ${warn.fecha || "Desconocida"}\n`;
          texto += `   👮‍♂️ *Por:* ${warn.by || "Desconocido"}\n`;
        });

        texto += `\n━━━━━━━━━━━━━━━━━━\n\n`;
      });

      texto += `👥 *Usuarios advertidos:* ${users.length}`;

      await sock.sendMessage(
        from,
        {
          text: texto,
          mentions
        },
        { quoted: msg }
      );

    } catch (err) {
      console.error("Error en comando listwarn:", err);

      await reply({
        text: "❌ Ocurrió un error interno al ejecutar el comando."
      });
    }
  }
};