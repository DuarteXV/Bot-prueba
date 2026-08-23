import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

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

async function descargarBuffer(url) {
  const { data } = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  return Buffer.from(data);
}

async function processVideoForWhatsApp(buffer) {
  const id = crypto.randomBytes(8).toString('hex');
  const inputP = path.join(tmp, `tt_${id}.mp4`);
  const outP = path.join(tmp, `tt_${id}_out.mp4`);
  const passLogP = path.join(tmp, `tt_${id}_pass`);

  fs.writeFileSync(inputP, buffer);

  const MAX_SIZE_MB = 60;
  const sizeMB = buffer.length / (1024 * 1024);

  try {
    if (sizeMB <= MAX_SIZE_MB) {
      await execAsync(`ffmpeg -i "${inputP}" -c copy -movflags +faststart "${outP}" -y`);
      return fs.readFileSync(outP);
    }

    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputP}"`
    );
    const duration = parseFloat(stdout.trim());

    const targetSizeBits = MAX_SIZE_MB * 8 * 1024 * 1024 * 0.92;
    const audioBitrate = 128;
    const videoBitrate = Math.floor(targetSizeBits / duration / 1000) - audioBitrate;

    await execAsync(
      `ffmpeg -i "${inputP}" -c:v libx264 -b:v ${videoBitrate}k -pass 1 -passlogfile "${passLogP}" -an -f null /dev/null -y`
    );
    await execAsync(
      `ffmpeg -i "${inputP}" -c:v libx264 -b:v ${videoBitrate}k -pass 2 -passlogfile "${passLogP}" -preset medium -c:a aac -b:a ${audioBitrate}k -movflags +faststart "${outP}" -y`
    );

    return fs.readFileSync(outP);
  } finally {
    try { fs.unlinkSync(inputP); } catch {}
    try { fs.unlinkSync(outP); } catch {}
    try { fs.unlinkSync(`${passLogP}-0.log`); } catch {}
    try { fs.unlinkSync(`${passLogP}-0.log.mbtree`); } catch {}
  }
}

const MAX_INPUT_MB = 200;

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

    try {
      const result = await downloadTikTokNormal(tiktokUrl);

      if (!result || !result.videoUrl) {
        await react('❌');
        return await reply({ text: `❌ No se pudo descargar el video. El enlace podría ser privado o no válido.` });
      }

      let buffer = await descargarBuffer(result.videoUrl);
      const sizeMB = buffer.length / (1024 * 1024);
      await reply({ text: `🐛 Buffer descargado: ${sizeMB.toFixed(1)}MB` });

      if (sizeMB > MAX_INPUT_MB) {
        await react('❌');
        return await reply({
          text: `❌ El video pesa ${sizeMB.toFixed(0)}MB, demasiado grande para procesar (límite: ${MAX_INPUT_MB}MB).`
        });
      }

      if (sizeMB > 60) {
        await reply({ text: `⏳ El video pesa ${sizeMB.toFixed(0)}MB, comprimiendo antes de enviar (esto puede tardar unos minutos)...` });
      }

      try {
        buffer = await processVideoForWhatsApp(buffer);
        await reply({ text: `🐛 Procesado. Nuevo tamaño: ${(buffer.length / (1024 * 1024)).toFixed(1)}MB` });
      } catch (e) {
        await reply({ text: `🐛 Error procesando: ${e.message}` });
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

      await reply({ text: `🐛 Intentando enviar video final...` });

      await sock.sendMessage(from, {
        video: buffer,
        mimetype: 'video/mp4',
        fileName: 'tiktok.mp4',
        caption
      }, { quoted: msg });

      await reply({ text: `🐛 sendMessage terminó sin tirar error` });

      await react('✅');

    } catch (error) {
      console.error('Error en TikTok download:', error);
      await react('❌');
      await reply({
        text: `❌ Error al procesar la descarga: ${error.message}\n\n🐛 Stack:\n${error.stack?.slice(0, 500)}`
      });
    }
  }
};