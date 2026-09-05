import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = path.join(__dirname, '../../tmp');

if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });

function validateTikTokUrl(url) {
  if (!url) return null;
  const regex = /^(https?:\/\/)?(www\.|vm\.|vt\.)?tiktok\.com\/[\w\d@?=&/.-]+/i;
  const match = url.match(regex);
  return match ? match[0] : null;
}

async function downloadTikTokNormal(url) {
  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;

    const { data } = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.tikwm.com/',
        'Origin': 'https://www.tikwm.com'
      },
      timeout: 15000
    });

    if (data.code === 0 && data.data && data.data.play) {
      const d = data.data;

      return {
        videoUrl: d.play,
        title: d.title,
        authorNick: d.author?.nickname || 'Desconocido',
        likes: d.digg_count,
        shares: d.share_count,
        downloads: d.download_count,
        comments: d.comment_count
      };
    }
    throw new Error('No video data found');
  } catch (error) {
    throw new Error(`TikWM API error: ${error.message}`);
  }
}

async function descargarAArchivo(url, destPath) {
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 60000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  await pipeline(response.data, fs.createWriteStream(destPath));
}

async function processVideoFile(inputP, outP) {
  const MAX_SIZE_MB = 60; // techo de seguridad de tamaño
  const originalSizeMB = fs.statSync(inputP).size / (1024 * 1024);

  if (originalSizeMB <= MAX_SIZE_MB) {
    // Remux puro: cero pérdida de calidad/resolución/fps, solo arregla timestamps
    // (bug de duración incorrecta en fuentes VFR, típico de TikTok en alto fps).
    await execAsync(
      `ffmpeg -y -fflags +genpts -i "${inputP}" -c copy -avoid_negative_ts make_zero -movflags +faststart "${outP}"`
    );
    return;
  }

  const { stdout: fpsRaw } = await execAsync(
    `ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of default=noprint_wrappers=1:nokey=1 "${inputP}"`
  );
  const fps = fpsRaw.trim();

  // Sistema híbrido: CRF (calidad constante, resolución intacta, sin "-vf scale")
  // con reintentos subiendo el CRF solo si el resultado sigue pesando más del techo.
  // CRF 20 = prácticamente indistinguible del original a simple vista.
  const crfSteps = [20, 22, 24, 26, 28];

  for (let i = 0; i < crfSteps.length; i++) {
    const crf = crfSteps[i];

    await execAsync(
      `ffmpeg -y -fflags +genpts -i "${inputP}" -r ${fps} -threads 0 ` +
      `-c:v libx264 -preset veryfast -crf ${crf} ` +
      `-c:a aac -b:a 128k -avoid_negative_ts make_zero -movflags +faststart "${outP}"`
    );

    const outSizeMB = fs.statSync(outP).size / (1024 * 1024);

    if (outSizeMB <= MAX_SIZE_MB || i === crfSteps.length - 1) {
      return; // aceptamos el resultado: o ya cabe, o es el último intento posible
    }
    // si sigue pesando de más, sube el CRF y vuelve a intentar (más compresión,
    // ligerísima pérdida extra de calidad, pero solo si de verdad es necesario)
  }
}

const MAX_INPUT_MB = 500;

export default {
  name: ['tiktok', 'tt'],
  description: 'Descarga videos de TikTok rápido',
  category: 'dl',
  groupOnly: false,

  async run({ sock, from, msg, args, usedPrefix, cmdName, reply, react }) {
    if (!args[0]) {
      return await reply({
        text: `🎵 Por favor, ingresa un enlace de TikTok.\n\n📝 *Ejemplo:* ${usedPrefix}${cmdName} https://www.tiktok.com/@usuario/video/1234567890`
      });
    }

    const tiktokUrl = validateTikTokUrl(args[0]);
    if (!tiktokUrl) {
      return await reply({
        text: `❌ URL de TikTok inválida. Por favor verifica el enlace.\n\n✅ *URLs válidas:*\n• https://www.tiktok.com/@usuario/video/...\n• https://vm.tiktok.com/...\n• https://vt.tiktok.com/...`
      });
    }

    await react('🔄');
    await reply({ text: `> ✎...Descargando video.` });

    const id = crypto.randomBytes(8).toString('hex');
    const inputP = path.join(tmp, `tt_${id}.mp4`);
    const outP = path.join(tmp, `tt_${id}_out.mp4`);

    try {
      const result = await downloadTikTokNormal(tiktokUrl);

      if (!result || !result.videoUrl) {
        await react('❌');
        return await reply({ text: `❌ No se pudo descargar el video. El enlace podría ser privado o no válido.` });
      }

      await descargarAArchivo(result.videoUrl, inputP);

      const sizeMB = fs.statSync(inputP).size / (1024 * 1024);

      if (sizeMB > MAX_INPUT_MB) {
        await react('❌');
        fs.unlinkSync(inputP);
        return await reply({
          text: `❌ El video pesa ${sizeMB.toFixed(0)}MB, demasiado grande para procesar (límite: ${MAX_INPUT_MB}MB).`
        });
      }

      if (sizeMB > 60) {
        await reply({ text: `⏳ El video pesa ${sizeMB.toFixed(0)}MB, comprimiendo antes de enviar...` });
      }

      let finalPath = inputP;
      try {
        await processVideoFile(inputP, outP);
        finalPath = outP;
      } catch (e) {
        console.error('No se pudo procesar el video, se manda el original:', e.message);
      }

      const titulo = result.title?.trim() || 'Sin título';

      let caption = `☑ *Video de TikTok descargado*\n`;
      caption += `─╮\n`;
      caption += `   ╰━━━━━━(☆)━━━━━━─╮\n`;
      caption += `*👤 ᴀᴜᴛᴏʀ:* ${result.authorNick || 'Desconocido'}\n`;
      caption += `*♡ ʟɪᴋᴇs:* ${result.likes ?? 'N/A'}\n`;
      caption += `*⌲ sʜᴀʀᴇ:* ${result.shares ?? 'N/A'}\n`;
      caption += `*⎙ sᴀᴠᴇ:* ${result.downloads ?? 'N/A'}\n`;
      caption += `*○ ᴄᴏᴍᴍᴇɴᴛ:* ${result.comments ?? 'N/A'}\n`;
      caption += `*📹 ᴛɪᴛᴜʟᴏ:* ${titulo}`;

      await sock.sendMessage(from, {
        video: { url: finalPath },
        mimetype: 'video/mp4',
        fileName: 'tiktok.mp4',
        caption
      }, { quoted: msg });

      await react('✅');

    } catch (error) {
      console.error('Error en TikTok download:', error);
      await react('❌');
      await reply({
        text: `❌ Error al procesar la descarga: ${error.message}`
      });
    } finally {
      try { fs.unlinkSync(inputP); } catch {}
      try { fs.unlinkSync(outP); } catch {}
    }
  }
};