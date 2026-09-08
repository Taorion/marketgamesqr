const fs = require("node:fs");
const path = require("node:path");

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath || !outputPath) {
  throw new Error("Uso: node scripts/generate-gos-cultivation-content.js <entrada.md> <salida.js>");
}

const source = fs.readFileSync(path.resolve(inputPath), "utf8").replace(/^\uFEFF/, "");
const target = path.resolve(outputPath);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `window.GOS_CULTIVATION_SOURCE = ${JSON.stringify(source)};\n`, "utf8");
console.log(`Contenido generado: ${target}`);
