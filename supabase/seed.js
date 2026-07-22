"use strict";
const { createClient } = require("@supabase/supabase-js");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const scryptAsync = promisify(crypto.scrypt);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_USER = String(process.env.ADMIN_USER || "").trim().toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "");
const LEGACY_WEAK_ADMIN_PASSWORDS = new Set(["", "admin", "password", "cambia-questa-password"]);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Imposta SUPABASE_URL e SUPABASE_SERVICE_KEY.");
  process.exit(1);
}
if (!ADMIN_USER || ADMIN_USER.length > 80) {
  console.error("Imposta ADMIN_USER con un valore non vuoto di massimo 80 caratteri.");
  process.exit(1);
}
if (LEGACY_WEAK_ADMIN_PASSWORDS.has(ADMIN_PASSWORD) || ADMIN_PASSWORD.length < 14) {
  console.error("ADMIN_PASSWORD deve contenere almeno 14 caratteri e non puo essere una password predefinita.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const PRODUCT_CATALOG = require("../products.json");
const DEFAULT_PRODUCTS = PRODUCT_CATALOG.map(({ shortDesc, ...product }) => ({ ...product, short_desc: shortDesc }));

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const N = 32768;
  const r = 8;
  const p = 1;
  const key = await scryptAsync(String(password), salt, 64, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${r}$${p}$${salt}$${key.toString("base64url")}`;
}

async function main() {
  console.log("[seed] Inserimento prodotti di default...");
  const { error: prodErr } = await supabase.from("products").upsert(
    DEFAULT_PRODUCTS.map((p) => ({ ...p, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })),
    { onConflict: "id" }
  );
  if (prodErr) throw new Error(`[seed] Errore prodotti: ${prodErr.message}`);
  console.log(`[seed] ${DEFAULT_PRODUCTS.length} prodotti inseriti.`);

  console.log(`[seed] Creazione utente admin "${ADMIN_USER}"...`);
  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  const { error: userErr } = await supabase.from("users").upsert([
    {
      id: crypto.randomUUID(),
      username: ADMIN_USER,
      role: "admin",
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ], { onConflict: "username" });
  if (userErr) throw new Error(`[seed] Errore utente: ${userErr.message}`);
  console.log("[seed] Utente admin creato.");

  console.log("[seed] Seed completato.");
}

main().catch((err) => { console.error(err); process.exit(1); });
