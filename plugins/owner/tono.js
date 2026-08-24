const SAMPLE_RATE = 44100;
const DURACION_DEFAULT = 5;
const FRECUENCIA_MIN = 20;
const FRECUENCIA_MAX = 20000;

export default {
  name: ["tono", "frecuencia", "hz"],
  description: "Genera un tono puro en una frecuencia (Hz) específica",
  category: "tools",
  ownerOnly: true,

  async run({ sock, from, msg, text, reply, react }) {
    try {
      if (!text.trim()) {
        return reply({
          text: "⛧ escribe la frecuencia en Hz, ej: !tono 400\n⛧ también puedes indicar duración: !tono 400 8",
        });
      }

      const partes = text.trim().split(/\s+/);
      const frecuencia = Number(partes[0]);
      const duracion = partes[1] ? Number(partes[1]) : DURACION_DEFAULT;

      if (isNaN(frecuencia) || frecuencia < FRECUENCIA_MIN || frecuencia > FRECUENCIA_MAX) {
        return reply({
          text: `⛧ frecuencia inválida, usa un valor entre ${FRECUENCIA_MIN} y ${FRECUENCIA_MAX} Hz`,
        });
      }

      if (isNaN(duracion) || duracion <= 0 || duracion > 30) {
        return reply({
          text: "⛧ duración inválida, usa un valor entre 1 y 30 segundos",
        });
      }

      await react("🎵");

      const buffer = generarTonoWav(frecuencia, duracion);

      await sock.sendMessage(
        from,
        {
          audio: buffer,
          mimetype: "audio/wav",
          ptt: false,
          fileName: `tono_${frecuencia}hz.wav`,
        },
        { quoted: msg }
      );

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

function generarTonoWav(frecuencia, duracionSegundos = 5, sampleRate = SAMPLE_RATE, volumen = 0.5) {
  const numMuestras = Math.floor(sampleRate * duracionSegundos);
  const bytesPorMuestra = 2;
  const dataSize = numMuestras * bytesPorMuestra;

  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * bytesPorMuestra, 28);
  buffer.writeUInt16LE(bytesPorMuestra, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  const amplitud = Math.floor(32767 * volumen);
  const fadeMuestras = Math.min(500, Math.floor(numMuestras / 10));

  for (let i = 0; i < numMuestras; i++) {
    const t = i / sampleRate;
    let muestra = Math.sin(2 * Math.PI * frecuencia * t) * amplitud;

    if (i < fadeMuestras) {
      muestra *= i / fadeMuestras;
    } else if (i > numMuestras - fadeMuestras) {
      muestra *= (numMuestras - i) / fadeMuestras;
    }

    buffer.writeInt16LE(Math.floor(muestra), 44 + i * bytesPorMuestra);
  }

  return buffer;
}

module.exports = { generarTonoWav };