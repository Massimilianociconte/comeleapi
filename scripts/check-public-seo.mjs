import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const DIST = path.join(ROOT, "dist");

const pages = [
  {
    file: "index.html",
    canonical: "https://comeleapi.it/",
    schemaType: "WebPage",
    schemaId: "https://comeleapi.it/#webpage"
  },
  {
    file: "links/index.html",
    canonical: "https://comeleapi.it/links/",
    schemaType: "WebPage",
    schemaId: "https://comeleapi.it/links/#webpage"
  }
];

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
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert(
  JSON.stringify(sitemapUrls) === JSON.stringify(pages.map((page) => page.canonical)),
  "sitemap.xml: URL non allineati alle pagine canoniche"
);

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
  /^Sitemap:\s+https:\/\/comeleapi\.it\/sitemap\.xml\s*$/im.test(robots),
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

console.log(
  `Check SEO pubblico completato: ${pages.length} pagine canoniche, sitemap coerente e policy crawler aperta verificata.`
);
