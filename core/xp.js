import { db } from "../database/db.js";

const CHAT_XP_MIN = 3;
const CHAT_XP_MAX = 8;
const CHAT_XP_COOLDOWN_MS = 60 * 1000;
const COMMAND_XP = 5;

function xpForLevel(level) {
  return level * level * 100;
}

export function levelFromXp(xp) {
  let level = 0;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

export function xpProgress(xp) {
  const level = levelFromXp(xp);
  const currentFloor = xpForLevel(level);
  const nextFloor = xpForLevel(level + 1);
  return { level, xp, currentFloor, nextFloor, missing: nextFloor - xp };
}

function addXp(jid, amount) {
  const user = db.getUser(jid);
  const newXp = (user.xp || 0) + amount;
  db.setUser(jid, { xp: newXp });
}

export function handleChatXp(sender) {
  const user = db.getUser(sender);
  const now = Date.now();
  if (user.lastXpAt && now - user.lastXpAt < CHAT_XP_COOLDOWN_MS) return;

  const amount = Math.floor(Math.random() * (CHAT_XP_MAX - CHAT_XP_MIN + 1)) + CHAT_XP_MIN;
  db.setUser(sender, { lastXpAt: now });
  addXp(sender, amount);
}

export function handleCommandXp(sender) {
  addXp(sender, COMMAND_XP);
}