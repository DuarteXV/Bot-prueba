export default {
  name: ["reload"],
  description: "Reinicia la sesión de este bot (reconexión rápida, ~1-2 segundos)",
  category: "owner",
  ownerOnly: true,

  async run({ sock, reply, react, botLabel }) {
    await react("🔄");
    await reply({ text: `🔄 Recargando sesión de *${botLabel}*, vuelvo en un momento...` });

    try {
      const { clearSocketFiles } = await import("../../core/connection.js");
      if (sock.sessionDir) {
        await clearSocketFiles(sock.sessionDir);
      }
    } catch (e) {
      console.error("[reload] Error limpiando sesión:", e.message);
    }

    setTimeout(() => {
      try {
        sock.end(new Error("Reload manual solicitado"));
      } catch (e) {
        console.error("[reload] Error cerrando socket:", e.message);
      }
    }, 500);
  },
};