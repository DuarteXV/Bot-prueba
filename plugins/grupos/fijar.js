import { jidNormalizedUser } from "@whiskeysockets/baileys";

const DURATIONS = {
  "24h": 86400,
  "7d": 604800,
  "30d": 2592000
};

export default {
  name: ["fijar"],
  description: "Fija un mensaje respondiendo a él",
  category: "grupos",
  groupOnly: true,
  adminOnly: true,

  async run({ sock, from, msg, args, reply }) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo;

    if (!quoted?.stanzaId) {
      return await reply({
        text: "『📌』Rᥱs⍴onძᧉ ⍺Ɩ ᴍᧉn𝗌⍺jᧉ qᥙᧉ qᥙіᧉꭇᧉ𝗌 fіj⍺ꭇ."
      });
    }

    const durArg = args[0]?.toLowerCase();
    const time = DURATIONS[durArg] || DURATIONS["24h"];

    try {
      await sock.sendMessage(from, {
        pin: {
          type: 1,
          time,
          key: {
            remoteJid: from,
            id: quoted.stanzaId,
            participant: jidNormalizedUser(quoted.participant),
            fromMe: false
          }
        }
      });

      await reply({
        text: `『📌』Mensaje fijado por ${durArg && DURATIONS[durArg] ? durArg : "24h"}.`
      });
    } catch (e) {
      await reply({
        text: `❌ No se pudo fijar:\n${e.message}`
      });
    }
  }
};