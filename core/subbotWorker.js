import { workerData, parentPort } from "worker_threads";
import makeWASocket, {
  DisconnectReason,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  initAuthCreds,
  BufferJSON,
  proto,
} from "@whiskeysockets/baileys";
import pino from "pino";
import { mkdir } from "fs/promises";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { handleMessage, invalidateGroupCache } from "./messageHandler.js";
import { loadPlugins } from "./pluginLoader.js";

const { id, sessionDir, phoneNumber, mainBotNum } = workerData;
const logger = pino({ level: "silent" });
let pluginsLoaded = false;

let activeBotsLive = [];
let currentSock = null;

parentPort.on("message", (msg) => {
  if (msg.type === "bots_list") {
    activeBotsLive = msg.data || [];
  }

  // 📡 El manager nos pide reaccionar a un mensaje de canal con nuestra
  // propia conexión (currentSock). newsletterReactMessage necesita el
  // JID real del canal (xxxx@newsletter), así que primero resolvemos
  // el código corto de invitación a JID con newsletterMetadata.
  if (msg.type === "react_canal" && currentSock) {
    (async () => {
      try {
        const meta = await currentSock.newsletterMetadata('invite', msg.invite);
        await currentSock.newsletterReactMessage(meta.id, msg.serverId, msg.emoji);
      } catch {
        // si falla para este subbot en particular, simplemente lo ignoramos
      }
    })();
  }
});

async function useSQLiteAuthState(sessionDir) {
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const authDb = new Database(path.join(sessionDir, "auth.db"));
  authDb.pragma("journal_mode = WAL");
  authDb.exec(`CREATE TABLE IF NOT EXISTS auth (id TEXT PRIMARY KEY, data TEXT)`);

  const readData = (id) => {
    const row = authDb.prepare("SELECT data FROM auth WHERE id = ?").get(id);
    return row ? JSON.parse(row.data, BufferJSON.reviver) : null;
  };

  const writeData = (data, id) => {
    authDb
      .prepare("INSERT OR REPLACE INTO auth (id, data) VALUES (?, ?)")
      .run(id, JSON.stringify(data, BufferJSON.replacer));
  };

  const removeData = (id) => authDb.prepare("DELETE FROM auth WHERE id = ?").run(id);

  let creds = readData("creds") || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          ids.forEach((id) => {
            let value = readData(`${type}-${id}`);
            if (type === "app-state-sync-key" && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            data[id] = value;
          });
          return data;
        },
        set: async (data) => {
          for (const cat in data) {
            for (const id in data[cat]) {
              const val = data[cat][id];
              if (val) {
                writeData(val, `${cat}-${id}`);
              } else {
                removeData(`${cat}-${id}`);
              }
            }
          }
        },
      },
    },
    saveCreds: () => writeData(creds, "creds"),
    closeDb: () => authDb.close(),
  };
}

async function startWorker(_attempt = 0) {
  await mkdir(sessionDir, { recursive: true });

  if (!pluginsLoaded) {
    await loadPlugins();
    pluginsLoaded = true;
  }

  const { state, saveCreds, closeDb } = await useSQLiteAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const useCode = !!phoneNumber && !state.creds.registered;

  let sock;
  let connected = false;
  let pendingMessages = [];
  let lastKnownJid = "";

  async function flushPending() {
    const queue = pendingMessages.splice(0);
    for (const msg of queue) {
      handleMessage(sock, msg, id.toUpperCase(), mainBotNum, activeBotsLive).catch(() => {});
    }
  }

  try {
    sock = makeWASocket({
      version: [2, 3000, 1044006379],
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      printQRInTerminal: false,
      logger,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      syncFullHistory: false,
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      retryRequestDelayMs: 3000,
      defaultQueryTimeoutMs: 60000,
    });

    currentSock = sock;
  } catch (e) {
    try { closeDb(); } catch {}
    parentPort?.postMessage({ type: "error", message: e.message });
    if (_attempt < 10) setTimeout(() => startWorker(_attempt + 1), 5000);
    return;
  }

  if (useCode) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      let code = await sock.requestPairingCode(phoneNumber.replace(/\D/g, ""));
      code = code?.match(/.{1,4}/g)?.join("-") || code;
      parentPort.postMessage({ type: "code", code });
    } catch (e) {
      parentPort.postMessage({ type: "error", message: e.message });
    }
  }

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      connected = true;
      currentSock = sock;

      const rawJid = sock.user?.id || "";
      const jidLimpio = rawJid ? rawJid.split(":")[0].split("@")[0] + "@s.whatsapp.net" : "";
      lastKnownJid = jidLimpio;

      parentPort.postMessage({
        type: "status",
        status: "online",
        jid: jidLimpio,
      });

      await flushPending();
    }

    if (connection === "close") {
      connected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;

      parentPort.postMessage({ type: "status", status: "offline", jid: lastKnownJid });

      try { closeDb(); } catch {}

      if (statusCode === DisconnectReason.loggedOut) {
        parentPort.postMessage({ type: "logged_out" });
        process.exit(0);
        return;
      }

      if (statusCode === DisconnectReason.connectionReplaced) {
        process.exit(0);
        return;
      }

      setTimeout(() => startWorker(_attempt + 1), 5000);
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("group-participants.update", ({ id: groupId }) => {
    invalidateGroupCache(groupId);
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key?.remoteJid === "status@broadcast") continue;

      if (!connected) {
        pendingMessages.push(msg);
        continue;
      }

      handleMessage(sock, msg, id.toUpperCase(), mainBotNum, activeBotsLive).catch(() => {});
    }
  });
}

startWorker().catch((e) => {
  parentPort?.postMessage({ type: "error", message: e.message });
  process.exit(1);
});