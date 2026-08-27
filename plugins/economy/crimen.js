import { db } from "../../database/db.js";
import { checkCooldown, setCooldown, formatTime } from "../../core/economy.js";

const CRIMENES_EXITO = [
  "Robaste una tienda y escapaste sin que nadie te viera.",
  "Le hackeaste la cuenta a un banco y sacaste una parte.",
  "Vendiste productos falsificados sin que te descubrieran.",
  "Estafaste a un turista despistado."
];

const CRIMENES_FALLO = [
  "Intentaste robar una tienda pero saltó la alarma y te atraparon.",
  "La policía te agarró vendiendo productos falsos.",
  "Tu estafa fue tan mala que la víctima llamó a la policía.",
  "Te descubrieron las cámaras de seguridad."
];

export default {
  name: ["crimen", "crime"],
  description: "Cometé un crimen random, con riesgo de multa",
  category: "economy",

  async run({ sender, reply }) {
    const status = checkCooldown(sender, "crimen");
    if (!status.ready) {
      return await reply({ text: `⏳ Estás escondido de la ley. Volvé en *${formatTime(status.remaining)}*.` });
    }

    setCooldown(sender, "crimen");

    const success = Math.random() < 0.5;
    const eco = db.getEco(sender);

    if (success) {
      const amount = Math.floor(Math.random() * 400) + 150;
      db.setEco(sender, { bolsillo: (eco.bolsillo || 0) + amount });
      const frase = CRIMENES_EXITO[Math.floor(Math.random() * CRIMENES_EXITO.length)];
      await reply({ text: `🔫 ${frase}\n*+${amount}* monedas.` });
    } else {
      const fine = Math.floor(Math.random() * 250) + 100;
      db.setEco(sender, { bolsillo: Math.max(0, (eco.bolsillo || 0) - fine) });
      const frase = CRIMENES_FALLO[Math.floor(Math.random() * CRIMENES_FALLO.length)];
      await reply({ text: `🚔 ${frase}\nPagaste una multa de *${fine}* monedas.` });
    }
  }
};