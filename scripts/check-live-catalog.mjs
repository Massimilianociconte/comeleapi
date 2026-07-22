import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const CATALOG_URL = process.env.COMELEAPI_CATALOG_URL ||
  "https://comeleapi-backend.onrender.com/api/products";
const FIELDS = [
  "id",
  "name",
  "shortDesc",
  "benefits",
  "price",
  "image",
  "link",
  "visible",
  "order"
];

function normalize(rows) {
  if (!Array.isArray(rows)) throw new Error("Catalogo non valido: atteso un array.");
  return rows
    .map((row) => Object.fromEntries(FIELDS.map((field) => [field, row?.[field]])))
    .sort((left, right) =>
      Number(left.order || 0) - Number(right.order || 0) ||
      String(left.id || "").localeCompare(String(right.id || ""))
    );
}

const local = normalize(JSON.parse(await readFile(path.join(ROOT, "products.json"), "utf8")));
const response = await fetch(CATALOG_URL, {
  headers: { Accept: "application/json" },
  signal: AbortSignal.timeout(30_000)
});
if (!response.ok) throw new Error(`Catalogo live non raggiungibile: HTTP ${response.status}.`);
const payload = await response.json();
const live = normalize(Array.isArray(payload) ? payload : payload.products);

if (JSON.stringify(local) !== JSON.stringify(live)) {
  throw new Error(
    "Catalogo live diverso da products.json: aggiornare la sorgente statica e ridistribuire il sito prima di considerare coerente il JSON-LD."
  );
}

console.log(`Check catalogo live completato: ${live.length} prodotti coerenti con products.json e JSON-LD.`);
