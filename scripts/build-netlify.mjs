import { createHash } from "node:crypto";
import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import CleanCSS from "clean-css";
import { minify } from "terser";
import {
  buildHomeStructuredData,
  buildLinksStructuredData
} from "./structured-data.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const OUT = path.join(ROOT, "dist");

const PUBLIC_FILES = [
  "index.html",
  "robots.txt",
  "sitemap.xml",
  "products.json",
  "links/index.html",
  "assets/css/styles.css",
  "assets/css/links.css",
  "assets/js/trusted-types.js",
  "assets/js/analytics.js",
  "assets/js/config.js",
  "assets/js/data.js",
  "assets/js/app.js",
  "assets/js/links.js",
  "assets/pdf/mini-guida-oli-comeleapi.pdf",
  "assets/img/logo-comeleapi.png",
  "assets/img/logo-comeleapi-256.png",
  "assets/img/logo-comeleapi-512.png",
  "assets/img/logo-comeleapi-1024.png",
  "assets/img/logo-comeleapi-96.webp",
  "assets/img/logo-comeleapi-256.webp",
  "assets/img/signatures/sara-bordenga-signature-320.webp",
  "assets/img/signatures/sara-bordenga-signature.webp"
];

const PUBLIC_HERO_FILES = new Set([
  "hero-massaggio-professionale-comeleapi-mobile.webp",
  "hero-massaggio-professionale-comeleapi.webp",
  "hero-comeleapi-botanica.jpg",
  "hero-massage-sara.jpg"
]);

const PUBLIC_DECOR_FILES = new Set([
  "lavanda.webp",
  "eucalipto.webp",
  "resina.webp"
]);

const LINKS_ICON_PNGS = new Set([
  "icon-scroll.png",
  "icon-download-v3.png",
  "icon-arrow.png",
  "icon-seal.png",
  "icon-drop.png",
  "icon-hands.png",
  "icon-community.png",
  "social-whatsapp.png",
  "social-instagram.png"
]);

const PUBLIC_FONT_FILES = new Set([
  "cormorant-garamond-variable-latin.woff2",
  "cormorant-garamond-italic-variable-latin.woff2",
  "mulish-variable-latin.woff2"
]);

const FORBIDDEN_OUTPUTS = [
  "server.js",
  "package.json",
  "package-lock.json",
  "render.yaml",
  "admin.html",
  "login.html",
  "admin.webmanifest",
  "sw.js",
  "data",
  "supabase",
  "scripts",
  "output",
  ".env"
];

// Il lookbehind evita di trattare il segmento `/assets/...` di un URL assoluto
// (per esempio un'immagine Open Graph) come un riferimento locale relativo.
const ASSET_REFERENCE_RE = /(?<![A-Za-z0-9_./:-])(?:\.\.\/|\.\/)?(?:assets|foto-prodotti|fonts|img)\/[A-Za-z0-9_./-]+\.(?:woff2?|ttf|webp|png|jpe?g|pdf|json|css|js)(?:\?[^"'`\s)<>,]*)?/g;

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function copyRelative(relativePath) {
  const source = path.join(ROOT, relativePath);
  const destination = path.join(OUT, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

async function copyDirectoryFiltered(relativeDirectory, includeFile) {
  const sourceRoot = path.join(ROOT, relativeDirectory);
  const entries = await readdir(sourceRoot, { withFileTypes: true });
  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      await copyDirectoryFiltered(relativePath, includeFile);
    } else if (entry.isFile() && includeFile(entry.name, relativePath)) {
      await copyRelative(relativePath);
    }
  }
}

function shortHash(buffer) {
  return createHash("sha256").update(buffer).digest("hex").slice(0, 12);
}

async function fingerprintReferences(source, baseDirectory) {
  const replacements = new Map();
  for (const match of source.matchAll(ASSET_REFERENCE_RE)) {
    const rawUrl = match[0];
    const cleanUrl = rawUrl.split("?", 1)[0];
    const filePath = path.resolve(baseDirectory, cleanUrl);
    if (!filePath.startsWith(`${ROOT}${path.sep}`) || !(await exists(filePath))) continue;
    const fileHash = shortHash(await readFile(filePath));
    replacements.set(rawUrl, `${cleanUrl}?v=${fileHash}`);
  }
  let output = source;
  const orderedReplacements = [...replacements].sort(([left], [right]) => right.length - left.length);
  const placeholders = orderedReplacements.map(([, versionedUrl], index) => ({
    marker: `__COMELEAPI_ASSET_${index}__`,
    versionedUrl
  }));
  orderedReplacements.forEach(([rawUrl], index) => {
    output = output.split(rawUrl).join(placeholders[index].marker);
  });
  for (const { marker, versionedUrl } of placeholders) {
    output = output.split(marker).join(versionedUrl);
  }
  return output;
}

async function minifyJavaScript(relativePath, documentBase = ROOT) {
  const sourcePath = path.join(ROOT, relativePath);
  const destinationPath = path.join(OUT, relativePath);
  const source = await fingerprintReferences(await readFile(sourcePath, "utf8"), documentBase);
  const result = await minify(source, {
    compress: { passes: 2 },
    mangle: true,
    ecma: 2020,
    format: { comments: false }
  });
  if (!result.code) throw new Error(`Minificazione JavaScript fallita: ${relativePath}`);
  await writeFile(destinationPath, `${result.code}\n`);
}

async function minifyCss(relativePath) {
  const sourcePath = path.join(ROOT, relativePath);
  const source = await fingerprintReferences(
    await readFile(sourcePath, "utf8"),
    path.dirname(sourcePath)
  );
  const result = new CleanCSS({
    level: { 1: { specialComments: 0 }, 2: false },
    rebase: false
  }).minify(source);
  if (result.errors.length) {
    throw new Error(`Minificazione CSS fallita (${relativePath}): ${result.errors.join("; ")}`);
  }
  return result.styles;
}

async function transformCatalog() {
  const sourcePath = path.join(ROOT, "products.json");
  const products = JSON.parse(await readFile(sourcePath, "utf8"));
  for (const product of products) {
    if (typeof product.image === "string") {
      product.image = await fingerprintReferences(product.image, ROOT);
    }
    if (typeof product.icon === "string") {
      product.icon = await fingerprintReferences(product.icon, ROOT);
    }
  }
  await writeFile(path.join(OUT, "products.json"), `${JSON.stringify(products, null, 2)}\n`);
}

function injectStructuredData(html, structuredData) {
  const pattern = /(<script\s+id="structuredData"\s+type="application\/ld\+json">)[\s\S]*?(<\/script>)/;
  if (!pattern.test(html)) throw new Error("Blocco JSON-LD structuredData non trovato.");
  const serialized = JSON.stringify(structuredData, null, 2).replace(/</g, "\\u003c");
  return html.replace(pattern, `$1\n${serialized}\n  $2`);
}

async function transformHome(styles, structuredData) {
  const sourcePath = path.join(ROOT, "index.html");
  let html = await readFile(sourcePath, "utf8");
  html = injectStructuredData(html, structuredData);
  const stylesheetPattern = /\s*<link rel="stylesheet" href="assets\/css\/styles\.css\?[^\"]+" \/>/;
  if (!stylesheetPattern.test(html)) {
    throw new Error("Link al CSS principale non trovato in index.html");
  }
  const inlinedStyles = styles.split("../fonts/").join("assets/fonts/");
  html = html.replace(stylesheetPattern, `\n  <style data-source="assets/css/styles.css">${inlinedStyles}</style>`);
  html = await fingerprintReferences(html, OUT);
  await writeFile(path.join(OUT, "index.html"), html);
}

async function transformLinksPage(structuredData) {
  const sourcePath = path.join(ROOT, "links/index.html");
  const source = injectStructuredData(await readFile(sourcePath, "utf8"), structuredData);
  const html = await fingerprintReferences(
    source,
    path.join(OUT, "links")
  );
  await writeFile(path.join(OUT, "links/index.html"), html);
}

function resolveReferenceBase(filePath) {
  if (filePath.endsWith("links/index.html") || filePath.endsWith("assets/js/links.js")) {
    return path.join(OUT, "links");
  }
  if (filePath.endsWith(".css")) return path.dirname(filePath);
  return OUT;
}

async function assertReferencesExist(relativePaths) {
  const missing = new Set();
  for (const relativePath of relativePaths) {
    const filePath = path.join(OUT, relativePath);
    const source = await readFile(filePath, "utf8");
    for (const match of source.matchAll(ASSET_REFERENCE_RE)) {
      const rawUrl = match[0].split("?", 1)[0];
      const resolved = path.resolve(resolveReferenceBase(filePath), rawUrl);
      if (!resolved.startsWith(`${OUT}${path.sep}`) || !(await exists(resolved))) {
        missing.add(`${relativePath}: ${match[0]}`);
      }
    }
  }
  if (missing.size) {
    throw new Error(`Asset pubblici mancanti:\n${[...missing].join("\n")}`);
  }
}

async function directorySize(directory) {
  let bytes = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    bytes += entry.isDirectory() ? await directorySize(filePath) : (await stat(filePath)).size;
  }
  return bytes;
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const relativePath of PUBLIC_FILES) await copyRelative(relativePath);
await copyDirectoryFiltered("assets/fonts", (name) => PUBLIC_FONT_FILES.has(name));
await copyDirectoryFiltered("assets/img/hero", (name) => PUBLIC_HERO_FILES.has(name));
await copyDirectoryFiltered("assets/img/decor", (name) => PUBLIC_DECOR_FILES.has(name));
await copyDirectoryFiltered("assets/img/icons", (name) => name.endsWith(".webp") || LINKS_ICON_PNGS.has(name));
await copyDirectoryFiltered("foto-prodotti", (name) => name.endsWith(".webp"));

await transformCatalog();
const sourceProducts = JSON.parse(await readFile(path.join(ROOT, "products.json"), "utf8"));
const homeStructuredData = buildHomeStructuredData(sourceProducts);
const linksStructuredData = buildLinksStructuredData();

const homeStyles = await minifyCss("assets/css/styles.css");
const linksStyles = await minifyCss("assets/css/links.css");
await writeFile(path.join(OUT, "assets/css/styles.css"), `${homeStyles}\n`);
await writeFile(path.join(OUT, "assets/css/links.css"), `${linksStyles}\n`);

await minifyJavaScript("assets/js/config.js");
await minifyJavaScript("assets/js/trusted-types.js");
await minifyJavaScript("assets/js/analytics.js");
await minifyJavaScript("assets/js/app.js");
await minifyJavaScript("assets/js/links.js", path.join(ROOT, "links"));

// data.js viene elaborato dopo products.json, così il suo URL porta l'hash
// del catalogo finale già versionato.
const dataSourcePath = path.join(ROOT, "assets/js/data.js");
let dataSource = await readFile(dataSourcePath, "utf8");
const catalogHash = shortHash(await readFile(path.join(OUT, "products.json")));
dataSource = dataSource.replace(/products\.json\?[^"']+/, `products.json?v=${catalogHash}`);
const minifiedData = await minify(dataSource, {
  compress: { passes: 2 },
  mangle: true,
  ecma: 2020,
  format: { comments: false }
});
if (!minifiedData.code) throw new Error("Minificazione JavaScript fallita: assets/js/data.js");
await writeFile(path.join(OUT, "assets/js/data.js"), `${minifiedData.code}\n`);

await transformHome(homeStyles, homeStructuredData);
await transformLinksPage(linksStructuredData);

await assertReferencesExist([
  "index.html",
  "products.json",
  "links/index.html",
  "assets/css/styles.css",
  "assets/css/links.css",
  "assets/js/trusted-types.js",
  "assets/js/analytics.js",
  "assets/js/app.js",
  "assets/js/data.js",
  "assets/js/links.js"
]);

for (const forbidden of FORBIDDEN_OUTPUTS) {
  if (await exists(path.join(OUT, forbidden))) {
    throw new Error(`File non pubblico presente in dist: ${forbidden}`);
  }
}

const totalBytes = await directorySize(OUT);
console.log(`Build Netlify completata: ${(totalBytes / 1024 / 1024).toFixed(2)} MiB in dist/`);
