import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(projectRoot, "site");
const outputRoot = path.join(projectRoot, "dist");
const excludedNames = new Set([".functions", "_worker.js", "functions", "node_modules", "budget.html"]);

async function copyDirectory(source, output) {
  await mkdir(output, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name, "en"));

  for (const entry of entries) {
    if (excludedNames.has(entry.name)) continue;
    if (entry.isSymbolicLink()) {
      throw new Error("Static source must not contain symbolic links");
    }

    const sourcePath = path.join(source, entry.name);
    const outputPath = path.join(output, entry.name);
    if (entry.isDirectory()) await copyDirectory(sourcePath, outputPath);
    else if (entry.isFile()) await copyFile(sourcePath, outputPath);
  }
}

await rm(outputRoot, { recursive: true, force: true });
await copyDirectory(sourceRoot, outputRoot);
console.log("Static build complete: site/ -> dist/ (legacy workers and nested functions excluded).");
