import { Worker } from "worker_threads";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { log } from "./logger.js";
import { db } from "../database/db.js";

const SUBBOTS_DIR = "./sessions/subbots";
if (!fs.existsSync(SUBBOTS_DIR)) fs.mkdirSync(SUBBOTS_DIR, { recursive: true });

export const activeBots = new Map();
const workers = new Map();
let mainSock = null;

function isSessionRegistered(sessionDir) {
  const dbPath = path.join(sessionDir, "auth.db");
  if (!fs.existsSync(dbPath)) return false;
  try {
    const authDb = new Database(dbPath, { readonly: true, fileMustExist: true });
    const row = authDb.prepare("SELECT data FROM auth WHERE id = ?").get("creds");
    authDb.close();
    if (!row) return false;
    const creds = JSON.parse(row.data);
    return !!creds.registered;
  } catch {
    return false;
  }
}

export function registerMainBot(sock, label = "MAIN") {
  mainSock = sock;
  const rawJid = sock.user?.id || "";
  const jid = rawJid ? rawJid.split(":")[0].split("@")[0] + "@s.whatsapp.net" : "";
  const status = jid ? "online" : "connecting";

  activeBots.set("main", { label, jid, status, isMain: true });

  if (jid) {
    const oldMains = db.getAllBots().filter(b => b.isMain && b.jid !== jid);
    for (const old of oldMains) {
      db.setBot(old.jid, { isMain: false, status: "offline" }, true);
    }

    db.setBot(jid, { label, jid, status, isMain: true });
    global.mainBotNum = jid.split("@")[0];
  }

  if (!jid) {
    sock.ev.on("connection.update", ({ connection }) => {
      if (connection === "open") {
        mainSock = sock;
        const currentRawJid = sock.user?.id || "";
        const currentJid = currentRawJid ? currentRawJid.split(":")[0].split("@")[0] + "@s.whatsapp.net" : "";
        if (currentJid) {
          const oldMains = db.getAllBots().filter(b => b.isMain && b.jid !== currentJid);
          for (const old of oldMains) {
            db.setBot(old.jid, { isMain: false, status: "offline" }, true);
          }

          activeBots.set("main", { label, jid: currentJid, status: "online", isMain: true });
          db.setBot(currentJid, { label, jid: currentJid, status: "online", isMain: true });
          global.mainBotNum = currentJid.split("@")[0];
        }
      }
    });
  }
}

export function updateBotStatus(id, data) {
  const current = activeBots.get(id) || {};
  activeBots.set(id, { ...current, ...data });
  if (data.jid) {
    db.setBot(data.jid, data);
  } else {
    db.setBot(id, data);
  }
}

export function removeSubbot(id) {
  const worker = workers.get(id);
  if (worker) {
    worker.terminate();
    workers.delete(id);
  }
  const botData = activeBots.get(id);
  activeBots.delete(id);
  if (botData && botData.jid) {
    db.setBot(botData.jid, { status: "offline" });
  } else {
    db.setBot(id, { status: "offline" });
  }
  const sessionDir = `${SUBBOTS_DIR}/${id}`;
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
    log.warn(`[MANAGER] Sesión de ${id} eliminada por completo`);
  }
}

function handleWorkerExit(id) {
  workers.delete(id);
  const sessionDir2 = `${SUBBOTS_DIR}/${id}`;

  if (isSessionRegistered(sessionDir2)) {
    log.info(`[MANAGER] Reconectando subbot ${id} en unos segundos...`);
    setTimeout(() => launchSubbot(id), 5000 + Math.random() * 1500);
  } else {
    log.warn(`[MANAGER] ${id} nunca completó la vinculación — descartando sesión`);
    const botData = activeBots.get(id);
    activeBots.delete(id);
    if (botData && botData.jid) {
      db.setBot(botData.jid, { status: "offline" });
    } else {
      db.setBot(id, { status: "offline" });
    }
    if (fs.existsSync(sessionDir2)) {
      fs.rmSync(sessionDir2, { recursive: true, force: true });
    }
  }
}

export function launchSubbot(id) {
  if (workers.has(id)) return;

  const sessionDir = path.resolve(`${SUBBOTS_DIR}/${id}`);
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  log.info(`[MANAGER] Lanzando subbot: ${id}`);

  const worker = new Worker("./core/subbotWorker.js", {
    workerData: { id, sessionDir },
  });
  workers.set(id, worker);

  worker.on("message", (msg) => {
    if (msg.type === "status") {
      const subJid = msg.jid ? msg.jid.split(":")[0].split("@")[0] + "@s.whatsapp.net" : null;
      updateBotStatus(id, { jid: subJid, status: msg.status, label: id.toUpperCase(), isMain: false });
    }
    if (msg.type === "logged_out" || msg.type === "bad_session") {
      log.warn(`[MANAGER] Subbot ${id} cerró sesión — eliminando...`);
      removeSubbot(id);
    }
  });

  worker.on("exit", () => {
    if (workers.get(id) === worker) {
      handleWorkerExit(id);
    }
  });

  worker.on("error", (err) => {
    log.error(`[MANAGER] Worker ${id} error: ${err.message}`);
  });
}

export async function requestSubbotCode(id, phoneNumber, sock, from) {
  const sessionDir = path.resolve(`${SUBBOTS_DIR}/${id}`);
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  return new Promise((resolve, reject) => {
    if (workers.has(id)) {
      workers.get(id).terminate();
      workers.delete(id);
    }

    const worker = new Worker("./core/subbotWorker.js", {
      workerData: { id, sessionDir, phoneNumber },
    });
    workers.set(id, worker);

    const timeout = setTimeout(() => {
      worker.terminate();
      if (workers.get(id) === worker) workers.delete(id);
      reject(new Error("Timeout esperando código"));
    }, 15000);

    const cleanupTimeout = setTimeout(() => {
      const bot = db.getBot(id);
      if (!bot || bot.status !== "online") {
        log.warn(`[MANAGER] Subbot ${id} nunca se conectó — eliminado`);
        removeSubbot(id);
      }
    }, 70_000);

    worker.on("message", (msg) => {
      if (msg.type === "code") {
        clearTimeout(timeout);
        resolve(msg.code);
      }

      if (msg.type === "status") {
        const subJid = msg.jid ? msg.jid.split(":")[0].split("@")[0] + "@s.whatsapp.net" : null;
        updateBotStatus(id, { jid: subJid, status: msg.status, label: id.toUpperCase(), isMain: false });

        if (msg.status === "online") {
          clearTimeout(cleanupTimeout);
          const userNum = id.replace("sub_", "");
          const userJid = subJid || `${userNum}@s.whatsapp.net`;
          sock.sendMessage(from, {
            text: `📍 *@${userNum} ha vinculado un subbot con éxito*\n` +
              "> • Puedes usar *.delbot* para desvincularlo cuando quieras.",
            mentions: [userJid]
          }).catch(e => log.error(`[MANAGER] Error enviando mensaje de éxito: ${e.message}`));
        }
      }

      if (msg.type === "logged_out" || msg.type === "bad_session") {
        clearTimeout(cleanupTimeout);
        removeSubbot(id);
      }

      if (msg.type === "pairing_timeout") {
        clearTimeout(cleanupTimeout);
        log.warn(`[MANAGER] Subbot ${id} no ingresó el código a tiempo`);
        removeSubbot(id);
      }
    });

    worker.on("exit", () => {
      clearTimeout(timeout);
      clearTimeout(cleanupTimeout);
      if (workers.get(id) === worker) {
        handleWorkerExit(id);
      }
    });

    worker.on("error", (err) => {
      clearTimeout(timeout);
      clearTimeout(cleanupTimeout);
      if (workers.get(id) === worker) workers.delete(id);
      reject(err);
    });
  });
}

export function launchAllSubbots() {
  if (!fs.existsSync(SUBBOTS_DIR)) return;
  const dirs = fs.readdirSync(SUBBOTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  if (dirs.length === 0) return;

  log.info(`[MANAGER] Relanzando ${dirs.length} subbot(s)...`);
  for (const id of dirs) {
    const sessionDir = path.resolve(`${SUBBOTS_DIR}/${id}`);
    if (isSessionRegistered(sessionDir)) {
      launchSubbot(id);
    } else {
      log.warn(`[MANAGER] ${id} nunca completó vinculación — eliminando sesión huérfana`);
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  }
}