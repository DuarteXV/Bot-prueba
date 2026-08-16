import { generateWAMessageFromContent, prepareWAMessageMedia } from "@whiskeysockets/baileys";

export default {
  name: ["carrusel"],
  description: "Envía un carrusel de prueba con 3 tarjetas",
  category: "owner",
  ownerOnly: true,

  async run({ sock, from, msg, reply }) {
    await reply({ text: "🐛 1) Entró al comando" });

    try {
      const images = [
        "https://cdn.dix.lat/me/ncimkw-c91x-5odrqn-6842d5.jpg",
        "https://cdn.dix.lat/me/8p7b4z-c91x-5tr6q8-7c0b31.jpg",
        "https://cdn.dix.lat/me/c4mk7m-c91x-vxxxsn-78b969.jpg"
      ];

      await reply({ text: `🐛 2) sock.waUploadToServer existe: ${typeof sock.waUploadToServer}` });

      const cards = [];
      for (let i = 0; i < images.length; i++) {
        await reply({ text: `🐛 3) Subiendo imagen ${i + 1}...` });

        const imageMessage = await prepareWAMessageMedia(
          { image: { url: images[i] } },
          { upload: sock.waUploadToServer }
        );

        await reply({
          text: `🐛 4) imageMessage ${i + 1}:\n\`\`\`${JSON.stringify(imageMessage, null, 2).slice(0, 1000)}\`\`\``
        });

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

      await reply({ text: "🐛 5) Cards armadas, generando mensaje..." });

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

      await reply({ text: "🐛 6) Mensaje generado, mandando con relayMessage..." });

      await sock.relayMessage(from, m.message, { messageId: m.key.id });

      await reply({ text: "🐛 7) relayMessage terminó sin error" });
    } catch (e) {
      await reply({ text: `❌ Error en paso intermedio:\n${e.message}\n\n\`\`\`${e.stack?.slice(0, 800)}\`\`\`` });
    }
  }
};