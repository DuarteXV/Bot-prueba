import axios from "axios";

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

function formatDuration(seconds) {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
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

  let duration = null;
  const match = mejorFormato.url.match(/duration_s%22%3A(\d+)/);
  if (match) duration = parseInt(match[1], 10);

  return {
    videoUrl: mejorFormato.url,
    quality: mejorFormato.quality,
    title: mejorFormato.filename || "Video de Facebook",
    duration
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
          text:
            `✨ ═══ 🫧 *FACEBOOK* 🫧 ═══ ✨\n\n` +
            `❌ Debes ingresar un enlace de Facebook.\n\n` +
            `💡 *Uso:*\n` +
            `  ✦ ${usedPrefix}facebook https://www.facebook.com/watch?v=1234567890\n\n` +
            `⚔️ _Yuta Okotsu MD | DuarteXV_`
        });
      }

      const facebookUrl = validateFacebookUrl(text);
      if (!facebookUrl) {
        return await reply({
          text:
            `✨ ═══ 🫧 *FACEBOOK* 🫧 ═══ ✨\n\n` +
            `❌ URL de Facebook inválida.\n\n` +
            `✅ *URLs válidas:*\n` +
            `• facebook.com/.../videos/...\n` +
            `• facebook.com/watch?v=...\n` +
            `• facebook.com/reel/...\n` +
            `• facebook.com/share/v/...\n` +
            `• fb.watch/...\n\n` +
            `⚔️ _Yuta Okotsu MD | DuarteXV_`
        });
      }

      await react("⏳");
      await reply({ text: `> ✎...Descargando video de Facebook.` });

      const result = await downloadFacebookVideo(facebookUrl);

      const caption =
        `✨ ═══ 🫧 *FACEBOOK* 🫧 ═══ ✨\n\n` +
        `📹 *Título:* ${result.title}\n` +
        `🎞️ *Calidad:* ${result.quality}\n` +
        `⏱️ *Duración:* ${formatDuration(result.duration)}\n\n` +
        `⚔️ _Yuta Okotsu MD | DuarteXV_`;

      // Stream directo por URL, sin bajar el buffer ni reencodear.
      await sock.sendMessage(
        from,
        { video: { url: result.videoUrl }, mimetype: "video/mp4", caption },
        { quoted: msg }
      );

      await react("✅");

    } catch (error) {
      await react("❌");
      await reply({
        text:
          `✨ ═══ 🫧 *FACEBOOK* 🫧 ═══ ✨\n\n` +
          `❌ *Error:* ${error.message}\n\n` +
          `⚔️ _Yuta Okotsu MD | DuarteXV_`
      });
      console.error("Error en facebook:", error);
    }
  }
};