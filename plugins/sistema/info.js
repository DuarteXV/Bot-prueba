// plugins/sistema/info.js
const handler = async ({ reply, user, senderNumber, isOwner, sock, from }) => {
  const since = new Date(user.registered).toLocaleDateString('es-CO')
  const lastSeen = new Date(user.lastSeen).toLocaleString('es-CO')

  // Pushname real de WhatsApp
  const pushname =
    sock.contacts?.[from]?.name ||
    sock.contacts?.[from]?.notify ||
    user.name ||
    'Desconocido'

  // Foto de perfil
  let profilePic = null
  try {
    profilePic = await sock.profilePictureUrl(from, 'image')
  } catch {
    profilePic = null
  }

  const text =
    `👤 *Tu perfil*\n\n` +
    `• Número: +${senderNumber}\n` +
    `• Nombre: ${pushname}\n` +
    `• Mensajes: ${user.messages}\n` +
    `• Premium: ${user.premium ? '⭐ Sí' : 'No'}\n` +
    `• Owner: ${isOwner ? '👑 Sí' : 'No'}\n` +
    `• Registrado: ${since}\n` +
    `• Último mensaje: ${lastSeen}`

  if (profilePic) {
    await sock.sendMessage(from, {
      image: { url: profilePic },
      caption: text,
    })
  } else {
    await reply(text)
  }
}

handler.command = ['info', 'perfil', 'profile', 'yo']
handler.tags = ['sistema']
handler.help = ['info - Ver tu perfil en la DB']

export default handler
