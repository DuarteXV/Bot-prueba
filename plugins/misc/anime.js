import fs from "fs";
import path from "path";
import { getName } from "../../core/nameCache.js";

const DATA_PATH = path.resolve(process.cwd(), "database/anime.json");
const DATA = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));

function cleanJid(jid = "") {
  if (!jid) return "";
  const atIndex = jid.lastIndexOf("@");
  if (atIndex === -1) return jid.split(":")[0];
  const userPart = jid.slice(0, atIndex).split(":")[0];
  const domainPart = jid.slice(atIndex + 1);
  return `${userPart}@${domainPart}`;
}

export default {
  name: Object.keys(DATA),
  description: "Reacciones anime: .hug @user, .kiss @user, etc.",
  category: "anime",
  adminOnly: false,
  groupOnly: true,
  showAllNames: true, // para que el menú liste todas las reacciones, no solo la primera

  async run({ sock, from, msg, sender, groupMeta, reply, react, cmdName }) {
    try {
      const category = (cmdName || "").toLowerCase();
      const entry = DATA[category];
      if (!entry) return;

      const contextInfo = msg?.message?.extendedTextMessage?.contextInfo;

      let who = sender;
      if (contextInfo?.mentionedJid?.length > 0) {
        who = contextInfo.mentionedJid[0];
      } else if (contextInfo?.participant) {
        who = contextInfo.participant;
      }

      // Resolver @lid usando el groupMeta que ya viene cacheado del handler
      if (who.endsWith("@lid") || isNaN(who.split("@")[0])) {
        const found = groupMeta?.participants?.find((p) => p.id === who || p.lid === who);
        if (found?.id) who = found.id;
      }

      const authorJid = cleanJid(sender);
      const mentionedJid = cleanJid(who);
      const isSelf = mentionedJid === authorJid;

      const video = entry.videos[Math.floor(Math.random() * entry.videos.length)];

      const authorName = msg.pushName || getName(authorJid) || authorJid.split("@")[0];
      const targetName = isSelf
        ? null
        : getName(mentionedJid) || mentionedJid.split("@")[0];

      const authorTag = `\`${authorName}\``;
      const targetTag = targetName ? `\`${targetName}\`` : null;

      const caption = isSelf
        ? `${authorTag} ${entry.self}`
        : `${authorTag} ${entry.target} ${targetTag}`;

      const mentions = isSelf ? [authorJid] : [authorJid, mentionedJid];

      await sock.sendMessage(
        from,
        { video: { url: video }, caption, mentions, gifPlayback: true },
        { quoted: msg }
      );
    } catch (e) {
      console.error(e);
      await react("❌");
      await reply({ text: `Failed` });
    }
  },
};