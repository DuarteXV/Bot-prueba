// plugins/menu.js

import { readDB } from "../db.js"
import { readFileSync, existsSync } from "fs"

const handler = {
  command: ["menu", "help", "start"],
  description: "Menú principal",
  ownerOnly: false,

  async handler({ sock, jid, msg, config, isOwner }) {
    const db = readDB()
    const banner = db.config?.bannerUrl || config.bannerUrl
    const channel = db.config?.channelLink || config.channelLink

    const menuText = `░▒▓ ${config.botName?.toUpperCase() || "MALACHAR"} ▓▒░

◈ *INFORMACIÓN*
  ◦ Versión   → ${config.botVersion || "1.0.0"}
  ◦ Prefijo   → ${config.prefix}
  ◦ Canal     → ${channel || "No configurado"}

◈ *COMANDOS BASE*
  ◦ ${config.prefix}ping       → Latencia del bot
  ◦ ${config.prefix}menu       → Este menú
  ◦ ${config.prefix}subbot     → Registrar subbot

${isOwner ? `◈ *OWNER*
  ◦ ${config.prefix}setbanner  → Cambiar banner del menú
  ◦ ${config.prefix}setchannel → Cambiar canal
  ◦ ${config.prefix}addsubbot  → Agregar subbot manualmente
  ◦ ${config.prefix}delsubbot  → Eliminar subbot
  ◦ ${config.prefix}listsubbot → Ver subbots activos

` : ""}◈ *${config.botName || "MALACHAR"}* — _Que la oscuridad guíe tu camino._`

    if (banner) {
      try {
        // Si es URL remota
        if (banner.startsWith("http")) {
          await sock.sendMessage(jid, {
            image: { url: banner },
            caption: menuText,
          }, { quoted: msg })
          return
        }
        // Si es path local
        if (existsSync(banner)) {
          await sock.sendMessage(jid, {
            image: readFileSync(banner),
            caption: menuText,
          }, { quoted: msg })
          return
        }
      } catch {}
    }

    // Sin banner
    await sock.sendMessage(jid, { text: menuText }, { quoted: msg })
  },
}

export default handler
