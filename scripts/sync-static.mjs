// Rigenera il markup statico nei file SORGENTE (serviti da Render) a partire
// dai generatori condivisi, così che sorgente e build (dist/, Netlify) restino
// allineati: blocco JSON-LD, griglia prodotti pre-renderizzata e sezione FAQ.
// La build Netlify riapplica gli stessi generatori in modo idempotente.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildHomeStructuredData, buildLinksStructuredData } from "./structured-data.mjs";
import { injectStructuredData, injectProductsGrid, injectFaqHtml } from "./html-inject.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");

const products = JSON.parse(await readFile(path.join(ROOT, "products.json"), "utf8"));

const homePath = path.join(ROOT, "index.html");
let home = await readFile(homePath, "utf8");
home = injectStructuredData(home, buildHomeStructuredData(products));
home = injectProductsGrid(home, products);
home = injectFaqHtml(home);
await writeFile(homePath, home);

const linksPath = path.join(ROOT, "links/index.html");
const links = injectStructuredData(await readFile(linksPath, "utf8"), buildLinksStructuredData());
await writeFile(linksPath, links);

console.log("Sync statico completato: index.html (JSON-LD, griglia prodotti, FAQ) e links/index.html (JSON-LD).");
