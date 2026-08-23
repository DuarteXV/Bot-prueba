import { checkCooldown, setCooldown, addBolsillo, formatTime } from "../../core/economy.js";

const FRASES_EXITO = [
  "Un señor te dio unas monedas por lástima.",
  "Una viejita te regaló su cambio.",
  "Alguien te tiró plata desde su carro.",
  "Encontraste una moneda en el piso mientras mendigabas."
];

const FRASES_FALLO = [
  "Nadie te dio nada, te ignoraron por completo.",
  "Un guardia te corrió del lugar.",
  "La gente pasó de largo sin mirarte.",
  "Te dijeron \"consíguete un trabajo\" y siguieron caminando."
];

export default {
  name: ["mendigar", "beg"],
  description: "Pide limosna a ver si alguien te da algo",
  category: "economia",

  async run({ sender, reply }) {
    const status = checkCooldown(sender, "mendigar");
    if (!status.ready) {
      return await reply({ text: `⏳ Ya mendigaste hace poco. Volvé en *${formatTime(status.remaining)}*.` });
    }

    setCooldown(sender, "mendigar");

    const success = Math.random() < 0.55;

    if (success) {
      const amount = Math.floor(Math.random() * 80) + 10;
      addBolsillo(sender, amount);
      const frase = FRASES_EXITO[Math.floor(Math.random() * FRASES_EXITO.length)];
      await reply({ text: `🙏 ${frase}\n*+${amount}* monedas.` });
    } else {
      const frase = FRASES_FALLO[Math.floor(Math.random() * FRASES_FALLO.length)];
      await reply({ text: `🙏 ${frase}\nNo ganaste nada esta vez.` });
    }
  }
};