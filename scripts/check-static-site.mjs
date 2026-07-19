import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(import.meta.dirname, "..");
const requestedRoot = process.argv[2] ?? "site";
if (!new Set(["site", "dist"]).has(requestedRoot)) {
  throw new Error("Check root must be either site or dist");
}
const contentRoot = path.join(projectRoot, requestedRoot);
const checkedExtensions = new Set([".html", ".htm", ".css"]);

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const absolute = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(absolute) : [absolute];
    }),
  );
  return nested.flat();
}

function toContentPath(absolute) {
  return path.relative(contentRoot, absolute).split(path.sep).join("/");
}

function extractReferences(contents, extension) {
  const references = [];
  const attributePattern = /\b(?:href|src|poster|action)\s*=\s*(["'])(.*?)\1/gis;
  for (const match of contents.matchAll(attributePattern)) references.push(match[2]);

  const srcsetPattern = /\bsrcset\s*=\s*(["'])(.*?)\1/gis;
  for (const match of contents.matchAll(srcsetPattern)) {
    for (const candidate of match[2].split(",")) {
      const reference = candidate.trim().split(/\s+/, 1)[0];
      if (reference) references.push(reference);
    }
  }

  const cssUrlPattern = /url\(\s*(["']?)(.*?)\1\s*\)/gis;
  if (extension === ".css") {
    for (const match of contents.matchAll(cssUrlPattern)) references.push(match[2]);
  } else {
    const inlineCssPattern = /<style\b[^>]*>([\s\S]*?)<\/style>|\bstyle\s*=\s*(["'])(.*?)\2/gis;
    for (const inlineMatch of contents.matchAll(inlineCssPattern)) {
      const css = inlineMatch[1] ?? inlineMatch[3] ?? "";
      for (const urlMatch of css.matchAll(cssUrlPattern)) references.push(urlMatch[2]);
    }
  }
  return references;
}

function isLocalReference(reference) {
  const value = reference.trim();
  if (!value || value.startsWith("#") || value.startsWith("//")) return false;
  if (/[{}]|<%|%>/.test(value)) return false;
  return !/^[a-z][a-z\d+.-]*:/i.test(value);
}

function resolveReference(sourcePath, rawReference) {
  const withoutFragment = rawReference.split("#", 1)[0].split("?", 1)[0];
  let decoded;
  try {
    decoded = decodeURIComponent(withoutFragment);
  } catch {
    return { error: "invalid-encoding" };
  }
  decoded = decoded.replaceAll("\\", "/");
  const sourceDirectory = path.posix.dirname(sourcePath);
  const relative = decoded.startsWith("/")
    ? decoded.slice(1)
    : path.posix.join(sourceDirectory, decoded);
  const normalized = path.posix.normalize(relative).replace(/^\.\//, "");
  if (normalized === ".." || normalized.startsWith("../")) {
    return { error: "outside-site" };
  }
  return { path: normalized };
}

function possibleTargets(referencePath) {
  if (!referencePath || referencePath === ".") return ["index.html"];
  const targets = [referencePath];
  if (referencePath.endsWith("/")) targets.push(`${referencePath}index.html`);
  if (!path.posix.extname(referencePath)) {
    targets.push(`${referencePath}.html`, `${referencePath}/index.html`);
    const functionPath = referencePath.replace(/^api\//, "functions/api/");
    if (functionPath !== referencePath) {
      targets.push(`${functionPath}.js`, `${functionPath}/index.js`);
    }
  }
  return targets;
}

function findingId(sourcePath, reference, reason) {
  return createHash("sha256")
    .update(`${sourcePath}\0${reference}\0${reason}`)
    .digest("hex")
    .slice(0, 12);
}

async function main() {
  if (!(await stat(contentRoot)).isDirectory()) throw new Error("Static content directory is missing");

  const files = await listFiles(contentRoot);
  const sitePaths = new Set(files.map(toContentPath));
  const functionsRoot = path.join(projectRoot, "functions");
  try {
    for (const file of await listFiles(functionsRoot)) {
      sitePaths.add(`functions/${path.relative(functionsRoot, file).split(path.sep).join("/")}`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const sourceFiles = files.filter((file) => checkedExtensions.has(path.extname(file).toLowerCase()));
  const findings = [];
  let referenceCount = 0;

  for (const source of sourceFiles) {
    const sourcePath = toContentPath(source);
    const extension = path.extname(source).toLowerCase();
    const contents = await readFile(source, "utf8");
    for (const reference of extractReferences(contents, extension)) {
      if (!isLocalReference(reference)) continue;
      referenceCount += 1;
      const resolved = resolveReference(sourcePath, reference);
      if (resolved.error) {
        findings.push({ id: findingId(sourcePath, reference, resolved.error), reason: resolved.error });
        continue;
      }
      if (!possibleTargets(resolved.path).some((candidate) => sitePaths.has(candidate))) {
        findings.push({ id: findingId(sourcePath, reference, "missing"), reason: "missing" });
      }
    }
  }

  if (findings.length) {
    const uniqueFindings = [...new Map(findings.map((finding) => [finding.id, finding])).values()];
    const totals = new Map();
    for (const finding of uniqueFindings) {
      const entries = totals.get(finding.reason) ?? [];
      entries.push(finding);
      totals.set(finding.reason, entries);
    }
    console.error(`Static-site check failed: ${uniqueFindings.length} invalid local reference(s).`);
    for (const [reason, entries] of totals) {
      console.error(`- ${reason}: ${entries.length}; finding IDs: ${entries.map(({ id }) => id).join(", ")}`);
    }
    console.error("Finding IDs intentionally replace paths and URLs to keep CI logs free of private data.");
    process.exitCode = 1;
    return;
  }

  console.log(`Static-site check passed: ${sourceFiles.length} document(s), ${referenceCount} local reference(s).`);
  console.log(`Checked directory: ${requestedRoot}/`);
}

try {
  await main();
} catch {
  console.error("Static-site check could not complete; paths and error details are suppressed for privacy.");
  process.exitCode = 1;
}
