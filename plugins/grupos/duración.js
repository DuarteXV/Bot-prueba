const DURATIONS = {
  off: 0,
  "24h": 86400,
  "7d": 604800,
  "90d": 7776000
};

export default {
  name: ["efimero", "temporal"],
  description: "Configura la duración de mensajes temporales del grupo",
  category: "grupos",
  groupOnly: true,
  adminOnly: true,

  async run({ sock, from, args, reply }) {
    const opcion = args[0]?.toLowerCase();

    if (!DURATIONS.hasOwnProperty(opcion)) {
      return await reply({
        text: "『⏳』*Uso:* .efimero off/24h/7d/90d\n\n*Ejemplo:* .efimero 7d"
      });
    }

    try {
      await sock.groupToggleEphemeral(from, DURATIONS[opcion]);
      await reply({
        text: opcion === "off"
          ? "『⏳』Mensajes temporales desactivados."
          : `『⏳』Mensajes temporales activados: ${opcion}.`
      });
    } catch (e) {
      await reply({ text: `❌ No se pudo cambiar:\n${e.message}` });
    }
  }
};