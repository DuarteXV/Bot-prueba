import axios from "axios"

export default {
  name: ["chatgpt", "gpt", "ia"],
  description: "Conversa con ChatGPT",
  category: "ia",
  ownerOnly: false,
  async run({ sock, from, msg, text, reply, react }) {
    if (!text) {
      return reply("¿Qué querés preguntarle a ChatGPT? Ej: *.chatgpt hola, cómo estás*")
    }

    try {
      await react("🤖")

      const { data } = await axios.get("https://api.alyacore.xyz/ai/chatgpt", {
        params: {
          text,
          key: "Duarte-zz12"
        }
      })

      if (!data.status || !data.result) {
        await react("❌")
        return reply("No pude obtener respuesta de ChatGPT, intentá de nuevo.")
      }

      await reply(data.result)
      await react("✅")
    } catch (err) {
      console.error(err)
      await react("❌")
      reply("Ocurrió un error al conectar con la API de ChatGPT.")
    }
  }
}