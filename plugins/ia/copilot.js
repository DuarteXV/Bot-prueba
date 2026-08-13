import axios from "axios";

const API_KEY = process.env.ALYA_API_KEY;
const API_URL = "https://api.alyacore.xyz/ai/copilot";

export default {
  name: ["copilot", "ai"],
  description: "Conversa con la IA Copilot.",
  category: "ia",
  ownerOnly: false,

  async run({ text, reply, sock, from }) {
    if (!text) {
      return await reply({
        text: `꒰✖️꒱ ᰍ Escrıᑲᧉ tu ⍴ꭇᧉgunt⍺ o mᧉns⍺jᧉ ⍴⍺ꭇ⍺ Copı𝗅oƚ.

⎙ *Ejᧉmp𝗅o:* .copilot ¿cómo está el clima hoy?`
      });
    }

    const sent = await reply({
      text: "> *Copilot está procesando tu petición...*"
    });

    try {
      const url = `${API_URL}?text=${encodeURIComponent(text)}&key=${API_KEY}`;

      const { data } = await axios.get(url, { timeout: 60000 });

      const responseText = data?.result || data?.response || data?.answer || data?.text || data?.message;

      if (!responseText) {
        return await sock.sendMessage(from, {
          text: "❌ No se pudo obtener una respuesta de Copilot.",
          edit: sent.key
        });
      }

      await sock.sendMessage(from, {
        text: responseText,
        edit: sent.key
      });

    } catch (err) {
      console.error("Error en Copilot:", err);

      await sock.sendMessage(from, {
        text: `❌ Error al consultar Copilot.\n\n${err.message}`,
        edit: sent.key
      });
    }
  }
};