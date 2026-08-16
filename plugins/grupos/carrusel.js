import { generateWAMessageFromContent, prepareWAMessageMedia } from "@whiskeysockets/baileys";

export default {
  name: ["carrusel"],
  description: "Envía un carrusel de prueba con 3 tarjetas",
  category: "owner",
  ownerOnly: true,

  async run({ sock, from, msg, reply }) {
    try {
      const images = [
        "https://cdn.dix.lat/me/ncimkw-c91x-5odrqn-6842d5.jpg",
        "https://cdn.dix.lat/me/8p7b4z-c91x-5tr6q8-7c0b31.jpg",
        "https://cdn.dix.lat/me/c4mk7m-c91x-vxxxsn-78b969.jpg"
      ];

      const cards = [];
      for (let i = 0; i < images.length; i++) {
        const imageMessage = await prepareWAMessageMedia(
          { image: { url: images[i] } },
          { upload: sock.waUploadToServer }
        );

        cards.push({
          header: {
            title: `Tarjeta ${i + 1}`,
            hasMediaAttachment: true,
            imageMessage: imageMessage.imageMessage
          },
          body: { text: `Contenido de la tarjeta ${i + 1}` },
          nativeFlowMessage: {
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
        });
      }

      const content = {
        interactiveMessage: {
          body: { text: "Deslizá para ver más opciones 👉" },
          footer: { text: "Yuta Bot" },
          carouselMessage: {
            cards
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