import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITEMAP_PAGES, SITE_ORIGIN } from "./generate-sitemap.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const DIST = path.join(ROOT, "dist");

const pages = [
  {
    file: "index.html",
    canonical: `${SITE_ORIGIN}/`,
    schemaType: "WebPage",
    schemaId: `${SITE_ORIGIN}/#webpage`
  },
  {
    file: "links/index.html",
    canonical: `${SITE_ORIGIN}/links/`,
    schemaType: "WebPage",
    schemaId: `${SITE_ORIGIN}/links/#webpage`
  }
];

const htmlCanonicals = pages.map((page) => page.canonical);
const sitemapCanonicals = SITEMAP_PAGES.map((page) => page.loc);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

for (const page of pages) {
  const html = await readFile(path.join(DIST, page.file), "utf8");
  const canonical = escapeRegExp(page.canonical);

  assert(
    countMatches(html, new RegExp(`<link\\s+rel=["']canonical["']\\s+href=["']${canonical}["']`, "gi")) === 1,
    `${page.file}: canonical unico mancante o errato`
  );
  assert(
    countMatches(html, new RegExp(`<meta\\s+property=["']og:url["']\\s+content=["']${canonical}["']`, "gi")) === 1,
    `${page.file}: og:url unico mancante o errato`
  );
  assert(countMatches(html, /<h1(?:\s|>)/gi) === 1, `${page.file}: deve contenere un solo H1`);

  const schemaBlocks = [...html.matchAll(/<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi)];
  assert(schemaBlocks.length === 1, `${page.file}: deve contenere un solo blocco JSON-LD`);
  const schema = JSON.parse(schemaBlocks[0][1]);
  const graph = Array.isArray(schema["@graph"]) ? schema["@graph"] : [schema];
  const pageNode = graph.find((node) => node["@id"] === page.schemaId);
  assert(pageNode, `${page.file}: nodo WebPage canonico mancante`);
  const pageTypes = Array.isArray(pageNode["@type"]) ? pageNode["@type"] : [pageNode["@type"]];
  assert(pageTypes.includes(page.schemaType), `${page.file}: tipo JSON-LD inatteso`);
  assert(pageNode.url === page.canonical, `${page.file}: URL JSON-LD non canonico`);

  assert(!html.includes("../index.html"), `${page.file}: link interno non canonico ../index.html`);
}

const home = await readFile(path.join(DIST, "index.html"), "utf8");
assert(!home.includes('id="certificazioni"'), "index.html: sezione certificazioni non verificata ancora pubblicata");
assert(!home.includes('id="prenota"'), "index.html: sezione territoriale futura ancora pubblicata");

const linksPage = await readFile(path.join(DIST, "links/index.html"), "utf8");
const linksDescription = linksPage.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1] || "";
assert(
  !linksDescription.toLowerCase().includes("instagram"),
  "links/index.html: la meta description non deve promettere il link Instagram nascosto"
);

const sitemap = await readFile(path.join(DIST, "sitemap.xml"), "utf8");
assert(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), "sitemap.xml: prologo XML UTF-8 mancante");
assert(
  /xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/.test(sitemap),
  "sitemap.xml: namespace sitemaps.org 0.9 mancante"
);
assert(
  /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/.test(sitemap),
  "sitemap.xml: namespace image sitemap 1.1 mancante"
);
assert(!/<changefreq\b/i.test(sitemap), "sitemap.xml: changefreq non deve essere usata (ignorata da Google)");
assert(!/<priority\b/i.test(sitemap), "sitemap.xml: priority non deve essere usata (ignorata da Google)");
assert(!sitemap.includes("\uFEFF"), "sitemap.xml: BOM UTF-8 non consentito");

const pageLocs = [...sitemap.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
for (const loc of pageLocs) {
  assert(loc.startsWith("https://"), `sitemap.xml: loc non HTTPS: ${loc}`);
  assert(!loc.includes("#"), `sitemap.xml: fragment non consentito: ${loc}`);
  assert(!loc.startsWith("https://www."), `sitemap.xml: host non canonico www: ${loc}`);
}
assert(
  JSON.stringify(pageLocs) === JSON.stringify(sitemapCanonicals),
  "sitemap.xml: URL pagina non allineati alle canoniche SITEMAP_PAGES"
);
assert(
  htmlCanonicals.every((url) => pageLocs.includes(url)),
  "sitemap.xml: pagine HTML canoniche assenti"
);
assert(
  pageLocs.includes(`${SITE_ORIGIN}/assets/pdf/mini-guida-oli-comeleapi.pdf`),
  "sitemap.xml: PDF guida pubblica assente"
);

const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]);
assert(lastmods.length === pageLocs.length, "sitemap.xml: ogni <url> deve avere <lastmod>");
const lastmodPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
for (const lastmod of lastmods) {
  assert(lastmodPattern.test(lastmod), `sitemap.xml: lastmod non W3C Datetime: ${lastmod}`);
  assert(!Number.isNaN(Date.parse(lastmod)), `sitemap.xml: lastmod non parseable: ${lastmod}`);
}

const imageLocs = [...sitemap.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((match) => match[1]);
assert(imageLocs.length >= 14, `sitemap.xml: image:loc insufficienti (${imageLocs.length})`);
for (const imageLoc of imageLocs) {
  assert(imageLoc.startsWith(`${SITE_ORIGIN}/`), `sitemap.xml: image non canonica: ${imageLoc}`);
  assert(!imageLoc.includes("?"), `sitemap.xml: image non deve avere query string: ${imageLoc}`);
}
assert(
  imageLocs.includes(`${SITE_ORIGIN}/assets/img/hero/hero-massaggio-professionale-comeleapi.webp`),
  "sitemap.xml: hero image mancante"
);
assert(
  imageLocs.some((url) => url.includes("/foto-prodotti/")),
  "sitemap.xml: immagini prodotto mancanti"
);

// Ogni blocco <url> HTML deve contenere almeno un'immagine.
const urlBlocks = sitemap.match(/<url>[\s\S]*?<\/url>/g) || [];
assert(urlBlocks.length === SITEMAP_PAGES.length, "sitemap.xml: numero blocchi <url> errato");
for (const block of urlBlocks) {
  const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
  if (loc?.endsWith(".pdf")) {
    assert(!block.includes("<image:image>"), `sitemap.xml: PDF non deve avere image: ${loc}`);
  } else {
    assert(block.includes("<image:image>"), `sitemap.xml: pagina senza image sitemap: ${loc}`);
    assert(block.includes("<image:title>"), `sitemap.xml: image:title mancante per ${loc}`);
    assert(block.includes("<image:caption>"), `sitemap.xml: image:caption mancante per ${loc}`);
  }
}

function parseRobots(source) {
  const groups = [];
  let agents = [];
  let rules = [];

  const flush = () => {
    if (agents.length) groups.push({ agents, rules });
    agents = [];
    rules = [];
  };

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.replace(/\s*#.*$/, "").trim();
    if (!line) {
      if (agents.length && rules.length) flush();
      continue;
    }

    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const directive = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (directive === "user-agent") {
      if (agents.length && rules.length) flush();
      agents.push(value.toLowerCase());
    } else if (agents.length) {
      rules.push({ directive, value });
    }
  }
  flush();
  return groups;
}

const robots = await readFile(path.join(DIST, "robots.txt"), "utf8");
const robotsGroups = parseRobots(robots);
const explicitlyAllowedAgents = [
  "googlebot",
  "googlebot-image",
  "googlebot-video",
  "googlebot-news",
  "googleother",
  "googleother-image",
  "googleother-video",
  "bingbot",
  "google-extended",
  "google-cloudvertexbot",
  "oai-searchbot",
  "gptbot",
  "oai-adsbot",
  "chatgpt-user",
  "claude-searchbot",
  "claude-user",
  "claudebot",
  "anthropic-ai",
  "perplexitybot",
  "perplexity-user",
  "applebot",
  "applebot-extended",
  "ccbot",
  "*"
];

for (const agent of explicitlyAllowedAgents) {
  const groups = robotsGroups.filter((group) => group.agents.includes(agent));
  assert(groups.length === 1, `robots.txt: gruppo ${agent} mancante o duplicato`);
  assert(
    groups[0].rules.some((rule) => rule.directive === "allow" && rule.value === "/"),
    `robots.txt: ${agent} non consente l'intero sito pubblico`
  );
}

assert(
  !robotsGroups.some((group) => group.rules.some(
    (rule) => rule.directive === "disallow" && rule.value
  )),
  "robots.txt: trovata una regola Disallow incompatibile con la policy aperta"
);
assert(
  new RegExp(`^Sitemap:\\s+${escapeRegExp(SITE_ORIGIN)}/sitemap\\.xml\\s*$`, "im").test(robots),
  "robots.txt: dichiarazione sitemap assoluta mancante o errata"
);

const netlifyConfig = await readFile(path.join(ROOT, "netlify.toml"), "utf8");
const pdfCacheRuleIndex = netlifyConfig.indexOf('for = "/assets/pdf/*"');
const genericAssetCacheRuleIndex = netlifyConfig.indexOf('for = "/assets/*"');
assert(
  /\[\[headers\]\]\s*\n\s*for\s*=\s*"\/assets\/pdf\/\*"[\s\S]*?Cache-Control\s*=\s*"public, max-age=0, must-revalidate"/.test(netlifyConfig),
  "netlify.toml: il PDF canonico non deve avere cache browser immutabile"
);
assert(
  pdfCacheRuleIndex >= 0 && pdfCacheRuleIndex < genericAssetCacheRuleIndex,
  "netlify.toml: la regola cache PDF specifica deve precedere quella generale"
);
assert(
  /for\s*=\s*"\/sitemap\.xml"[\s\S]*?Content-Type\s*=\s*"application\/xml; charset=UTF-8"/.test(netlifyConfig),
  "netlify.toml: header Content-Type sitemap mancante"
);
assert(
  /for\s*=\s*"\/sitemap\.xml"[\s\S]*?Cache-Control\s*=\s*"public, max-age=0, must-revalidate"/.test(netlifyConfig),
  "netlify.toml: header Cache-Control sitemap mancante"
);

console.log(
  `Check SEO pubblico completato: ${pages.length} pagine HTML, sitemap con ${pageLocs.length} URL ` +
    `(${imageLocs.length} immagini) e policy crawler aperta verificata.`
);
