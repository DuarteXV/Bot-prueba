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

    const isFromMe = !quoted.participant || quoted.participant === sock.user?.id;
    const pinKey = {
      remoteJid: from,
      id: quoted.stanzaId,
      participant: isFromMe ? undefined : jidNormalizedUser(quoted.participant),
      fromMe: isFromMe
    };

    await reply({
      text: `🐛 *Debug pin:*\n\`\`\`${JSON.stringify({ pinKey, time }, null, 2)}\`\`\``
    });

    try {
      const result = await sock.sendMessage(from, {
        pin: {
          type: 1,
          time,
          key: pinKey
        }
      });

      await reply({
        text: `『📌』Mensaje fijado por ${durArg && DURATIONS[durArg] ? durArg : "24h"}.\n\n🐛 *Resultado envío:*\n\`\`\`${JSON.stringify(result, null, 2)}\`\`\``
      });
    } catch (e) {
      await reply({
        text: `❌ No se pudo fijar:\n${e.message}\n\n🐛 *Stack:*\n\`\`\`${e.stack}\`\`\``
      });
    }
  }
};