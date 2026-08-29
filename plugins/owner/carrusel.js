import { Button, Carousel } from "@whiskeysockets/baileys";

export default {
  name: ["carrusel"],
  description: "Envía un carrusel de prueba con 3 tarjetas",
  category: "owner",
  ownerOnly: true,

  async run({ sock, from, msg, reply }) {
    try {
      const images = [
        "https://picsum.photos/seed/1/400/400",
        "https://picsum.photos/seed/2/400/400",
        "https://picsum.photos/seed/3/400/400"
      ];

      const cards = [];
      for (let i = 0; i < images.length; i++) {
        const cardButton = new Button(sock)
          .setTitle(`Tarjeta ${i + 1}`)
          .setBody(`Contenido de la tarjeta ${i + 1}`)
          .setImage(images[i])
          .addReply(`Opción ${i + 1}`, `card_${i + 1}`);

        cards.push(await cardButton.toCard());
      }

      const carousel = new Carousel(sock)
        .setBody("Deslizá para ver más opciones 👉")
        .setFooter("Yuta Bot")
        .addCard(cards);

      await carousel.send(from, { quoted: msg });
    } catch (e) {
      console.error(e);
      await reply({ text: `❌ Error:\n${e.message}` });
    }
  }
};