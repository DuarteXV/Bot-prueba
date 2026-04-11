import config from '../../config.js'

const handler = async ({ reply, text }) => {
  if (!text) {
    return reply(
      `❌ Uso: *.setname <nombre>*\n\n` +
      `› Nombre actual: *${config.botName}*\n\n` +
      `Ejemplo: .setname Isagi Yoichi`
    )
  }

  const anterior = config.botName
  config.botName = text.trim()

  await reply(
    `✅ *Nombre del bot actualizado*\n\n` +
    `› Anterior: ${anterior}\n` +
    `› Nuevo: *${config.botName}*\n\n` +
    `_Para que persista al reiniciar, guarda el nombre en config.js como botName_`
  )
}

handler.command = ['setname']
handler.tags = ['owner']
handler.owner = true

export default handler