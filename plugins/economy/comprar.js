import { db } from '../../database/db.js'
import { ITEMS } from '../../core/gamedata.js'

export default {
  name: ['comprar', 'buy'],
  description: 'Compra un item de la tienda',
  category: 'economy',
  ownerOnly: false,

  async run({ sender, args, reply, react }) {
    const itemId = args[0]?.toLowerCase()

    if (!itemId) {
      return await reply({ text: `⚠️ Especifica el ID del item.\n\n*Ejemplo:* .comprar pala\n\n> Usá *.tienda* para ver los items disponibles` })
    }

    const item = ITEMS[itemId]
    if (!item) {
      return await reply({ text: `❌ Item no encontrado.\n\n> Usá *.tienda* para ver los items disponibles` })
    }

    const eco = db.getEco(sender)

    if (eco.inventario.includes(itemId)) {
      return await reply({ text: `❌ Ya tenés *${item.nombre}* en tu inventario.` })
    }

    if (eco.bolsillo < item.precio) {
      const faltante = item.precio - eco.bolsillo
      return await reply({
        text: `❌ No tenés suficientes Fragmentos.\n\n` +
          `*Precio:* ${item.precio.toLocaleString()} Fragmentos\n` +
          `*Bolsillo:* ${eco.bolsillo.toLocaleString()} Fragmentos\n` +
          `*Te faltan:* ${faltante.toLocaleString()} Fragmentos`
      })
    }

    const nuevoInventario = [...eco.inventario, itemId]
    db.setEco(sender, {
      bolsillo: eco.bolsillo - item.precio,
      inventario: nuevoInventario
    })

    await react('✅')
    await reply({
      text: `✅ *Compra exitosa*\n\n` +
        `*Item:* ${item.nombre}\n` +
        `*Precio pagado:* ${item.precio.toLocaleString()} Fragmentos\n` +
        `*Bolsillo restante:* ${(eco.bolsillo - item.precio).toLocaleString()} Fragmentos\n\n` +
        `> Usá *.equipar ${itemId} <personaje>* para dárselo a un personaje`
    })
  }
}