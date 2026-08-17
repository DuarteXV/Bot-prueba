import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { randomUUID } from "crypto";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36";
const PUBLIC_JWT = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiIiLCJhdWQiOiIiLCJpYXQiOjE1MjMzNjQ4MjQsIm5iZiI6MTUyMzM2NDgyNCwianRpIjoicHJvamVjdF9wdWJsaWNfYzkwNWRkMWMwMWU5ZmQ3NzY5ODNjYTQwZDBhOWQyZjNfT1Vzd2EwODA0MGI4ZDJjN2NhM2NjZGE2MGQ2MTBhMmRkY2U3NyJ9.qvHSXgCJgqpC4gd6-paUlDLFmg0o2DsOvb1EUYPYx_E";
const TOOL = "upscaleimage";

const BASE_HEADERS = {
  accept: "application/json",
  "user-agent": UA,
  referer: "https://www.iloveimg.com/",
  origin: "https://www.iloveimg.com",
  authorization: `Bearer ${PUBLIC_JWT}`
};

function multipart(fields, fileField) {
  const boundary = "----WebKitFormBoundary" + randomUUID().replace(/-/g, "").slice(0, 16);
  const parts = [];
  for (const [name, val] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${val}\r\n`));
  }
  if (fileField) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fileField.name}"; filename="${fileField.filename}"\r\nContent-Type: ${fileField.mime}\r\n\r\n`));
    parts.push(fileField.buffer);
    parts.push(Buffer.from("\r\n"));
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return { body: Buffer.concat(parts), contentType: `multipart/form-data; boundary=${boundary}` };
}

async function startTask() {
  const resp = await fetch(`https://api.iloveimg.com/v1/start/${TOOL}`, { headers: BASE_HEADERS });
  if (!resp.ok) throw new Error(`Error inicio tarea (${resp.status})`);
  const data = await resp.json();
  return { server: data.server, task: data.task };
}

async function uploadImage(server, task, imageBuffer, filename) {
  const { body, contentType } = multipart({ task }, { name: "file", filename, mime: "image/jpeg", buffer: imageBuffer });
  const resp = await fetch(`https://${server}/v1/upload`, {
    method: "POST",
    headers: { ...BASE_HEADERS, "content-type": contentType },
    body
  });
  if (!resp.ok) throw new Error(`Error subiendo imagen (${resp.status})`);
  return await resp.json();
}

async function processImage(server, task, serverFilename, filename, multiplier = "4") {
  const { body, contentType } = multipart({
    packaged_filename: "iloveimg-upscaled",
    task,
    tool: TOOL,
    "files[0][server_filename]": serverFilename,
    "files[0][filename]": filename,
    multiplier
  });
  const resp = await fetch(`https://${server}/v1/process`, {
    method: "POST",
    headers: { ...BASE_HEADERS, "content-type": contentType },
    body
  });
  if (!resp.ok) throw new Error(`Error procesando imagen (${resp.status})`);
  return await resp.json();
}

async function downloadResult(server, task) {
  const resp = await fetch(`https://${server}/v1/download/${task}`, {
    headers: { "user-agent": UA, referer: "https://www.iloveimg.com/" }
  });
  if (!resp.ok) throw new Error(`Error descargando resultado (${resp.status})`);
  return Buffer.from(await resp.arrayBuffer());
}

async function iloveimgUpscale(imageBuffer, filename) {
  const { server, task } = await startTask();
  const upload = await uploadImage(server, task, imageBuffer, filename);
  await processImage(server, task, upload.server_filename, filename, "4");
  return await downloadResult(server, task);
}

export default {
  name: ["hd", "upscale", "mejorar"],
  description: "Mejora la calidad de una imagen (x4) usando IA",
  category: "utils",

  async run({ sock, from, msg, usedPrefix, cmdName, reply, react }) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const target = quoted || msg.message;
    const messageType = target ? Object.keys(target)[0] : null;
    const mime = target?.[messageType]?.mimetype || "";

    if (!mime) {
      return await reply({
        text: `🖼️ *Mejorar calidad de imagen (HD)*\n\nResponde a una imagen con *${usedPrefix}${cmdName}*\n\nFunción: Escala la imagen x4 usando IA`
      });
    }

    if (!/image\/(jpe?g|png|webp)/.test(mime)) {
      return await reply({ text: "❌ El formato debe ser una imagen (JPG, PNG, WEBP)" });
    }

    await react("⏳");

    try {
      const media = await downloadMediaMessage(
        { message: quoted ? { [messageType]: target[messageType] } : msg.message, key: msg.key },
        "buffer",
        {}
      );

      const filename = `upscale_${Date.now()}.jpg`;
      const resultBuffer = await iloveimgUpscale(media, filename);

      await sock.sendMessage(
        from,
        {
          image: resultBuffer,
          caption: "✅ *Imagen mejorada (x4)*\n\n> ✨ Calidad aumentada con IA"
        },
        { quoted: msg }
      );

      await react("✅");
    } catch (e) {
      console.error(e);
      await react("❌");
      await reply({ text: `❌ Error al procesar la imagen:\n${e.message}` });
    }
  }
};