// plugins/owner/sistema.js
import { backupDB } from '../../lib/database.js'
import { cleanTmp } from '../../lib/utils.js'
import config from '../../config.js'

const handler = async ({ command, args, reply, db, saveDB, senderNumber, user }) => {

  // ── ban ──────────────────────────────────────────────────────────────────
  if (command === 'ban') {
    const target = args[0]?.replace(/[^0-9]/g, '')
    if (!target) return reply('❌ Uso: .ban <número>')

    if (!db.users[target]) return reply('❌ Usuario no encontrado en DB')
    db.users[target].banned = true
    await saveDB()
    return reply(`✅ *${target}* ha sido baneado`)
  }

  // ── unban ─────────────────────────────────────────────────────────────────
  if (command === 'unban') {
    const target = args[0]?.replace(/[^0-9]/g, '')
    if (!target) return reply('❌ Uso: .unban <número>')

    if (!db.users[target]) return reply('❌ Usuario no encontrado')
    db.users[target].banned = false
    await saveDB()
    return reply(`✅ *${target}* desbaneado`)
  }

  // ── backup ────────────────────────────────────────────────────────────────
  if (command === 'backup') {
    await saveDB()
    const backupPath = await backupDB()
    return reply(backupPath
      ? `✅ Backup creado:\n\`${backupPath}\``
      : '❌ Error creando backup'
    )
  }

  // ── limpiar / cleantmp ────────────────────────────────────────────────────
  if (command === 'limpiar' || command === 'cleantmp') {
    cleanTmp()
    return reply('✅ Carpeta tmp limpiada')
  }

  // ── stats ─────────────────────────────────────────────────────────────────
  if (command === 'stats') {
    const banned = Object.values(db.users).filter(u => u.banned).length
    const premium = Object.values(db.users).filter(u => u.premium).length
    return reply(
      `📊 *Estadísticas DB*\n` +
      `• Usuarios: ${Object.keys(db.users).length}\n` +
      `• Baneados: ${banned}\n` +
      `• Premium: ${premium}\n` +
      `• Mensajes totales: ${db.stats.totalMessages}`
    )
  }

  // ── addpremium ────────────────────────────────────────────────────────────
  if (command === 'addpremium') {
    const target = args[0]?.replace(/[^0-9]/g, '')
    if (!target) return reply('❌ Uso: .addpremium <número>')
    if (!db.users[target]) return reply('❌ Usuario no encontrado')
    db.users[target].premium = true
    await saveDB()
    return reply(`⭐ *${target}* ahora es premium`)
  }

  // ── rempremium ────────────────────────────────────────────────────────────
  if (command === 'rempremium') {
    const target = args[0]?.replace(/[^0-9]/g, '')
    if (!target) return reply('❌ Uso: .rempremium <número>')
    if (!db.users[target]) return reply('❌ Usuario no encontrado')
    db.users[target].premium = false
    await saveDB()
    return reply(`✅ Premium removido de *${target}*`)
  }
}

handler.command = ['ban', 'unban', 'backup', 'limpiar', 'cleantmp', 'stats', 'addpremium', 'rempremium']
handler.tags = ['owner']
handler.help = ['ban <num>', 'unban <num>', 'backup', 'limpiar', 'stats', 'addpremium <num>', 'rempremium <num>']
handler.owner = true

export default handler
