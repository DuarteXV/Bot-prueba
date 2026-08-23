import { db } from "../../database/db.js";
import { checkCooldown, setCooldown, addBolsillo, formatTime } from "../../core/economy.js";

export default {
  name: ["daily", "diario"],
  description: "Reclama tu recompensa diaria",
  category: "economia",

  async run({ sender, reply }) {
    const status = checkCooldown(sender, "daily");
    if (!status.ready) {
      return await reply({ text: `⏳ Ya reclamaste tu diario. Volvé en *${formatTime(status.remaining)}*.` });
    }

    const amount = Math.floor(Math.random() * 300) + 200;
    addBolsillo(sender, amount);
    setCooldown(sender, "daily");

    await reply({ text: `💰 Reclamaste tu diario: *+${amount}* monedas.` });
  }
};