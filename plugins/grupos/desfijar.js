import { jidNormalizedUser } from "@whiskeysockets/baileys";

export default {
  name: ["desfijar"],
  description: "Desfija un mensaje respondiendo a él",
  category: "grupos",
  groupOnly: true,
  adminOnly: true,

  async run({ sock, from, msg, reply }) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo;

    if (!quoted?.stanzaId) {
      return await reply({
        text: "『📌』Rᥱs⍴onძᧉ ⍺Ɩ ᴍᧉn𝗌⍺jᧉ qᥙᧉ qᥙіᧉꭇᧉ𝗌 ძᧉ𝗌fіj⍺ꭇ."
      });
    }

    try {
      await sock.sendMessage(from, {
        pin: {
          type: 2,
          key: {
            remoteJid: from,
            id: quoted.stanzaId,
            participant: jidNormalizedUser(quoted.participant),
            fromMe: false
          }
        }
      });

      await reply({ text: "『📌』Mensaje desfijado." });
    } catch (e) {
      await reply({ text: `❌ No se pudo desfijar:\n${e.message}` });
    }
  }
};