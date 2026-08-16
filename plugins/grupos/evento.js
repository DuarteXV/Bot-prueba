function getTimeZoneOffsetMinutes(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  const parts = dtf.formatToParts(date);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  const asUTC = Date.UTC(
    map.year, map.month - 1, map.day,
    map.hour === "24" ? 0 : map.hour, map.minute, map.second
  );
  return (asUTC - date.getTime()) / 60000;
}

function cubaTimeToUtc(year, month, day, hour, minute) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const offsetMinutes = getTimeZoneOffsetMinutes(new Date(utcGuess), "America/Havana");
  return new Date(utcGuess - offsetMinutes * 60000);
}

export default {
  name: ["evento"],
  description: "Crea un evento de grupo con RSVP (hora de Cuba)",
  category: "grupos",
  groupOnly: true,
  adminOnly: true,

  async run({ sock, from, text, reply }) {
    if (!text) {
      return await reply({
        text: "『📅』*Uso:* .evento nombre | descripción | DD/MM/AAAA HH:MM\n\n*Ejemplo:*\n.evento Reunión semanal | Hablamos del roadmap | 20/08/2026 19:00\n\n_La hora se interpreta como hora de Cuba._"
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
    const startDate = cubaTimeToUtc(year, month, day, hour, minute);

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