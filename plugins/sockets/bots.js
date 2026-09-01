import { db } from "../../database/db.js";
import config from "../../config.js";

function cleanJid(jid = "") {
  if (!jid) return "";
  const atIndex = jid.lastIndexOf("@");
  if (atIndex === -1) return jid.split(":")[0];
  const userPart = jid.slice(0, atIndex).split(":")[0];
  const domainPart = jid.slice(atIndex + 1);
  return `${userPart}@${domainPart}`;
}

export default {
  name: ["bots", "listbots"],
  description: "Muestra los bots conectados en el grupo actual",
  category: "sockets",
  groupOnly: true,

  async run({ sock, from, msg, react, reply, groupMeta }) {
    try {
      await react("🤖");

      const limpiarNumero = (jid = "") =>
        jid.split("@")[0].split(":")[0].replace(/\D/g, "");

      const obtenerNombre = (numero) => {
        try {
          const bot = db.getBot(`${numero}@s.whatsapp.net`);
          if (
            bot?.label &&
            bot.label !== "Subbot" &&
            bot.label !== "MAIN" &&
            !bot.label.startsWith("SUB_")
          ) {
            return bot.label;
          }
          return bot?.pushName || bot?.name || config.botName;
        } catch {
          return config.botName;
        }
      };

      const metadata = groupMeta || (await sock.groupMetadata(from));
      const participants = metadata.participants.map((p) => cleanJid(p.id));

      const numeroPrincipal = limpiarNumero(sock.user?.id);
      const nombrePrincipal = obtenerNombre(numeroPrincipal);
      const principalData = db.getBot(`${numeroPrincipal}@s.whatsapp.net`);

      const todosLosBots = db.getAllBots().filter((b) => !b.isMain);

      // Para cada bot conocido (por número o por lid), buscamos su jid REAL tal cual está en el grupo
      const findTarget = (numero, lid) => {
        return metadata.participants.find((p) => {
          const clean = cleanJid(p.id);
          if (!clean.endsWith("@lid")) return clean === `${numero}@s.whatsapp.net`;
          return lid && limpiarNumero(clean) === lid;
        });
      };

      const subbotsEnGrupo = todosLosBots
        .map((bot) => {
          const numero = limpiarNumero(bot.jid || bot.id);
          const target = findTarget(numero, bot.lid);
          return target ? { ...bot, numero, targetJid: cleanJid(target.id) } : null;
        })
        .filter(Boolean);

      const principalTarget = findTarget(numeroPrincipal, principalData?.lid);

      const participantsMentions = [];

      let report = `•.°· ◇ \`ᒪIՏTᗩ ᗪᗴ ᗷOTՏ ᗩᑕTIᐯOՏ\` ◇ ·°.•\n`;
      report += `〔💎〕Principal: ${nombrePrincipal}\n`;
      report += `〔🌀〕Sub-bots totales: ${todosLosBots.length}\n`;
      report += `〔🌱〕En este grupo: ${subbotsEnGrupo.length}\n\n`;

      if (principalTarget) {
        const jidPrincipal = cleanJid(principalTarget.id);
        participantsMentions.push(jidPrincipal);
        report += `> *𖠌 ʙᴏᴛ::* @${numeroPrincipal} (${nombrePrincipal})\n`;
        report += `> *⚝ ᴛɪᴘᴏ::* Principal 👑\n\n`;
      }

      if (subbotsEnGrupo.length > 0) {
        for (const bot of subbotsEnGrupo) {
          const nombreSub = obtenerNombre(bot.numero);
          participantsMentions.push(bot.targetJid);
          report += `> *𖠌 ʙᴏᴛ::* @${bot.numero} (${nombreSub})\n`;
          report += `> *⚝ ᴛɪᴘᴏ::* Sub-bot 🌀\n\n`;
        }
      } else if (!principalTarget) {
        report += `⚠️ No hay ningún bot de este sistema dentro de este grupo.\n\n`;
      }

      report += `🪼 _Powered by DuarteXV_`;

      await sock.sendMessage(
        from,
        { text: report, mentions: participantsMentions.filter(Boolean) },
        { quoted: msg }
      );

      await react("✅");
    } catch (e) {
      console.error(e);
      await react("❌");
      if (reply) await reply({ text: `Failed` });
    }
  }
};