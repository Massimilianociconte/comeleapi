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

// Carica variabili d'ambiente da file .env se presente
try {
  const envPath = path.join(ROOT, ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (e) {
  // Ignora errori lettura .env
}

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
const RATE_LIMIT_SWEEP_MS = 60 * 1000;
const MAX_RATE_LIMIT_ENTRIES = 4096;
const IS_PROD = process.env.NODE_ENV === "production";
const CONFIGURED_SESSION_SECRET = String(process.env.SESSION_SECRET || "");
const COOKIE_SECRET = CONFIGURED_SESSION_SECRET || crypto.randomBytes(32).toString("base64url");
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:sara.bordenga@gmail.com";
const PUBLIC_SITE_ORIGINS = String(
  process.env.PUBLIC_SITE_ORIGINS || "https://comeleapi.it,https://www.comeleapi.it,https://comeleapi.netlify.app"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const CONFIGURED_ADMIN_USER = String(process.env.ADMIN_USER || "").trim().toLowerCase();
const CONFIGURED_ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "");
const LEGACY_WEAK_ADMIN_PASSWORDS = new Set(["", "admin", "password", "cambia-questa-password"]);

function validateAdminBootstrapPassword(password) {
  const value = String(password || "");
  if (LEGACY_WEAK_ADMIN_PASSWORDS.has(value) || value.length < 14) {
    throw new Error("ADMIN_PASSWORD deve contenere almeno 14 caratteri e non puo essere una password predefinita.");
  }
  return value;
}

function validateRuntimeConfig() {
  if (!IS_PROD) return;
  if (!USE_SUPABASE) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_KEY sono obbligatorie in produzione.");
  }
  if (Buffer.byteLength(CONFIGURED_SESSION_SECRET, "utf8") < 32) {
    throw new Error("SESSION_SECRET deve contenere almeno 32 byte in produzione.");
  }
  if (!CONFIGURED_ADMIN_USER) {
    throw new Error("ADMIN_USER e obbligatoria in produzione.");
  }
  validateAdminBootstrapPassword(CONFIGURED_ADMIN_PASSWORD);
}

const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const PRODUCT_CATALOG_FILE = path.join(ROOT, "products.json");
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
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8"
};

const DEFAULT_PRODUCTS = JSON.parse(fs.readFileSync(PRODUCT_CATALOG_FILE, "utf8"));

const sessions = new Map();
const loginAttempts = new Map();
const contactAttempts = new Map();
let nextRateLimitSweepAt = 0;
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

class ClientInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "ClientInputError";
  }
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
  pieces.push(`SameSite=${options.sameSite || "Lax"}`);
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
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  if (IS_PROD) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
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
  return !IS_PROD && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
}

function requestOrigin(req) {
  const forwardedProtocol = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const protocol = forwardedProtocol || (IS_PROD ? "https" : "http");
  const host = String(req.headers.host || "").trim();
  return host ? `${protocol}://${host}` : "";
}

function isPublicCorsPath(pathname) {
  return pathname === "/api/products" || pathname === "/api/contact";
}

function applyCors(req, res, url) {
  if (!isApiPath(url.pathname)) return true;
  const origin = req.headers.origin;
  if (!origin) return true;

  let normalizedOrigin;
  try {
    normalizedOrigin = new URL(origin).origin;
  } catch {
    return false;
  }

  if (normalizedOrigin === requestOrigin(req)) return true;
  if (!isPublicCorsPath(url.pathname) || !isAllowedOrigin(normalizedOrigin)) return false;

  res.setHeader("Access-Control-Allow-Origin", origin);
  // These two endpoints are intentionally consumed by the public site hosted
  // on a different origin. CORP must therefore agree with the narrow CORS
  // allowlist above; all other responses keep the stricter same-site policy.
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
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
  if (required && !text) throw new ClientInputError("Campo obbligatorio mancante.");
  if (text.length > max) throw new ClientInputError(`Campo troppo lungo: massimo ${max} caratteri.`);
  return text;
}

function cleanMultilineText(value, max, required = false) {
  const text = String(value ?? "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (required && !text) throw new ClientInputError("Campo obbligatorio mancante.");
  if (text.length > max) throw new ClientInputError(`Campo troppo lungo: massimo ${max} caratteri.`);
  return text;
}

function cleanEmail(value) {
  const email = cleanText(value, 180).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ClientInputError("Email non valida.");
  return email;
}

function cleanPhone(value) {
  const phone = cleanText(value, 40);
  if (!/^[+()\d\s.-]{6,40}$/.test(phone)) throw new ClientInputError("Telefono non valido.");
  return phone;
}

function cleanUrl(value, field) {
  const raw = cleanText(value, 600);
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new ClientInputError(`${field} non valido.`);
  }
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && isLocal)) {
    throw new ClientInputError(`${field} deve usare HTTPS.`);
  }
  return parsed.toString();
}

function cleanImageUrl(value) {
  const raw = cleanText(value, 600);
  if (SUPABASE_URL && raw.startsWith(SUPABASE_URL)) return raw;
  if (raw.startsWith("/uploads/")) return raw;
  if (raw.startsWith("/assets/img/")) return raw.slice(1);
  if (raw.startsWith("assets/img/")) return raw;
  if (raw.startsWith("/foto-prodotti/")) return raw.slice(1);
  if (raw.startsWith("foto-prodotti/")) return raw;
  return cleanUrl(raw, "URL immagine");
}

// ── Products ────────────────────────────────────────────────────────

function normalizeProduct(input, existing = {}, fallbackOrder = 0) {
  return {
    id: existing.id || `p-${crypto.randomUUID()}`,
    name: cleanText(input.name, 80),
    shortDesc: cleanText(input.shortDesc, 320),
    benefits: cleanText(input.benefits, 500, false),
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

function shouldRepairLegacyProductSeed(products) {
  if (!Array.isArray(products)) return false;
  const ids = new Set(products.map((product) => product.id));
  const defaultIds = new Set(DEFAULT_PRODUCTS.map((product) => product.id));
  const allowedIds = new Set([...LEGACY_PRODUCT_IDS, ...defaultIds]);
  const exactLegacySeed = products.length === LEGACY_PRODUCT_IDS.size && isLegacyProductSeed(products);
  const recoverablePartialRepair =
    [...defaultIds].every((id) => ids.has(id))
    && products.some((product) => LEGACY_PRODUCT_IDS.has(product.id))
    && products.every((product) => allowedIds.has(product.id));
  return exactLegacySeed || recoverablePartialRepair;
}

function databaseProduct(row) {
  return {
    id: row.id,
    name: row.name,
    shortDesc: row.short_desc,
    benefits: row.benefits,
    price: row.price,
    image: row.image,
    link: row.link,
    visible: row.visible,
    order: row.order
  };
}

async function repairLegacyProductSeed(db, products) {
  const repairAt = nowIso();
  const rows = DEFAULT_PRODUCTS.map((product) => ({
    id: product.id,
    name: product.name,
    short_desc: product.shortDesc,
    benefits: product.benefits,
    price: product.price,
    image: product.image,
    link: product.link,
    visible: product.visible,
    order: product.order,
    updated_at: repairAt
  }));
  const { error: upsertError } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (upsertError) throw new Error("Errore allineamento catalogo corrente: " + upsertError.message);

  const obsoleteIds = products
    .map((product) => product.id)
    .filter((id) => LEGACY_PRODUCT_IDS.has(id));
  if (obsoleteIds.length) {
    const { error: deleteError } = await db.from("products").delete().in("id", obsoleteIds);
    if (deleteError) throw new Error("Errore rimozione prodotti legacy: " + deleteError.message);
  }

  const { data, error: verifyError } = await db.from("products").select("*").order("order", { ascending: true });
  if (verifyError) throw new Error("Errore verifica allineamento catalogo: " + verifyError.message);
  const repaired = (data || []).map(databaseProduct);
  const repairedIds = new Set(repaired.map((product) => product.id));
  if (
    repaired.length !== DEFAULT_PRODUCTS.length
    || DEFAULT_PRODUCTS.some((product) => !repairedIds.has(product.id))
    || repaired.some((product) => LEGACY_PRODUCT_IDS.has(product.id))
  ) {
    throw new Error("Allineamento catalogo incompleto: verifica manuale richiesta.");
  }

  console.log(`[products] Seed legacy sostituito con ${repaired.length} prodotti correnti.`);
  return repaired;
}

async function loadProducts({ allowPublicFallback = false } = {}) {
  if (USE_SUPABASE) {
    const db = getSupabase();
    const { data, error } = await db.from("products").select("*").order("order", { ascending: true });
    if (error) {
      console.error("[db] errore caricamento prodotti:", error.message);
      if (allowPublicFallback) return jsonClone(DEFAULT_PRODUCTS);
      throw new Error("Errore caricamento prodotti: " + error.message);
    }
    const mapped = (data || []).map(databaseProduct);
    if (shouldRepairLegacyProductSeed(mapped)) {
      try {
        return await repairLegacyProductSeed(db, mapped);
      } catch (error) {
        console.error("[products] allineamento automatico fallito:", error.message);
        if (allowPublicFallback) return jsonClone(DEFAULT_PRODUCTS);
        throw error;
      }
    }
    return mapped;
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
      throw new Error("Errore caricamento richieste: " + error.message);
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

function loginRateKey(req) {
  return clientIp(req);
}

function sweepRateLimitMaps(now = Date.now()) {
  if (now < nextRateLimitSweepAt) return;

  for (const [key, entry] of loginAttempts) {
    const expiresAt = Math.max(entry.firstAt + LOGIN_WINDOW_MS, entry.lockedUntil || 0);
    if (expiresAt <= now) loginAttempts.delete(key);
  }
  for (const [key, entry] of contactAttempts) {
    if (entry.firstAt + CONTACT_WINDOW_MS <= now) contactAttempts.delete(key);
  }
  nextRateLimitSweepAt = now + RATE_LIMIT_SWEEP_MS;
}

function checkContactRate(req) {
  const key = clientIp(req);
  const now = Date.now();
  sweepRateLimitMaps(now);
  const entry = contactAttempts.get(key);
  if (!entry || entry.firstAt + CONTACT_WINDOW_MS < now) {
    if (!entry && contactAttempts.size >= MAX_RATE_LIMIT_ENTRIES) return false;
    contactAttempts.set(key, { count: 1, firstAt: now });
    return true;
  }
  entry.count += 1;
  contactAttempts.set(key, entry);
  return entry.count <= CONTACT_MAX_ATTEMPTS;
}

function checkLoginRate(req) {
  const key = loginRateKey(req);
  const now = Date.now();
  sweepRateLimitMaps(now);
  const entry = loginAttempts.get(key);
  if (!entry) {
    if (loginAttempts.size >= MAX_RATE_LIMIT_ENTRIES) {
      return { ok: false, key: null, retryAfter: 60 };
    }
    return { ok: true, key };
  }
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
  if (!key) return;
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
        reject(new ClientInputError("Payload troppo grande."));
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
        reject(new ClientInputError("JSON non valido."));
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
        reject(new ClientInputError("File troppo grande. Dimensione massima: 5 MB."));
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
      console.error("[upload] errore Supabase Storage:", error.message);
      return sendJson(res, 500, { error: "Errore interno durante il caricamento dell'immagine." });
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

function normalizePushSubscription(value, session) {
  if (!value || typeof value !== "object") {
    throw new ClientInputError("Sottoscrizione push non valida.");
  }
  const endpoint = cleanUrl(value.endpoint, "Endpoint push");
  const p256dh = cleanText(value.keys?.p256dh, 256);
  const auth = cleanText(value.keys?.auth, 128);
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(p256dh) || !/^[A-Za-z0-9_-]+={0,2}$/.test(auth)) {
    throw new ClientInputError("Chiavi della sottoscrizione push non valide.");
  }
  const timestamp = nowIso();
  return {
    endpoint,
    expirationTime: Number.isFinite(value.expirationTime) ? value.expirationTime : null,
    keys: { p256dh, auth },
    user: session.username,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

async function loadPushSubscriptions() {
  if (USE_SUPABASE) {
    const db = getSupabase();
    const { data, error } = await db
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth,user_name,created_at,updated_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error("Impossibile leggere le sottoscrizioni push.");
    return (data || []).map((row) => ({
      endpoint: row.endpoint,
      expirationTime: null,
      keys: { p256dh: row.p256dh, auth: row.auth },
      user: row.user_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  const subscriptions = await readJson(PUSH_SUBSCRIPTIONS_FILE, []);
  return Array.isArray(subscriptions) ? subscriptions : [];
}

async function savePushSubscriptions(subscriptions) {
  if (!Array.isArray(subscriptions)) throw new TypeError("Elenco sottoscrizioni push non valido.");
  if (USE_SUPABASE) throw new Error("La sostituzione completa delle sottoscrizioni cloud non e consentita.");
  await writeJson(PUSH_SUBSCRIPTIONS_FILE, subscriptions);
}

async function removePushSubscriptions(endpoints) {
  const staleEndpoints = [...new Set(endpoints.filter(Boolean))];
  if (!staleEndpoints.length) return;
  if (USE_SUPABASE) {
    const db = getSupabase();
    const { error: deleteError } = await db
      .from("push_subscriptions")
      .delete()
      .in("endpoint", staleEndpoints);
    if (deleteError) throw new Error("Impossibile rimuovere le sottoscrizioni push scadute.");
    return;
  }

  const current = await loadPushSubscriptions();
  const staleSet = new Set(staleEndpoints);
  await savePushSubscriptions(current.filter((subscription) => !staleSet.has(subscription.endpoint)));
}

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
  const staleEndpoints = subscriptions
    .filter((_, index) => results[index].remove)
    .map((subscription) => subscription.endpoint);
  await removePushSubscriptions(staleEndpoints);
  return {
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    registered: activeSubscriptions.length
  };
}

async function notifyNewLead() {
  try {
    const payload = {
      type: "NEW_LEAD",
      title: "Nuova richiesta dal sito",
      body: "Apri il gestionale autenticato per visualizzare i dettagli.",
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
  let username;
  let password;
  try {
    const body = await readBody(req);
    username = cleanText(body.username, 80, false).toLowerCase();
    password = String(body.password || "");
  } catch (err) {
    if (err instanceof ClientInputError) return sendJson(res, 400, { error: err.message });
    console.error("[auth] lettura richiesta login fallita:", err);
    return sendJson(res, 500, { error: "Errore interno del server." });
  }

  const rate = checkLoginRate(req);
  if (!rate.ok) {
    res.setHeader("Retry-After", String(rate.retryAfter || 60));
    return sendJson(res, 429, { error: "Troppi tentativi. Riprova tra qualche minuto." });
  }

  let user = null;
  let passwordOk = false;

  if (USE_SUPABASE) {
    const db = getSupabase();
    const { data: dbUser, error } = await db.from("users").select("*").eq("username", username).maybeSingle();
    if (error) {
      console.error("[auth] lettura utente fallita:", error.message);
      return sendJson(res, 503, { error: "Servizio di autenticazione temporaneamente non disponibile." });
    }
    if (dbUser) {
      user = dbUser;
      passwordOk = await verifyPassword(password, user.password_hash);
    }
  } else {
    const users = await readJson(USERS_FILE, []);
    const userList = Array.isArray(users) ? users : [];
    const localUser = userList.find((u) => String(u.username).toLowerCase() === username);
    if (localUser) {
      user = localUser;
      passwordOk = await verifyPassword(password, user.passwordHash);
    }
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
    notifyNewLead();
    return sendJson(res, 201, {
      ok: true,
      message: "Richiesta ricevuta. Ti ricontatteremo al più presto.",
      id: lead.id
    });
  } catch (err) {
    if (err instanceof ClientInputError) {
      return sendJson(res, 400, { error: err.message });
    }
    console.error("[contact] errore salvataggio richiesta:", err);
    return sendJson(res, 500, { error: "Impossibile salvare la richiesta in questo momento." });
  }
}

async function handleHealth(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Metodo non consentito." });
  if (!USE_SUPABASE) {
    return sendJson(res, 503, { ok: false, service: "ready", database: "not-configured" });
  }

  const db = getSupabase();
  const { error } = await db.from("products").select("id", { count: "exact", head: true });
  if (error) {
    console.error("[health] verifica Supabase fallita:", error.message);
    return sendJson(res, 503, { ok: false, service: "ready", database: "unreachable" });
  }

  return sendJson(res, 200, { ok: true, service: "ready", database: "reachable" });
}

// ── API router ──────────────────────────────────────────────────────

async function handleApi(req, res, url) {
  if (!applyCors(req, res, url)) {
    return sendJson(res, 403, { error: "Origine non consentita." });
  }
  if (req.method === "OPTIONS" && isApiPath(url.pathname)) {
    return send(res, 204, "", { "Content-Type": MIME[".txt"] });
  }

  if (url.pathname === "/api/health") return handleHealth(req, res);

  if (url.pathname === "/api/products" && req.method === "GET") {
    const products = (await loadProducts({ allowPublicFallback: true })).map(publicProduct);
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
        const { error: upsertError } = await db.from("push_subscriptions").upsert({
          endpoint: incoming.endpoint,
          p256dh: incoming.keys.p256dh,
          auth: incoming.keys.auth,
          user_name: incoming.user,
          created_at: incoming.createdAt,
          updated_at: incoming.updatedAt
        }, { onConflict: "endpoint" });
        if (upsertError) throw new Error("Errore registrazione notifiche: " + upsertError.message);
        const { count, error: countError } = await db
          .from("push_subscriptions")
          .select("*", { count: "exact", head: true });
        if (countError) throw new Error("Errore conteggio notifiche: " + countError.message);
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
      const endpoint = cleanUrl(body.endpoint, "Endpoint push");
      if (USE_SUPABASE) {
        const db = getSupabase();
        const { error: deleteError } = await db
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", endpoint);
        if (deleteError) throw new Error("Errore rimozione notifiche: " + deleteError.message);
        const { count, error: countError } = await db
          .from("push_subscriptions")
          .select("*", { count: "exact", head: true });
        if (countError) throw new Error("Errore conteggio notifiche: " + countError.message);
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
        const { data: existing, error: existingError } = await db
          .from("leads")
          .select("id")
          .eq("id", id)
          .maybeSingle();
        if (existingError) throw new Error("Errore verifica richiesta: " + existingError.message);
        if (!existing) return sendJson(res, 404, { error: "Richiesta non trovata." });

        if (req.method === "PATCH") {
          const body = await readBody(req);
          const updates = { updated_at: nowIso() };
          if (Object.prototype.hasOwnProperty.call(body, "read")) updates.read = Boolean(body.read);
          if (Object.prototype.hasOwnProperty.call(body, "status")) {
            const status = cleanText(body.status, 20);
            if (!["new", "reviewed", "archived"].includes(status)) throw new ClientInputError("Stato richiesta non valido.");
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
            if (!["new", "reviewed", "archived"].includes(status)) throw new ClientInputError("Stato richiesta non valido.");
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
        const defaults = jsonClone(DEFAULT_PRODUCTS);
        const resetAt = nowIso();
        const rows = defaults.map((p) => ({
          id: p.id, name: p.name, short_desc: p.shortDesc, benefits: p.benefits,
          price: p.price, image: p.image, link: p.link, visible: p.visible,
          order: p.order, created_at: resetAt, updated_at: resetAt
        }));
        const { error: upsertError } = await db
          .from("products")
          .upsert(rows, { onConflict: "id" });
        if (upsertError) throw new Error("Errore ripristino prodotti predefiniti: " + upsertError.message);

        const { data: existingRows, error: readError } = await db.from("products").select("id");
        if (readError) throw new Error("Errore verifica prodotti dopo il ripristino: " + readError.message);
        const defaultIds = new Set(rows.map((row) => row.id));
        const obsoleteIds = (existingRows || [])
          .map((row) => row.id)
          .filter((id) => !defaultIds.has(id));
        if (obsoleteIds.length) {
          const { error: deleteError } = await db.from("products").delete().in("id", obsoleteIds);
          if (deleteError) throw new Error("Errore rimozione prodotti non predefiniti: " + deleteError.message);
        }
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
          const { data: updatedRow, error } = await db.from("products").update({
            name: updated.name,
            short_desc: updated.shortDesc,
            benefits: updated.benefits,
            price: updated.price,
            image: updated.image,
            link: updated.link,
            visible: updated.visible,
            order: updated.order,
            updated_at: nowIso()
          }).eq("id", id).select("id").maybeSingle();
          if (error) throw new Error("Errore aggiornamento prodotto: " + error.message);
          if (!updatedRow) return sendJson(res, 404, { error: "Prodotto non trovato." });
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
          const { data: updatedRow, error } = await db
            .from("products")
            .update(updates)
            .eq("id", id)
            .select("id")
            .maybeSingle();
          if (error) throw new Error("Errore aggiornamento prodotto: " + error.message);
          if (!updatedRow) return sendJson(res, 404, { error: "Prodotto non trovato." });
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
          const { data: deletedRow, error } = await db
            .from("products")
            .delete()
            .eq("id", id)
            .select("id")
            .maybeSingle();
          if (error) throw new Error("Errore eliminazione prodotto: " + error.message);
          if (!deletedRow) return sendJson(res, 404, { error: "Prodotto non trovato." });
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
    if (err instanceof ClientInputError) {
      return sendJson(res, 400, { error: err.message });
    }
    console.error("[admin-api] operazione fallita:", err);
    return sendJson(res, 500, { error: "Operazione non completata per un errore interno." });
  }

  return sendJson(res, 405, { error: "Metodo non consentito." });
}

// ── Static file serving ─────────────────────────────────────────────

function isPathInside(baseDirectory, candidate) {
  const relative = path.relative(baseDirectory, candidate);
  return relative === "" || (
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function safeStaticPath(urlPath) {
  let pathname = decodeURIComponent(urlPath);
  if (pathname === "/") pathname = "/index.html";
  if (pathname === "/admin") pathname = "/admin.html";
  if (pathname === "/links") pathname = "/links/";
  if (pathname === "/links/") pathname = "/links/index.html";

  if (pathname.includes("\0")) return null;
  const firstSegment = pathname.split("/").filter(Boolean)[0] || "";
  const privateDirectories = new Set([
    ".git",
    ".github",
    ".netlify",
    ".venv-opt",
    "data",
    "node_modules",
    "output",
    "scripts",
    "supabase",
    "tmp"
  ]);
  if (privateDirectories.has(firstSegment)) return null;
  if (path.basename(pathname).startsWith(".")) return null;
  if (["/server.js", "/package.json", "/package-lock.json", "/render.yaml"].includes(pathname)) return null;

  // Servizio immagini locali caricate in modalità locale
  if (pathname.startsWith("/uploads/")) {
    if (USE_SUPABASE) return null;
    const resolved = path.resolve(ROOT, `.${pathname}`);
    if (!isPathInside(UPLOAD_DIR, resolved)) return null;
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(path.extname(resolved).toLowerCase())) return null;
    return resolved;
  }

  const ext = path.extname(pathname).toLowerCase();
  if (!MIME[ext]) return null;
  const resolved = path.resolve(ROOT, `.${pathname}`);
  if (!isPathInside(ROOT, resolved)) return null;
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
  const db = getSupabase();
  const { data: userRows, error: adminReadError } = await db
    .from("users")
    .select("id,username,role,password_hash");
  if (adminReadError) throw new Error("Impossibile verificare gli utenti amministratori.");
  const admins = (userRows || []).filter((record) => record.role === "admin");

  if (!CONFIGURED_ADMIN_USER) {
    if (!Array.isArray(admins) || admins.length === 0) {
      throw new Error("Imposta ADMIN_USER e ADMIN_PASSWORD per creare il primo amministratore.");
    }
    return;
  }

  const targetPassword = validateAdminBootstrapPassword(CONFIGURED_ADMIN_PASSWORD);
  const existing = (userRows || []).find(
    (record) => String(record.username || "").toLowerCase() === CONFIGURED_ADMIN_USER
  );
  const passwordAlreadyCurrent = existing
    ? await verifyPassword(targetPassword, existing.password_hash)
    : false;

  if (existing && (!passwordAlreadyCurrent || existing.role !== "admin")) {
    const passwordHash = await hashPassword(targetPassword);
    const { error } = await db
      .from("users")
      .update({ password_hash: passwordHash, role: "admin", updated_at: nowIso() })
      .eq("id", existing.id);
    if (error) throw new Error("Impossibile aggiornare le credenziali amministratore.");
  } else if (!existing) {
    const passwordHash = await hashPassword(targetPassword);
    const { error } = await db.from("users").insert({
      id: crypto.randomUUID(),
      username: CONFIGURED_ADMIN_USER,
      role: "admin",
      password_hash: passwordHash,
      created_at: nowIso(),
      updated_at: nowIso()
    });
    if (error) throw new Error("Impossibile creare l'utente amministratore configurato.");
  }

  const obsoleteAdminIds = (admins || [])
    .filter((record) => String(record.username || "").toLowerCase() !== CONFIGURED_ADMIN_USER)
    .map((record) => record.id);
  if (obsoleteAdminIds.length) {
    const { error } = await db
      .from("users")
      .update({ role: "disabled", updated_at: nowIso() })
      .in("id", obsoleteAdminIds);
    if (error) throw new Error("Impossibile disabilitare gli alias amministratore obsoleti.");
  }

  console.log(`[auth] Utente amministratore configurato: "${CONFIGURED_ADMIN_USER}".`);
}

async function ensureDataFiles() {
  if (USE_SUPABASE) {
    await loadProducts();
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

  let users = await readJson(USERS_FILE, []);
  if (!Array.isArray(users)) users = [];

  if (!CONFIGURED_ADMIN_USER) {
    if (!users.some((user) => user.role === "admin")) {
      throw new Error("Imposta ADMIN_USER e ADMIN_PASSWORD per creare il primo amministratore locale.");
    }
    return;
  }

  const targetPassword = validateAdminBootstrapPassword(CONFIGURED_ADMIN_PASSWORD);
  const passwordHash = await hashPassword(targetPassword);
  let user = users.find(
    (record) => String(record.username || "").toLowerCase() === CONFIGURED_ADMIN_USER
  );
  if (!user) {
    user = {
      id: crypto.randomUUID(),
      username: CONFIGURED_ADMIN_USER,
      role: "admin",
      passwordHash,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    users.push(user);
  } else {
    user.passwordHash = passwordHash;
    user.role = "admin";
    user.updatedAt = nowIso();
  }
  users.forEach((record) => {
    if (record !== user && record.role === "admin") {
      record.role = "disabled";
      record.updatedAt = nowIso();
    }
  });
  await writeJson(USERS_FILE, users);
  console.log(`[auth] Utente amministratore locale configurato: "${CONFIGURED_ADMIN_USER}".`);
}

// ── Entrypoint ──────────────────────────────────────────────────────

async function main() {
  validateRuntimeConfig();
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
    console.log(`[server] comeleapi attivo su http://0.0.0.0:${PORT}/`);
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
