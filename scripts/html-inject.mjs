// Generatori HTML condivisi tra la build Netlify (dist/) e lo script di sync
// (sorgente servita da Render). Producono il markup statico pre-renderizzato
// per i crawler e le AI, mantenendo un'unica fonte di verità:
//  - la griglia prodotti rispecchia esattamente l'output runtime di assets/js/app.js;
//  - la sezione FAQ deriva da FAQ_DEFINITIONS (stesso testo del nodo FAQPage).
import { FAQ_DEFINITIONS } from "./structured-data.mjs";

// Icone/immagini alternative: DEVE rispecchiare productDisplayOverrides in
// assets/js/app.js così che il pre-render coincida con il render runtime.
const PRODUCT_DISPLAY_OVERRIDES = {
  "p-collezione-essenziale": { icon: "assets/img/icons/products/collezione-essenziale.webp" },
  "p-baby-essentials": { icon: "assets/img/icons/products/kit-bambini-icon.webp" },
  "p-sweet-home": { icon: "assets/img/icons/products/sweet-home.webp?v=20260712-home-v2" },
  "p-dolce-notte": { icon: "assets/img/icons/products/dolce-notte.webp" },
  "p-gym-rat": { icon: "assets/img/icons/products/sport-wellness.webp" },
  "p-per-lui": {
    icon: "assets/img/icons/products/per-lui.webp",
    image: "foto-prodotti/per-lui.webp?v=20260712-cover-v2"
  },
  "p-per-lei": { icon: "assets/img/icons/products/per-lei.webp?v=20260711-rose" },
  "p-animal-scents": { icon: "assets/img/icons/products/animal-scents.webp" },
  "p-balance-skin": { icon: "assets/img/icons/products/balance-skin.webp?v=20260712-skincare-v4" },
  "p-bloom-skin": { icon: "assets/img/icons/products/bloom-skin.webp" },
  "p-shine-bright-like-a-diamond": { icon: "assets/img/icons/products/kit-diamond-icon.webp" },
  "p-bye-bye-menopausa": { icon: "assets/img/icons/products/bye-bye-menopausa.webp" }
};

const FALLBACK_PRODUCT_IMAGE = "assets/img/hero/hero-comeleapi-botanica.jpg?v=20260711-hero-v1";
const FALLBACK_ICON = "assets/img/icons/icon-drop.webp";

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));
}

// Preferisce le versioni WebP ottimizzate senza rompere URL esterni o path già
// convertiti (stesso comportamento di toOptimizedImagePath in app.js).
function toOptimizedImagePath(url) {
  const raw = String(url || "").trim();
  if (!raw || /^https?:\/\//i.test(raw) || /^data:/i.test(raw)) return raw;
  const queryIndex = raw.indexOf("?");
  const filePath = queryIndex >= 0 ? raw.slice(0, queryIndex) : raw;
  const query = queryIndex >= 0 ? raw.slice(queryIndex) : "";
  const isLocalAsset =
    filePath.includes("foto-prodotti/") ||
    filePath.includes("assets/img/icons/") ||
    filePath.includes("assets/img/products/") ||
    filePath.includes("assets/img/signatures/") ||
    filePath.includes("assets/img/logo-");
  if (isLocalAsset && /\.(png|jpe?g)$/i.test(filePath)) {
    return filePath.replace(/\.(png|jpe?g)$/i, ".webp") + query;
  }
  return raw;
}

// Variante responsive mantenendo l'eventuale cache key (come imageVariantPath in app.js).
function imageVariantPath(url, width) {
  const raw = String(url || "").trim();
  const queryIndex = raw.indexOf("?");
  const imagePath = queryIndex >= 0 ? raw.slice(0, queryIndex) : raw;
  const query = queryIndex >= 0 ? raw.slice(queryIndex) : "";
  return /\.webp$/i.test(imagePath)
    ? imagePath.replace(/\.webp$/i, `-${width}.webp`) + query
    : raw;
}

function visibleSortedProducts(products) {
  return products
    .filter((product) => product && product.visible !== false)
    .slice()
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}

/**
 * Restituisce il markup statico (italiano, lingua di default) delle card
 * prodotto. È un mirror dell'output di app.js: al caricamento con JS attivo
 * app.js sostituisce comunque il contenuto, quindi lo stato iniziale usa la
 * classe `reveal` per evitare qualsiasi flash/CLS durante l'hydration.
 */
export function buildProductsGridHtml(products) {
  const visible = visibleSortedProducts(products);
  const cards = visible.map((product, index) => {
    const override = PRODUCT_DISPLAY_OVERRIDES[product.id] || {};
    const image = toOptimizedImagePath(override.image || product.image) || FALLBACK_PRODUCT_IMAGE;
    const icon = toOptimizedImagePath(override.icon || FALLBACK_ICON);
    const iconSmall = imageVariantPath(icon, 96);
    const price = String(product.price || "").trim();
    const link = String(product.link || "").trim();
    const name = String(product.name || "");
    const shortDesc = String(product.shortDesc || "");
    const ariaLabel = `Apri il link di acquisto per ${name}${price ? ` - ${price}` : ""}`;
    return `        <a class="product-card product-card--clickable reveal" data-product-id="${escapeHtml(product.id)}" data-delay="${index % 3}" href="${escapeHtml(link)}" target="_blank" rel="noopener nofollow" aria-label="${escapeHtml(ariaLabel)}">
          <div class="product-img">
            <img class="product-photo" src="${escapeHtml(image)}" alt="${escapeHtml(name)}" width="640" height="480" sizes="(max-width: 700px) 90vw, 320px" loading="lazy" decoding="async" />
          </div>
          <div class="product-body">
            <div class="product-heading">
              <span class="product-kit-icon" aria-hidden="true">
                <img class="product-icon-img" src="${escapeHtml(icon)}" srcset="${escapeHtml(iconSmall)} 96w, ${escapeHtml(icon)} 192w" sizes="54px" alt="" width="40" height="40" loading="lazy" decoding="async" />
              </span>
              <div>
                <h3>${escapeHtml(name)}</h3>
                ${shortDesc ? `<p class="desc">${escapeHtml(shortDesc)}</p>` : ""}
              </div>
            </div>
            ${price ? `<span class="product-price">${escapeHtml(price)}</span>` : ""}
          </div>
        </a>`;
  });
  return cards.join("\n");
}

/** Costruisce l'accordion FAQ visibile (native <details>) da FAQ_DEFINITIONS. */
export function buildFaqHtml(definitions = FAQ_DEFINITIONS) {
  return definitions
    .map((item) => `        <details class="faq-item">
          <summary class="faq-q">${escapeHtml(item.q)}</summary>
          <div class="faq-a"><p>${escapeHtml(item.a)}</p></div>
        </details>`)
    .join("\n");
}

function replaceBetweenMarkers(html, startMarker, endMarker, inner, context) {
  const pattern = new RegExp(`(${startMarker})[\\s\\S]*?(${endMarker})`);
  if (!pattern.test(html)) throw new Error(`Marker non trovati per ${context}: ${startMarker} / ${endMarker}`);
  return html.replace(pattern, `$1\n${inner}\n$2`);
}

export function injectStructuredData(html, structuredData) {
  const pattern = /(<script\s+id="structuredData"\s+type="application\/ld\+json">)[\s\S]*?(<\/script>)/;
  if (!pattern.test(html)) throw new Error("Blocco JSON-LD structuredData non trovato.");
  const serialized = JSON.stringify(structuredData, null, 2).replace(/</g, "\\u003c");
  return html.replace(pattern, `$1\n${serialized}\n  $2`);
}

export function injectProductsGrid(html, products) {
  return replaceBetweenMarkers(
    html,
    "<!-- products:start -->",
    "<!-- products:end -->",
    buildProductsGridHtml(products),
    "griglia prodotti"
  );
}

export function injectFaqHtml(html, definitions = FAQ_DEFINITIONS) {
  return replaceBetweenMarkers(
    html,
    "<!-- faq:start -->",
    "<!-- faq:end -->",
    buildFaqHtml(definitions),
    "sezione FAQ"
  );
}
