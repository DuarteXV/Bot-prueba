import { requestSubbotCode, activeBots } from "../../core/subbotManager.js";
import { jidNormalizedUser } from "@whiskeysockets/baileys";

const cooldowns = new Map();

export default {
  name: ["code"],
  description: "Vincula tu número como subbot",
  category: "sockets",
  ownerOnly: false,

  async run({ sock, from, sender, react, reply, msg, resolveLid, args }) {
    await react("🔑");

    let resolved = jidNormalizedUser(sender);

    if (resolved.endsWith("@lid")) {
      resolved = await resolveLid(resolved);
    }

    let phone = resolved.endsWith("@lid") ? "" : resolved.split("@")[0].replace(/\D/g, "");

    // Fallback manual: si no se pudo detectar automáticamente (username sin contacto),
    // el usuario puede pasar su número directamente: .code 5215512345678
    if (!phone && args?.[0]) {
      const manual = args[0].replace(/\D/g, "");
      if (manual.length >= 8) phone = manual;
    }

    if (!phone || phone.length < 8) {
      return await reply({
        text:
          `⚠️ No pude detectar tu número automáticamente (esto pasa si tienes activado un *nombre de usuario* de WhatsApp y no me tienes en tus contactos).\n\n` +
          `Escribe tu número con código de país así: *.code 5215512345678*`
      });
    }

    const id = `sub_${phone}`;

    if (activeBots.has(id) && activeBots.get(id).status === "online") {
      return await reply({
        text: `⚠️ Tu número ya está vinculado como subbot.\nUsa *.delbot* para desvincularlo.`
      });
    }

    if (cooldowns.has(phone)) {
      const diff = Date.now() - cooldowns.get(phone);
      const restante = Math.ceil((60000 - diff) / 1000);
      if (diff < 60000) {
        return await reply({
          text: `🌾 Ya pediste un código recientemente.\nEspera *${restante} segundos* antes de pedir otro.`
        });
      }
    }

    cooldowns.set(phone, Date.now());

    await reply({
      text:
        `⚔️ *VINCULACIÓN DE SUBBOT*\n\n` +
        `📋 *Instrucciones:*\n` +
        ` ✦ Abre WhatsApp en tu teléfono\n` +
        ` ✦ Ve a *Dispositivos vinculados*\n` +
        ` ✦ Toca *Vincular dispositivo*\n` +
        ` ✦ Toca *Vincular con número de teléfono*\n` +
        ` ✦ Ingresa el código que recibirás ahora\n` +
        ` ✦ Tienes *60 segundos* antes de que expire\n\n` +
        `⏳ _Generando código..._`
    });

    try {
      const code = await requestSubbotCode(id, phone, sock, from);
      await sock.sendMessage(from, { text: `${code}` }, { quoted: msg });
      await react("✅");
    } catch (e) {
      cooldowns.delete(phone);
      await react("❌");
      await reply({ text: `❌ Error generando código:\n${e.message}` });
    }
  }
};