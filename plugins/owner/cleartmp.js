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
      const files = fs.readdirSync(TMP_DIR);
      let borrados = 0;
      let totalBytes = 0;

      for (const file of files) {
        const filePath = path.join(TMP_DIR, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            totalBytes += stat.size;
            fs.unlinkSync(filePath);
            borrados++;
          }
        } catch {}
      }

      const mb = (totalBytes / 1024 / 1024).toFixed(2);
      await reply({ text: `🧹 Se borraron *${borrados}* archivo(s) de tmp (${mb} MB liberados).` });

      if (global.gc) global.gc();
    } catch (e) {
      await reply({ text: `❌ Error limpiando tmp: ${e.message}` });
    }
  }
};