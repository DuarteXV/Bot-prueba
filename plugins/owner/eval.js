import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { db } from "../../database/db.js";

export default {
  name: ["eval", "exec", ">"],
  description: "Evalúa código JavaScript",
  category: "owner",
  ownerOnly: true,

  async run({ reply, text, sock, from, msg }) {
    try {
      let result = await eval(`(async () => { return ${text} })()`);

      if (result === undefined) result = "undefined";
      if (typeof result !== "string")
        result = JSON.stringify(result, null, 2);

      await reply({
        text: `✅ *Resultado:*\n\`\`\`${result}\`\`\``
      });
    } catch (e) {
      await reply({
        text: `❌ *Error:*\n\`\`\`${e.message}\`\`\``
      });
    }
  },
};