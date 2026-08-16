import { db } from "../database/db.js";

export default {
  name: ["antilink"],
  description: "Activa o desactiva el antilink del grupo",
  category: "grupos",
  groupOnly: true,
  adminOnly: true,

  async run({ from, args, reply }) {
    const opcion = args[0]?.toLowerCase();

    if (!["on", "off"].includes(opcion)) {
      const estado = db.getGroup(from).antilink ? "activado ✅" : "desactivado ❌";
      return await reply({
        text: `『🔗』Antilink está *${estado}*.\n> Usa *.antilink on* o *.antilink off*`
      });
    }

    db.setGroup(from, { antilink: opcion === "on" });

    return await reply({
      text: `『🔗』Antilink ${opcion === "on" ? "activado ✅" : "desactivado ❌"}.`
    });
  }
};