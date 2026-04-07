// lib/loader.js - Carga plugins desde carpetas
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { fileURLToPath, pathToFileURL } from 'url'
import chokidar from 'chokidar'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PLUGINS_DIR = path.resolve(__dirname, '../plugins')

export async function loadPlugins() {
  const plugins = {}
  let total = 0
  let errors = 0

  if (!fs.existsSync(PLUGINS_DIR)) {
    fs.mkdirSync(PLUGINS_DIR, { recursive: true })
  }

  // Recorrer todas las subcarpetas de plugins/
  const categories = fs.readdirSync(PLUGINS_DIR).filter((f) => {
    return fs.statSync(path.join(PLUGINS_DIR, f)).isDirectory()
  })

  for (const category of categories) {
    const categoryPath = path.join(PLUGINS_DIR, category)
    const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith('.js'))

    for (const file of files) {
      const filePath = path.join(categoryPath, file)
      const pluginKey = `${category}/${file.replace('.js', '')}`

      try {
        // Forzar recarga eliminando cache (ESM no tiene require.cache, usamos timestamp)
        const fileUrl = pathToFileURL(filePath).href + `?t=${Date.now()}`
        const mod = await import(fileUrl)
        const handler = mod.default

        if (typeof handler !== 'function') {
          console.warn(chalk.yellow(`[LOADER] ${pluginKey}: no exporta función por defecto`))
          continue
        }

        plugins[pluginKey] = handler
        total++
      } catch (e) {
        errors++
        console.error(chalk.red(`[LOADER ERROR] ${pluginKey}: ${e.message}`))
      }
    }
  }

  console.log(
    chalk.green(`[LOADER] ${total} plugins cargados`) +
    (errors ? chalk.red(` | ${errors} errores`) : '')
  )

  return plugins
}

// Watcher para recarga en caliente (desarrollo)
export function watchPlugins(onReload) {
  const watcher = chokidar.watch(PLUGINS_DIR, {
    ignored: /(^|[/\\])\../,
    persistent: true,
    ignoreInitial: true,
  })

  watcher.on('change', async (filePath) => {
    console.log(chalk.cyan(`[HOT RELOAD] Cambio detectado: ${filePath}`))
    if (typeof onReload === 'function') {
      const count = await onReload()
      console.log(chalk.green(`[HOT RELOAD] ${count} plugins recargados`))
    }
  })

  watcher.on('add', async (filePath) => {
    console.log(chalk.cyan(`[HOT RELOAD] Nuevo plugin: ${filePath}`))
    if (typeof onReload === 'function') await onReload()
  })

  return watcher
}
