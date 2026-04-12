const config = {
  botName: 'Hajime Nagumo',
  prefix: '.',

  ownerNumber: ['573135180876'],
['50498273976'],

  channelJid: '120363420979328566@newsletter',
  channelName: '⏤͟͞ू⃪𝐁𝕃𝐔𝔼 𝐋𝕆𝐂𝕂 𝐂𝕃𝐔𝔹 𑁯🩵ᰍ',
  channelInviteLink: 'https://whatsapp.com/channel/0029Vb73g1r1NCrTbefbFQ2T',
  channelThumbUrl: 'https://raw.githubusercontent.com/DuarteXV/Yotsuba-MD-Premium/main/uploads/d528f18702dbed84.jpg',

  subBots: [],
  tmpDir: './tmp',
  dbPath: './database/db.json',
  dbBackupPath: './database/backup',
  saveInterval: 5,
  rateLimit: 20,
}

// Singleton global — todos los módulos comparten la misma referencia
if (!global._config) global._config = config
export default global._config