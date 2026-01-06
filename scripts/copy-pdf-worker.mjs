import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const pdfjsDistPath = path.dirname(
    fileURLToPath(import.meta.resolve("pdfjs-dist/package.json"))
);

const src = path.join(pdfjsDistPath, "build", "pdf.worker.mjs");
const destDir = path.join(process.cwd(), "public");
const dest = path.join(destDir, "pdf.worker.mjs");

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);

console.log(`Copied pdf.worker.mjs to ${dest}`);