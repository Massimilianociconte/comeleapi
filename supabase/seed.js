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
    id: "p-collezione-essenziale", name: "Collezione Essenziale",
    short_desc: "Starter kit con 12 oli",
    benefits: "Unisce diffusione aromatica e oli trasversali per accompagnare casa, energia, respiro e momenti di calma con un approccio ordinato.",
    price: "196,41 €",
    image: "foto-prodotti/collezione-essenziale.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/f3f1cb39-39f4-4f4c-93a3-d869c197613d",
    visible: true, order: 0
  },
  {
    id: "p-baby-essentials", name: "Baby Essentials",
    short_desc: "Starter kit delicato con diffusore Feather the Owl e oli KidScents per piccoli rituali di famiglia.",
    benefits: "Pensato per la routine dei più piccoli: atmosfera serale, comfort e profumi morbidi, sempre con uso consapevole e adeguato all'età.",
    price: "162,25 €",
    image: "foto-prodotti/baby-essentials.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/ddab525d-a08a-4c2b-a7ed-c7e2c0522d33",
    visible: true, order: 1
  },
  {
    id: "p-sweet-home", name: "Sweet Home",
    short_desc: "Selezione per rendere la casa più accogliente, fresca e armoniosa con note naturali e pulite.",
    benefits: "Combina aromi luminosi e morbidi per profumare gli ambienti e trasformare la casa in uno spazio più ordinato, sereno e familiare.",
    price: "178,11 €",
    image: "foto-prodotti/sweet-home.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/91b5e23d-752e-440c-ba56-bf459688c4c1",
    visible: true, order: 2
  },
  {
    id: "p-dolce-notte", name: "Dolce Notte",
    short_desc: "Blend e oli per accompagnare il rituale della sera e preparare un ambiente più disteso.",
    benefits: "Note avvolgenti e rilassanti per rallentare, respirare e chiudere la giornata con un gesto semplice di cura.",
    price: "92,10 €",
    image: "foto-prodotti/dolce-notte.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/82e13afb-0fa8-4efa-a0b8-2abad12ebd60",
    visible: true, order: 3
  },
  {
    id: "p-gym-rat", name: "Sport & Wellness",
    short_desc: "Set aromatico per chi vive movimento, allenamento e recupero con energia.",
    benefits: "Note fresche e toniche da integrare prima o dopo l'attività fisica, per sostenere focus, respiro e sensazione di leggerezza.",
    price: "156,38 €",
    image: "foto-prodotti/sport-wellness-clean.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/88d08118-3dfa-4d07-b492-fbe9bf144bf3",
    visible: true, order: 4
  },
  {
    id: "p-per-lui", name: "Per Lui",
    short_desc: "Selezione dal carattere pulito, legnoso e deciso per una routine maschile naturale.",
    benefits: "Unisce note fresche e profonde per cura personale, ambiente e momenti di reset quotidiano, senza risultare invadente.",
    price: "104,75 €",
    image: "foto-prodotti/per-lui.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/a5880fa9-bf5e-4e11-bcad-c39343baa1fa",
    visible: true, order: 5
  },
  {
    id: "p-per-lei", name: "Per Lei",
    short_desc: "Percorso aromatico femminile, morbido e luminoso, pensato per equilibrio e cura quotidiana.",
    benefits: "Note floreali e armoniche per rituali di pelle, respiro e presenza, con un profilo elegante e naturale.",
    price: "76,58 €",
    image: "foto-prodotti/kit-per-lei.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/562399ef-a072-4f8e-811e-2e0ec43abdd6",
    visible: true, order: 6
  },
  {
    id: "p-animal-scents", name: "Animal scents",
    short_desc: "Linea dedicata alla cura aromatica degli animali, con prodotti specifici e approccio delicato.",
    benefits: "Aiuta a creare una routine più attenta e rispettosa per casa e compagni animali, usando prodotti dedicati e non improvvisati.",
    price: "86,34 €",
    image: "foto-prodotti/animal-scents.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/ee09a34b-0ef7-4169-82c5-9e2115659705",
    visible: true, order: 7
  },
  {
    id: "p-balance-skin", name: "BALANCE skin",
    short_desc: "Routine skincare essenziale per una pelle che cerca equilibrio, freschezza e semplicità.",
    benefits: "Combina passaggi mirati per pulizia, idratazione e comfort cutaneo, con una sensazione leggera, pulita e ordinata.",
    price: "148,67 €",
    image: "foto-prodotti/balance-skin-clean.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/fdce81cc-3f59-415c-8dc0-ca127f413431",
    visible: true, order: 8
  },
  {
    id: "p-bloom-skin", name: "BLOOM skin",
    short_desc: "Trattamento skincare luminoso per una pelle dall'aspetto più vitale e uniforme.",
    benefits: "Pensato per rituali viso più curati: texture, profumo e attivi cosmetici lavorano insieme per una pelle dall'aspetto più radioso.",
    price: "169,69 €",
    image: "foto-prodotti/bloom-skin.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/f6bea7b5-fff7-4ad1-a3a6-c4f8fa265aab",
    visible: true, order: 9
  },
  {
    id: "p-shine-bright-like-a-diamond", name: "Shine Bright like a Diamond",
    short_desc: "Selezione beauty e benessere per una routine luminosa, energica e curata.",
    benefits: "Unisce prodotti pensati per glow, freschezza e presenza: ideale quando vuoi sentirti ordinata, vitale e pronta a brillare.",
    price: "163,09 €",
    image: "foto-prodotti/shine-bright-like-a-diamond.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/d8202be7-c994-433a-9f38-7d7e1a7f3146",
    visible: true, order: 10
  },
  {
    id: "p-bye-bye-menopausa", name: "Bye Bye Menopausa",
    short_desc: "Percorso naturale pensato per accompagnare la donna nelle fasi di cambiamento.",
    benefits: "Una routine di supporto al benessere quotidiano, con oli e prodotti scelti per equilibrio, presenza e ascolto del corpo.",
    price: "188,22 €",
    image: "foto-prodotti/bye-bye-menopausa.png",
    link: "https://www.youngliving.com/apps/enrollment/social-links/8833dee2-aab2-46e1-94d0-c7bb78d5800d",
    visible: true, order: 11
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
