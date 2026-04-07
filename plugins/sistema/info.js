// plugins/sistema/info.js

const handler = async ({ reply, user, senderNumber, isOwner }) => {
  const since = new Date(user.registered).toLocaleDateString('es-CO')
  const lastSeen = new Date(user.lastSeen).toLocaleString('es-CO')

  await reply(
    `👤 *Tu perfil*\n\n` +
    `• Número: +${senderNumber}\n` +
    `• Nombre: ${user.name || 'Desconocido'}\n` +
    `• Mensajes: ${user.messages}\n` +
    `• Premium: ${user.premium ? '⭐ Sí' : 'No'}\n` +
    `• Owner: ${isOwner ? '👑 Sí' : 'No'}\n` +
    `• Registrado: ${since}\n` +
    `• Último mensaje: ${lastSeen}`
  )
}

handler.command = ['info', 'perfil', 'profile', 'yo']
handler.tags = ['sistema']
handler.help = ['info - Ver tu perfil en la DB']

export default handler
