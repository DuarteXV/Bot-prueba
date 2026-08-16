export default {
  name: ["evento"],
  description: "Crea un evento de grupo con RSVP",
  category: "grupos",
  groupOnly: true,
  adminOnly: true,

  async run({ sock, from, text, reply }) {
    if (!text) {
      return await reply({
        text: "『📅』*Uso:* .evento nombre | descripción | DD/MM/AAAA HH:MM\n\n*Ejemplo:*\n.evento Reunión semanal | Hablamos del roadmap | 20/08/2026 19:00"
      });
    }

    const [name, description, dateStr] = text.split("|").map((s) => s.trim());

    if (!name || !dateStr) {
      return await reply({
        text: "『📅』Faltan datos. Usá: .evento nombre | descripción | DD/MM/AAAA HH:MM"
      });
    }

    const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
    if (!match) {
      return await reply({
        text: "『📅』Formato de fecha inválido. Usá DD/MM/AAAA HH:MM"
      });
    }

    const [, day, month, year, hour, minute] = match.map(Number);
    const startDate = new Date(year, month - 1, day, hour, minute);

    if (isNaN(startDate.getTime()) || startDate.getTime() < Date.now()) {
      return await reply({
        text: "『📅』La fecha es inválida o ya pasó."
      });
    }

    try {
      await sock.sendMessage(from, {
        event: {
          name,
          description: description || "",
          startDate,
          extraGuestsAllowed: true
        }
      });
    } catch (e) {
      await reply({ text: `❌ No se pudo crear el evento:\n${e.message}` });
    }
  }
};