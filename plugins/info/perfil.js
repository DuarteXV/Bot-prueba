import { xpProgress } from "../../core/xp.js";
import { db } from "../../database/db.js";

const FALLBACK_PHOTO = "https://cdn.dix.lat/me/0b0v_20260828-c91x-qz9u-550c.jpg";

export default {
  name: ["perfil", "profile"],
  description: "Muestra tu perfil: foto, monedas y XP",
  category: "economy",

  async run({ sock, sender, from, msg, reply }) {
    const user = db.getUser(sender);
    const eco = db.getEco(sender);
    const { level, xp, missing } = xpProgress(user.xp || 0);

    let photoUrl = FALLBACK_PHOTO;
    try {
      photoUrl = await sock.profilePictureUrl(sender, "image");
    } catch {
      // Sin foto o privacidad restringida: se usa la foto de respaldo
    }

    const total = eco.bolsillo + eco.banco;
    const mention = `@${sender.split("@")[0]}`;

    const caption =
      `𓂃ෆ˚ 🍮 ⍴ᥱr𝖿іᥣ ძᥱ ${mention} ౨ৎ\n\n` +
      `𓂃ෆ˚ 🍮 m᥆ᥒᥱძᥲs ${total} [ᑲ᥆ᥣsіᥣᥣ᥆: ${eco.bolsillo} | ᑲᥲᥒᥴ᥆: ${eco.banco}]\n` +
      `⏤͟͟͞͞  ⚡ ᥒі᥎ᥱᥣ: ${level}\n` +
      `𓂃ෆ˚ *᥊⍴:* ${xp} [𝖿ᥲᥣ𝗍ᥲᥒ ${missing} ⍴ᥲrᥲ ᥒі᥎ᥱᥣ${level + 1}]`;

    try {
      await sock.sendMessage(
        from,
        { image: { url: photoUrl }, caption, mentions: [sender] },
        { quoted: msg }
      );
    } catch (error) {
      await reply({ text: `Error al mostrar el perfil: ${error.message}` });
      console.error("Error en perfil:", error);
    }
  }
};