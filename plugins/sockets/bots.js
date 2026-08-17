import { db } from "../../database/db.js";
import config from "../../config.js";
import fs from "fs";

export default {
  name: ["bots", "listbots"],
  description: "Muestra los bots conectados en el grupo actual",
  category: "sockets",
  groupOnly: true,

  async run({ sock, from, msg, react, reply, groupMeta, resolveLid }) {
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

      // 1. Participantes del grupo actual, resolviendo LIDs a número real
      const metadata = groupMeta || (await sock.groupMetadata(from));

      const participantesGrupo = await Promise.all(
        metadata.participants.map(async (p) => {
          let jid = p.id;
          if (jid.endsWith("@lid")) {
            jid = await resolveLid(jid);
          }
          return limpiarNumero(jid);
        })
      );

      // 2. Datos del bot Principal
      const todosLosBots = db.getAllBots ? db.getAllBots() : [];
      const registroMain = todosLosBots.find((b) => (b.isMain === true || b.isMain === 1) && b.jid);

      const numeroPrincipal = registroMain
        ? limpiarNumero(registroMain.jid)
        : (global.mainBotNum || limpiarNumero(sock?.user?.id));

      const nombrePrincipal = obtenerNombre(numeroPrincipal);

      // 3. Obtener el total global y filtrar los del grupo
      const subbotsDir = "./sessions/subbots";
      let todosLosSubbots = [];
      let subbotsEnGrupo = [];

      if (fs.existsSync(subbotsDir)) {
        todosLosSubbots = fs
          .readdirSync(subbotsDir, { withFileTypes: true })
          .filter((dir) => dir.isDirectory())
          .map((dir) => dir.name)
          .filter((name) => name.startsWith("sub_"))
          .map((name) => name.replace("sub_", ""))
          .filter((numero) => numero !== numeroPrincipal);

        subbotsEnGrupo = todosLosSubbots.filter((numero) => participantesGrupo.includes(numero));
      }

      const participantsMentions = [];

      let report = `•.°· ◇ \`ᒪIՏTᗩ ᗪᗴ ᗷOTՏ ᗩᑕTIᐯOՏ\` ◇ ·°.•\n`;
      report += `〔💎〕Principal: ${nombrePrincipal}\n`;
      report += `〔🌀〕Sub-bots: ${todosLosSubbots.length}\n`;
      report += `〔🌱〕En este grupo: ${subbotsEnGrupo.length}\n\n`;

      if (participantesGrupo.includes(numeroPrincipal)) {
        const jidPrincipal = `${numeroPrincipal}@s.whatsapp.net`;
        participantsMentions.push(jidPrincipal);

        report += `> *𖠌 ʙᴏᴛ::* @${numeroPrincipal} (${nombrePrincipal})\n`;
        report += `> *⚝ ᴛɪᴘᴏ::* Principal 👑\n\n`;
      }

      if (subbotsEnGrupo.length > 0) {
        for (const numero of subbotsEnGrupo) {
          const nombreSub = obtenerNombre(numero);
          const jidSub = `${numero}@s.whatsapp.net`;

          participantsMentions.push(jidSub);

          report += `> *𖠌 ʙᴏᴛ::* @${numero} (${nombreSub})\n`;
          report += `> *⚝ ᴛɪᴘᴏ::* Sub-bot 🌀\n\n`;
        }
      } else if (!participantesGrupo.includes(numeroPrincipal)) {
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