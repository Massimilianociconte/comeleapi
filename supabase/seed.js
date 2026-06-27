"use strict";
const { createClient } = require("@supabase/supabase-js");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const scryptAsync = promisify(crypto.scrypt);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Imposta SUPABASE_URL e SUPABASE_SERVICE_KEY.");
  process.exit(1);
}
if (!ADMIN_PASSWORD) {
  console.error("Imposta ADMIN_PASSWORD.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const DEFAULT_PRODUCTS = [
  {
    id: "p-lavanda", name: "Olio Essenziale di Lavanda",
    short_desc: "Rilassante e calmante, ideale per la sera.",
    benefits: "favorisce il relax, riduce tensione e stress, migliora il sonno.",
    price: "14,90 €",
    image: "https://images.unsplash.com/photo-1611073615452-4889e2d68957?auto=format&fit=crop&w=800&q=80",
    link: "https://www.google.com/search?q=olio+essenziale+lavanda",
    visible: true, order: 0
  },
  {
    id: "p-eucalipto", name: "Olio Essenziale di Eucalipto",
    short_desc: "Balsamico e rinfrescante, libera le vie respiratorie.",
    benefits: "purifica l'aria, rinfresca, utile in caso di raffreddore.",
    price: "12,50 €",
    image: "https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?auto=format&fit=crop&w=800&q=80",
    link: "https://www.google.com/search?q=olio+essenziale+eucalipto",
    visible: true, order: 1
  },
  {
    id: "p-rosa", name: "Olio Essenziale di Rosa Damascena",
    short_desc: "Elegante e nutriente, per una pelle morbida e vellutata.",
    benefits: "idrata la pelle, equilibra le emozioni, profumo avvolgente.",
    price: "29,00 €",
    image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=800&q=80",
    link: "https://www.google.com/search?q=olio+essenziale+rosa+damascena",
    visible: true, order: 2
  },
  {
    id: "p-menta", name: "Olio Essenziale di Menta Piperita",
    short_desc: "Tonificante e rinfrescante, risveglia mente e corpo.",
    benefits: "rinfresca, stimola la concentrazione, allevia la stanchezza.",
    price: "11,90 €",
    image: "https://images.unsplash.com/photo-1606914469633-cb9d7b56b27e?auto=format&fit=crop&w=800&q=80",
    link: "https://www.google.com/search?q=olio+essenziale+menta+piperita",
    visible: true, order: 3
  },
  {
    id: "p-arancio", name: "Olio Essenziale di Arancio Dolce",
    short_desc: "Solare e luminoso, diffonde ottimismo e leggerezza.",
    benefits: "migliora l'umore, illumina l'ambiente, dolce e delicato.",
    price: "10,50 €",
    image: "https://images.unsplash.com/photo-1582194720944-3e6d6891eba7?auto=format&fit=crop&w=800&q=80",
    link: "https://www.google.com/search?q=olio+essenziale+arancio+dolce",
    visible: true, order: 4
  },
  {
    id: "p-incenso", name: "Olio Essenziale di Incenso",
    short_desc: "Profondo e meditativo, per momenti di raccoglimento.",
    benefits: "favorisce la meditazione, calma la mente, aroma spirituale.",
    price: "19,90 €",
    image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80",
    link: "https://www.google.com/search?q=olio+essenziale+incenso",
    visible: true, order: 5
  }
];

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
  if (prodErr) console.error("[seed] Errore prodotti:", prodErr.message);
  else console.log(`[seed] ${DEFAULT_PRODUCTS.length} prodotti inseriti.`);

  console.log(`[seed] Creazione utente admin "${ADMIN_USER}"...`);
  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  const { error: userErr } = await supabase.from("users").upsert([
    {
      id: crypto.randomUUID(),
      username: ADMIN_USER.toLowerCase(),
      role: "admin",
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ], { onConflict: "username" });
  if (userErr) console.error("[seed] Errore utente:", userErr.message);
  else console.log("[seed] Utente admin creato.");

  console.log("[seed] Seed completato.");
}

main().catch((err) => { console.error(err); process.exit(1); });
