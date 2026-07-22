import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const DIST = path.join(ROOT, "dist");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const source = await readFile(path.join(ROOT, "assets/js/analytics.js"), "utf8");
const built = await readFile(path.join(DIST, "assets/js/analytics.js"), "utf8");
const home = await readFile(path.join(DIST, "index.html"), "utf8");
const links = await readFile(path.join(DIST, "links/index.html"), "utf8");

for (const eventName of [
  "page_view",
  "click_whatsapp",
  "click_phone",
  "click_email",
  "download_pdf",
  "click_product",
  "click_young_living",
  "links_to_landing"
]) {
  assert(source.includes(`"${eventName}"`), `Evento analytics mancante: ${eventName}`);
}

assert(source.includes("analyticsAllowed()"), "Gate consenso analytics mancante");
assert(source.includes("comeleapi:cookie-consent"), "Aggancio aggiornamento consenso mancante");
assert(!/\b(?:fetch|sendBeacon|XMLHttpRequest)\s*\(/.test(source), "analytics.js non deve trasmettere direttamente dati");
assert(!/(?:googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|G-[A-Z0-9]{6,})/i.test(built), "Provider analytics non autorizzato incluso nella build");
assert((home.match(/assets\/js\/analytics\.js/g) || []).length === 1, "Homepage: analytics.js mancante o duplicato");
assert((links.match(/assets\/js\/analytics\.js/g) || []).length === 1, "Links: analytics.js mancante o duplicato");

console.log("Check analytics completato: eventi predisposti, consenso applicato e nessun provider trasmissivo incluso.");
