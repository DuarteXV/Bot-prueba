import fs from "fs"
import path from "path"
import config from "./config.js"
import { readDB } from "./db.js"

// ── Carga todos los plugins de ./plugins/**/*.js ────────────────────
const plugins = []

async function loadPlugins() {
  const pluginDir = "./plugins"
  if (!fs.existsSync(pluginDir)) return

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(fullPath)
      else if (entry.name.endsWith(".js") && !entry.name.startsWith("_")) {
        pluginPaths.push(fullPath)
      }
    }
  }

  const pluginPaths = []
  walk(pluginDir)

  for (const p of pluginPaths) {
    try {
      const mod = await import(`${process.cwd()}/${p}?t=${Date.now()}`)
      // Carga default export
      if (mod.default && Array.isArray(mod.default.command)) {
        plugins.push(mod.default)
      }
      // Carga named exports (ej: export const addSubbotHandler = {...})
      for (const key of Object.keys(mod)) {
        if (key === "default") continue
        const exp = mod[key]
        if (exp && typeof exp === "object" && Array.isArray(exp.command)) {
          plugins.push(exp)
        }
      }
    } catch (e) {
      console.error(`  ✗ Error cargando plugin ${p}:`, e.message)
    }
  }

  console.log(`  ◈ ${plugins.length} plugins cargados`)
}

await loadPlugins()

// ── Handler principal ───────────────────────────────────────────────
export async function handler(sock, msg) {
  const db = readDB()
  const jid = msg.key.remoteJid
  const isGroup = jid.endsWith("@g.us")
  const senderJid = isGroup
    ? msg.key.participant || msg.key.remoteJid
    : msg.key.remoteJid
  const sender = senderJid.replace(/@.+/, "")
  const isOwner = config.owner.includes(sender)

  // ── Extrae texto del mensaje ─────────────────────────────────────
  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    msg.message?.documentMessage?.caption ||
    ""

  const prefix = config.prefix
  const isCmd = body.startsWith(prefix)
  if (!isCmd) return

  const args = body.slice(prefix.length).trim().split(/\s+/)
  const command = args.shift().toLowerCase()
  const text = args.join(" ")

  // ── Contexto unificado ───────────────────────────────────────────
  const ctx = {
    sock,
    msg,
    jid,
    sender,
    senderJid,
    isGroup,
    isOwner,
    command,
    args,
    text,
    body,
    prefix,
    db,
    config,
    // Helpers rápidos
    reply: (content) => sock.sendMessage(jid, content, { quoted: msg }),
    react: (emoji) => sock.sendMessage(jid, { react: { text: emoji, key: msg.key } }),
  }

  // ── Busca y ejecuta plugin ───────────────────────────────────────
  for (const plugin of plugins) {
    if (!plugin.command.includes(command)) continue

    // ── Validaciones ──────────────────────────────────────────────
    if (plugin.ownerOnly && !isOwner) {
      await ctx.reply({ text: "◈ Solo el owner puede usar este comando." })
      return
    }

    if (plugin.groupOnly && !isGroup) {
      await ctx.reply({ text: "◈ Este comando solo funciona en grupos." })
      return
    }

    if (plugin.privateOnly && isGroup) {
      await ctx.reply({ text: "◈ Este comando solo funciona en privado." })
      return
    }

    try {
      await ctx.react("⏳")
      await plugin.handler(ctx)
    } catch (e) {
      console.error(`  ✗ Error en /${command}:`, e.message)
      await ctx.reply({ text: `◈ Error ejecutando el comando.\n\`${e.message}\`` })
    }
    return
  }
}
