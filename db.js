import fs from "fs"
import path from "path"

const DB_PATH = "./data/db.json"

const defaultDB = {
  config: {
    channelLink: "",
    channelJid: "",
    bannerUrl: "",
  },
  subbots: {},   // { jid: { name, number, addedAt, addedBy } }
  users: {},     // { jid: { name, banned, ... } }
}

function ensureDB() {
  if (!fs.existsSync("./data")) fs.mkdirSync("./data", { recursive: true })
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2))
  }
}

export function readDB() {
  ensureDB()
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"))
  } catch {
    return structuredClone(defaultDB)
  }
}

export function writeDB(data) {
  ensureDB()
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

export function getConfig() {
  return readDB().config
}

export function setConfig(key, value) {
  const db = readDB()
  db.config[key] = value
  writeDB(db)
}

export function getSubbots() {
  return readDB().subbots
}

export function addSubbot(jid, info) {
  const db = readDB()
  db.subbots[jid] = { ...info, addedAt: Date.now() }
  writeDB(db)
}

export function removeSubbot(jid) {
  const db = readDB()
  delete db.subbots[jid]
  writeDB(db)
}

export function isSubbot(jid) {
  return !!readDB().subbots[jid]
}
