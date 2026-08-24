import { inspect } from "util";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { db } from "../../database/db.js";

export default {
  name: ["eval", "exec", ">"],
  description: "Evalúa código JavaScript",
  category: "owner",
  ownerOnly: true,

  async run(ctx) {
    const { reply, text, sock, from, msg } = ctx;
    if (!text?.trim()) return reply({ text: "❌ Sin código que evaluar." });

    const exec = (code) => eval(`(async () => { ${code} })()`);

    try {
      let result;
      try {
        result = await exec(`return (${text})`);
      } catch (e) {
        if (!(e instanceof SyntaxError)) throw e;
        result = await exec(text);
      }

      const out =
        typeof result === "string" ? result : inspect(result, { depth: 2 });

      await reply({
        text: `✅ *Resultado:*\n\`\`\`${out.slice(0, 4000) || "undefined"}\`\`\``,
      });
    } catch (e) {
      await reply({ text: `❌ *Error:*\n\`\`\`${e?.stack ?? e}\`\`\`` });
    }
  },
};