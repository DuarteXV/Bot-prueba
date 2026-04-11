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

  const categories = fs.readdirSync(PLUGINS_DIR).filter((f) =>
    fs.statSync(path.join(PLUGINS_DIR, f)).isDirectory()
  )

  for (const category of categories) {
    const categoryPath = path.join(PLUGINS_DIR, category)
    const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith('.js'))

    for (const file of files) {
      const filePath = path.join(categoryPath, file)
      const pluginKey = `${category}/${file.replace('.js', '')}`

      try {
        const fileUrl = pathToFileURL(filePath).href + `?t=${Date.now()}`
        const mod = await import(fileUrl)
        const handler = mod.default

        if (typeof handler !== 'function') {
          console.warn(chalk.yellow(`[LOADER] ${pluginKey}: no exporta función por defecto`))
          continue
        }

        plugins[pluginKey] = handler
        total++
        console.log(chalk.gray(`[LOADER] ✔ ${pluginKey}`))
      } catch (e) {
        errors++
        console.error(chalk.red(`[LOADER ERROR] ${pluginKey}:`), e)
      }
    }
  }

  console.log(
    chalk.green(`[LOADER] ${total} plugins cargados`) +
    (errors ? chalk.red(` | ${errors} errores`) : '')
  )

  return plugins
}

export function watchPlugins(onReload) {
  const watcher = chokidar.watch(PLUGINS_DIR, {
    ignored: /(^|[/\\])\../,
    persistent: true,
    ignoreInitial: true,
  })

  const reload = async (filePath, event) => {
    console.log(chalk.cyan(`[HOT RELOAD] ${event}: ${filePath}`))
    if (typeof onReload === 'function') {
      const plugins = await onReload()
      console.log(chalk.green(`[HOT RELOAD] ${Object.keys(plugins).length} plugins recargados`))
    }
  }

  watcher.on('change', (f) => reload(f, 'Cambio'))
  watcher.on('add', (f) => reload(f, 'Nuevo'))
  watcher.on('unlink', (f) => reload(f, 'Eliminado'))

  return watcher
}