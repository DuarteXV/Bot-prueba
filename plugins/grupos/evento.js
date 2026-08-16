const TIMEZONES = {
  cuba: "America/Havana",
  colombia: "America/Bogota",
  mexico: "America/Mexico_City",
  argentina: "America/Argentina/Buenos_Aires",
  chile: "America/Santiago",
  peru: "America/Lima",
  venezuela: "America/Caracas",
  ecuador: "America/Guayaquil",
  bolivia: "America/La_Paz",
  paraguay: "America/Asuncion",
  uruguay: "America/Montevideo",
  panama: "America/Panama",
  "costa rica": "America/Costa_Rica",
  guatemala: "America/Guatemala",
  honduras: "America/Tegucigalpa",
  "el salvador": "America/El_Salvador",
  nicaragua: "America/Managua",
  "republica dominicana": "America/Santo_Domingo",
  españa: "Europe/Madrid",
  usa: "America/New_York",
  "estados unidos": "America/New_York"
};

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

function localTimeToUtc(year, month, day, hour, minute, timeZone) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const offsetMinutes = getTimeZoneOffsetMinutes(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offsetMinutes * 60000);
}

export default {
  name: ["evento"],
  description: "Crea un evento de grupo con RSVP",
  category: "grupos",
  groupOnly: true,
  adminOnly: true,

  async run({ sock, from, text, reply }) {
    if (!text) {
      return await reply({
        text: `『📅』*Uso:* .evento nombre | descripción | DD/MM/AAAA HH:MM | país\n\n*Ejemplo:*\n.evento Reunión | Charla semanal | 20/08/2026 19:00 | colombia\n\n*Países soportados:*\n${Object.keys(TIMEZONES).join(", ")}\n\n_También aceptás una zona IANA directa (ej: America/Bogota)._`
      });
    }

    const [name, description, dateStr, tzArg] = text.split("|").map((s) => s.trim());

    if (!name || !dateStr) {
      return await reply({
        text: "『📅』Faltan datos. Usá: .evento nombre | descripción | DD/MM/AAAA HH:MM | país"
      });
    }

    const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
    if (!match) {
      return await reply({
        text: "『📅』Formato de fecha inválido. Usá DD/MM/AAAA HH:MM"
      });
    }

    const timeZone = tzArg
      ? TIMEZONES[tzArg.toLowerCase()] || tzArg
      : "America/Havana";

    try {
      new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    } catch {
      return await reply({
        text: `『📅』No reconozco esa zona horaria: "${tzArg}".\n\n*Países soportados:*\n${Object.keys(TIMEZONES).join(", ")}`
      });
    }

    const [, day, month, year, hour, minute] = match.map(Number);
    const startDate = localTimeToUtc(year, month, day, hour, minute, timeZone);

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