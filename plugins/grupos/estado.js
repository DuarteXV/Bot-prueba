export default {
  name: ["estadogrupo", "gstatus"],
  description: "Sube un estado dentro del grupo",
  category: "grupos",
  groupOnly: true,
  adminOnly: true,

  async run({ sock, from, text, reply }) {
    if (!text) {
      return await reply({ text: "❀ Escribe un texto para el estado del grupo." });
    }

    try {
      await sock.sendMessage(from, {
        text,
        backgroundColor: "#7C3AED",
        font: 5,
        groupStatus: true
      });
    } catch (e) {
      await reply({ text: `❌ No se pudo enviar:\n${e.message}` });
    }
  }
};