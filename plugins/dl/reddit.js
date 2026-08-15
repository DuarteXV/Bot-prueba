import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
};

async function getPostData(redditUrl) {
  const jsonUrl = `${redditUrl.split("?")[0].replace(/\/$/, "")}.json`;
  const res = await fetch(jsonUrl, { headers: HEADERS });
  if (!res.ok) throw new Error(`Reddit devolvió HTTP ${res.status}`);
  const data = await res.json();
  return data[0].data.children[0].data;
}

function getVideoUrl(post) {
  const media = post.secure_media || post.media;
  if (!media?.reddit_video) {
    throw new Error("ese post no tiene un video de reddit (v.redd.it)");
  }
  return media.reddit_video.fallback_url.split("?")[0];
}

function guessAudioUrl(videoUrl) {
  // el audio vive aparte (formato DASH); si algún día falla, hay que
  // revisar <base>/DASHPlaylist.mpd para sacar el nombre real
  const base = videoUrl.slice(0, videoUrl.lastIndexOf("/"));
  return `${base}/DASH_audio.mp4`;
}

async function urlExists(url) {
  const res = await fetch(url, { method: "HEAD", headers: HEADERS });
  return res.ok;
}

async function downloadToFile(url, filePath) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(filePath));
}

function mergeAudioVideo(videoPath, audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", ["-y", "-i", videoPath, "-i", audioPath, "-c", "copy", outputPath]);
    ff.on("error", reject);
    ff.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg salió con código ${code}`))
    );
  });
}

export default {
  name: ["reddit", "rdl", "redditdl", "rvid"],
  description: "Descarga videos de Reddit con audio",
  category: "dl",
  ownerOnly: false,
  async run({ sock, from, msg, text, reply, react }) {
    const tmpDir = path.join(tmpdir(), "reddit-dl");
    const id = randomUUID();
    const videoPath = path.join(tmpDir, `${id}_video.mp4`);
    const audioPath = path.join(tmpDir, `${id}_audio.mp4`);
    const outputPath = path.join(tmpDir, `${id}_final.mp4`);

    try {
      if (!text?.trim()) {
        return reply({
          text: "⛧ pasame el link de un post de reddit con video",
        });
      }
      if (!/reddit\.com|redd\.it/.test(text)) {
        return reply({
          text: "⛧ eso no parece un link de reddit",
        });
      }

      await react("🎬");
      await mkdir(tmpDir, { recursive: true });

      const post = await getPostData(text.trim());
      const videoUrl = getVideoUrl(post);
      const audioUrl = guessAudioUrl(videoUrl);

      await downloadToFile(videoUrl, videoPath);

      let finalPath = videoPath;
      if (await urlExists(audioUrl)) {
        await downloadToFile(audioUrl, audioPath);
        await mergeAudioVideo(videoPath, audioPath, outputPath);
        finalPath = outputPath;
      }

      const title = post.title || "Video de Reddit";
      const subreddit = post.subreddit_name_prefixed || "";
      const author = post.author ? `u/${post.author}` : "";
      const permalink = `https://reddit.com${post.permalink}`;

      await sock.sendMessage(
        from,
        {
          video: { url: finalPath },
          caption:
            `⛧ ${title}\n\n` +
            (subreddit ? `⛧ subreddit › ${subreddit}\n` : "") +
            (author ? `⛧ autor › ${author}\n` : "") +
            `⛧ link › ${permalink}`,
        },
        { quoted: msg }
      );

      await react("✅");
    } catch (e) {
      console.error(e);
      await react("❌");
      await reply({ text: `⛧ ${e.message}` });
    } finally {
      await Promise.allSettled([unlink(videoPath), unlink(audioPath), unlink(outputPath)]);
    }
  },
};