/**
 * Catalogo pubblico prodotti.
 *
 * `products.json` e' la sorgente editoriale unica usata dal sito statico,
 * dal server locale e dal seed Supabase. L'API, quando disponibile, resta
 * prioritaria per consentire gli aggiornamenti dal gestionale.
 */

const PRODUCT_CATALOG_URL = "products.json?v=20260711-official-copy";

function apiBase() {
  return String(window.COMELEAPI_API_BASE || "").trim().replace(/\/+$/, "");
}

function apiUrl(path) {
  const base = apiBase();
  return base ? `${base}${path}` : path;
}

async function fetchProducts(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Accept": "application/json" },
    ...options
  });
  if (!response.ok) throw new Error(`risposta non valida (${response.status})`);
  const payload = await response.json();
  const products = Array.isArray(payload) ? payload : payload.products;
  if (!Array.isArray(products)) throw new Error("formato prodotti non valido");
  return products;
}

async function loadCatalog() {
  return fetchProducts(PRODUCT_CATALOG_URL, { credentials: "same-origin" });
}

async function loadProducts() {
  try {
    return await fetchProducts(apiUrl("/api/products"), {
      credentials: apiBase() ? "omit" : "same-origin"
    });
  } catch (apiError) {
    try {
      return await loadCatalog();
    } catch (catalogError) {
      console.error("[data] catalogo prodotti non disponibile.", { apiError, catalogError });
      return [];
    }
  }
}

function saveProducts(products) {
  console.warn("[data] saveProducts non disponibile nel sito pubblico.", products);
}

async function resetProducts() {
  return clone(await loadCatalog());
}

async function getVisibleProducts() {
  const products = await loadProducts();
  return products
    .filter((product) => product.visible !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function makeId() {
  return "p-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

window.SaraData = { loadProducts, saveProducts, resetProducts, getVisibleProducts, makeId };
