import config from "../../config.js";
import { db } from "../../database/db.js";

export default {
  name: ["modeowner"],
  description: 'Prende o apaga el modo privado del grupo usando "on" u "off"',
  category: "owner",
  groupOnly: true,
  ownerOnly: true,

  async run({ from, args, react, reply }) {
    const accion = args[0]?.toLowerCase();

    if (accion === "on") {
      db.setGroup(from, { privateMode: true });
      await react("🔒");
      return await reply({
        text: `🔒 *Modo Privado ACTIVADO en este grupo.*\n\nA partir de ahora, *${config.botName}* ignorará los mensajes de usuarios comunes en este grupo. Solo atenderá a los owners.`
      });
    }

    if (accion === "off") {
      db.setGroup(from, { privateMode: false });
      await react("🔓");
      return await reply({
        text: `🔓 *Modo Privado DESACTIVADO en este grupo.*\n\nEl bot ha vuelto a la normalidad y responderá a todo el público.`
      });
    }

    await react("❓");
    await reply({ text: `💡 *Uso correcto del comando:*\n• _.modeowner on_ (Para encender)\n• _.modeowner off_ (Para apagar)` });
  }
};