import { requestSubbotCode, activeBots } from '../../core/subbotManager.js'

const cooldowns = new Map()

export default {
  name: ['code'],
  description: 'Vincula tu número como subbot',
  category: 'sockets',
  ownerOnly: false,

  async run({ sock, from, senderNum, react, reply, msg, args }) {
    await react('🔑')

    // Intenta resolver el número real. Si el remitente usa un JID @lid
    // (cuenta con username activo), Baileys puede exponer el número real
    // en key.senderPn / key.participantPn / key.remoteJidAlt según la versión.
    const rawJid = msg.key?.remoteJid || ''
    const isLid = rawJid.endsWith('@lid') || (msg.key?.participant || '').endsWith('@lid')
    const altPn = msg.key?.senderPn || msg.key?.participantPn || msg.key?.remoteJidAlt

    let phone = ''
    if (args && args[0]) {
      // El usuario ya pasó el número manualmente (fallback)
      phone = args[0].replace(/\D/g, '')
    } else if (isLid && altPn) {
      phone = altPn.split('@')[0].replace(/\D/g, '')
    } else if (!isLid) {
      phone = senderNum.replace(/\D/g, '')
    }

    if (!phone || phone.length < 8) {
      return await reply({
        text: `⚠️ No pude detectar tu número automáticamente (esto pasa si tienes activado un *nombre de usuario* de WhatsApp).\n\n` +
          `Envía tu número completo con código de país así: *.code 521234567890*`
      })
    }

    const id = `sub_${phone}`

    if (activeBots.has(id) && activeBots.get(id).status === 'online') {
      return await reply({
        text: `⚠️ Tu número ya está vinculado como subbot.\nUsa *.delbot* para desvincularlo.`
      })
    }

    if (cooldowns.has(phone)) {
      const diff = Date.now() - cooldowns.get(phone)
      const restante = Math.ceil((60000 - diff) / 1000)
      if (diff < 60000) {
        return await reply({
          text: `🌾 Ya pediste un código recientemente.\nEspera *${restante} segundos* antes de pedir otro.`
        })
      }
    }

    cooldowns.set(phone, Date.now())

    await reply({
      text: `⚔️ *VINCULACIÓN DE SUBBOT*\n\n` +
        `📋 *Instrucciones:*\n` +
        ` ✦ Abre WhatsApp en tu teléfono\n` +
        ` ✦ Ve a *Dispositivos vinculados*\n` +
        ` ✦ Toca *Vincular dispositivo*\n` +
        ` ✦ Toca *Vincular con número de teléfono*\n` +
        ` ✦ Ingresa el código que recibirás ahora\n` +
        ` ✦ Tienes *60 segundos* antes de que expire\n\n` +
        `⏳ _Generando código..._`
    })

    try {
      const code = await requestSubbotCode(id, phone, sock, from)
      await sock.sendMessage(from, { text: `${code}` }, { quoted: msg })
      await react('✅')
    } catch (e) {
      cooldowns.delete(phone)
      await react('❌')
      await reply({ text: `❌ Error generando código:\n${e.message}` })
    }
  }
}