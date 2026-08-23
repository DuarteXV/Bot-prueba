import { db } from '../../database/db.js'
import config from '../../config.js'

export default {
  name: ['delmeta'],
  description: 'Resetea tu marca de agua a la del bot',
  category: 'stickers',
  ownerOnly: false,

  async run({ senderNum, react, reply }) {
    await react('🗑️')

    const user = db.getUser(senderNum)

    if (!user.text1 && !user.text2) {
      return await reply({
        text: `⚠️ No tienes ninguna marca establecida.`
      })
    }

    db.setUser(senderNum, {
      text1: null,
      text2: null
    })

    await reply({
      text: `✅ *Marca reseteada* a la del bot\n\n📦 *Pack:* ${config.botname}\n✍️ *Autor:* ${config.author}`
    })

    await react('✅')
  }
}