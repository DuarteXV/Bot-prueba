export default {
  name: ["estadogrupal"],
  description: "Sube un estado visible solo para los miembros del grupo",
  category: "grupos",
  groupOnly: true,
  adminOnly: true,

  async run({ sock, from, groupMeta, text, reply }) {
    if (!text) {
      return await reply({ text: "❀ Escribe un texto para el estado." });
    }

    try {
      const participants = groupMeta?.participants || (await sock.groupMetadata(from)).participants;

      const statusJidList = participants
        .map((p) => p.id)
        .filter((jid) => jid !== sock.user?.id && !jid.endsWith("@lid"));

      await sock.sendMessage(
        "status@broadcast",
        { text },
        {
          backgroundColor: "#7C3AED",
          font: 2,
          statusJidList,
          broadcast: true
        }
      );

      await reply({ text: `『⭐』Estado enviado a ${statusJidList.length} miembros del grupo.` });
    } catch (e) {
      await reply({ text: `❌ No se pudo enviar el estado:\n${e.message}` });
    }
  }
};