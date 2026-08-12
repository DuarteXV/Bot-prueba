import axios from "axios";

const API_KEY = "Duarte-zz12";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async (fn, attempt = 1) => {
  try {
    return await fn();
  } catch (e) {
    if (e.response?.status === 429 && attempt <= 3) {
      await delay((e.response.headers["retry-after"] || 5) * 1000);
      return withRetry(fn, attempt + 1);
    }
    throw e;
  }
};

const fetchInstagram = (url) =>
  withRetry(async () => {
    const { data } = await axios.get("https://api.alyacore.xyz/dl/instagram", {
      params: { url, key: API_KEY },
    });
    return data;
  });

export default {
  name: ["instagram", "ig", "igdl"],
  description: "Descarga videos/fotos de Instagram (reels, posts)",
  category: "dl",
  groupOnly: false,

  async run({ sock, from, msg, text, usedPrefix, reply, react }) {
    try {
      if (!text) {
        return await reply({
          text: `⚠️ Manda el link de Instagram.\n\n💡 *Uso:* ${usedPrefix || "."}ig <link>`,
        });
      }

      if (!/instagram\.com/.test(text)) {
        return await reply({ text: "❌ Ese no parece un link de Instagram válido." });
      }

      await react("⏳");

      const result = await fetchInstagram(text);

      if (!result.status || !result.data?.dl) {
        await react("❌");
        return await reply({ text: "❌ No se pudo descargar ese contenido. Puede ser privado o el link no es válido." });
      }

      const { data } = result;
      const caption = data.title ? `📥 *Instagram*\n\n${data.title}` : "📥 *Instagram*";

      if (data.type === "video") {
        await sock.sendMessage(
          from,
          { video: { url: data.dl }, caption, mimetype: "video/mp4" },
          { quoted: msg }
        );
      } else {
        await sock.sendMessage(
          from,
          { image: { url: data.dl }, caption },
          { quoted: msg }
        );
      }

      await react("✅");
    } catch (e) {
      console.error("[instagram]", e);
      await react("❌");
      await reply({ text: `❌ Error al descargar: ${e.message}` });
    }
  },
};