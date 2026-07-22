import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(projectRoot, "site");
const outputRoot = path.join(projectRoot, "dist");
const excludedNames = new Set([".functions", "_worker.js", "functions", "node_modules", "budget.html"]);

// Keep the original figures in the private source, but redact monetary values
// from every deployed HTML page until this switch is deliberately removed.
const feePrivacyInjection = `
<style id="fee-privacy">[class*="price"],[class*="amount"],[class*="budget"],[class*="fee"],[class*="cost"],[id*="price"],[id*="amount"],[id*="budget"],[id*="fee"],[id*="cost"]{visibility:hidden!important}</style>
<script id="fee-privacy-script">(()=>{const money=/(?:[¥￥]\\s*\\d[\\d,.]*(?:\\s*[-~至]\\s*[¥￥]?\\s*\\d[\\d,.]*)?\\s*(?:元|人民币)?|\\d[\\d,.]*\\s*(?:元|人民币|MYR|RM|马币|泰铢|THB|SGD|CNY)(?:\\s*[-~至]\\s*\\d[\\d,.]*\\s*(?:元|人民币|MYR|RM|马币|泰铢|THB|SGD|CNY))?)/gi;const section=/(费用|预算|价格|报价|总价|人均|每人|收费|罚款|押金|税费|服务费)/i;function redact(root=document){root.querySelectorAll('[class*="price"],[class*="amount"],[class*="budget"],[class*="fee"],[class*="cost"],[id*="price"],[id*="amount"],[id*="budget"],[id*="fee"],[id*="cost"]').forEach(e=>e.style.visibility='hidden');root.querySelectorAll('table').forEach(t=>{if(section.test(t.textContent))t.querySelectorAll('td,th').forEach(c=>{if(/\\d/.test(c.textContent))c.style.visibility='hidden'});});const w=document.createTreeWalker(root.body||root,NodeFilter.SHOW_TEXT);const ns=[];while(w.nextNode())ns.push(w.currentNode);ns.forEach(n=>{if(money.test(n.nodeValue))n.nodeValue=n.nodeValue.replace(money,'已隐藏')});}redact();new MutationObserver(()=>redact()).observe(document.documentElement,{subtree:true,childList:true});})();</script>`;

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
    else if (entry.isFile()) {
      if (entry.name.toLowerCase().endsWith(".html")) {
        const html = await readFile(sourcePath, "utf8");
        const deployed = html.includes("</head>")
          ? html.replace("</head>", `${feePrivacyInjection}</head>`)
          : `${feePrivacyInjection}${html}`;
        await writeFile(outputPath, deployed, "utf8");
      } else await copyFile(sourcePath, outputPath);
    }
  }
}

await rm(outputRoot, { recursive: true, force: true });
await copyDirectory(sourceRoot, outputRoot);
console.log("Static build complete: site/ -> dist/ (legacy workers and nested functions excluded).");
