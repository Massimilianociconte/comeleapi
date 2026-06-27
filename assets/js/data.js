/**
 * data.js
 * ------------------------------------------------------------------
 * Modulo dati pubblico per la vetrina.
 * I prodotti arrivano dal server tramite /api/products. Il set di
 * default resta come fallback leggibile se il server non risponde.
 *
 * Ogni prodotto:
 * {
 *   id:        string  univoco
 *   name:      string  nome del prodotto
 *   shortDesc: string  breve descrizione (1 riga)
 *   benefits:  string  benefici principali (testo)
 *   price:     string  prezzo indicativo (es. "18,90 €")
 *   image:     string  URL immagine
 *   link:      string  link esterno di acquisto
 *   visible:   boolean visibilità sul sito pubblico
 *   order:     number  ordine di visualizzazione
 * }
 * ------------------------------------------------------------------
 */

const DEFAULT_PRODUCTS = [
  {
    id: "p-lavanda",
    name: "Olio Essenziale di Lavanda",
    shortDesc: "Rilassante e calmante, ideale per la sera.",
    benefits: " favorisce il relax, riduce tensione e stress, migliora il sonno.",
    price: "14,90 €",
    image: "https://images.unsplash.com/photo-1611073615452-4889e2d68957?auto=format&fit=crop&w=800&q=80",
    link: "https://www.google.com/search?q=olio+essenziale+lavanda",
    visible: true,
    order: 0
  },
  {
    id: "p-eucalipto",
    name: "Olio Essenziale di Eucalipto",
    shortDesc: "Balsamico e rinfrescante, libera le vie respiratorie.",
    benefits: " purifica l'aria, rinfresca, utile in caso di raffreddore.",
    price: "12,50 €",
    image: "https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?auto=format&fit=crop&w=800&q=80",
    link: "https://www.google.com/search?q=olio+essenziale+eucalipto",
    visible: true,
    order: 1
  },
  {
    id: "p-rosa",
    name: "Olio Essenziale di Rosa Damascena",
    shortDesc: "Elegante e nutriente, per una pelle morbida e vellutata.",
    benefits: " idrata la pelle, equilibra le emozioni, profumo avvolgente.",
    price: "29,00 €",
    image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=800&q=80",
    link: "https://www.google.com/search?q=olio+essenziale+rosa+damascena",
    visible: true,
    order: 2
  },
  {
    id: "p-menta",
    name: "Olio Essenziale di Menta Piperita",
    shortDesc: "Tonificante e rinfrescante, risveglia mente e corpo.",
    benefits: " rinfresca, stimola la concentrazione, allevia la stanchezza.",
    price: "11,90 €",
    image: "https://images.unsplash.com/photo-1606914469633-cb9d7b56b27e?auto=format&fit=crop&w=800&q=80",
    link: "https://www.google.com/search?q=olio+essenziale+menta+piperita",
    visible: true,
    order: 3
  },
  {
    id: "p-arancio",
    name: "Olio Essenziale di Arancio Dolce",
    shortDesc: "Solare e luminoso, diffonde ottimismo e leggerezza.",
    benefits: " migliora l'umore, illumina l'ambiente, dolce e delicato.",
    price: "10,50 €",
    image: "https://images.unsplash.com/photo-1582194720944-3e6d6891eba7?auto=format&fit=crop&w=800&q=80",
    link: "https://www.google.com/search?q=olio+essenziale+arancio+dolce",
    visible: true,
    order: 4
  },
  {
    id: "p-incenso",
    name: "Olio Essenziale di Incenso",
    shortDesc: "Profondo e meditativo, per momenti di raccoglimento.",
    benefits: " favorisce la meditazione, calma la mente, aroma spirituale.",
    price: "19,90 €",
    image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80",
    link: "https://www.google.com/search?q=olio+essenziale+incenso",
    visible: true,
    order: 5
  }
];

function apiBase() {
  return String(window.COMELEAPI_API_BASE || "").trim().replace(/\/+$/, "");
}

function apiUrl(path) {
  const base = apiBase();
  return base ? `${base}${path}` : path;
}

/**
 * Legge i prodotti pubblici dal server. Se la richiesta fallisce,
 * restituisce una copia del set di default.
 * @returns {Array} array di prodotti
 */
async function loadProducts() {
  try {
    const response = await fetch(apiUrl("/api/products"), {
      headers: { "Accept": "application/json" },
      credentials: apiBase() ? "omit" : "same-origin"
    });
    if (!response.ok) throw new Error("risposta non valida");
    const payload = await response.json();
    if (!Array.isArray(payload.products)) throw new Error("formato non valido");
    return payload.products;
  } catch (e) {
    console.warn("[data] impossibile leggere i prodotti dal server, uso i default.", e);
    return clone(DEFAULT_PRODUCTS);
  }
}

/**
 * Compatibilità: il sito pubblico non salva prodotti.
 * @param {Array} products
 */
function saveProducts(products) {
  console.warn("[data] saveProducts non disponibile nel sito pubblico.", products);
}

/**
 * Reimposta i prodotti al set di default.
 * @returns {Array} i prodotti di default
 */
function resetProducts() {
  return clone(DEFAULT_PRODUCTS);
}

/**
 * Restituisce i prodotti pubblici, ordinati per `order`.
 * I prodotti non disponibili restano presenti con visible=false.
 * @returns {Array}
 */
async function getVisibleProducts() {
  const products = await loadProducts();
  return products
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Genera un nuovo id univoco.
 * @returns {string}
 */
function makeId() {
  return "p-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Esposizione globale (il progetto è volutamente senza bundler)
window.SaraData = { loadProducts, saveProducts, resetProducts, getVisibleProducts, makeId };
