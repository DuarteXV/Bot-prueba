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

function inferirTipoReal(dlUrl) {
  try {
    const u = new URL(dlUrl);
    const token = u.searchParams.get("token");
    if (!token) return null;

    const payload = token.split(".")[1];
    if (!payload) return null;

    const json = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
    const filename = json.filename || "";

    if (/\.(mp4|mov|webm|mkv)$/i.test(filename)) return "video";
    if (/\.(jpe?g|png|webp)$/i.test(filename)) return "image";
    return null;
  } catch {
    return null;
  }
}

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
      const caption = data.title ? `Aquí tienes :D\n\n${data.title}` : "Aquí tienes :D";

      const tipoReal = inferirTipoReal(data.dl) || data.type;

      if (tipoReal === "video") {
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