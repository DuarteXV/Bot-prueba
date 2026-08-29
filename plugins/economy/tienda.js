import { ITEMS } from '../../core/gamedata.js'

export default {
  name: ['tienda', 'shop'],
  description: 'Muestra los items disponibles para comprar',
  category: 'economy',
  ownerOnly: false,

  async run({ reply, react }) {
    await react('🛒')

    const genericos = Object.entries(ITEMS).filter(([, i]) => !i.restriccion)
    const exclusivos = Object.entries(ITEMS).filter(([, i]) => i.restriccion)

    let texto = `🛒 *Tienda de Fragmentos*\n╰━━━━━━(☆)━━━━━━─╮\n\n`
    texto += `*── Objetos generales (cualquier personaje) ──*\n\n`

    for (const [id, item] of genericos) {
      texto += `*${item.nombre}*\n`
      texto += `   💰 ${item.precio.toLocaleString()} Fragmentos | ⚡ Poder: ${item.poder}\n`
      texto += `   🆔 \`${id}\`\n\n`
    }

    texto += `*── Objetos exclusivos por personaje ──*\n\n`

    for (const [id, item] of exclusivos) {
      texto += `*${item.nombre}*\n`
      texto += `   💰 ${item.precio.toLocaleString()} Fragmentos | ⚡ Poder: ${item.poder}\n`
      texto += `   🔒 Solo: *${item.restriccion}*\n`
      texto += `   🆔 \`${id}\`\n\n`
    }

    texto += `> Usá *.comprar <ID>* para comprar\n> Usá *.equipar <ID> <personaje>* para equiparlo`

    await reply({ text: texto })
  }
}