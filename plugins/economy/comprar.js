import { db } from '../../database/db.js'

const ITEMS = {
  pala: { nombre: '🪏 Pala', precio: 500 },
  pico: { nombre: '⛏️ Pico', precio: 1200 },
  katana_maldita: { nombre: '🗡️ Katana maldita', precio: 3000 },
  cristal_dominio: { nombre: '💎 Cristal de dominio', precio: 8000 },
}

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
          `*Precio:* ${item.precio} Fragmentos\n` +
          `*Bolsillo:* ${eco.bolsillo} Fragmentos\n` +
          `*Te faltan:* ${faltante} Fragmentos`
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
        `*Precio pagado:* ${item.precio} Fragmentos\n` +
        `*Bolsillo restante:* ${eco.bolsillo - item.precio} Fragmentos\n\n` +
        `> El bonus ya aplica en tu próximo *.work*`
    })
  }
}