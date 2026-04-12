import os from 'os'
import { execSync } from 'child_process'

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
  const cpuModel = cpus[0]?.model?.trim() || 'Desconocido'
  const cpuCores = cpus.length
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const memPercent = ((usedMem / totalMem) * 100).toFixed(1)
  const loadAvg = os.loadavg().map(l => l.toFixed(2)).join(' | ')

  // Disco
  let diskInfo = 'No disponible'
  try {
    const disk = execSync("df -h / | tail -1 | awk '{print $2, $3, $4, $5}'").toString().trim().split(' ')
    diskInfo = `Total: ${disk[0]} | Usado: ${disk[1]} | Libre: ${disk[2]} (${disk[3]})`
  } catch {}

  // Procesos activos (top 5 por CPU)
  let topProcs = 'No disponible'
  try {
    const procs = execSync("ps aux --sort=-%cpu | awk 'NR>1 && NR<=6 {printf \"%s %.1f%% %sKB\\n\", $11, $3, $6}'").toString().trim()
    topProcs = procs.split('\n').join('\n• ')
  } catch {}

  // Variables de entorno relevantes
  const envVars = [
    `NODE_ENV: ${process.env.NODE_ENV || 'no definido'}`,
    `PORT: ${process.env.PORT || 'no definido'}`,
    `HOME: ${process.env.HOME || 'no definido'}`,
    `USER: ${process.env.USER || 'no definido'}`,
  ].join('\n• ')

  // Red
  let netInfo = 'No disponible'
  try {
    const net = execSync("cat /proc/net/dev | awk 'NR>2 && $1!=\"lo:\" {print $1, $2, $10}' | head -3").toString().trim()
    const lines = net.split('\n').map(line => {
      const parts = line.trim().split(/\s+/)
      return `${parts[0]} ↓${formatBytes(parseInt(parts[1]))} ↑${formatBytes(parseInt(parts[2]))}`
    })
    netInfo = lines.join('\n• ')
  } catch {}

  const info = `╭━━━━━━━━━━━━━━━━━━━━━━━╮
┃   🖥️ *Info del Servidor*
╰━━━━━━━━━━━━━━━━━━━━━━━╯

🔧 *Sistema*
• OS: ${os.platform()} (${os.arch()})
• Host: ${os.hostname()}
• Node: ${process.version}

⚙️ *CPU*
• Modelo: ${cpuModel}
• Núcleos: ${cpuCores}
• Carga: ${loadAvg}

🧠 *Memoria RAM*
• Total: ${formatBytes(totalMem)}
• Usada: ${formatBytes(usedMem)} (${memPercent}%)
• Libre: ${formatBytes(freeMem)}

💾 *Disco*
• ${diskInfo}

🔝 *Top Procesos (CPU)*
• ${topProcs}

🌐 *Red*
• ${netInfo}

🔑 *Variables de Entorno*
• ${envVars}

⏱️ *Uptime*
• Servidor: ${formatUptime(os.uptime())}
• Bot: ${formatUptime(process.uptime())}`

  await reply(info)
}

handler.command = ['server', 'serverinfo', 'sinfo']
handler.owner = true
handler.tags = ['owner']
handler.help = ['server']

export default handler