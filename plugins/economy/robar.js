import { db } from "../../database/db.js";
import { checkCooldown, setCooldown, formatTime } from "../../core/economy.js";
import { jidNormalizedUser } from "@whiskeysockets/baileys";

export default {
  name: ["rob", "robar"],
  description: "Intenta robarle plata a otro usuario",
  category: "economia",
  groupOnly: true,

  async run({ sender, msg, reply, resolveLid }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
    let targetRaw = mentioned || quotedParticipant;

    if (!targetRaw) {
      return await reply({ text: "『🔫』Mencioná a quién querés robar. Uso: .robar @usuario" });
    }

    const wasLid = targetRaw.endsWith("@lid");
    if (wasLid) {
      targetRaw = await resolveLid(targetRaw);
    }

    const target = jidNormalizedUser(targetRaw);
    const targetEco = db.getEco(target);

    await reply({
      text: `🐛 *Debug:*\nmentionedJid: ${mentioned}\nquotedParticipant: ${quotedParticipant}\nwasLid: ${wasLid}\ntargetRaw (resuelto): ${targetRaw}\ntarget (final): ${target}\ntargetEco: ${JSON.stringify(targetEco)}`
    });

    if (target === sender) {
      return await reply({ text: "『🔫』No podés robarte a vos mismo, xd." });
    }

    const status = checkCooldown(sender, "rob");
    if (!status.ready) {
      return await reply({ text: `⏳ Estás escondido de la policía. Volvé en *${formatTime(status.remaining)}*.` });
    }

    if ((targetEco.bolsillo || 0) < 100) {
      return await reply({ text: "『🔫』Esa persona no tiene suficiente plata en el bolsillo para robarle." });
    }

    setCooldown(sender, "rob");

    const success = Math.random() < 0.4;
    const targetNum = target.split("@")[0];

    if (success) {
      const amount = Math.floor(targetEco.bolsillo * (Math.random() * 0.3 + 0.1));
      db.setEco(target, { bolsillo: targetEco.bolsillo - amount });
      const senderEco = db.getEco(sender);
      db.setEco(sender, { bolsillo: (senderEco.bolsillo || 0) + amount });

      await reply({
        text: `💸 ¡Le robaste *${amount}* monedas a @${targetNum}!`,
        mentions: [target]
      });
    } else {
      const senderEco = db.getEco(sender);
      const fine = Math.floor(Math.random() * 150) + 50;
      db.setEco(sender, { bolsillo: Math.max(0, (senderEco.bolsillo || 0) - fine) });

      await reply({
        text: `🚔 Te atraparon intentando robar a @${targetNum} y pagaste una multa de *${fine}* monedas.`,
        mentions: [target]
      });
    }
  }
};