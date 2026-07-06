/**
 * data.js
 * ------------------------------------------------------------------
 * Modulo dati pubblico per la vetrina oli essenziali.
 * Il gestionale resta la fonte principale; questo set è il fallback
 * usato quando /api/products non è raggiungibile.
 *
 * Ogni prodotto:
 * {
 *   id:        string  univoco
 *   name:      string  nome del prodotto
 *   shortDesc: string  breve descrizione (1 riga)
 *   benefits:  string  benefici principali (testo)
 *   price:     string  prezzo o nota prezzo da mostrare
 *   image:     string  URL immagine
 *   link:      string  link esterno di acquisto
 *   visible:   boolean visibilità sul sito pubblico
 *   order:     number  ordine di visualizzazione
 * }
 * ------------------------------------------------------------------
 */

const DEFAULT_PRODUCTS = [
  {
    id: "p-collezione-essenziale",
    name: "Collezione Essenziale",
    shortDesc: "Starter kit con 12 oli",
    benefits: "Unisce diffusione aromatica e oli trasversali per accompagnare casa, energia, respiro e momenti di calma con un approccio ordinato.",
    price: "196,41 €",
    image: "foto-prodotti/collezione-essenziale.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/f3f1cb39-39f4-4f4c-93a3-d869c197613d",
    visible: true,
    order: 0
  },
  {
    id: "p-baby-essentials",
    name: "Baby Essentials",
    shortDesc: "Starter kit delicato con diffusore Feather the Owl e oli KidScents per piccoli rituali di famiglia.",
    benefits: "Pensato per la routine dei più piccoli: atmosfera serale, comfort e profumi morbidi, sempre con uso consapevole e adeguato all'età.",
    price: "162,25 €",
    image: "foto-prodotti/baby-essentials.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/ddab525d-a08a-4c2b-a7ed-c7e2c0522d33",
    visible: true,
    order: 1
  },
  {
    id: "p-sweet-home",
    name: "Sweet Home",
    shortDesc: "Selezione per rendere la casa più accogliente, fresca e armoniosa con note naturali e pulite.",
    benefits: "Combina aromi luminosi e morbidi per profumare gli ambienti e trasformare la casa in uno spazio più ordinato, sereno e familiare.",
    price: "178,11 €",
    image: "foto-prodotti/sweet-home.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/91b5e23d-752e-440c-ba56-bf459688c4c1",
    visible: true,
    order: 2
  },
  {
    id: "p-dolce-notte",
    name: "Dolce Notte",
    shortDesc: "Blend e oli per accompagnare il rituale della sera e preparare un ambiente più disteso.",
    benefits: "Note avvolgenti e rilassanti per rallentare, respirare e chiudere la giornata con un gesto semplice di cura.",
    price: "92,10 €",
    image: "foto-prodotti/dolce-notte.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/82e13afb-0fa8-4efa-a0b8-2abad12ebd60",
    visible: true,
    order: 3
  },
  {
    id: "p-gym-rat",
    name: "Sport & Wellness",
    shortDesc: "Set aromatico per chi vive movimento, allenamento e recupero con energia.",
    benefits: "Note fresche e toniche da integrare prima o dopo l'attività fisica, per sostenere focus, respiro e sensazione di leggerezza.",
    price: "156,38 €",
    image: "foto-prodotti/sport-wellness-clean.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/88d08118-3dfa-4d07-b492-fbe9bf144bf3",
    visible: true,
    order: 4
  },
  {
    id: "p-per-lui",
    name: "Per Lui",
    shortDesc: "Selezione dal carattere pulito, legnoso e deciso per una routine maschile naturale.",
    benefits: "Unisce note fresche e profonde per cura personale, ambiente e momenti di reset quotidiano, senza risultare invadente.",
    price: "104,75 €",
    image: "foto-prodotti/per-lui.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/a5880fa9-bf5e-4e11-bcad-c39343baa1fa",
    visible: true,
    order: 5
  },
  {
    id: "p-per-lei",
    name: "Per Lei",
    shortDesc: "Percorso aromatico femminile, morbido e luminoso, pensato per equilibrio e cura quotidiana.",
    benefits: "Note floreali e armoniche per rituali di pelle, respiro e presenza, con un profilo elegante e naturale.",
    price: "76,58 €",
    image: "foto-prodotti/kit-per-lei.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/562399ef-a072-4f8e-811e-2e0ec43abdd6",
    visible: true,
    order: 6
  },
  {
    id: "p-animal-scents",
    name: "Animal scents",
    shortDesc: "Linea dedicata alla cura aromatica degli animali, con prodotti specifici e approccio delicato.",
    benefits: "Aiuta a creare una routine più attenta e rispettosa per casa e compagni animali, usando prodotti dedicati e non improvvisati.",
    price: "86,34 €",
    image: "foto-prodotti/animal-scents.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/ee09a34b-0ef7-4169-82c5-9e2115659705",
    visible: true,
    order: 7
  },
  {
    id: "p-balance-skin",
    name: "BALANCE skin",
    shortDesc: "Routine skincare essenziale per una pelle che cerca equilibrio, freschezza e semplicità.",
    benefits: "Combina passaggi mirati per pulizia, idratazione e comfort cutaneo, con una sensazione leggera, pulita e ordinata.",
    price: "148,67 €",
    image: "foto-prodotti/balance-skin-clean.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/fdce81cc-3f59-415c-8dc0-ca127f413431",
    visible: true,
    order: 8
  },
  {
    id: "p-bloom-skin",
    name: "BLOOM skin",
    shortDesc: "Trattamento skincare luminoso per una pelle dall'aspetto più vitale e uniforme.",
    benefits: "Pensato per rituali viso più curati: texture, profumo e attivi cosmetici lavorano insieme per una pelle dall'aspetto più radioso.",
    price: "169,69 €",
    image: "foto-prodotti/bloom-skin.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/f6bea7b5-fff7-4ad1-a3a6-c4f8fa265aab",
    visible: true,
    order: 9
  },
  {
    id: "p-shine-bright-like-a-diamond",
    name: "Shine Bright like a Diamond",
    shortDesc: "Selezione beauty e benessere per una routine luminosa, energica e curata.",
    benefits: "Unisce prodotti pensati per glow, freschezza e presenza: ideale quando vuoi sentirti ordinata, vitale e pronta a brillare.",
    price: "163,09 €",
    image: "foto-prodotti/shine-bright-like-a-diamond.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/d8202be7-c994-433a-9f38-7d7e1a7f3146",
    visible: true,
    order: 10
  },
  {
    id: "p-bye-bye-menopausa",
    name: "Bye Bye Menopausa",
    shortDesc: "Percorso naturale pensato per accompagnare la donna nelle fasi di cambiamento.",
    benefits: "Una routine di supporto al benessere quotidiano, con oli e prodotti scelti per equilibrio, presenza e ascolto del corpo.",
    price: "188,22 €",
    image: "foto-prodotti/bye-bye-menopausa.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/8833dee2-aab2-46e1-94d0-c7bb78d5800d",
    visible: true,
    order: 11
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
 * I prodotti nascosti dal gestionale non vengono mostrati nel sito pubblico.
 * @returns {Array}
 */
async function getVisibleProducts() {
  const products = await loadProducts();
  return products
    .filter((p) => p.visible !== false)
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
