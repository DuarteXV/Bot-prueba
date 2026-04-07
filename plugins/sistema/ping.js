// plugins/sistema/ping.js

const handler = async ({ bot, from, msg, reply }) => {
  const start = Date.now()
  const sentMsg = await reply('🏓 Midiendo...')
  const latency = Date.now() - start

  await bot.sendMessage(from, {
    text: `🏓 *Pong!*\n📶 Latencia: *${latency}ms*`,
    edit: sentMsg.key,
  })
}

handler.command = ['ping', 'speed', 'latencia']
handler.tags = ['sistema']
handler.help = ['ping - Ver latencia del bot']

export default handler
