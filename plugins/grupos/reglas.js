import { generateWAMessageFromContent } from "@whiskeysockets/baileys";

const REGLAS = {
  spam: "🚫 *Reglas de spam:*\n- No mandar links sin permiso\n- No flood de mensajes\n- No cadenas ni reenvíos masivos",
  respeto: "🤝 *Reglas de respeto:*\n- Nada de insultos graves\n- Nada de discriminación\n- Resolver conflictos en privado, no en el grupo",
  venta: "💰 *Reglas de venta:*\n- Prohibido vender/promocionar sin autorización\n- Nada de esquemas piramidales\n- Consultar con un admin antes de publicitar algo"
};

export default {
  name: ["reglas"],
  description: "Muestra el menú de reglas del grupo",
  category: "grupos",
  groupOnly: true,

  async run({ sock, from, msg, args, usedPrefix, reply }) {
    const categoria = args[0]?.toLowerCase();

    if (categoria && REGLAS[categoria]) {
      return await reply({ text: REGLAS[categoria] });
    }

    const content = {
      interactiveMessage: {
        body: { text: "📋 Elegí una categoría de reglas para ver el detalle:" },
        footer: { text: "Yuta Bot" },
        nativeFlowMessage: {
          buttons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "Ver categorías",
                sections: [
                  {
                    title: "Categorías de reglas",
                    rows: [
                      { title: "Spam", description: "Reglas sobre links y flood", id: `${usedPrefix}reglas spam` },
                      { title: "Respeto", description: "Convivencia en el grupo", id: `${usedPrefix}reglas respeto` },
                      { title: "Venta", description: "Publicidad y promociones", id: `${usedPrefix}reglas venta` }
                    ]
                  }
                ]
              })
            }
          ]
        }
      }
    };

    const m = generateWAMessageFromContent(from, content, { quoted: msg, userJid: sock.user.id });
    await sock.relayMessage(from, m.message, { messageId: m.key.id });
  }
};