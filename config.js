const config = {
  // ══════════════════════════════
  //        BOT PRINCIPAL
  // ══════════════════════════════
  botName: "Malachar",
  botVersion: "1.0.0",
  prefix: "/",

  // ══════════════════════════════
  //          OWNER
  // ══════════════════════════════
  owner: ["573135180876"],
  ownerName: "Owner",

  // ══════════════════════════════
  //          CANAL
  // ══════════════════════════════
  // Edita con /setchannel <link>
  channelLink: "https://whatsapp.com/channel/XXXXXXXXXX",
  channelJid: "", // se llena automático al usar /setchannel

  // ══════════════════════════════
  //          MENÚ
  // ══════════════════════════════
  // Edita con /setbanner <imagen adjunta>
  bannerUrl: "",

  // ══════════════════════════════
  //          SUBBOTS
  // ══════════════════════════════
  maxSubbots: 100,

  // JID del grupo donde se permite /code
  // Formato: 1234567890-1234567890@g.us
  subbotGroup: "XXXXXXXXXX-XXXXXXXXXX@g.us",

  // ══════════════════════════════
  //          SESIÓN
  // ══════════════════════════════
  sessionFolder: "./session",
  tmpFolder: "./tmp",
}

export default config
