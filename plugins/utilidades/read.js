import { downloadMediaMessage } from "@whiskeysockets/baileys";

export default {
  name: ["readviewonce", "read", "readvo", "ver"],
  description: "Descarga y muestra el contenido de un mensaje ViewOnce",
  category: "utilidades",
  ownerOnly: false,

  async run({ sock, from, msg, reply }) {
    const contextInfo =
      msg.message?.extendedTextMessage?.contextInfo ||
      msg.message?.imageMessage?.contextInfo ||
      msg.message?.videoMessage?.contextInfo;

    const quotedMessage = contextInfo?.quotedMessage;

    if (!quotedMessage) {
      return reply({
        text: "Responde a un mensaje ViewOnce."
      });
    }

    const message =
      quotedMessage.viewOnceMessageV2?.message ||
      quotedMessage.viewOnceMessage?.message ||
      quotedMessage.viewOnceMessageV2Extension?.message ||
      quotedMessage;

    const media =
      message.imageMessage ||
      message.videoMessage ||
      message.audioMessage ||
      message.documentMessage ||
      message.stickerMessage;

    if (!media) {
      return reply({
        text: "Responde a un mensaje ViewOnce."
      });
    }

    await sock.sendMessage(from, {
      react: {
        text: "🕒",
        key: msg.key
      }
    });

    try {
      const buffer = await downloadMediaMessage(
        {
          key: {
            remoteJid: from,
            id: contextInfo.stanzaId,
            participant: contextInfo.participant
          },
          message: quotedMessage
        },
        "buffer",
        {}
      );

      if (message.imageMessage) {
        await sock.sendMessage(from, {
          image: buffer,
          caption: message.imageMessage.caption || ""
        });
      } else if (message.videoMessage) {
        await sock.sendMessage(from, {
          video: buffer,
          caption: message.videoMessage.caption || ""
        });
      } else if (message.audioMessage) {
        await sock.sendMessage(from, {
          audio: buffer,
          mimetype: message.audioMessage.mimetype || "audio/mpeg"
        });
      } else if (message.documentMessage) {
        await sock.sendMessage(from, {
          document: buffer,
          fileName: message.documentMessage.fileName || "file",
          mimetype:
            message.documentMessage.mimetype ||
            "application/octet-stream"
        });
      } else if (message.stickerMessage) {
        await sock.sendMessage(from, {
          sticker: buffer
        });
      }

      await sock.sendMessage(from, {
        react: {
          text: "✅",
          key: msg.key
        }
      });
    } catch (e) {
      await sock.sendMessage(from, {
        react: {
          text: "❌",
          key: msg.key
        }
      });

      await reply({
        text: `❌ Error: ${e.message}`
      });
    }
  }
};