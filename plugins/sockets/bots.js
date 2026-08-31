import { db } from "../../database/db.js";
import config from "../../config.js";

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

      const participantLids = new Set(
        metadata.participants
          .map((p) => p.id)
          .filter((id) => id.endsWith("@lid"))
      );

      const participantNums = new Set(
        metadata.participants
          .map((p) => (!p.id.endsWith("@lid") ? limpiarNumero(p.id) : null))
          .filter(Boolean)
      );

      const numeroPrincipal = limpiarNumero(sock.user?.id);
      const nombrePrincipal = obtenerNombre(numeroPrincipal);

      const todosLosBots = db.getAllBots().filter((b) => !b.isMain);

      const estaEnGrupo = (bot) => {
        const num = limpiarNumero(bot.jid || bot.id);
        if (num && participantNums.has(num)) return true;
        if (bot.lid && participantLids.has(bot.lid)) return true;
        return false;
      };

      const subbotsEnGrupo = todosLosBots.filter(estaEnGrupo);

      const principalData = db.getBot(`${numeroPrincipal}@s.whatsapp.net`);
      const principalEnGrupo =
        participantNums.has(numeroPrincipal) ||
        (principalData?.lid && participantLids.has(principalData.lid));

      const participantsMentions = [];

      let report = `•.°· ◇ \`ᒪIՏTᗩ ᗪᗴ ᗷOTՏ ᗩᑕTIᐯOՏ\` ◇ ·°.•\n`;
      report += `〔💎〕Principal: ${nombrePrincipal}\n`;
      report += `〔🌀〕Sub-bots totales: ${todosLosBots.length}\n`;
      report += `〔🌱〕En este grupo: ${subbotsEnGrupo.length}\n\n`;

      if (principalEnGrupo) {
        const jidPrincipal = `${numeroPrincipal}@s.whatsapp.net`;
        participantsMentions.push(jidPrincipal);

        report += `> *𖠌 ʙᴏᴛ::* @${numeroPrincipal} (${nombrePrincipal})\n`;
        report += `> *⚝ ᴛɪᴘᴏ::* Principal 👑\n\n`;
      }

      if (subbotsEnGrupo.length > 0) {
        for (const bot of subbotsEnGrupo) {
          const numero = limpiarNumero(bot.jid || bot.id);
          const nombreSub = obtenerNombre(numero);
          const jidSub = `${numero}@s.whatsapp.net`;

          participantsMentions.push(jidSub);

          report += `> *𖠌 ʙᴏᴛ::* @${numero} (${nombreSub})\n`;
          report += `> *⚝ ᴛɪᴘᴏ::* Sub-bot 🌀\n\n`;
        }
      } else if (!principalEnGrupo) {
        report += `⚠️ No hay ningún bot de este sistema dentro de este grupo.\n\n`;
      }

      report += `🪼 _Powered by DuarteXV_`;

      await sock.sendMessage(
        from,
        {
          text: report,
          mentions: participantsMentions.filter(Boolean)
        },
        { quoted: msg }
      );

      await react("✅");
    } catch (e) {
      console.error(e);
      await react("❌");
      if (reply) {
        await reply({ text: `Failed` });
      }
    }
  }
};