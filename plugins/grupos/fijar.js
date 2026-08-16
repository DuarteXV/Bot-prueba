import { jidNormalizedUser } from "@whiskeysockets/baileys";

export default {
  name: ["fijar"],
  description: "Fija un mensaje respondiendo a él",
  category: "grupos",
  groupOnly: true,
  adminOnly: true,

  async run({ sock, from, msg, reply, resolveLid }) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo;

    if (!quoted?.stanzaId) {
      return await reply({
        text: "『📌』Rᥱs⍴onძᧉ ⍺Ɩ ᴍᧉn𝗌⍺jᧉ qᥙᧉ qᥙіᧉꭇᧉ𝗌 fіj⍺ꭇ."
      });
    }

    const isFromMe = !quoted.participant || quoted.participant === sock.user?.id;
    let participant = quoted.participant;

    if (!isFromMe && participant) {
      participant = await resolveLid(participant);
    }

    const pinKey = {
      remoteJid: from,
      id: quoted.stanzaId,
      participant: isFromMe ? undefined : participant,
      fromMe: isFromMe
    };

    try {
      await sock.sendMessage(from, {
        pin: pinKey,
        type: 1
      });

      await reply({ text: "『📌』Mensaje fijado." });
    } catch (e) {
      await reply({ text: `❌ No se pudo fijar:\n${e.message}` });
    }
  }
};