import { downloadMediaMessage } from "@whiskeysockets/baileys";

export default {
  name: ["readviewonce", "read", "readvo", "ver"],
  description: "Descarga y muestra el contenido de un mensaje ViewOnce",
  category: "tools",
  ownerOnly: false,

  async run({ sock, from, msg, reply }) {
    const quoted =
      msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted) {
      return reply({
        text: "Responde a un mensaje ViewOnce."
      });
    }

    const message =
      quoted.viewOnceMessageV2?.message ||
      quoted.viewOnceMessage?.message ||
      quoted;

    const isViewOnce =
      quoted.viewOnceMessageV2 ||
      quoted.viewOnceMessage ||
      message?.viewOnceMessageV2 ||
      message?.viewOnceMessage;

    if (!isViewOnce) {
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
      let type;
      let media;
      let caption = "";

      if (message.imageMessage) {
        type = "imageMessage";
        media = message.imageMessage;
        caption = media.caption || "";
      } else if (message.videoMessage) {
        type = "videoMessage";
        media = message.videoMessage;
        caption = media.caption || "";
      } else if (message.audioMessage) {
        type = "audioMessage";
        media = message.audioMessage;
      } else if (message.documentMessage) {
        type = "documentMessage";
        media = message.documentMessage;
        caption = media.caption || "";
      } else if (message.stickerMessage) {
        type = "stickerMessage";
        media = message.stickerMessage;
      } else {
        throw new Error("Tipo de archivo no soportado");
      }

      const buffer = await downloadMediaMessage(
        {
          key: msg.key,
          message: {
            [type]: media
          }
        },
        "buffer",
        {}
      );

      if (type === "imageMessage") {
        await sock.sendMessage(from, {
          image: buffer,
          caption
        });
      } else if (type === "videoMessage") {
        await sock.sendMessage(from, {
          video: buffer,
          caption
        });
      } else if (type === "audioMessage") {
        await sock.sendMessage(from, {
          audio: buffer,
          mimetype: media.mimetype || "audio/mpeg"
        });
      } else if (type === "documentMessage") {
        await sock.sendMessage(from, {
          document: buffer,
          fileName: media.fileName || "file.bin",
          mimetype: media.mimetype || "application/octet-stream",
          caption
        });
      } else if (type === "stickerMessage") {
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