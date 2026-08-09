import fs from "fs";
import path from "path";
import { db } from "../../database/db.js";

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

function resolveDisplayName(jid, groupMeta) {
  const cached = db.getPushName(jid);
  if (cached) return cached;

  const num = jid.split("@")[0];
  const participant = groupMeta?.participants?.find(
    (p) => cleanJid(p.id).split("@")[0] === num || cleanJid(p.lid || "").split("@")[0] === num
  );
  if (participant?.username) return `@${participant.username}`;

  return num;
}

export default {
  name: Object.keys(DATA),
  description: "Reacciones anime: .hug @user, .kiss @user, etc.",
  category: "anime",
  adminOnly: false,
  groupOnly: true,
  showAllNames: true,

  async run({ sock, from, msg, sender, groupMeta, reply, react, cmdName, resolveLid }) {
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

      // 🔧 Resolver el LID: primero con groupMeta (id o lid), y si
      // sigue siendo LID, en vivo con signalRepository (grupos 100%
      // migrados a LID donde no hay campo "lid" aparte).
      if (who.endsWith("@lid") || isNaN(who.split("@")[0])) {
        const found = groupMeta?.participants?.find((p) => p.id === who || p.lid === who);
        if (found?.id && !found.id.endsWith("@lid")) {
          who = found.id;
        } else if (who.endsWith("@lid")) {
          const resolved = await resolveLid(who);
          if (resolved && resolved !== who) who = resolved;
        }
      }

      const authorJid = cleanJid(sender);
      const mentionedJid = cleanJid(who);
      const isSelf = mentionedJid === authorJid;

      const video = entry.videos[Math.floor(Math.random() * entry.videos.length)];

      const authorName = msg.pushName || resolveDisplayName(authorJid, groupMeta);
      const targetName = isSelf ? null : resolveDisplayName(mentionedJid, groupMeta);

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