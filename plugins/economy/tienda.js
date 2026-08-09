export default {
  name: ['tienda', 'shop'],
  description: 'Muestra los items disponibles para comprar',
  category: 'economy',
  ownerOnly: false,

  async run({ reply, react }) {
    await react('🛒')
    await reply({
      text: `🛒 *Tienda de Fragmentos*\n` +
        `╰━━━━━━(☆)━━━━━━─╮\n\n` +
        `*🪏 Pala*\n` +
        `   💰 Precio: 500 Fragmentos\n` +
        `   ⚡ Bonus: +50 Fragmentos por trabajo\n` +
        `   🆔 ID: \`pala\`\n\n` +
        `*⛏️ Pico*\n` +
        `   💰 Precio: 1.200 Fragmentos\n` +
        `   ⚡ Bonus: +120 Fragmentos por trabajo\n` +
        `   🆔 ID: \`pico\`\n\n` +
        `*🗡️ Katana maldita*\n` +
        `   💰 Precio: 3.000 Fragmentos\n` +
        `   ⚡ Bonus: +300 Fragmentos por trabajo\n` +
        `   🆔 ID: \`katana_maldita\`\n\n` +
        `*💎 Cristal de dominio*\n` +
        `   💰 Precio: 8.000 Fragmentos\n` +
        `   ⚡ Bonus: +600 Fragmentos por trabajo\n` +
        `   🆔 ID: \`cristal_dominio\`\n\n` +
        `> Usá *.comprar <ID>* para comprar un item`
    })
  }
}