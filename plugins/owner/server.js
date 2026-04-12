import os from 'os'

const handler = async ({ reply }) => {
  const formatBytes = (bytes) => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB'
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB'
    return (bytes / 1024).toFixed(2) + ' KB'
  }

  const formatUptime = (seconds) => {
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    return `${d}d ${h}h ${m}m ${s}s`
  }

  const cpus = os.cpus()
  const cpuModel = cpus[0]?.model || 'Desconocido'
  const cpuCores = cpus.length

  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const memPercent = ((usedMem / totalMem) * 100).toFixed(1)

  const uptime = os.uptime()
  const botUptime = process.uptime()

  const platform = os.platform()
  const arch = os.arch()
  const hostname = os.hostname()
  const nodeVersion = process.version

  const loadAvg = os.loadavg().map(l => l.toFixed(2)).join(' | ')

  const info = `╭━━━━━━━━━━━━━━━━━━━━━━━╮
┃   🖥️ *Info del Servidor*
╰━━━━━━━━━━━━━━━━━━━━━━━╯

🔧 *Sistema*
• OS: ${platform} (${arch})
• Host: ${hostname}
• Node: ${nodeVersion}

⚙️ *CPU*
• Modelo: ${cpuModel}
• Núcleos: ${cpuCores}
• Carga: ${loadAvg}

🧠 *Memoria RAM*
• Total: ${formatBytes(totalMem)}
• Usada: ${formatBytes(usedMem)} (${memPercent}%)
• Libre: ${formatBytes(freeMem)}

⏱️ *Uptime*
• Servidor: ${formatUptime(uptime)}
• Bot: ${formatUptime(botUptime)}`

  await reply(info)
}

handler.command = ['server', 'serverinfo', 'sinfo']
handler.owner = true
handler.tags = ['owner']
handler.help = ['server']

export default handler