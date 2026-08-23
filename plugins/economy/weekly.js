import { checkCooldown, setCooldown, addBolsillo, formatTime } from "../../core/economy.js";

export default {
  name: ["weekly", "semanal"],
  description: "Reclama tu recompensa semanal",
  category: "economia",

  async run({ sender, reply }) {
    const status = checkCooldown(sender, "weekly");
    if (!status.ready) {
      return await reply({ text: `⏳ Ya reclamaste tu semanal. Volvé en *${formatTime(status.remaining)}*.` });
    }

    const amount = Math.floor(Math.random() * 1500) + 1000;
    addBolsillo(sender, amount);
    setCooldown(sender, "weekly");

    await reply({ text: `💰 Reclamaste tu semanal: *+${amount}* monedas.` });
  }
};