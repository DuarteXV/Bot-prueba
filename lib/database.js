// lib/database.js - DB en JSON con backup automático
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import config from '../config.js'

const DB_PATH = path.resolve(config.dbPath)
const BACKUP_DIR = path.resolve(config.dbBackupPath)

// Estructura base de la DB
export let db = {
  users: {},
  groups: {},
  settings: {},
  stats: {
    totalMessages: 0,
    startedAt: Date.now(),
  },
}

// Asegurar que existen los directorios
function ensureDirs() {
  const dbDir = path.dirname(DB_PATH)
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

// Cargar DB desde archivo
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
    // Intentar cargar el backup más reciente
    const backupLoaded = await loadLatestBackup()
    if (!backupLoaded) {
      console.log(chalk.yellow('[DB] Iniciando con DB vacía'))
    }
  }
}

// Guardar DB
export async function saveDB() {
  ensureDirs()
  try {
    const json = JSON.stringify(db, null, 2)
    fs.writeFileSync(DB_PATH, json, 'utf-8')
  } catch (e) {
    console.error(chalk.red(`[DB ERROR] No se pudo guardar: ${e.message}`))
  }
}

// Crear backup manual/automático
export async function backupDB() {
  ensureDirs()
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(BACKUP_DIR, `db-${timestamp}.json`)
    fs.copyFileSync(DB_PATH, backupPath)

    // Mantener solo los últimos 10 backups
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort()
    if (backups.length > 10) {
      const toDelete = backups.slice(0, backups.length - 10)
      for (const f of toDelete) {
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

// Cargar el backup más reciente
async function loadLatestBackup() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return false
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort()
    if (!backups.length) return false

    const latest = path.join(BACKUP_DIR, backups[backups.length - 1])
    const raw = fs.readFileSync(latest, 'utf-8')
    const parsed = JSON.parse(raw)
    db = { ...db, ...parsed }
    console.log(chalk.yellow(`[DB] Backup cargado: ${latest}`))
    return true
  } catch (e) {
    return false
  }
}

// Obtener o crear usuario
export function getUser(jid) {
  // Usar el número puro como clave, sin @s.whatsapp.net
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
      data: {}, // datos extra personalizados
    }
  }
  db.users[number].lastSeen = Date.now()
  return db.users[number]
}

// Guardar automáticamente cada X minutos
import config2 from '../config.js'
setInterval(async () => {
  await saveDB()
  await backupDB()
}, (config2.saveInterval || 5) * 60 * 1000)
