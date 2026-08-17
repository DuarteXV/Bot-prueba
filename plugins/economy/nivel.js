import { xpProgress } from "../../core/xp.js";
import { db } from "../../database/db.js";

export default {
  name: ["nivel", "rank", "xp"],
  description: "Muestra tu nivel y XP",
  category: "economia",

  async run({ sender, reply }) {
    const user = db.getUser(sender);
    const { level, xp, missing } = xpProgress(user.xp || 0);

    await reply({
      text: `『⭐』*Nivel:* ${level}\n*XP:* ${xp}\n*Faltan:* ${missing} XP para nivel ${level + 1}`
    });
  }
};