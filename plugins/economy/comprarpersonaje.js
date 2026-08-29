import { db } from "../../database/db.js";
import { PERSONAJES } from "../../core/gamedata.js";
import { Button, Carousel } from "@whiskeysockets/baileys";

function getPersonajes(jid) {
  const user = db.getUser(jid);
  return user.personajes || {};
}

export default {
  name: ["buychar"],
  description: "Compra un personaje de Jujutsu Kaisen",
  category: "economy",

  async run({ sock, from, msg, sender, args, reply, react, usedPrefix }) {
    const personajeId = args[0]?.toLowerCase();

    // ── Confirmar compra si vino con argumento (desde el botón del carrusel) ──
    if (personajeId) {
      const personaje = PERSONAJES[personajeId];
      if (!personaje) {
        return await reply({ text: "❌ Personaje no encontrado." });
      }

      const misPersonajes = getPersonajes(sender);
      if (misPersonajes[personajeId]) {
        return await reply({ text: `❌ Ya tenés a *${personaje.nombre}*.` });
      }

      const eco = db.getEco(sender);
      if (eco.bolsillo < personaje.precio) {
        const faltante = personaje.precio - eco.bolsillo;
        return await reply({
          text:
            `❌ No tenés suficientes Fragmentos.\n\n` +
            `*Precio:* ${personaje.precio.toLocaleString()} Fragmentos\n` +
            `*Bolsillo:* ${eco.bolsillo.toLocaleString()} Fragmentos\n` +
            `*Te faltan:* ${faltante.toLocaleString()} Fragmentos`
        });
      }

      misPersonajes[personajeId] = { nivel: 1, xp: 0, arma: null, armadura: null };
      db.setEco(sender, { bolsillo: eco.bolsillo - personaje.precio });
      db.setUser(sender, { personajes: misPersonajes });

      await react("✅");
      return await reply({
        text:
          `✅ *¡Compraste a ${personaje.nombre}!*\n\n` +
          `*Precio pagado:* ${personaje.precio.toLocaleString()} Fragmentos\n` +
          `*Bolsillo restante:* ${(eco.bolsillo - personaje.precio).toLocaleString()} Fragmentos\n\n` +
          `> Usá *.equipar <item> ${personajeId}* para darle equipo`
      });
    }

    // ── Sin argumento: mostrar el carrusel de personajes ──
    try {
      const cards = [];

      for (const [id, personaje] of Object.entries(PERSONAJES)) {
        const cardButton = new Button(sock)
          .setTitle(personaje.nombre)
          .setBody(
            `Generación: ${personaje.generacion === "new_gen" ? "New Gen" : "Old Gen"}\n` +
            `Precio: ${personaje.precio.toLocaleString()} Fragmentos`
          )
          .setImage(personaje.imagen)
          .addReply(`Comprar ${personaje.nombre}`, `${usedPrefix}comprarpersonaje ${id}`);

        cards.push(await cardButton.toCard());
      }

      const carousel = new Carousel(sock)
        .setBody("⚔️ Elegí el personaje que querés comprar 👉")
        .setFooter("Yuta Bot RPG")
        .addCard(cards);

      await carousel.send(from, { quoted: msg });
    } catch (e) {
      console.error(e);
      await reply({ text: `❌ Error mostrando el carrusel:\n${e.message}` });
    }
  }
};