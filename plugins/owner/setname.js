const handler = async ({ reply, text }) => {
  if (!text) {
    return reply(
      `❌ Uso: *.setname <nombre>*\n\n` +
      `› Nombre actual: *${global._config.botName}*\n\n` +
      `Ejemplo: .setname Isagi Yoichi`
    )
  }

  const anterior = global._config.botName
  global._config.botName = text.trim()

  await reply(
    `✅ *Nombre del bot actualizado*\n\n` +
    `› Anterior: ${anterior}\n` +
    `› Nuevo: *${global._config.botName}*\n\n` +
    `_Para persistir al reiniciar, actualiza config.js_`
  )
}

handler.command = ['setname']
handler.tags = ['owner']
handler.owner = true

export default handler