import fs from "fs";
import path from "path";

const TMP_DIR = path.resolve("./tmp");

export default {
  name: ["cleartmp", "limpiartmp"],
  description: "Borra los archivos temporales de la carpeta tmp",
  category: "owner",
  ownerOnly: true,

  async run({ reply }) {
    if (!fs.existsSync(TMP_DIR)) {
      return await reply({ text: `⚠️ La carpeta tmp no existe: \`${TMP_DIR}\`` });
    }

    try {
      const entries = fs.readdirSync(TMP_DIR, { withFileTypes: true });
      let borrados = 0;

      for (const entry of entries) {
        const fullPath = path.join(TMP_DIR, entry.name);
        try {
          if (entry.isDirectory()) {
            fs.rmSync(fullPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(fullPath);
          }
          borrados++;
        } catch {}
      }

      await reply({ text: `🧹 Se borraron *${borrados}* elemento(s) de tmp (archivos y carpetas).` });

      if (global.gc) global.gc();
    } catch (e) {
      await reply({ text: `❌ Error limpiando tmp: ${e.message}` });
    }
  }
};