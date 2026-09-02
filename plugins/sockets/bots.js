import { db } from "../../database/db.js";
import config from "../../config.js";
import { jidNormalizedUser, isLidUser } from "@whiskeysockets/baileys";

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

      const metadata = groupMeta || (await sock.groupMetadata(from));

      const findTarget = (numero, lid) => {
        return metadata.participants.find((p) => {
          const clean = jidNormalizedUser(p.id);
          if (!isLidUser(clean)) return clean === `${numero}@s.whatsapp.net`;
          return lid && limpiarNumero(clean) === lid;
        });
      };

      const mainData = db.getAllBots().find((b) => b.isMain);
      const numeroPrincipal = mainData ? limpiarNumero(mainData.jid || mainData.id) : null;

      const todosLosBots = db.getAllBots().filter((b) => !b.isMain);

      const subbotsEnGrupo = todosLosBots
        .map((bot) => {
          const numero = limpiarNumero(bot.jid || bot.id);
          const target = findTarget(numero, bot.lid);
          return target ? { ...bot, numero, targetJid: jidNormalizedUser(target.id) } : null;
        })
        .filter(Boolean);

      const principalTarget = numeroPrincipal ? findTarget(numeroPrincipal, mainData?.lid) : null;

      const participantsMentions = [];

      let report = `•.°· ◇ \`ᒪIՏTᗩ ᗪᗴ ᗷOTՏ ᗩᑕTIᐯOՏ\` ◇ ·°.•\n`;
      report += `〔💎〕Principal: ${config.botName}\n`;
      report += `〔🌀〕Sub-bots totales: ${todosLosBots.length}\n`;
      report += `〔🌱〕En este grupo: ${subbotsEnGrupo.length}\n\n`;

      if (principalTarget) {
        const jidPrincipal = jidNormalizedUser(principalTarget.id);
        const digitosVisibles = jidPrincipal.split("@")[0];
        participantsMentions.push(jidPrincipal);
        report += `> *𖠌 ʙᴏᴛ::* @${digitosVisibles}\n`;
        report += `> *⚝ ᴛɪᴘᴏ::* Principal 👑\n\n`;
      }

      if (subbotsEnGrupo.length > 0) {
        for (const bot of subbotsEnGrupo) {
          const digitosVisibles = bot.targetJid.split("@")[0];
          participantsMentions.push(bot.targetJid);
          report += `> *𖠌 ʙᴏᴛ::* @${digitosVisibles}\n`;
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