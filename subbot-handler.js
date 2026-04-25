// subbot-handler.js
// Handler que usan los subbots. Cada subbot tiene su propio prefijo
// guardado en ./subbots/<número>/config.json

import fs from "fs"
import path from "path"
import { readDB } from "./db.js"
import { stopSubbotInstance } from "./subbot-manager.js"

// Cache de plugins compartidos (se cargan igual que en el principal)
let subbotPlugins = null

async function getPlugins() {
  if (subbotPlugins) return subbotPlugins
  subbotPlugins = []

  const pluginDir = "./plugins"
  if (!fs.existsSync(pluginDir)) return subbotPlugins

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(fullPath)
      else if (entry.name.endsWith(".js") && !entry.name.startsWith("_")) {
        paths.push(fullPath)
      }
    }
  }

  const paths = []
  walk(pluginDir)

  for (const p of paths) {
    try {
      const mod = await import(`${process.cwd()}/${p}`)
      if (mod.default && Array.isArray(mod.default.command)) subbotPlugins.push(mod.default)
      for (const key of Object.keys(mod)) {
        if (key === "default") continue
        const exp = mod[key]
        if (exp && typeof exp === "object" && Array.isArray(exp.command)) subbotPlugins.push(exp)
      }
    } catch {}
  }

  return subbotPlugins
}

// ── Lee config del subbot ───────────────────────────────────────────
function getSubbotConfig(number) {
  const cfgPath = `./subbots/${number}/config.json`
  try {
    if (fs.existsSync(cfgPath)) return JSON.parse(fs.readFileSync(cfgPath, "utf-8"))
  } catch {}
  return { prefix: "/" }
}

// ── Guarda config del subbot ────────────────────────────────────────
function setSubbotConfig(number, data) {
  const cfgPath = `./subbots/${number}/config.json`
  fs.writeFileSync(cfgPath, JSON.stringify(data, null, 2))
}

// ── Handler principal del subbot ────────────────────────────────────
export async function loadSubbotHandler(sock, msg, number) {
  const db = readDB()
  const jid = msg.key.remoteJid
  const isGroup = jid.endsWith("@g.us")
  const senderJid = isGroup ? (msg.key.participant || msg.key.remoteJid) : msg.key.remoteJid
  const sender = senderJid.replace(/@.+/, "")

  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    msg.message?.documentMessage?.caption ||
    ""

  const subbotCfg = getSubbotConfig(number)
  const prefix = subbotCfg.prefix ?? "/"

  // Soporte para sin prefijo (prefix = "")
  const isCmd = prefix === "" ? body.trim().length > 0 : body.startsWith(prefix)
  if (!isCmd) return

  const rawCmd = prefix === "" ? body.trim() : body.slice(prefix.length).trim()
  const args = rawCmd.split(/\s+/)
  const command = args.shift().toLowerCase()
  const text = args.join(" ")

  const isOwner = db.config?.owner?.includes(sender) || false

  const reply = (content) => sock.sendMessage(jid, content, { quoted: msg })
  const react = (emoji) => sock.sendMessage(jid, { react: { text: emoji, key: msg.key } })

  // ── Comando /stop — solo el dueño del subbot (mismo número) ────────
  if (command === "stop") {
    if (sender !== number) {
      await reply({ text: "◈ Solo el dueño de este subbot puede desvincularlo." })
      return
    }
    await react("⏳")
    await reply({ text: `░▒▓ MALACHAR ▓▒░\n\n◈ Subbot desvinculado.\n◦ Número: ${number}\n◦ Sesión eliminada.` })
    await sleep(500)
    await stopSubbotInstance(number)
    return
  }

  // ── Comando /prefix — edita el prefijo del subbot ──────────────────
  if (command === "prefix") {
    if (sender !== number && !isOwner) {
      await reply({ text: "◈ Solo el dueño del subbot puede cambiar el prefijo." })
      return
    }
    const newPrefix = text.trim()
    if (newPrefix === "noprefix") {
      setSubbotConfig(number, { ...subbotCfg, prefix: "" })
      await react("✅")
      await reply({ text: "◈ Prefijo eliminado. El bot responde a cualquier texto." })
    } else if (newPrefix.length === 0) {
      await reply({ text: `◈ Uso: /prefix <nuevo>\n◦ Para sin prefijo: /prefix noprefix\n◦ Prefijo actual: *${prefix || "ninguno"}*` })
    } else {
      setSubbotConfig(number, { ...subbotCfg, prefix: newPrefix })
      await react("✅")
      await reply({ text: `◈ Prefijo actualizado → *${newPrefix}*` })
    }
    return
  }

  // ── Busca en plugins ────────────────────────────────────────────────
  const plugins = await getPlugins()

  for (const plugin of plugins) {
    if (!plugin.command.includes(command)) continue

    if (plugin.ownerOnly && !isOwner) {
      await reply({ text: "◈ Solo el owner puede usar este comando." })
      return
    }
    if (plugin.groupOnly && !isGroup) {
      await reply({ text: "◈ Este comando solo funciona en grupos." })
      return
    }
    if (plugin.privateOnly && isGroup) {
      await reply({ text: "◈ Este comando solo funciona en privado." })
      return
    }

    try {
      await react("⏳")
      await plugin.handler({
        sock, msg, jid, sender, senderJid,
        isGroup, isOwner, command, args, text, body, prefix,
        db, config: db.config,
        reply,
        react,
      })
    } catch (e) {
      console.error(`  ✗ subbot ${number} error en /${command}:`, e.message)
      await reply({ text: `◈ Error ejecutando el comando.\n\`${e.message}\`` })
    }
    return
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}
