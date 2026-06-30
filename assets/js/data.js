/**
 * data.js
 * ------------------------------------------------------------------
 * Modulo dati pubblico per eventuali proposte aromatiche legacy.
 * Il sito principale usa una sezione consulenziale statica; questo set
 * resta come fallback senza prezzi se una pagina richiede ancora /api/products.
 *
 * Ogni prodotto:
 * {
 *   id:        string  univoco
 *   name:      string  nome del prodotto
 *   shortDesc: string  breve descrizione (1 riga)
 *   benefits:  string  benefici principali (testo)
 *   price:     string  non usato sul sito pubblico
 *   image:     string  URL immagine
 *   link:      string  link esterno di acquisto
 *   visible:   boolean visibilità sul sito pubblico
 *   order:     number  ordine di visualizzazione
 * }
 * ------------------------------------------------------------------
 */

const DEFAULT_PRODUCTS = [
  {
    id: "p-mini-guida",
    name: "Mini guida gratuita agli oli essenziali",
    shortDesc: "Una risorsa semplice per iniziare a conoscere gli oli essenziali.",
    benefits: " aiuta a orientarsi tra usi quotidiani, attenzioni di base e piccoli rituali di benessere.",
    price: "",
    image: "https://images.unsplash.com/photo-1611073615452-4889e2d68957?auto=format&fit=crop&w=800&q=80",
    link: "https://wa.me/390000000000?text=Ciao%20Sara,%20vorrei%20ricevere%20la%20mini%20guida%20gratuita%20agli%20oli%20essenziali.",
    visible: true,
    order: 0
  },
  {
    id: "p-collezione-essenziale",
    name: "Collezione Essenziale",
    shortDesc: "Kit base con 12 oli essenziali selezionati.",
    benefits: " offre una base ordinata e versatile per avvicinarsi agli oli con più consapevolezza.",
    price: "",
    image: "https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?auto=format&fit=crop&w=800&q=80",
    link: "https://wa.me/390000000000?text=Ciao%20Sara,%20vorrei%20informazioni%20sulla%20Collezione%20Essenziale.",
    visible: true,
    order: 1
  },
  {
    id: "p-consulenza-aromatica",
    name: "Consulenza aromatica personalizzata",
    shortDesc: "Un percorso per scegliere gli oli più adatti alle esigenze personali.",
    benefits: " collega preferenze, obiettivi di benessere e modalità d'uso in modo semplice e curato.",
    price: "",
    image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=800&q=80",
    link: "https://wa.me/390000000000?text=Ciao%20Sara,%20vorrei%20parlare%20di%20una%20consulenza%20aromatica%20personalizzata.",
    visible: true,
    order: 2
  },
  {
    id: "p-signature-blend",
    name: "Signature Blend",
    shortDesc: "Consulenza personalizzata con kit benessere su misura.",
    benefits: " crea un rituale più personale, premium e coerente con il momento della persona.",
    price: "",
    image: "https://images.unsplash.com/photo-1606914469633-cb9d7b56b27e?auto=format&fit=crop&w=800&q=80",
    link: "https://wa.me/390000000000?text=Ciao%20Sara,%20vorrei%20creare%20il%20mio%20Signature%20Blend%20personalizzato.",
    visible: true,
    order: 3
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
