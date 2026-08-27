import { checkCooldown, setCooldown, addBolsillo, formatTime } from "../../core/economy.js";

export default {
  name: ["monthly", "mensual"],
  description: "Reclama tu recompensa mensual",
  category: "economy",

  async run({ sender, reply }) {
    const status = checkCooldown(sender, "monthly");
    if (!status.ready) {
      return await reply({ text: `⏳ Ya reclamaste tu mensual. Volvé en *${formatTime(status.remaining)}*.` });
    }

    const amount = Math.floor(Math.random() * 6000) + 4000;
    addBolsillo(sender, amount);
    setCooldown(sender, "monthly");

    await reply({ text: `💰 Reclamaste tu mensual: *+${amount}* monedas.` });
  }
};