import axios from "axios";
import yts from "yt-search";

const API_KEY = process.env.LEMPI_API_KEY;

export default {
  name: ["play", "yta", "ytmp3", "playaudio"],
  description: "Descarga música de YouTube",
  category: 'dl',
  ownerOnly: false,

  async run({ sock, from, msg, text, reply, react }) {
    try {
      if (!text.trim()) {
        return reply({
          text: "⛧ escribe el nombre o link del video",
        });
      }

      await react("🎧");

      const search = await yts(text);

      const yt =
        search.videos?.[0] ||
        search.all?.[0];

      if (!yt) {
        return reply({
          text: "⛧ no encontré resultados",
        });
      }

      const api =
        `https://api.lempi.lat/dl/yta?apikey=${API_KEY}&url=${encodeURIComponent(yt.url)}`;

      const res = await axios.get(api, {
        timeout: 90000,
      });

      const data = res.data;

      if (!data?.status || !data?.datos?.url) {
        return reply({
          text: "⛧ no pude obtener el audio",
        });
      }

      const title = data.titulo;
      const thumbnail = data.miniatura;
      const youtube_url = yt.url;
      const download_url = data.datos.url;
      const calidad = data.datos.calidad || "360p";
      const formato = data.datos.extension?.replace(".", "") || "mp3";
      const fileName = data.datos.archivo || `${title}.${formato}`;

      const vistas = formatViews(yt.views);

      await sock.sendMessage(
        from,
        {
          image: { url: thumbnail },
          caption:
            `⛧ ${title}\n\n` +
            `⛧ vistas › ${vistas}\n` +
            `⛧ duración › ${formatDuration(yt.seconds)}\n` +
            `⛧ calidad › ${calidad}\n` +
            `⛧ formato › ${formato}\n` +
            `⛧ link › ${youtube_url}`
        },
        { quoted: msg }
      );

      const isLongAudio = yt.seconds > 1800; // 30 minutos

      if (isLongAudio) {
        await sock.sendMessage(
          from,
          {
            document: { url: download_url },
            mimetype: "audio/mpeg",
            fileName,
            caption: "⛧ audio enviado como documento por duración/tamaño",
          },
          { quoted: msg }
        );
      } else {
        await sock.sendMessage(
          from,
          {
            audio: { url: download_url },
            mimetype: "audio/mpeg",
            ptt: false,
          },
          { quoted: msg }
        );
      }

      await react("✅");

    } catch (e) {
      console.error(e);

      await react("❌");

      await reply({
        text: `⛧ ${e.message}`,
      });
    }
  },
};

function formatViews(views) {
  if (!views) return "No disponible";

  if (views >= 1e9) {
    return `${(views / 1e9).toFixed(1)}B`;
  }

  if (views >= 1e6) {
    return `${(views / 1e6).toFixed(1)}M`;
  }

  if (views >= 1e3) {
    return `${(views / 1e3).toFixed(1)}k`;
  }

  return views.toString();
}

function formatDuration(duration) {
  if (!duration) return "No disponible";

  if (typeof duration === "string") {
    if (duration.includes(":")) {
      return duration;
    }
    duration = Number(duration);
  }

  if (isNaN(duration)) {
    return "No disponible";
  }

  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = Math.floor(duration % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}