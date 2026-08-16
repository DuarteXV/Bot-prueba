import { generateWAMessageFromContent, prepareWAMessageMedia } from "@whiskeysockets/baileys";

const IMAGES = [
  "https://cdn.dix.lat/me/ncimkw-c91x-5odrqn-6842d5.jpg",
  "https://cdn.dix.lat/me/8p7b4z-c91x-5tr6q8-7c0b31.jpg",
  "https://cdn.dix.lat/me/c4mk7m-c91x-vxxxsn-78b969.jpg"
];

export default {
  name: ["carrusel"],
  description: "Envía un carrusel de prueba con 3 tarjetas",
  category: "owner",
  ownerOnly: true,

  async run({ sock, from, msg, reply }) {
    try {
      const cards = await Promise.all(
        IMAGES.map(async (url, i) => {
          const { imageMessage } = await prepareWAMessageMedia(
            { image: { url } },
            { upload: sock.waUploadToServer }
          );

          return {
            header: { title: `Tarjeta ${i + 1}`, hasMediaAttachment: true, imageMessage },
            body: { text: `Contenido de la tarjeta ${i + 1}` },
            footer: { text: "Yuta Bot" },
            nativeFlowMessage: {
              messageVersion: 1,
              buttons: [
                {
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: `Opción ${i + 1}`,
                    id: `card_${i + 1}`
                  })
                }
              ]
            }
          };
        })
      );

      const m = generateWAMessageFromContent(
        from,
        {
          viewOnceMessage: {
            message: {
              messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
              interactiveMessage: {
                body: { text: "Deslizá para ver más opciones 👉" },
                footer: { text: "Yuta Bot" },
                carouselMessage: { messageVersion: 1, cards }
              }
            }
          }
        },
        { quoted: msg, userJid: sock.user.id }
      );

      await sock.relayMessage(from, m.message, { messageId: m.key.id });
    } catch (e) {
      console.error(e);
      await reply({ text: `❌ Error:\n${e.message}` });
    }
  }
};