export default {
  name: ["estadogrupal"],
  description: "Sube un estado visible solo para los miembros del grupo (morado)",
  category: "grupos",
  groupOnly: true,
  adminOnly: true,

  async run({ sock, from, groupMeta, text, reply, resolveLid }) {
    if (!text) {
      return await reply({ text: "❀ Escribe un texto para el estado." });
    }

    try {
      const participants = groupMeta?.participants || (await sock.groupMetadata(from)).participants;

      const resolved = await Promise.all(
        participants.map(async (p) => {
          if (p.id.endsWith("@lid")) {
            return await resolveLid(p.id);
          }
          return p.id;
        })
      );

      const statusJidList = [...new Set(resolved)]
        .filter((jid) => jid && jid !== sock.user?.id && !jid.endsWith("@lid"));

      if (!statusJidList.length) {
        return await reply({ text: "❌ No se pudo resolver el número real de ningún miembro." });
      }

      await sock.sendMessage(
        "status@broadcast",
        {
          text,
          contextInfo: {
            statusAudienceMetadata: {
              audienceType: 1 // CLOSE_FRIENDS
            }
          }
        },
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