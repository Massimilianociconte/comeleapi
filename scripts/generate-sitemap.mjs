/**
 * Genera sitemap.xml conforme a protocollo sitemaps.org + estensione immagini Google.
 * Regole 2026 (SEO + GEO):
 * - solo URL canoniche assolute HTTPS, senza fragment e senza www
 * - lastmod accurato in W3C Datetime (Google lo usa se affidabile)
 * - nessuna changefreq/priority (ignorate da Google, spesso fuorvianti)
 * - image:image per asset indexabili collegati alle pagine
 * - documenti pubblici indexabili (PDF guida) come URL a sé
 * - escape XML completo e UTF-8
 */

import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const SITE_ORIGIN = "https://comeleapi.it";

export const SITEMAP_PAGES = [
  {
    loc: `${SITE_ORIGIN}/`,
    sourceFiles: ["index.html", "products.json"],
    kind: "home"
  },
  {
    loc: `${SITE_ORIGIN}/links/`,
    sourceFiles: ["links/index.html"],
    kind: "links"
  },
  {
    loc: `${SITE_ORIGIN}/assets/pdf/mini-guida-oli-comeleapi.pdf`,
    sourceFiles: ["assets/pdf/mini-guida-oli-comeleapi.pdf"],
    kind: "pdf"
  }
];

export function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** W3C Datetime con offset, stabile e leggibile da GSC. */
export function toW3cDatetime(date) {
  const pad = (n, size = 2) => String(n).padStart(size, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = pad(Math.floor(abs / 60));
  const minutes = pad(abs % 60);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${hours}:${minutes}`
  );
}

async function maxMtime(root, relativePaths) {
  let latest = 0;
  for (const relativePath of relativePaths) {
    const info = await stat(path.join(root, relativePath));
    latest = Math.max(latest, info.mtimeMs);
  }
  return new Date(latest);
}

function absoluteAssetUrl(relativePath) {
  const clean = relativePath.replace(/^\.?\//, "").replace(/^\/+/, "");
  return `${SITE_ORIGIN}/${clean}`;
}

function buildImageEntries(images) {
  return images
    .filter((image) => image?.loc)
    .map((image) => {
      const lines = [
        "    <image:image>",
        `      <image:loc>${escapeXml(image.loc)}</image:loc>`
      ];
      if (image.title) {
        lines.push(`      <image:title>${escapeXml(image.title)}</image:title>`);
      }
      if (image.caption) {
        lines.push(`      <image:caption>${escapeXml(image.caption)}</image:caption>`);
      }
      lines.push("    </image:image>");
      return lines.join("\n");
    })
    .join("\n");
}

export async function collectSitemapImages(root) {
  const products = JSON.parse(await readFile(path.join(root, "products.json"), "utf8"));
  const visibleProducts = products
    .filter((product) => product?.visible !== false && typeof product.image === "string")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const homeImages = [
    {
      loc: absoluteAssetUrl("assets/img/hero/hero-massaggio-professionale-comeleapi.webp"),
      title: "Trattamento professionale comeleapi",
      caption: "Massaggio professionale con oli essenziali a Bresso e area Milano"
    },
    {
      loc: absoluteAssetUrl("assets/img/logo-comeleapi-1024.png"),
      title: "Logo comeleapi",
      caption: "Marchio comeleapi — benessere, massaggi e cura della persona"
    },
    ...visibleProducts.map((product) => ({
      loc: absoluteAssetUrl(product.image.split("?", 1)[0]),
      title: product.name,
      caption: product.shortDesc || product.name
    }))
  ];

  const linksImages = [
    {
      loc: absoluteAssetUrl("assets/img/logo-comeleapi-1024.png"),
      title: "comeleapi — Link utili",
      caption: "Hub di link utili del progetto comeleapi curato da Sara"
    }
  ];

  return {
    [`${SITE_ORIGIN}/`]: homeImages,
    [`${SITE_ORIGIN}/links/`]: linksImages
  };
}

export async function buildSitemapXml(root) {
  const imagesByLoc = await collectSitemapImages(root);
  const urlBlocks = [];

  for (const page of SITEMAP_PAGES) {
    const lastmod = toW3cDatetime(await maxMtime(root, page.sourceFiles));
    const images = imagesByLoc[page.loc] || [];
    const imageXml = buildImageEntries(images);
    urlBlocks.push(
      [
        "  <url>",
        `    <loc>${escapeXml(page.loc)}</loc>`,
        `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
        imageXml,
        "  </url>"
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
    `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    `${urlBlocks.join("\n")}\n` +
    `</urlset>\n`
  );
}

// Eseguibile standalone: node scripts/generate-sitemap.mjs
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = path.resolve(SCRIPT_DIR, "..");
  const xml = await buildSitemapXml(root);
  await writeFile(path.join(root, "sitemap.xml"), xml);
  console.log(`sitemap.xml generata: ${SITEMAP_PAGES.length} URL canoniche`);
}
