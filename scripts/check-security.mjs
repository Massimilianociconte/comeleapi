import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function listRepositoryTextFiles(directory) {
  const skippedDirectories = new Set([
    ".git",
    ".netlify",
    ".venv-opt",
    "data",
    "dist",
    "node_modules",
    "output",
    "tmp",
    "uploads"
  ]);
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listRepositoryTextFiles(file));
    else if (/\.(?:css|html|js|json|md|mjs|sql|toml|txt|xml|ya?ml)$/i.test(entry.name)) files.push(file);
  }
  return files;
}

const forbiddenLocationDigest = "fa0f4be95c3c0feff1a936abc84e79ed6aa3ee3d14041f3f0ff1cc2ece2a3407";
function containsForbiddenLocation(source) {
  const tokens = source
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  for (let index = 0; index <= tokens.length - 4; index += 1) {
    if (createHash("sha256").update(tokens.slice(index, index + 4).join(" ")).digest("hex") === forbiddenLocationDigest) {
      return true;
    }
  }
  return false;
}

const server = await readFile(path.join(ROOT, "server.js"), "utf8");
const seed = await readFile(path.join(ROOT, "supabase/seed.js"), "utf8");
const packageManifest = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));
const nodeVersion = (await readFile(path.join(ROOT, ".node-version"), "utf8")).trim();
const schema = await readFile(path.join(ROOT, "supabase/schema.sql"), "utf8");
const migration = await readFile(
  path.join(ROOT, "supabase/migrations/20260722_harden_private_tables.sql"),
  "utf8"
);
const renderConfig = await readFile(path.join(ROOT, "render.yaml"), "utf8");
const netlifyConfig = await readFile(path.join(ROOT, "netlify.toml"), "utf8");

assert(!server.includes("CANONICAL_ADMIN_PASSWORD"), "Sicurezza: password canonica ancora nel server");
assert(!server.includes("isAcceptedAdminPassword"), "Sicurezza: bypass password plaintext ancora presente");
assert(!server.includes('endsWith(".github.io")'), "Sicurezza: wildcard CORS github.io ancora presente");
assert(!server.includes("Access-Control-Allow-Credentials"), "Sicurezza: CORS credentialed non necessario ancora presente");
assert(
  server.includes('res.setHeader("Cross-Origin-Resource-Policy", "cross-origin")'),
  "Sicurezza: CORP non compatibile con gli endpoint pubblici cross-origin"
);
assert(server.includes('SameSite=${options.sameSite || "Lax"}'), "Sicurezza: cookie SameSite=Lax mancante");
assert(server.includes("validateRuntimeConfig();"), "Sicurezza: validazione configurazione produzione mancante");
assert(server.includes('url.pathname === "/api/health"'), "Sicurezza: health endpoint mancante");
assert(server.includes('database: "unreachable"'), "Sicurezza: stato database health mancante");
assert(server.includes('role: "disabled"'), "Sicurezza: disabilitazione alias admin mancante");
assert(server.includes("Strict-Transport-Security"), "Sicurezza: HSTS backend mancante");
assert(server.includes('\".woff\": \"font/woff\"') && server.includes('\".woff2\": \"font/woff2\"'), "Runtime: MIME font locali mancanti");
assert(server.includes("isPathInside(UPLOAD_DIR, resolved)"), "Sicurezza: containment upload mancante");
assert(!server.includes("resolved.startsWith(ROOT)"), "Sicurezza: controllo path vulnerabile a prefissi ancora presente");
assert(server.includes("async function loadPushSubscriptions()"), "Sicurezza: lettura sottoscrizioni push mancante");
assert(server.includes("async function savePushSubscriptions(subscriptions)"), "Sicurezza: pulizia sottoscrizioni push mancante");
assert(server.includes("async function removePushSubscriptions(endpoints)"), "Sicurezza: rimozione puntuale sottoscrizioni push mancante");
assert(server.includes("function normalizePushSubscription(value, session)"), "Sicurezza: validazione sottoscrizione push mancante");
assert(server.includes('.upsert({\n          endpoint: incoming.endpoint'), "Push: registrazione Supabase non idempotente");
assert(server.includes("if (upsertError) throw new Error"), "Push: errore upsert Supabase ignorato");
assert(server.includes("if (deleteError) throw new Error"), "Push: errore delete Supabase ignorato");
assert(server.includes("if (countError) throw new Error"), "Push: errore count Supabase ignorato");
assert(server.includes("if (upsertError) throw new Error(\"Errore ripristino prodotti predefiniti:"), "Prodotti: errore reset upsert ignorato");
assert(server.includes("if (readError) throw new Error(\"Errore verifica prodotti dopo il ripristino:"), "Prodotti: errore verifica reset ignorato");
assert(server.includes("if (deleteError) throw new Error(\"Errore rimozione prodotti non predefiniti:"), "Prodotti: errore pulizia reset ignorato");
assert(server.includes("if (existingError) throw new Error(\"Errore verifica richiesta:"), "Lead: errore lookup Supabase ignorato");
assert(server.includes("const MAX_RATE_LIMIT_ENTRIES = 4096"), "Rate limit: cap memoria mancante");
assert(server.includes("function sweepRateLimitMaps("), "Rate limit: sweep delle entry scadute mancante");
assert(
  server.includes("function loginRateKey(req) {\n  return clientIp(req);"),
  "Rate limit: il login deve essere limitato primariamente per IP"
);
assert(!server.includes('`${clientIp(req)}:${'), "Rate limit: chiavi IP:username aggirabili ancora presenti");
assert(
  server.includes("async function loadProducts({ allowPublicFallback = false } = {})"),
  "Prodotti: lettura admin fail-closed non distinta dal fallback pubblico"
);
assert(
  server.includes("loadProducts({ allowPublicFallback: true })"),
  "Prodotti: fallback resiliente non limitato alla vetrina pubblica"
);
assert(
  !server.includes("if (!data || !data.length) return jsonClone(DEFAULT_PRODUCTS)"),
  "Prodotti: catalogo Supabase vuoto ancora sostituito da default fantasma"
);
assert(
  server.includes('throw new Error("Errore caricamento richieste: " + error.message)'),
  "Lead: errore lettura Supabase ancora convertito in lista vuota"
);
assert(
  server.includes('.delete()\n            .eq("id", id)\n            .select("id")\n            .maybeSingle()'),
  "Prodotti: eliminazione Supabase senza verifica della riga modificata"
);
assert(!seed.includes('process.env.ADMIN_USER || "admin"'), "Seed: username admin predefinito ancora presente");
assert(seed.includes("ADMIN_PASSWORD.length < 14"), "Seed: requisito password forte mancante");
assert(seed.includes("if (prodErr) throw new Error"), "Seed: errore prodotti non fail-closed");
assert(seed.includes("if (userErr) throw new Error"), "Seed: errore utente non fail-closed");
assert(nodeVersion === "24.18.0", "Runtime: .node-version deve fissare Node 24.18.0");
assert(
  packageManifest.engines?.node === ">=24.18.0 <25.0.0",
  "Runtime: engines.node deve essere coerente con Node 24 e avere un limite superiore"
);
assert(
  renderConfig.includes("npm ci --omit=dev && npm run check:server && npm run check:security"),
  "Render: build deve validare sintassi backend e gate di sicurezza"
);

const netlifyRedirectBlocks = netlifyConfig.split("[[redirects]]").slice(1);
function hasNetlifyRedirect(from, to, status) {
  return netlifyRedirectBlocks.some((block) =>
    block.includes(`from = "${from}"`)
    && block.includes(`to = "${to}"`)
    && block.includes(`status = ${status}`)
    && block.includes("force = true")
  );
}

for (const adminPath of ["/admin", "/admin/", "/admin.html"]) {
  assert(
    hasNetlifyRedirect(adminPath, "https://comeleapi-backend.onrender.com/admin", 302),
    `Netlify: redirect sicuro del gestionale mancante per ${adminPath}`
  );
}
for (const loginPath of ["/login", "/login/", "/login.html"]) {
  assert(
    hasNetlifyRedirect(loginPath, "https://comeleapi-backend.onrender.com/login.html", 302),
    `Netlify: redirect sicuro del login mancante per ${loginPath}`
  );
}

const privateTables = ["products", "leads", "users", "push_subscriptions"];
for (const sql of [schema, migration]) {
  assert(!/CREATE\s+POLICY[\s\S]*?USING\s*\(\s*true\s*\)/i.test(sql), "Supabase: policy RLS permissiva ancora presente");
  assert(
    /to_regprocedure\s*\(\s*'public\.rls_auto_enable\(\)'\s*\)/i.test(sql),
    "Supabase: controllo idempotente della funzione RLS mancante"
  );
  assert(
    /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.rls_auto_enable\(\)\s+FROM\s+PUBLIC,\s*anon,\s*authenticated,\s*service_role/i.test(sql),
    "Supabase: revoca EXECUTE della funzione SECURITY DEFINER mancante"
  );
  for (const table of privateTables) {
    const qualifiedTable = `(?:public\\.)?${table}`;
    assert(
      new RegExp(`DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+"service_role_all"\\s+ON\\s+${qualifiedTable}`, "i").test(sql),
      `Supabase: rimozione policy service_role_all mancante per ${table}`
    );
    assert(
      new RegExp(`ALTER\\s+TABLE\\s+${qualifiedTable}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, "i").test(sql),
      `Supabase: RLS non abilitata per ${table}`
    );
    assert(
      new RegExp(`REVOKE\\s+ALL\\s+ON\\s+TABLE\\s+${qualifiedTable}\\s+FROM\\s+anon,\\s*authenticated`, "i").test(sql),
      `Supabase: revoca anon/authenticated mancante per ${table}`
    );
    assert(
      new RegExp(`GRANT\\s+ALL\\s+ON\\s+TABLE\\s+${qualifiedTable}\\s+TO\\s+service_role`, "i").test(sql),
      `Supabase: grant service_role mancante per ${table}`
    );
  }
}

assert(
  migration.includes("has_function_privilege('anon'")
    && migration.includes("has_function_privilege('authenticated'")
    && migration.includes("has_function_privilege('service_role'"),
  "Supabase: verifica transazionale dei privilegi funzione mancante"
);
assert(migration.includes("NOTIFY pgrst, 'reload schema'"), "Supabase: reload schema PostgREST mancante");

for (const file of await listRepositoryTextFiles(ROOT)) {
  assert(
    !containsForbiddenLocation(await readFile(file, "utf8")),
    `Privacy: dato di localizzazione privato presente in ${path.relative(ROOT, file)}`
  );
}

console.log("Check sicurezza completato: credenziali fuori dal codice, CORS/cookie hardenizzati e RLS privata.");
