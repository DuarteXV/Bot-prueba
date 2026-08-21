import { randomUUID } from "crypto";
import { generateWAMessageFromContent, proto } from "@whiskeysockets/baileys";

export default {
  name: ["testtabla"],
  description: "Prueba de tabla estilo Meta AI",
  category: "owner",
  ownerOnly: true,

  async run({ sock, from, msg, reply }) {
    try {
      const rows = [
        ["Usuario", "Mensajes", "Nivel"],
        ["Fulano", "1200", "5"],
        ["Mengano", "800", "3"]
      ];

      const data = Buffer.from(JSON.stringify({
        response_id: randomUUID(),
        sections: [
          {
            view_model: {
              primitive: {
                headers: rows[0],
                rows: rows.slice(1),
                __typename: "GenAITablePrimitive"
              },
              __typename: "GenAISingleLayoutViewModel"
            }
          }
        ]
      })).toString("base64");

      const content = {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2,
          botMetadata: {
            pluginMetadata: {},
            messageDisclaimerText: "Prueba de tabla"
          }
        },
        botForwardedMessage: {
          message: {
            richResponseMessage: {
              messageType: proto.AIRichResponseMessageType.AI_RICH_RESPONSE_TYPE_STANDARD,
              submessages: [],
              unifiedResponse: { data },
              contextInfo: {
                isForwarded: true,
                forwardingScore: 1,
                forwardedAiBotMessageInfo: { botJid: "0@bot" },
                forwardOrigin: proto.ContextInfo.ForwardOrigin.META_AI
              }
            }
          }
        }
      };

      const m = generateWAMessageFromContent(from, content, { quoted: msg, userJid: sock.user.id });
      await sock.relayMessage(from, m.message, { messageId: m.key.id });
    } catch (e) {
      console.error(e);
      await reply({ text: `❌ Error:\n${e.message}` });
    }
  }
};