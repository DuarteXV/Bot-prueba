import { readdirSync, watch, existsSync, statSync } from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { log } from "./logger.js";

const plugins = new Map();
const PLUGINS_DIR = path.resolve("./plugins");

// Mapa para controlar los tiempos del debounce y evitar duplicados
const watchTimers = new Map();

export async function loadPlugins() {
  plugins.clear();
  await loadDir(PLUGINS_DIR);

  // 🔧 FIX: contar plugins únicos (por referencia de objeto), no aliases.
  // "plugins.size" cuenta cada alias como entrada separada del Map,
  // así que un comando con 2 nombres se contaba como 2 comandos.
  const uniquePlugins = new Set(plugins.values());
  log.ok(`Plugins cargados: ${uniquePlugins.size} comandos (${plugins.size} alias)`);
}

async function loadDir(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }

  const tasks = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      tasks.push(loadDir(full));
    } else if (entry.name.endsWith(".js")) {
      tasks.push(loadPlugin(full));
    }
  }

  await Promise.all(tasks);
}

async function loadPlugin(filePath) {
  try {
    // 1. Asegurar que el archivo exista y no sea una carpeta fantasma
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) return;

    const url = pathToFileURL(filePath).href + `?t=${Date.now()}`;
    const mod = await import(url);

    if (!mod.default?.name || !mod.default?.run) {
      log.warn(`Plugin sin estructura válida: ${filePath}`);
      return;
    }

    // Limpiar comandos antiguos vinculados a este archivo para evitar duplicados en memoria
    for (const [key, val] of plugins.entries()) {
      if (val === mod.default) {
        plugins.delete(key);
      }
    }

    const names = Array.isArray(mod.default.name) ? mod.default.name : [mod.default.name];
    for (const n of names) {
      plugins.set(n.toLowerCase(), mod.default);
    }
  } catch (e) {
    log.error(`Error cargando plugin ${filePath}: ${e.message}`);
  }
}

export function watchPlugins() {
  // Escuchamos los cambios de forma recursiva
  watch(PLUGINS_DIR, { recursive: true }, (event, filename) => {
    if (!filename || !filename.endsWith(".js")) return;

    // Resolvemos la ruta de forma absoluta pase lo que pase
    const fullPath = path.resolve(PLUGINS_DIR, filename);

    // DEBOUNCE: Si el archivo cambia muchas veces seguidas, cancelamos el intento anterior
    if (watchTimers.has(fullPath)) {
      clearTimeout(watchTimers.get(fullPath));
    }

    // Esperamos 150ms a que el archivo se termine de escribir en el disco
    const timer = setTimeout(async () => {
      watchTimers.delete(fullPath);

      if (!existsSync(fullPath)) {
        // Si el archivo ya no existe, es porque se usó 'deleteplugin'. Lo barremos de la memoria.
        log.info(`Plugin eliminado del disco: ${filename}`);
        // Forzamos una recarga limpia para actualizar el mapa de comandos sin lo eliminado
        await loadPlugins();
        return;
      }

      log.info(`Plugin actualizado detectado: ${filename}`);
      await loadPlugin(fullPath);
    }, 150);

    watchTimers.set(fullPath, timer);
  });

  log.info("Hot-reload de plugins activo con soporte anti-duplicados");
}

export function getPlugins() {
  return plugins;
}