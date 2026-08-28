import config from '../../config.js'

export default {
  name: ['owner', 'dueño'],
  description: 'Muestra la información del dueño del bot',
  category: 'info',
  ownerOnly: false,

  async run({ sock, from, msg }) {
    const ownerNum = '573135180876'

    if (!ownerNum) return

    await sock.sendMessage(from, {
      contacts: {
        displayName: 'DuarteXV',
        contacts: [{
          vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:DuarteXV\nTEL;type=CELL;type=VOICE;waid=${ownerNum}:+${ownerNum}\nEND:VCARD`
        }]
      }
    }, { quoted: msg })
  }
}