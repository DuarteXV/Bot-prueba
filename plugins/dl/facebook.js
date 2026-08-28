const FB_API_KEY = 'Duarte-zz12';

function validateFacebookUrl(url) {
  let cleaned = url.trim().replace(/[^\x00-\x7F]/g, '');

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
      if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
        cleaned = 'https://' + cleaned;
      }
      return cleaned;
    }
  }

  return null;
}

function formatDuration(seconds) {
  if (!seconds || Number.isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function downloadFacebookVideo(url) {
  const endpoint = `https://api.alyacore.xyz/dl/facebook?url=${encodeURIComponent(url)}&key=${FB_API_KEY}`;

  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

  const data = await response.json();
  if (data.status !== true || !data.resultados?.length) {
    throw new Error('No se encontraron formatos disponibles en la respuesta de la API');
  }

  const formatos = data.resultados;
  const mejorFormato =
    formatos.find((f) => f.quality?.includes('1080p') && f.url !== '/') ||
    formatos.find((f) => f.quality?.includes('720p') && f.url !== '/') ||
    formatos.find((f) => f.quality?.includes('540p') && f.url !== '/') ||
    formatos.find((f) => f.url !== '/');

  if (!mejorFormato) {
    throw new Error('No se encontró un enlace de descarga de video válido');
  }

  let duration = null;
  const match = mejorFormato.url.match(/duration_s%22%3A(\d+)/);
  if (match) duration = parseInt(match[1], 10);

  return {
    videoUrl: mejorFormato.url,
    title: mejorFormato.filename || 'Video de Facebook',
    duration,
  };
}

const facebook = {
  name: 'facebook',
  aliases: ['fb'],
  description: 'Descarga videos de Facebook',
  handler: async ({ sock, chatJid, msg, args }) => {
    if (!args[0]) {
      await sock.sendMessage(
        chatJid,
        { text: 'Uso: *.facebook <link>*\nEjemplo: .facebook https://www.facebook.com/watch?v=1234567890' },
        { quoted: msg }
      );
      return;
    }

    const facebookUrl = validateFacebookUrl(args[0]);
    if (!facebookUrl) {
      await sock.sendMessage(
        chatJid,
        {
          text:
            'URL de Facebook inválida. URLs válidas:\n' +
            '• facebook.com/.../videos/...\n' +
            '• facebook.com/watch?v=...\n' +
            '• facebook.com/reel/...\n' +
            '• facebook.com/share/v/...\n' +
            '• fb.watch/...',
        },
        { quoted: msg }
      );
      return;
    }

    try {
      const result = await downloadFacebookVideo(facebookUrl);
      const caption = `*Video de Facebook*\n\nTítulo: ${result.title}\nDuración: ${formatDuration(result.duration)}`;

      // Baileys hace streaming directo desde la URL, sin bajar el buffer completo primero.
      await sock.sendMessage(
        chatJid,
        { video: { url: result.videoUrl }, mimetype: 'video/mp4', caption },
        { quoted: msg }
      );
    } catch (e) {
      console.error('[facebook]', e);
      await sock.sendMessage(
        chatJid,
        { text: 'No se pudo descargar el video. Verifica que sea público e intenta con otro enlace.' },
        { quoted: msg }
      );
    }
  },
};

export default facebook;