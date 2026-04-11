// plugins/owner/setname.js
import config from '../../config.js'

const handler = async ({ reply, text }) => {
  const cfg = global._config || config

  if (!text) {
    return reply(
      `❌ Uso: *.setname <nombre>*\n\n` +
      `› Nombre actual: *${cfg.botName}*\n\n` +
      `Ejemplo: .setname Isagi Yoichi`
    )
  }

  const anterior = cfg.botName
  cfg.botName = text.trim()

  await reply(
    `✅ *Nombre del bot actualizado*\n\n` +
    `› Anterior: ${anterior}\n` +
    `› Nuevo: *${cfg.botName}*\n\n` +
    `_Para persistir al reiniciar, actualiza config.js_`
  )
}

handler.command = ['setname']
handler.tags = ['owner']
handler.owner = true

export default handler