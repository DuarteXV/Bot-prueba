const nameCache = new Map();

export function rememberName(jid, name) {
  if (!jid || !name) return;
  nameCache.set(jid, name);
}

export function getName(jid) {
  return nameCache.get(jid);
}