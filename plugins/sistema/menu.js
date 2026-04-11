import { formatDuration } from '../../lib/utils.js'
import config from '../../config.js'

const handler = async ({ from, replyChannel, isOwner, db }) => {
  const uptime = formatDuration(Date.now() - db.stats.startedAt)
  const prefix = config.prefix

  const menu = `╭━━━━━━━━━━━━━━━━━━━━━━━╮
┃   🤖 *${config.botName}*
╰━━━━━━━━━━━━━━━━━━━━━━━╯

📊 *Stats*
• Uptime: ${uptime}
• Usuarios: ${Object.keys(db.users).length}
• Mensajes: ${db.stats.totalMessages}

⚙️ *Sistema*
› ${prefix}ping
› ${prefix}menu
› ${prefix}info
${isOwner ? `\n👑 *Owner*\n› ${prefix}ban\n› ${prefix}unban\n› ${prefix}backup\n› ${prefix}limpiar` : ''}

> Prefijo: \`${prefix}\``

  await replyChannel(menu, {
    title: config.botName,
    body: config.channelName,
    sourceUrl: config.channelInviteLink,
  })
}

handler.command = ['menu', 'help', 'start', 'h']
handler.tags = ['sistema']
handler.help = ['menu']

export default handler