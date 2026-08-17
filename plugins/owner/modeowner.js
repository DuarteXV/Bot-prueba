import config from "../../config.js";
import { db } from "../../database/db.js";

export default {
  name: ["modeowner"],
  description: 'Prende o apaga el modo privado usando "on" u "off"',
  category: "owner",
  ownerOnly: true,

  async run({ botJid, args, react, reply }) {
    const accion = args[0]?.toLowerCase();

    if (accion === "on") {
      db.setBot(botJid, { privateMode: true });
      await react("🔒");
      return await reply({
        text: `🔒 *Modo Privado ACTIVADO.*\n\nA partir de ahora, *${config.botName}* ignorará los mensajes de usuarios comunes y grupos. Solo atenderá a los owners.`
      });
    }

    if (accion === "off") {
      db.setBot(botJid, { privateMode: false });
      await react("🔓");
      return await reply({
        text: `🔓 *Modo Privado DESACTIVADO.*\n\nEl bot ha vuelto a la normalidad y responderá a todo el público.`
      });
    }

    await react("❓");
    await reply({ text: `💡 *Uso correcto del comando:*\n• _.modeowner on_ (Para encender)\n• _.modeowner off_ (Para apagar)` });
  }
};