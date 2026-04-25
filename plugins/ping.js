// plugins/ping.js
// Mide la latencia real entre envío y entrega del mensaje

const handler = {
  command: ["ping", "speed"],
  description: "Latencia del bot",
  ownerOnly: false,

  async handler({ sock, msg, jid, react }) {
    const start = Date.now()

    const sent = await sock.sendMessage(jid, { text: "◈" }, { quoted: msg })

    const latency = Date.now() - start

    const bar = getBar(latency)
    const status = latency < 300 ? "rápido" : latency < 700 ? "normal" : "lento"

    await sock.sendMessage(jid, {
      text: `░▒▓ MALACHAR — PING ▓▒░\n\n◈ Latencia  → *${latency}ms*\n◈ Estado    → ${status}\n◈ Velocidad → ${bar}`,
    }, { quoted: msg })

    // Borra el primer mensaje "◈"
    if (sent?.key) {
      await sock.sendMessage(jid, { delete: sent.key })
    }
  },
}

function getBar(ms) {
  if (ms < 200) return "▓▓▓▓▓ (excelente)"
  if (ms < 400) return "▓▓▓▓░ (muy bueno)"
  if (ms < 600) return "▓▓▓░░ (bueno)"
  if (ms < 900) return "▓▓░░░ (normal)"
  return "▓░░░░ (lento)"
}

export default handler
