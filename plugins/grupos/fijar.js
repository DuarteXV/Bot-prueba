import { jidNormalizedUser, generateWAMessageFromContent, proto } from "@whiskeysockets/baileys";
import { randomBytes } from "crypto";

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

    try {
      const content = {
        messageContextInfo: {
          messageSecret: randomBytes(32),
          messageAddOnDurationInSecs: time
        },
        pinInChatMessage: {
          key: pinKey,
          type: proto.Message.PinInChatMessage.Type.PIN_FOR_ALL,
          senderTimestampMs: Date.now()
        }
      };

      await reply({
        text: `🐛 *content antes de generar:*\n\`\`\`${JSON.stringify(content, null, 2)}\`\`\``
      });

      const m = generateWAMessageFromContent(from, content, { userJid: sock.user.id });

      await reply({
        text: `🐛 *m.message después de generar:*\n\`\`\`${JSON.stringify(m.message, null, 2)}\`\`\``
      });

      await sock.relayMessage(from, m.message, { messageId: m.key.id });

      await reply({
        text: `『📌』Mensaje fijado por ${durArg && DURATIONS[durArg] ? durArg : "24h"}.`
      });
    } catch (e) {
      await reply({
        text: `❌ No se pudo fijar:\n${e.message}\n\n🐛 *Stack:*\n\`\`\`${e.stack}\`\`\``
      });
    }
  }
};