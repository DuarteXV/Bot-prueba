import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { jidNormalizedUser } from "@whiskeysockets/baileys";

async function getProfilePic(sock, jid) {
  try {
    const url = await sock.profilePictureUrl(jid, "image");
    const res = await fetch(url);
    const buffer = Buffer.from(await res.arrayBuffer());
    return await loadImage(buffer);
  } catch {
    return null;
  }
}

function drawCircleAvatar(ctx, img, x, y, size) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (img) {
    ctx.drawImage(img, x, y, size, size);
  } else {
    ctx.fillStyle = "#555";
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();
}

export default {
  name: ["ship"],
  description: "Genera una tarjeta de compatibilidad entre dos usuarios",
  category: "fun",
  groupOnly: true,

  async run({ sock, from, sender, msg, reply }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;

    let userA = jidNormalizedUser(sender);
    let userB = null;

    if (mentioned.length >= 2) {
      userA = jidNormalizedUser(mentioned[0]);
      userB = jidNormalizedUser(mentioned[1]);
    } else if (mentioned.length === 1) {
      userB = jidNormalizedUser(mentioned[0]);
    } else if (quotedParticipant) {
      userB = jidNormalizedUser(quotedParticipant);
    }

    if (!userB) {
      return await reply({
        text: "『💘』Mencioná a alguien (o respondé su mensaje) para hacer el ship.\n\n*Uso:* .ship @usuario"
      });
    }

    if (userA === userB) {
      return await reply({ text: "『💘』No podés hacerte ship con vos mismo, xd." });
    }

    const width = 800;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#ff6a88");
    gradient.addColorStop(1, "#ff99ac");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const avatarSize = 260;
    const avatarY = (height - avatarSize) / 2;

    const [imgA, imgB] = await Promise.all([
      getProfilePic(sock, userA),
      getProfilePic(sock, userB)
    ]);

    ctx.lineWidth = 8;
    ctx.strokeStyle = "#ffffff";

    drawCircleAvatar(ctx, imgA, 40, avatarY, avatarSize);
    ctx.beginPath();
    ctx.arc(40 + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.stroke();

    drawCircleAvatar(ctx, imgB, width - avatarSize - 40, avatarY, avatarSize);
    ctx.beginPath();
    ctx.arc(width - avatarSize - 40 + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.stroke();

    const percent = Math.floor(Math.random() * 101);

    ctx.font = "bold 100px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("❤", width / 2, height / 2 - 20);

    ctx.font = "bold 48px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${percent}%`, width / 2, height / 2 + 70);

    const barWidth = 260;
    const barHeight = 24;
    const barX = (width - barWidth) / 2;
    const barY = height - 60;

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(barX, barY, (barWidth * percent) / 100, barHeight);

    const buffer = canvas.toBuffer("image/png");

    const numA = userA.split("@")[0];
    const numB = userB.split("@")[0];

    let caption;
    if (percent >= 80) caption = "『💘』¡Son el uno para el otro!";
    else if (percent >= 50) caption = "『💘』Hay potencial ahí...";
    else if (percent >= 20) caption = "『💘』Mejor quedan como amigos.";
    else caption = "『💘』Cero compatibilidad, lo siento.";

    await sock.sendMessage(
      from,
      {
        image: buffer,
        caption: `${caption}\n\n@${numA} 💞 @${numB}\n*Compatibilidad:* ${percent}%`,
        mentions: [userA, userB]
      },
      { quoted: msg }
    );
  }
};