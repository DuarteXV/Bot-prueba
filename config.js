// config.js - Configuración central del bot
export default {
  // Info del bot
  botName: 'MyBot',
  prefix: '.',

  // Números de owner (formato: número@s.whatsapp.net)
  ownerNumber: ['573135180876@s.whatsapp.net'],

  // Canal de WhatsApp (newsletter JID)
  // Formato: 120363XXXXXXXXXX@newsletter
  channelJid: '',

  // Configuración de subbots
  // Cada subbot es una sesión adicional que se conecta al bot principal
  subBots: [
    // { name: 'SubBot1', sessionPath: './sessions/sub1' },
    // { name: 'SubBot2', sessionPath: './sessions/sub2' },
  ],

  // Carpeta temporal
  tmpDir: './tmp',

  // DB
  dbPath: './database/db.json',
  dbBackupPath: './database/backup',

  // Guardar DB cada X minutos
  saveInterval: 5,

  // Límite de mensajes por usuario por minuto (anti-spam)
  rateLimit: 20,
}
