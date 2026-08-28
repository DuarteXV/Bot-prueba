import axios from "axios";

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function validateFacebookUrl(url) {
  let cleaned = url.trim().replace(/[^\x00-\x7F]/g, "");

  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?facebook\.com\/.+\/videos\/\d+/,
    /(?:https?:\/\/)?(?:www\.)?facebook\.com\/watch\/?\?v=\d+/,
    /(?:https?:\/\/)?(?:www\.)?facebook\.com\/reel\/\d+/,
    /(?:https?:\/\/)?fb\.watch\/[A-Za-z0-9_-]+/,
    /(?:https?:\/\/)?(?:m\.)?facebook\.com\/.+\/videos\/\d+/,
    /(?:https?:\/\/)?(?:www\.)?facebook\.com\/share\/[rv]\/[A-Za-z0-9_-]+/,
  ];

  for (const pattern of patterns) {
    if (pattern.test(cleaned)) {
      if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
        cleaned = "https://" + cleaned;
      }
      return cleaned;
    }
  }

  return null;
}

async function downloadFacebookVideo(url) {
  const res = await axios.get("https://api.alyacore.xyz/dl/facebook", {
    params: { url, key: "Duarte-zz12" },
    timeout: 25000
  });

  const data = res.data;

  if (!data.status || !Array.isArray(data.resultados) || !data.resultados.length) {
    throw new Error("No se encontraron formatos disponibles en la respuesta de la API");
  }

  const formatos = data.resultados;
  const mejorFormato =
    formatos.find(f => f.quality?.includes("1080p") && f.url !== "/") ||
    formatos.find(f => f.quality?.includes("720p") && f.url !== "/") ||
    formatos.find(f => f.quality?.includes("540p") && f.url !== "/") ||
    formatos.find(f => f.url !== "/");

  if (!mejorFormato) {
    throw new Error("No se encontró un enlace de descarga de video válido");
  }

  return {
    videoUrl: decodeHtmlEntities(mejorFormato.url)
  };
}

export default {
  name: ["facebook", "fb"],
  description: "Descarga videos de Facebook",
  category: "dl",
  ownerOnly: false,

  async run({ sock, from, msg, text, usedPrefix, react, reply }) {
    try {
      if (!text) {
        return await reply({
          text: `Debes ingresar un enlace de Facebook.\n\nUso: ${usedPrefix}facebook https://www.facebook.com/watch?v=1234567890`
        });
      }

      const facebookUrl = validateFacebookUrl(text);
      if (!facebookUrl) {
        return await reply({
          text:
            `URL de Facebook inválida.\n\n` +
            `URLs válidas:\n` +
            `• facebook.com/.../videos/...\n` +
            `• facebook.com/watch?v=...\n` +
            `• facebook.com/reel/...\n` +
            `• facebook.com/share/v/...\n` +
            `• fb.watch/...`
        });
      }

      await react("⏳");

      const result = await downloadFacebookVideo(facebookUrl);

      // Stream directo por URL, sin bajar el buffer ni reencodear.
      await sock.sendMessage(
        from,
        { video: { url: result.videoUrl }, mimetype: "video/mp4", caption: "Aquí tienes :D" },
        { quoted: msg }
      );

      await react("✅");

    } catch (error) {
      await react("❌");
      await reply({ text: `Error: ${error.message}` });
      console.error("Error en facebook:", error);
    }
  }
};