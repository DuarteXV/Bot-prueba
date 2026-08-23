import { db } from "../database/db.js";

const COOLDOWNS = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
  rob: 2 * 60 * 60 * 1000,
  mendigar: 30 * 60 * 1000,
  crimen: 2 * 60 * 60 * 1000
};

export function formatTime(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function checkCooldown(jid, key) {
  const user = db.getUser(jid);
  const lastKey = `last${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  const last = user[lastKey] || 0;
  const cooldown = COOLDOWNS[key];
  const diff = Date.now() - last;

  if (diff < cooldown) {
    return { ready: false, remaining: cooldown - diff };
  }
  return { ready: true };
}

export function setCooldown(jid, key) {
  const lastKey = `last${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  db.setUser(jid, { [lastKey]: Date.now() });
}

export function addBolsillo(jid, amount) {
  const user = db.getUser(jid);
  db.setUser(jid, { bolsillo: (user.bolsillo || 0) + amount });
}