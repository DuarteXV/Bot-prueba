import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import config from '../config.js'

const DB_PATH = path.resolve(config.dbPath)
const BACKUP_DIR = path.resolve(config.dbBackupPath)

export let db = {
  users: {},
  groups: {},
  settings: {},
  stats: {
    totalMessages: 0,
    startedAt: Date.now(),
  },
}

function ensureDirs() {
  const dbDir = path.dirname(DB_PATH)
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

export async function loadDB() {
  ensureDirs()
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8')
      const parsed = JSON.parse(raw)
      db = { ...db, ...parsed }
      console.log(chalk.green(`[DB] Cargada: ${Object.keys(db.users).length} usuarios`))
    } else {
      console.log(chalk.yellow('[DB] No existe, creando nueva...'))
      await saveDB()
    }
  } catch (e) {
    console.error(chalk.red(`[DB ERROR] No se pudo cargar: ${e.message}`))
    const backupLoaded = await loadLatestBackup()
    if (!backupLoaded) console.log(chalk.yellow('[DB] Iniciando con DB vacía'))
  }
}

export async function saveDB() {
  ensureDirs()
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8')
  } catch (e) {
    console.error(chalk.red(`[DB ERROR] No se pudo guardar: ${e.message}`))
  }
}

export async function backupDB() {
  ensureDirs()
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(BACKUP_DIR, `db-${timestamp}.json`)
    fs.copyFileSync(DB_PATH, backupPath)

    const backups = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort()
    if (backups.length > 10) {
      for (const f of backups.slice(0, backups.length - 10)) {
        fs.unlinkSync(path.join(BACKUP_DIR, f))
      }
    }

    console.log(chalk.cyan(`[DB BACKUP] Guardado: ${backupPath}`))
    return backupPath
  } catch (e) {
    console.error(chalk.red(`[DB BACKUP ERROR] ${e.message}`))
    return null
  }
}

async function loadLatestBackup() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return false
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort()
    if (!backups.length) return false
    const raw = fs.readFileSync(path.join(BACKUP_DIR, backups[backups.length - 1]), 'utf-8')
    db = { ...db, ...JSON.parse(raw) }
    console.log(chalk.yellow(`[DB] Backup cargado`))
    return true
  } catch (e) {
    return false
  }
}

export function getUser(jid) {
  const number = jid.split('@')[0].split(':')[0]
  if (!db.users[number]) {
    db.users[number] = {
      jid: `${number}@s.whatsapp.net`,
      number,
      name: null,
      registered: Date.now(),
      lastSeen: Date.now(),
      messages: 0,
      banned: false,
      premium: false,
      warns: 0,
      lang: 'es',
      data: {},
    }
  }
  db.users[number].lastSeen = Date.now()
  return db.users[number]
}

setInterval(async () => {
  await saveDB()
  await backupDB()
}, (config.saveInterval || 5) * 60 * 1000)