import { jidNormalizedUser, isLidUser } from '@whiskeysockets/baileys'

const norm = (j) => (j ? jidNormalizedUser(j) : '')

const identities = (...jids) => {
  const pn = []
  const lid = []
  for (const j of jids.map(norm).filter(Boolean)) (isLidUser(j) ? lid : pn).push(j)
  return { pn, lid }
}

const findParticipant = (participants, { pn, lid }) =>
  (pn.length &&
    participants.find((p) => p.phoneNumber && pn.includes(norm(p.phoneNumber)))) ||
  (lid.length && participants.find((p) => lid.includes(norm(p.id)))) ||
  participants.find((p) => pn.includes(norm(p.id))) ||
  null

const isAdmin = (p) => p?.admin === 'admin' || p?.admin === 'superadmin'

export default {
  name: ['abrir', 'open'],
  description: 'Abre el chat del grupo para todos los miembros',
  category: 'grupos',
  groupOnly: true,

  async run({ sock, from, msg, reply }) {
    const { participants = [] } = await sock.groupMetadata(from)

    const sender = findParticipant(
      participants,
      identities(msg.key.participant, msg.key.participantAlt, msg.participant)
    )
    if (!isAdmin(sender))
      return await reply({ text: '❌ Solo admins del grupo pueden usar este comando.' })

    const bot = findParticipant(participants, identities(sock.user?.id, sock.user?.lid))
    if (!isAdmin(bot))
      return await reply({ text: '❌ El bot necesita ser admin para abrir el grupo.' })

    try {
      await sock.groupSettingUpdate(from, 'not_announcement')
      await reply({
        text: '꒰ 𑁍 ꒱ E𝗅 gꭇᥙ⍴o ⍺ 𝗌іძo ⍺ᑲiᧉꭇƚo.\n> ¡ahora todos los miembros pueden enviar mensajes!.'
      })
    } catch (e) {
      await reply({ text: `❌ Hubo un error al abrir el grupo: ${e.message}` })
    }
  }
}