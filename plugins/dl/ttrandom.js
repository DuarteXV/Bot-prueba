import axios from "axios";

const QUERIES = [
  "story wa",
  "story sad",
  "video fun",
  "story wa galau",
  "story wa sindiran",
  "story wa bahagia",
  "story wa lirik lagu overlay",
  "story wa lirik lagu",
  "video viral"
];

async function tiktokRandom(query) {
  const response = await axios({
    method: "POST",
    url: "https://tikwm.com/api/feed/search",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Cookie": "current_language=en",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
    },
    data: {
      keywords: query,
      count: 10,
      cursor: 0,
      HD: 1
    }
  });

  const videos = response.data?.data?.videos;
  if (!videos?.length) {
    throw new Error("No se encontraron videos.");
  }

  const video = videos[Math.floor(Math.random() * videos.length)];

  return {
    title: video.title,
    cover: video.cover,
    origin_cover: video.origin_cover,
    no_watermark: video.play,
    watermark: video.wmplay,
    music: video.music
  };
}

export default {
  name: ["ttrandom", "tiktokrandom"],
  description: "Descarga un TikTok aleatorio",
  category: "dl",

  async run({ sock, from, msg, reply }) {
    await reply({ text: "⏳ Buscando un video..." });

    try {
      const query = QUERIES[Math.floor(Math.random() * QUERIES.length)];
      const result = await tiktokRandom(query);

      await sock.sendMessage(
        from,
        {
          video: { url: result.no_watermark },
          caption: result.title || ""
        },
        { quoted: msg }
      );
    } catch (e) {
      await reply({ text: `❌ Error: ${e.message}` });
    }
  }
};