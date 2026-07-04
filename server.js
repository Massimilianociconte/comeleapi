"use strict";

const http = require("node:http");
const https = require("node:https");
const path = require("node:path");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const { createClient } = require("@supabase/supabase-js");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const webpush = require("web-push");

const scryptAsync = promisify(crypto.scrypt);

const ROOT = __dirname;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_STORAGE_BUCKET = "product-images";

// Rileva se usare Supabase o se andare in modalità locale/offline
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

const PORT = Number(process.env.PORT || 4173);
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const SESSION_COOKIE = "comeleapi_sid";
const MAX_BODY_BYTES = 128 * 1024;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 6;
const CONTACT_WINDOW_MS = 10 * 60 * 1000;
const CONTACT_MAX_ATTEMPTS = 8;
const IS_PROD = process.env.NODE_ENV === "production";
const COOKIE_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("base64url");
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:privacy@comeleapi.it";
const PUBLIC_SITE_ORIGINS = String(process.env.PUBLIC_SITE_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");
const PUSH_SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "push_subscriptions.json");
const VAPID_FILE = path.join(DATA_DIR, "vapid.json");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

const DEFAULT_PRODUCTS = [
  {
    id: "p-collezione-essenziale",
    name: "collezione essenziale",
    shortDesc: "Kit introduttivo con oli essenziali e diffusore per costruire rituali quotidiani semplici e versatili.",
    benefits: "Unisce diffusione aromatica e oli trasversali per accompagnare casa, energia, respiro e momenti di calma con un approccio ordinato.",
    price: "196,41 €",
    image: "assets/img/products/collezione-essenziale.png",
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
    image: "assets/img/products/baby-essentials.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/ddab525d-a08a-4c2b-a7ed-c7e2c0522d33",
    visible: true,
    order: 1
  },
  {
    id: "p-sweet-home",
    name: "Sweet Home",
    shortDesc: "Selezione per rendere la casa più accogliente, fresca e armoniosa con note naturali e pulite.",
    benefits: "Combina aromi luminosi e morbidi per profumare gli ambienti e trasformare la casa in uno spazio più ordinato, sereno e familiare.",
    price: "Prezzo sul link",
    image: "assets/img/products/sweet-home.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/91b5e23d-752e-440c-ba56-bf459688c4c1",
    visible: true,
    order: 2
  },
  {
    id: "p-dolce-notte",
    name: "Dolce Notte",
    shortDesc: "Blend e oli per accompagnare il rituale della sera e preparare un ambiente più disteso.",
    benefits: "Note avvolgenti e rilassanti per rallentare, respirare e chiudere la giornata con un gesto semplice di cura.",
    price: "Prezzo sul link",
    image: "assets/img/products/dolce-notte.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/82e13afb-0fa8-4efa-a0b8-2abad12ebd60",
    visible: true,
    order: 3
  },
  {
    id: "p-gym-rat",
    name: "Gym rat",
    shortDesc: "Set aromatico per chi vive movimento, allenamento e recupero con energia.",
    benefits: "Note fresche e toniche da integrare prima o dopo l'attività fisica, per sostenere focus, respiro e sensazione di leggerezza.",
    price: "Prezzo sul link",
    image: "assets/img/products/gym-rat.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/88d08118-3dfa-4d07-b492-fbe9bf144bf3",
    visible: true,
    order: 4
  },
  {
    id: "p-per-lui",
    name: "Per Lui",
    shortDesc: "Selezione dal carattere pulito, legnoso e deciso per una routine maschile naturale.",
    benefits: "Unisce note fresche e profonde per cura personale, ambiente e momenti di reset quotidiano, senza risultare invadente.",
    price: "Prezzo sul link",
    image: "assets/img/products/per-lui.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/a5880fa9-bf5e-4e11-bcad-c39343baa1fa",
    visible: true,
    order: 5
  },
  {
    id: "p-per-lei",
    name: "Per Lei",
    shortDesc: "Percorso aromatico femminile, morbido e luminoso, pensato per equilibrio e cura quotidiana.",
    benefits: "Note floreali e armoniche per rituali di pelle, respiro e presenza, con un profilo elegante e naturale.",
    price: "Prezzo sul link",
    image: "assets/img/products/per-lei.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/562399ef-a072-4f8e-811e-2e0ec43abdd6",
    visible: true,
    order: 6
  },
  {
    id: "p-animal-scents",
    name: "Animal scents",
    shortDesc: "Linea dedicata alla cura aromatica degli animali, con prodotti specifici e approccio delicato.",
    benefits: "Aiuta a creare una routine più attenta e rispettosa per casa e compagni animali, usando prodotti dedicati e non improvvisati.",
    price: "Prezzo sul link",
    image: "assets/img/products/animal-scents.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/ee09a34b-0ef7-4169-82c5-9e2115659705",
    visible: true,
    order: 7
  },
  {
    id: "p-balance-skin",
    name: "BALANCE skin",
    shortDesc: "Routine skincare essenziale per una pelle che cerca equilibrio, freschezza e semplicità.",
    benefits: "Combina passaggi mirati per pulizia, idratazione e comfort cutaneo, con una sensazione leggera, pulita e ordinata.",
    price: "Prezzo sul link",
    image: "assets/img/products/balance-skin.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/fdce81cc-3f59-415c-8dc0-ca127f413431",
    visible: true,
    order: 8
  },
  {
    id: "p-bloom-skin",
    name: "BLOOM skin",
    shortDesc: "Trattamento skincare luminoso per una pelle dall'aspetto più vitale e uniforme.",
    benefits: "Pensato per rituali viso più curati: texture, profumo e attivi cosmetici lavorano insieme per una pelle dall'aspetto più radioso.",
    price: "Prezzo sul link",
    image: "assets/img/products/skincare-glow.jpg",
    link: "https://www.youngliving.com/apps/enrollment/social-links/f6bea7b5-fff7-4ad1-a3a6-c4f8fa265aab",
    visible: true,
    order: 9
  },
  {
    id: "p-shine-bright-like-a-diamond",
    name: "Shine Bright like a Diamond",
    shortDesc: "Selezione beauty e benessere per una routine luminosa, energica e curata.",
    benefits: "Unisce prodotti pensati per glow, freschezza e presenza: ideale quando vuoi sentirti ordinata, vitale e pronta a brillare.",
    price: "Prezzo sul link",
    image: "assets/img/products/skincare-glow.jpg",
    link: "https://www.youngliving.com/apps/enrollment/social-links/d8202be7-c994-433a-9f38-7d7e1a7f3146",
    visible: true,
    order: 10
  },
  {
    id: "p-bye-bye-menopausa",
    name: "Bye Bye Menopausa",
    shortDesc: "Percorso naturale pensato per accompagnare la donna nelle fasi di cambiamento.",
    benefits: "Una routine di supporto al benessere quotidiano, con oli e prodotti scelti per equilibrio, presenza e ascolto del corpo.",
    price: "Prezzo sul link",
    image: "assets/img/products/personal-care.jpg",
    link: "https://www.youngliving.com/apps/enrollment/social-links/8833dee2-aab2-46e1-94d0-c7bb78d5800d",
    visible: true,
    order: 11
  }
];

const sessions = new Map();
const loginAttempts = new Map();
const contactAttempts = new Map();
const UPLOAD_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

// ── Supabase client (lazy singleton) ────────────────────────────────

let supabase;
function getSupabase() {
  if (!supabase) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error("Variabili SUPABASE_URL e SUPABASE_SERVICE_KEY obbligatorie.");
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return supabase;
}

// ── Helpers ─────────────────────────────────────────────────────────

function jsonClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function sign(value) {
  return crypto.createHmac("sha256", COOKIE_SECRET).update(value).digest("base64url");
}

function signedValue(value) {
  return `${value}.${sign(value)}`;
}

function verifySignedValue(raw) {
  if (!raw || typeof raw !== "string" || !raw.includes(".")) return null;
  const idx = raw.lastIndexOf(".");
  const value = raw.slice(0, idx);
  const given = raw.slice(idx + 1);
  const expected = sign(value);
  if (given.length !== expected.length) return null;
  const ok = crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  return ok ? value : null;
}

function parseCookies(req) {
  const out = {};
  const header = req.headers.cookie || "";
  header.split(";").forEach((part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return;
    out[key] = decodeURIComponent(rest.join("="));
  });
  return out;
}

function setCookie(res, name, value, options = {}) {
  const pieces = [`${name}=${encodeURIComponent(value)}`];
  pieces.push(`Path=${options.path || "/"}`);
  pieces.push(`SameSite=${options.sameSite || (IS_PROD ? "None" : "Strict")}`);
  if (options.httpOnly !== false) pieces.push("HttpOnly");
  if (options.secure || IS_PROD) pieces.push("Secure");
  if (options.maxAge !== undefined) pieces.push(`Max-Age=${options.maxAge}`);
  res.setHeader("Set-Cookie", pieces.join("; "));
}

function clearCookie(res, name) {
  setCookie(res, name, "", { maxAge: 0 });
}

function securityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "manifest-src 'self'",
      "worker-src 'self'"
    ].join("; ")
  );
}

function isApiPath(pathname) {
  return pathname && pathname.startsWith("/api/");
}

function isAllowedOrigin(origin) {
  if (!origin) return false;
  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (PUBLIC_SITE_ORIGINS.includes(parsed.origin)) return true;
  if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) return true;
  return parsed.protocol === "https:" && parsed.hostname.endsWith(".github.io");
}

function applyCors(req, res, url) {
  if (!isApiPath(url.pathname)) return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  if (!isAllowedOrigin(origin)) return false;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, X-CSRF-Token");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Vary", "Origin");
  return true;
}

function send(res, status, body, headers = {}) {
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
  res.statusCode = status;
  res.end(body);
}

// ── JSON file helpers (Locale Mode) ─────────────────────────────────

async function readJson(file, fallback) {
  try {
    const raw = await fsp.readFile(file, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (fallback !== undefined) return jsonClone(fallback);
    throw err;
  }
}

async function writeJson(file, value) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
  await fsp.rename(tmp, file);
}

function sendJson(res, status, payload) {
  res.setHeader("Cache-Control", "no-store");
  send(res, status, JSON.stringify(payload), { "Content-Type": MIME[".json"] });
}

function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.end();
}

function notFound(res) {
  send(res, 404, "Not found", { "Content-Type": MIME[".txt"] });
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

// ── VAPID keys ──────────────────────────────────────────────────────

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

function getVapidKeys() {
  if (USE_SUPABASE) {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error("Variabili VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY obbligatorie per le notifiche push in produzione.");
    }
    return { publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY };
  } else {
    try {
      const keys = JSON.parse(fs.readFileSync(VAPID_FILE, "utf8"));
      return { publicKey: keys.publicKey, privateKey: keys.privateKey };
    } catch {
      throw new Error("Impossibile caricare le chiavi VAPID locali. Controlla il file data/vapid.json.");
    }
  }
}

// ── Password hashing ───────────────────────────────────────────────

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const N = 32768;
  const r = 8;
  const p = 1;
  const key = await scryptAsync(String(password), salt, 64, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${r}$${p}$${salt}$${key.toString("base64url")}`;
}

async function verifyPassword(password, storedHash) {
  try {
    const [algo, nRaw, rRaw, pRaw, salt, hash] = String(storedHash || "").split("$");
    if (algo !== "scrypt" || !salt || !hash) return false;
    const N = Number(nRaw);
    const r = Number(rRaw);
    const p = Number(pRaw);
    const expected = Buffer.from(hash, "base64url");
    const actual = await scryptAsync(String(password), salt, expected.length, { N, r, p, maxmem: 64 * 1024 * 1024 });
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

// ── Validators ──────────────────────────────────────────────────────

function cleanText(value, max, required = true) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (required && !text) throw new Error("Campo obbligatorio mancante.");
  if (text.length > max) throw new Error(`Campo troppo lungo: massimo ${max} caratteri.`);
  return text;
}

function cleanMultilineText(value, max, required = false) {
  const text = String(value ?? "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (required && !text) throw new Error("Campo obbligatorio mancante.");
  if (text.length > max) throw new Error(`Campo troppo lungo: massimo ${max} caratteri.`);
  return text;
}

function cleanEmail(value) {
  const email = cleanText(value, 180).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email non valida.");
  return email;
}

function cleanPhone(value) {
  const phone = cleanText(value, 40);
  if (!/^[+()\d\s.-]{6,40}$/.test(phone)) throw new Error("Telefono non valido.");
  return phone;
}

function cleanUrl(value, field) {
  const raw = cleanText(value, 600);
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${field} non valido.`);
  }
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && isLocal)) {
    throw new Error(`${field} deve usare HTTPS.`);
  }
  return parsed.toString();
}

function cleanImageUrl(value) {
  const raw = cleanText(value, 600);
  if (SUPABASE_URL && raw.startsWith(SUPABASE_URL)) return raw;
  if (raw.startsWith("/uploads/")) return raw;
  if (raw.startsWith("/assets/img/")) return raw.slice(1);
  if (raw.startsWith("assets/img/")) return raw;
  return cleanUrl(raw, "URL immagine");
}

// ── Products ────────────────────────────────────────────────────────

function normalizeProduct(input, existing = {}, fallbackOrder = 0) {
  return {
    id: existing.id || `p-${crypto.randomUUID()}`,
    name: cleanText(input.name, 80),
    shortDesc: cleanText(input.shortDesc, 130),
    benefits: cleanText(input.benefits, 260),
    price: cleanText(input.price, 24, false),
    image: cleanImageUrl(input.image),
    link: cleanUrl(input.link, "Link acquisto"),
    visible: input.visible !== false,
    order: Number.isFinite(existing.order) ? existing.order : fallbackOrder
  };
}

const LEGACY_PRODUCT_IDS = new Set([
  "p-lavanda",
  "p-eucalipto",
  "p-rosa",
  "p-menta",
  "p-arancio",
  "p-incenso"
]);

function isLegacyProductSeed(products) {
  return Array.isArray(products)
    && products.length > 0
    && products.every((product) => (
      LEGACY_PRODUCT_IDS.has(product.id)
      || String(product.link || "").startsWith("https://www.google.com/search?q=olio+essenziale")
    ));
}

async function loadProducts() {
  if (USE_SUPABASE) {
    const db = getSupabase();
    const { data, error } = await db.from("products").select("*").order("order", { ascending: true });
    if (error) {
      console.error("[db] errore caricamento prodotti:", error.message);
      return jsonClone(DEFAULT_PRODUCTS);
    }
    if (!data || !data.length) return jsonClone(DEFAULT_PRODUCTS);
    const mapped = data.map((row) => ({
      id: row.id,
      name: row.name,
      shortDesc: row.short_desc,
      benefits: row.benefits,
      price: row.price,
      image: row.image,
      link: row.link,
      visible: row.visible,
      order: row.order
    }));
    return isLegacyProductSeed(mapped) ? jsonClone(DEFAULT_PRODUCTS) : mapped;
  } else {
    const list = await readJson(PRODUCTS_FILE, DEFAULT_PRODUCTS);
    if (!Array.isArray(list)) return jsonClone(DEFAULT_PRODUCTS);
    const sorted = list
      .map((p, i) => ({ ...p, order: Number.isFinite(p.order) ? p.order : i }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return isLegacyProductSeed(sorted) ? jsonClone(DEFAULT_PRODUCTS) : sorted;
  }
}

async function saveProducts(products) {
  const normalized = products
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((p, i) => ({ ...p, order: i }));

  if (USE_SUPABASE) {
    const db = getSupabase();
    const rows = normalized.map((p) => ({
      id: p.id,
      name: p.name,
      short_desc: p.shortDesc,
      benefits: p.benefits,
      price: p.price,
      image: p.image,
      link: p.link,
      visible: p.visible,
      order: p.order,
      updated_at: nowIso()
    }));
    const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
    if (error) throw new Error("Errore salvataggio prodotti: " + error.message);
  } else {
    await writeJson(PRODUCTS_FILE, normalized);
  }
  return normalized;
}

function publicProduct(product) {
  return {
    id: product.id,
    name: product.name,
    shortDesc: product.shortDesc,
    benefits: product.benefits,
    price: product.price,
    image: product.image,
    link: product.link,
    visible: product.visible !== false,
    order: product.order
  };
}

// ── Leads ───────────────────────────────────────────────────────────

function normalizeLead(input) {
  return {
    id: `lead-${crypto.randomUUID()}`,
    name: cleanText(input.name, 100),
    phone: cleanPhone(input.phone),
    email: cleanEmail(input.email),
    day: cleanText(input.day, 80, false),
    slot: cleanText(input.slot, 80, false),
    message: cleanMultilineText(input.message, 1200, false),
    status: "new",
    read: false,
    source: "form-frontend",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

async function loadLeads() {
  if (USE_SUPABASE) {
    const db = getSupabase();
    const { data, error } = await db.from("leads").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("[db] errore caricamento leads:", error.message);
      return [];
    }
    return (data || []).map((row) => ({
      id: row.id,
      name: row.name || "",
      phone: row.phone || "",
      email: row.email || "",
      day: row.day || "",
      slot: row.slot || "",
      message: row.message || "",
      status: ["new", "reviewed", "archived"].includes(row.status) ? row.status : "new",
      read: Boolean(row.read),
      source: row.source || "form-frontend",
      createdAt: row.created_at || nowIso(),
      updatedAt: row.updated_at || row.created_at || nowIso()
    }));
  } else {
    const list = await readJson(LEADS_FILE, []);
    if (!Array.isArray(list)) return [];
    return list
      .filter((lead) => lead && lead.id)
      .map((lead) => ({
        id: String(lead.id),
        name: String(lead.name || ""),
        phone: String(lead.phone || ""),
        email: String(lead.email || ""),
        day: String(lead.day || ""),
        slot: String(lead.slot || ""),
        message: String(lead.message || ""),
        status: ["new", "reviewed", "archived"].includes(lead.status) ? lead.status : "new",
        read: Boolean(lead.read),
        source: String(lead.source || "form-frontend"),
        createdAt: String(lead.createdAt || nowIso()),
        updatedAt: String(lead.updatedAt || nowIso())
      }));
  }
}

function adminLead(lead) {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    day: lead.day,
    slot: lead.slot,
    message: lead.message,
    status: lead.status,
    read: lead.read,
    source: lead.source,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt
  };
}

function leadStats(leads) {
  return {
    total: leads.length,
    new: leads.filter((lead) => lead.status === "new").length,
    reviewed: leads.filter((lead) => lead.status === "reviewed").length,
    archived: leads.filter((lead) => lead.status === "archived").length
  };
}

function filterLeads(leads, url) {
  const query = cleanText(url.searchParams.get("q") || "", 120, false).toLowerCase();
  const status = cleanText(url.searchParams.get("status") || "active", 20, false);
  return leads.filter((lead) => {
    const statusOk =
      status === "all" ||
      (status === "active" && lead.status !== "archived") ||
      lead.status === status;
    if (!statusOk) return false;
    if (!query) return true;
    const haystack = [lead.name, lead.email, lead.phone, lead.day, lead.slot, lead.message]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

// ── Sessions ────────────────────────────────────────────────────────

function createSession(user) {
  const id = crypto.randomBytes(32).toString("base64url");
  const session = {
    id,
    userId: user.id,
    username: user.username,
    role: user.role,
    csrfToken: crypto.randomBytes(32).toString("base64url"),
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS
  };
  sessions.set(id, session);
  return session;
}

function getSession(req) {
  const cookie = parseCookies(req)[SESSION_COOKIE];
  const sessionId = verifySignedValue(cookie);
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    return null;
  }
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return session;
}

function requireAuth(req, res) {
  const session = getSession(req);
  if (!session) {
    sendJson(res, 401, { error: "Autenticazione richiesta." });
    return null;
  }
  return session;
}

function requireCsrf(req, res, session) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
  const token = String(req.headers["x-csrf-token"] || "");
  if (!token || token.length !== session.csrfToken.length) {
    sendJson(res, 403, { error: "Token CSRF non valido." });
    return false;
  }
  const ok = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(session.csrfToken));
  if (!ok) sendJson(res, 403, { error: "Token CSRF non valido." });
  return ok;
}

// ── Rate limiting ───────────────────────────────────────────────────

function loginRateKey(req, username) {
  return `${clientIp(req)}:${String(username || "").toLowerCase()}`;
}

function checkContactRate(req) {
  const key = clientIp(req);
  const now = Date.now();
  const entry = contactAttempts.get(key);
  if (!entry || entry.firstAt + CONTACT_WINDOW_MS < now) {
    contactAttempts.set(key, { count: 1, firstAt: now });
    return true;
  }
  entry.count += 1;
  contactAttempts.set(key, entry);
  return entry.count <= CONTACT_MAX_ATTEMPTS;
}

function checkLoginRate(req, username) {
  const key = loginRateKey(req, username);
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry) return { ok: true, key };
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return { ok: false, key, retryAfter: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  if (entry.firstAt + LOGIN_WINDOW_MS < now) {
    loginAttempts.delete(key);
    return { ok: true, key };
  }
  return { ok: true, key };
}

function recordLoginFailure(key) {
  const now = Date.now();
  const entry = loginAttempts.get(key) || { count: 0, firstAt: now, lockedUntil: 0 };
  if (entry.firstAt + LOGIN_WINDOW_MS < now) {
    entry.count = 0;
    entry.firstAt = now;
    entry.lockedUntil = 0;
  }
  entry.count += 1;
  if (entry.count >= LOGIN_MAX_ATTEMPTS) entry.lockedUntil = now + LOGIN_LOCK_MS;
  loginAttempts.set(key, entry);
}

function recordLoginSuccess(key) {
  loginAttempts.delete(key);
}

// ── Body parsing ────────────────────────────────────────────────────

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Payload troppo grande."));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      const contentType = req.headers["content-type"] || "";
      try {
        if (contentType.includes("application/json")) return resolve(JSON.parse(raw));
        if (contentType.includes("application/x-www-form-urlencoded")) {
          return resolve(Object.fromEntries(new URLSearchParams(raw)));
        }
        resolve({});
      } catch {
        reject(new Error("JSON non valido."));
      }
    });
    req.on("error", reject);
  });
}

async function readRawBuffer(req, limit = MAX_UPLOAD_BYTES) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("File troppo grande. Dimensione massima: 5 MB."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// ── Multipart parsing ───────────────────────────────────────────────

function splitBuffer(buffer, delimiter) {
  const parts = [];
  let start = 0;
  let idx;
  while ((idx = buffer.indexOf(delimiter, start)) !== -1) {
    parts.push(buffer.subarray(start, idx));
    start = idx + delimiter.length;
  }
  parts.push(buffer.subarray(start));
  return parts;
}

function parseMultipart(buffer, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  const headerBreak = Buffer.from("\r\n\r\n");
  return splitBuffer(buffer, delimiter)
    .map((part) => {
      let chunk = part;
      if (chunk.subarray(0, 2).toString() === "\r\n") chunk = chunk.subarray(2);
      if (chunk.subarray(chunk.length - 2).toString() === "\r\n") chunk = chunk.subarray(0, chunk.length - 2);
      if (chunk.equals(Buffer.from("--")) || !chunk.length) return null;
      if (chunk.subarray(chunk.length - 2).toString() === "--") chunk = chunk.subarray(0, chunk.length - 2);
      const headerEnd = chunk.indexOf(headerBreak);
      if (headerEnd < 0) return null;
      const headerText = chunk.subarray(0, headerEnd).toString("utf8");
      const content = chunk.subarray(headerEnd + headerBreak.length);
      const headers = {};
      headerText.split("\r\n").forEach((line) => {
        const idx = line.indexOf(":");
        if (idx > 0) headers[line.slice(0, idx).toLowerCase()] = line.slice(idx + 1).trim();
      });
      const disposition = headers["content-disposition"] || "";
      const name = disposition.match(/name="([^"]+)"/)?.[1] || "";
      const filename = disposition.match(/filename="([^"]*)"/)?.[1] || "";
      return { name, filename, contentType: headers["content-type"] || "", content };
    })
    .filter(Boolean);
}

function detectImageType(buffer, declaredType) {
  if (buffer.length >= 12 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return "image/jpeg";
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") {
    return "image/webp";
  }
  return UPLOAD_TYPES[declaredType] ? declaredType : "";
}

// ── Upload ──────────────────────────────────────────────────────────

async function handleUpload(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Metodo non consentito." });
  const contentType = req.headers["content-type"] || "";
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[1] || contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[2];
  if (!contentType.includes("multipart/form-data") || !boundary) {
    return sendJson(res, 400, { error: "Upload non valido." });
  }

  const raw = await readRawBuffer(req);
  const parts = parseMultipart(raw, boundary);
  const file = parts.find((part) => part.name === "image" && part.filename && part.content.length);
  if (!file) return sendJson(res, 400, { error: "Seleziona un'immagine da caricare." });

  const imageType = detectImageType(file.content, file.contentType);
  const ext = UPLOAD_TYPES[imageType];
  if (!ext) {
    return sendJson(res, 400, { error: "Formato non supportato. Usa JPG, PNG o WebP." });
  }

  const filename = `${Date.now()}-${crypto.randomBytes(10).toString("hex")}${ext}`;

  if (USE_SUPABASE) {
    const db = getSupabase();
    const { error } = await db.storage.from(SUPABASE_STORAGE_BUCKET).upload(filename, file.content, {
      contentType: imageType,
      cacheControl: "31536000",
      upsert: false
    });
    if (error) {
      return sendJson(res, 500, { error: "Errore caricamento immagine: " + error.message });
    }
    const { data: urlData } = db.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(filename);
    return sendJson(res, 201, { url: urlData.publicUrl, filename });
  } else {
    const filePath = path.join(UPLOAD_DIR, filename);
    await fsp.writeFile(filePath, file.content);
    return sendJson(res, 201, { url: `/uploads/${filename}`, filename });
  }
}

// ── Push notifications ──────────────────────────────────────────────

function sendPushNotification(subscription, payload, vapid) {
  webpush.setVapidDetails(VAPID_SUBJECT, vapid.publicKey, vapid.privateKey);
  return webpush.sendNotification(subscription, JSON.stringify(payload))
    .then(() => ({ ok: true, remove: false }))
    .catch((error) => {
      const statusCode = error.statusCode;
      return {
        ok: false,
        statusCode,
        remove: statusCode === 404 || statusCode === 410,
        error: error.message
      };
    });
}

async function sendPushToAll(payload) {
  const subscriptions = await loadPushSubscriptions();
  if (!subscriptions.length) return { sent: 0, failed: 0, registered: 0 };
  const vapid = getVapidKeys();
  const results = await Promise.all(subscriptions.map((sub) => sendPushNotification(sub, payload, vapid)));
  const activeSubscriptions = subscriptions.filter((_, index) => !results[index].remove);
  if (activeSubscriptions.length !== subscriptions.length) await savePushSubscriptions(activeSubscriptions);
  return {
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    registered: activeSubscriptions.length
  };
}

async function notifyNewLead(lead) {
  try {
    const payload = {
      type: "NEW_LEAD",
      title: "Nuova richiesta da " + (lead.name || "Utente"),
      body: lead.message ? (lead.message.length > 50 ? lead.message.slice(0, 50) + "..." : lead.message) : "Controlla le nuove richieste nel gestionale.",
      url: "/admin.html#richieste"
    };
    await sendPushToAll(payload);
  } catch (err) {
    console.warn("[push]", err.message);
  }
}

// ── Auth ────────────────────────────────────────────────────────────

function userPayload(session) {
  return {
    user: {
      username: session.username,
      role: session.role
    },
    csrfToken: session.csrfToken,
    expiresAt: new Date(session.expiresAt).toISOString()
  };
}

async function handleLogin(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Metodo non consentito." });
  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    return sendJson(res, 400, { error: err.message });
  }
  const username = cleanText(body.username, 80, false).toLowerCase();
  const password = String(body.password || "");
  const rate = checkLoginRate(req, username);
  if (!rate.ok) {
    res.setHeader("Retry-After", String(rate.retryAfter || 60));
    return sendJson(res, 429, { error: "Troppi tentativi. Riprova tra qualche minuto." });
  }

  let user = null;
  let passwordOk = false;
  if (USE_SUPABASE) {
    const db = getSupabase();
    const { data: dbUser } = await db.from("users").select("*").eq("username", username).single();
    user = dbUser;
    passwordOk = user ? await verifyPassword(password, user.password_hash) : false;
  } else {
    const users = await readJson(USERS_FILE, []);
    const localUser = Array.isArray(users) ? users.find((u) => String(u.username).toLowerCase() === username) : null;
    user = localUser;
    passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;
  }

  if (!user || !passwordOk || user.role !== "admin") {
    recordLoginFailure(rate.key);
    await new Promise((resolve) => setTimeout(resolve, 300));
    return sendJson(res, 401, { error: "Credenziali non valide." });
  }

  recordLoginSuccess(rate.key);
  const session = createSession(user);
  setCookie(res, SESSION_COOKIE, signedValue(session.id), { maxAge: Math.floor(SESSION_TTL_MS / 1000) });
  sendJson(res, 200, userPayload(session));
}

// ── Contact form ────────────────────────────────────────────────────

async function handleContact(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Metodo non consentito." });
  if (!checkContactRate(req)) {
    return sendJson(res, 429, { error: "Troppe richieste ravvicinate. Riprova tra qualche minuto." });
  }
  let body;
  try {
    body = await readBody(req);
    const lead = normalizeLead(body);
    if (USE_SUPABASE) {
      const db = getSupabase();
      const { error } = await db.from("leads").insert({
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        day: lead.day,
        slot: lead.slot,
        message: lead.message,
        status: lead.status,
        read: lead.read,
        source: lead.source,
        created_at: lead.createdAt,
        updated_at: lead.updatedAt
      });
      if (error) throw new Error("Errore salvataggio richiesta: " + error.message);
    } else {
      const leads = await loadLeads();
      leads.unshift(lead);
      await writeJson(LEADS_FILE, leads);
    }
    notifyNewLead(lead);
    return sendJson(res, 201, {
      ok: true,
      message: "Richiesta ricevuta. Ti ricontatteremo al più presto.",
      id: lead.id
    });
  } catch (err) {
    return sendJson(res, 400, { error: err.message || "Richiesta non valida." });
  }
}

// ── API router ──────────────────────────────────────────────────────

async function handleApi(req, res, url) {
  applyCors(req, res, url);
  if (req.method === "OPTIONS" && isApiPath(url.pathname)) {
    if (req.headers.origin && !isAllowedOrigin(req.headers.origin)) {
      return sendJson(res, 403, { error: "Origine non consentita." });
    }
    return send(res, 204, "", { "Content-Type": MIME[".txt"] });
  }

  if (url.pathname === "/api/products" && req.method === "GET") {
    const products = (await loadProducts()).map(publicProduct);
    return sendJson(res, 200, { products });
  }

  if (url.pathname === "/api/contact") return handleContact(req, res);

  if (url.pathname === "/api/auth/login") return handleLogin(req, res);

  if (url.pathname === "/api/auth/session" && req.method === "GET") {
    const session = requireAuth(req, res);
    if (!session) return;
    return sendJson(res, 200, userPayload(session));
  }

  if (url.pathname === "/api/auth/logout" && req.method === "POST") {
    const session = requireAuth(req, res);
    if (!session || !requireCsrf(req, res, session)) return;
    sessions.delete(session.id);
    clearCookie(res, SESSION_COOKIE);
    return sendJson(res, 200, { ok: true });
  }

  if (!url.pathname.startsWith("/api/admin/")) return notFound(res);

  const session = requireAuth(req, res);
  if (!session || !requireCsrf(req, res, session)) return;

  const parts = url.pathname.split("/").filter(Boolean);

  try {
    if (url.pathname === "/api/admin/notifications/public-key" && req.method === "GET") {
      const vapid = getVapidKeys();
      return sendJson(res, 200, {
        publicKey: vapid.publicKey,
        secureContext: IS_PROD ? "https" : "localhost"
      });
    }

    if (url.pathname === "/api/admin/notifications/subscribe" && req.method === "POST") {
      const body = await readBody(req);
      const incoming = normalizePushSubscription(body.subscription || body, session);
      if (USE_SUPABASE) {
        const db = getSupabase();
        await db.from("push_subscriptions").delete().eq("endpoint", incoming.endpoint);
        const { error } = await db.from("push_subscriptions").insert({
          endpoint: incoming.endpoint,
          p256dh: incoming.keys.p256dh,
          auth: incoming.keys.auth,
          user_name: incoming.user,
          created_at: incoming.createdAt,
          updated_at: incoming.updatedAt
        });
        if (error) throw new Error("Errore registrazione notifiche: " + error.message);
        const { count } = await db.from("push_subscriptions").select("*", { count: "exact", head: true });
        return sendJson(res, 201, { ok: true, registered: count || 0 });
      } else {
        const list = await loadPushSubscriptions();
        const active = list.filter((sub) => sub.endpoint !== incoming.endpoint);
        active.push(incoming);
        await savePushSubscriptions(active);
        return sendJson(res, 201, { ok: true, registered: active.length });
      }
    }

    if (url.pathname === "/api/admin/notifications/unsubscribe" && req.method === "POST") {
      const body = await readBody(req);
      const endpoint = body.endpoint;
      if (!endpoint) return sendJson(res, 400, { error: "Endpoint mancante." });
      if (USE_SUPABASE) {
        const db = getSupabase();
        await db.from("push_subscriptions").delete().eq("endpoint", endpoint);
        const { count } = await db.from("push_subscriptions").select("*", { count: "exact", head: true });
        return sendJson(res, 200, { ok: true, registered: count || 0 });
      } else {
        const list = await loadPushSubscriptions();
        const active = list.filter((sub) => sub.endpoint !== endpoint);
        await savePushSubscriptions(active);
        return sendJson(res, 200, { ok: true, registered: active.length });
      }
    }

    if (url.pathname === "/api/admin/notifications/test" && req.method === "POST") {
      const result = await sendPushToAll({
        type: "TEST",
        title: "Test Notifiche PWA",
        body: "Le notifiche in background funzionano correttamente!",
        url: "/admin.html"
      });
      return sendJson(res, 200, { ok: true, ...result });
    }

    if (url.pathname === "/api/admin/leads" && req.method === "GET") {
      const leads = await loadLeads();
      const filtered = filterLeads(leads, url);
      return sendJson(res, 200, {
        leads: filtered.map(adminLead),
        stats: leadStats(leads),
        ...userPayload(session)
      });
    }

    if (parts[0] === "api" && parts[1] === "admin" && parts[2] === "leads" && parts[3]) {
      const id = decodeURIComponent(parts[3]);

      if (USE_SUPABASE) {
        const db = getSupabase();
        const { data: existing } = await db.from("leads").select("id").eq("id", id).single();
        if (!existing) return sendJson(res, 404, { error: "Richiesta non trovata." });

        if (req.method === "PATCH") {
          const body = await readBody(req);
          const updates = { updated_at: nowIso() };
          if (Object.prototype.hasOwnProperty.call(body, "read")) updates.read = Boolean(body.read);
          if (Object.prototype.hasOwnProperty.call(body, "status")) {
            const status = cleanText(body.status, 20);
            if (!["new", "reviewed", "archived"].includes(status)) throw new Error("Stato richiesta non valido.");
            updates.status = status;
            updates.read = status !== "new";
          }
          const { error } = await db.from("leads").update(updates).eq("id", id);
          if (error) throw new Error("Errore aggiornamento richiesta: " + error.message);
          const leads = await loadLeads();
          return sendJson(res, 200, {
            lead: adminLead(leads.find((lead) => lead.id === id)),
            stats: leadStats(leads)
          });
        }

        if (req.method === "DELETE") {
          const { error } = await db.from("leads").delete().eq("id", id);
          if (error) throw new Error("Errore eliminazione richiesta: " + error.message);
          const leads = await loadLeads();
          return sendJson(res, 200, { ok: true, stats: leadStats(leads) });
        }
      } else {
        const leads = await loadLeads();
        const idx = leads.findIndex((lead) => lead.id === id);
        if (idx < 0) return sendJson(res, 404, { error: "Richiesta non trovata." });

        if (req.method === "PATCH") {
          const body = await readBody(req);
          leads[idx].updatedAt = nowIso();
          if (Object.prototype.hasOwnProperty.call(body, "read")) leads[idx].read = Boolean(body.read);
          if (Object.prototype.hasOwnProperty.call(body, "status")) {
            const status = cleanText(body.status, 20);
            if (!["new", "reviewed", "archived"].includes(status)) throw new Error("Stato richiesta non valido.");
            leads[idx].status = status;
            leads[idx].read = status !== "new";
          }
          await writeJson(LEADS_FILE, leads);
          return sendJson(res, 200, { lead: adminLead(leads[idx]), stats: leadStats(leads) });
        }

        if (req.method === "DELETE") {
          leads.splice(idx, 1);
          await writeJson(LEADS_FILE, leads);
          return sendJson(res, 200, { ok: true, stats: leadStats(leads) });
        }
      }
    }

    if (url.pathname === "/api/admin/uploads") {
      return await handleUpload(req, res);
    }

    if (url.pathname === "/api/admin/products" && req.method === "GET") {
      return sendJson(res, 200, { products: (await loadProducts()).map(publicProduct), ...userPayload(session) });
    }

    if (url.pathname === "/api/admin/products" && req.method === "POST") {
      const body = await readBody(req);
      const list = await loadProducts();
      const product = normalizeProduct(body, {}, list.length);
      if (USE_SUPABASE) {
        const db = getSupabase();
        const { error } = await db.from("products").insert({
          id: product.id,
          name: product.name,
          short_desc: product.shortDesc,
          benefits: product.benefits,
          price: product.price,
          image: product.image,
          link: product.link,
          visible: product.visible,
          order: product.order,
          created_at: nowIso(),
          updated_at: nowIso()
        });
        if (error) throw new Error("Errore creazione prodotto: " + error.message);
      } else {
        list.push(product);
        await saveProducts(list);
      }
      const saved = await loadProducts();
      return sendJson(res, 201, { products: saved.map(publicProduct), product: publicProduct(product) });
    }

    if (url.pathname === "/api/admin/products/reset" && req.method === "POST") {
      if (USE_SUPABASE) {
        const db = getSupabase();
        await db.from("products").delete().neq("id", "");
        const defaults = jsonClone(DEFAULT_PRODUCTS);
        const rows = defaults.map((p) => ({
          id: p.id, name: p.name, short_desc: p.shortDesc, benefits: p.benefits,
          price: p.price, image: p.image, link: p.link, visible: p.visible,
          order: p.order, created_at: nowIso(), updated_at: nowIso()
        }));
        await db.from("products").insert(rows);
      } else {
        await saveProducts(jsonClone(DEFAULT_PRODUCTS));
      }
      const saved = await loadProducts();
      return sendJson(res, 200, { products: saved.map(publicProduct) });
    }

    if (parts[0] === "api" && parts[1] === "admin" && parts[2] === "products" && parts[3]) {
      const id = decodeURIComponent(parts[3]);
      const list = await loadProducts();
      const idx = list.findIndex((p) => p.id === id);
      if (idx < 0) return sendJson(res, 404, { error: "Prodotto non trovato." });

      if (req.method === "PUT") {
        const body = await readBody(req);
        const updated = normalizeProduct(body, list[idx], idx);
        if (USE_SUPABASE) {
          const db = getSupabase();
          const { error } = await db.from("products").update({
            name: updated.name,
            short_desc: updated.shortDesc,
            benefits: updated.benefits,
            price: updated.price,
            image: updated.image,
            link: updated.link,
            visible: updated.visible,
            order: updated.order,
            updated_at: nowIso()
          }).eq("id", id);
          if (error) throw new Error("Errore aggiornamento prodotto: " + error.message);
        } else {
          list[idx] = updated;
          await saveProducts(list);
        }
        const saved = await loadProducts();
        return sendJson(res, 200, { products: saved.map(publicProduct), product: publicProduct(updated) });
      }

      if (req.method === "PATCH") {
        const body = await readBody(req);
        const updates = { updated_at: nowIso() };
        if (Object.prototype.hasOwnProperty.call(body, "visible")) updates.visible = body.visible !== false;
        if (USE_SUPABASE) {
          const db = getSupabase();
          const { error } = await db.from("products").update(updates).eq("id", id);
          if (error) throw new Error("Errore aggiornamento prodotto: " + error.message);
        } else {
          if (Object.prototype.hasOwnProperty.call(updates, "visible")) list[idx].visible = updates.visible;
          await saveProducts(list);
        }
        const saved = await loadProducts();
        const product = saved.find((p) => p.id === id);
        return sendJson(res, 200, { products: saved.map(publicProduct), product: product ? publicProduct(product) : null });
      }

      if (req.method === "DELETE") {
        if (USE_SUPABASE) {
          const db = getSupabase();
          const { error } = await db.from("products").delete().eq("id", id);
          if (error) throw new Error("Errore eliminazione prodotto: " + error.message);
        } else {
          list.splice(idx, 1);
          await saveProducts(list);
        }
        const saved = await loadProducts();
        return sendJson(res, 200, { products: saved.map(publicProduct) });
      }

      if (parts[4] === "move" && req.method === "POST") {
        const body = await readBody(req);
        const direction = Number(body.direction) < 0 ? -1 : 1;
        const target = idx + direction;
        if (target < 0 || target >= list.length) {
          return sendJson(res, 200, { products: list.map(publicProduct) });
        }
        const tmp = list[idx].order;
        list[idx].order = list[target].order;
        list[target].order = tmp;
        const saved = await saveProducts(list);
        return sendJson(res, 200, { products: saved.map(publicProduct) });
      }
    }
  } catch (err) {
    return sendJson(res, 400, { error: err.message || "Operazione non valida." });
  }

  return sendJson(res, 405, { error: "Metodo non consentito." });
}

// ── Static file serving ─────────────────────────────────────────────

function safeStaticPath(urlPath) {
  let pathname = decodeURIComponent(urlPath);
  if (pathname === "/") pathname = "/index.html";
  if (pathname === "/admin") pathname = "/admin.html";
  if (pathname === "/links") pathname = "/links/";
  if (pathname === "/links/") pathname = "/links/index.html";

  if (pathname.includes("\0")) return null;
  if (pathname.startsWith("/data/")) return null;
  if (pathname === "/server.js" || pathname === "/package.json" || pathname.endsWith(".env")) return null;

  // Servizio immagini locali caricate in modalità locale
  if (pathname.startsWith("/uploads/")) {
    if (USE_SUPABASE) return null;
    const resolved = path.normalize(path.join(ROOT, pathname));
    if (!resolved.startsWith(ROOT)) return null;
    return resolved;
  }

  const ext = path.extname(pathname).toLowerCase();
  if (!MIME[ext]) return null;
  const resolved = path.normalize(path.join(ROOT, pathname));
  if (!resolved.startsWith(ROOT)) return null;
  if ([path.join(ROOT, "server.js"), path.join(ROOT, "package.json")].includes(resolved)) return null;
  if (path.basename(resolved).startsWith(".env")) return null;
  return resolved;
}

async function serveFile(req, res, filePath, options = {}) {
  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) return notFound(res);
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
    if (path.basename(filePath) === "sw.js") {
      res.setHeader("Service-Worker-Allowed", "/");
    }
    res.setHeader("Cache-Control", options.noStore ? "no-store" : "public, max-age=600");
    fs.createReadStream(filePath).pipe(res);
  } catch {
    notFound(res);
  }
}

async function handleStatic(req, res, url) {
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === "/admin" || pathname === "/admin.html" || pathname === "/assets/js/admin.js") {
    const session = getSession(req);
    if (!session) {
      if (pathname.endsWith(".js")) return send(res, 401, "Autenticazione richiesta.", { "Content-Type": MIME[".txt"] });
      const next = encodeURIComponent("/admin.html");
      return redirect(res, `/login.html?next=${next}`);
    }
  }

  if (pathname === "/login.html" && getSession(req)) {
    return redirect(res, "/admin.html");
  }

  const filePath = safeStaticPath(pathname);
  if (!filePath) return notFound(res);
  const ext = path.extname(filePath).toLowerCase();
  const noStore = [".html", ".js", ".css", ".webmanifest"].includes(ext) || pathname === "/admin";
  await serveFile(req, res, filePath, { noStore });
}

// ── Request handler ─────────────────────────────────────────────────

async function handleRequest(req, res) {
  securityHeaders(res);
  const url = new URL(req.url, `http://${req.headers.host || `127.0.0.1:${PORT}`}`);

  try {
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return await handleStatic(req, res, url);
  } catch (err) {
    console.error("[server]", err);
    sendJson(res, 500, { error: "Errore interno del server." });
  }
}

// ── Admin user bootstrap & local DB setup ───────────────────────────

async function ensureAdminUserSupabase() {
  const username = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.warn("[auth] ADMIN_USER e ADMIN_PASSWORD non impostati. Impossibile garantire accesso admin su Supabase.");
    return;
  }
  const db = getSupabase();
  const { data: existing } = await db.from("users").select("id").eq("username", username.toLowerCase()).single();
  if (existing) return;
  const passwordHash = await hashPassword(password);
  const { error } = await db.from("users").insert({
    id: crypto.randomUUID(),
    username: username.toLowerCase(),
    role: "admin",
    password_hash: passwordHash,
    created_at: nowIso(),
    updated_at: nowIso()
  });
  if (error) {
    console.error("[auth] errore creazione admin su Supabase:", error.message);
  } else {
    console.log(`[auth] Utente admin "${username}" creato su Supabase.`);
  }
}

async function ensureDataFiles() {
  if (USE_SUPABASE) {
    await ensureAdminUserSupabase();
    return;
  }

  // Creazione cartelle locali se non esistono
  await fsp.mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
  await fsp.mkdir(UPLOAD_DIR, { recursive: true, mode: 0o755 });

  if (!fs.existsSync(PRODUCTS_FILE)) {
    await writeJson(PRODUCTS_FILE, DEFAULT_PRODUCTS);
  }

  if (!fs.existsSync(LEADS_FILE)) {
    await writeJson(LEADS_FILE, []);
  }

  if (!fs.existsSync(PUSH_SUBSCRIPTIONS_FILE)) {
    await writeJson(PUSH_SUBSCRIPTIONS_FILE, []);
  }

  if (!fs.existsSync(VAPID_FILE)) {
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.generateKeys();
    const keys = {
      publicKey: ecdh.getPublicKey(null, "uncompressed").toString("base64url"),
      privateKey: ecdh.getPrivateKey().toString("base64url"),
      createdAt: nowIso()
    };
    await writeJson(VAPID_FILE, keys);
  }

  if (!fs.existsSync(USERS_FILE)) {
    const username = (process.env.ADMIN_USER || "admin").toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "admin";
    const passwordHash = await hashPassword(password);
    const users = [
      {
        id: crypto.randomUUID(),
        username,
        role: "admin",
        passwordHash,
        createdAt: nowIso(),
        updatedAt: nowIso()
      }
    ];
    await writeJson(USERS_FILE, users);
    console.log(`[auth] Utente admin locale creato.`);
    console.log(`[auth] UTENTE: ${username}`);
    console.log(`[auth] PASSWORD: ${password}`);
  }
}

// ── Entrypoint ──────────────────────────────────────────────────────

async function main() {
  if (USE_SUPABASE) {
    try {
      getSupabase(); // Valida le chiavi subito all'avvio
    } catch (e) {
      console.error("[supabase] Errore inizializzazione client:", e.message);
      process.exit(1);
    }
  }

  await ensureDataFiles();

  const server = http.createServer(handleRequest);
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[server] Come le Api attivo su http://0.0.0.0:${PORT}/`);
    console.log(`[server] Gestionale protetto: http://0.0.0.0:${PORT}/admin.html`);
    if (!USE_SUPABASE) {
      console.log(`[server] ATTENZIONE: Esecuzione in MODALITÀ LOCALE (senza Supabase).`);
      console.log(`[server] I dati dei contatti e prodotti sono persistenti nella cartella /data/`);
      console.log(`[server] Se vuoi usare Supabase in locale, imposta SUPABASE_URL e SUPABASE_SERVICE_KEY nel file .env`);
    } else {
      console.log(`[server] Connesso ed in esecuzione in MODALITÀ CLOUD (connessione a Supabase attiva).`);
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
