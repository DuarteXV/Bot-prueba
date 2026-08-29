import { db } from "../../database/db.js";
import { ITEMS } from "../../core/gamedata.js";

function getPersonajes(jid) {
  const user = db.getUser(jid);
  return user.personajes || {};
}

export default {
  name: ["equipar", "equip"],
  description: "Equipa un arma o armadura a un personaje",
  category: "economy",

  async run({ sender, args, reply, react }) {
    const itemId = args[0]?.toLowerCase();
    const personajeId = args[1]?.toLowerCase();

    if (!itemId || !personajeId) {
      return await reply({
        text: `⚠️ *Uso:* .equipar <item> <personaje>\n\n*Ejemplo:* .equipar katana_maldita gojo`
      });
    }

    const item = ITEMS[itemId];
    if (!item) {
      return await reply({ text: "❌ Item no encontrado.\n\n> Usá *.tienda* para ver los items." });
    }

    const misPersonajes = getPersonajes(sender);
    const personaje = misPersonajes[personajeId];
    if (!personaje) {
      return await reply({ text: "❌ No tenés ese personaje.\n\n> Usá *.comprarpersonaje* para comprarlo." });
    }

    const eco = db.getEco(sender);
    if (!eco.inventario.includes(itemId)) {
      return await reply({ text: "❌ No tenés ese item en tu inventario.\n\n> Usá *.comprar* para comprarlo." });
    }

    if (item.restriccion && item.restriccion !== personajeId) {
      return await reply({
        text: `🔒 *${item.nombre}* es exclusivo de *${item.restriccion}*, no se lo podés poner a este personaje.`
      });
    }

    personaje[item.tipo] = itemId;
    misPersonajes[personajeId] = personaje;
    db.setUser(sender, { personajes: misPersonajes });

    await react("✅");
    await reply({
      text: `✅ Equipaste *${item.nombre}* a tu personaje.\n\n*Slot:* ${item.tipo}\n*Poder del item:* +${item.poder}`
    });
  }
};