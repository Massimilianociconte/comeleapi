"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { test } = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const CURRENT_PRODUCTS = require("../products.json");
const LEGACY_IDS = [
  "p-lavanda",
  "p-eucalipto",
  "p-rosa",
  "p-menta",
  "p-arancio",
  "p-incenso"
];

function passwordHash(password) {
  const salt = "product-sync-test-salt";
  const N = 32768;
  const r = 8;
  const p = 1;
  const key = crypto.scryptSync(password, salt, 64, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${r}$${p}$${salt}$${key.toString("base64url")}`;
}

function legacyRows() {
  return LEGACY_IDS.map((id, order) => ({
    id,
    name: id.slice(2),
    short_desc: `Prodotto legacy ${id}`,
    benefits: "",
    price: "10,00 €",
    image: "assets/img/logo-comeleapi.png",
    link: `https://www.google.com/search?q=olio+essenziale+${id.slice(2)}`,
    visible: true,
    order,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  }));
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body)
  });
  response.end(body);
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server.address().port;
}

async function freePort() {
  const server = http.createServer();
  const port = await listen(server);
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForServer(child, port) {
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });

  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Backend terminato durante l'avvio:\n${output}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/login.html`);
      if (response.ok) return;
    } catch {
      // Il processo non ha ancora aperto la porta.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timeout avvio backend:\n${output}`);
}

test("il gestionale sostituisce il seed legacy con lo stesso catalogo usato dal frontend", async (t) => {
  const adminUser = "sync-test-admin";
  const adminPassword = "Product-sync-test-password-2026";
  const adminRecord = {
    id: "00000000-0000-4000-8000-000000000001",
    username: adminUser,
    role: "admin",
    password_hash: passwordHash(adminPassword)
  };
  let products = legacyRows();

  const supabaseServer = http.createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");

    if (url.pathname === "/rest/v1/users" && request.method === "GET") {
      return sendJson(response, 200, [adminRecord]);
    }

    if (url.pathname === "/rest/v1/products" && request.method === "GET") {
      return sendJson(response, 200, products.slice().sort((left, right) => left.order - right.order));
    }

    if (url.pathname === "/rest/v1/products" && request.method === "POST") {
      let body = "";
      for await (const chunk of request) body += chunk;
      const rows = JSON.parse(body);
      for (const row of rows) {
        const index = products.findIndex((product) => product.id === row.id);
        if (index >= 0) products[index] = { ...products[index], ...row };
        else products.push({ ...row });
      }
      response.writeHead(201, { "Content-Type": "application/json" });
      return response.end("[]");
    }

    if (url.pathname === "/rest/v1/products" && request.method === "DELETE") {
      const filter = url.searchParams.get("id") || "";
      const match = /^in\.\((.*)\)$/.exec(filter);
      const deletedIds = new Set(match ? match[1].split(",").map(decodeURIComponent) : []);
      products = products.filter((product) => !deletedIds.has(product.id));
      response.writeHead(204);
      return response.end();
    }

    if (url.pathname === "/rest/v1/products" && request.method === "PATCH") {
      let body = "";
      for await (const chunk of request) body += chunk;
      const updates = JSON.parse(body);
      const filter = url.searchParams.get("id") || "";
      const id = filter.startsWith("eq.") ? filter.slice(3) : "";
      const index = products.findIndex((product) => product.id === id);
      if (index < 0) return sendJson(response, 200, []);
      products[index] = { ...products[index], ...updates };
      return sendJson(response, 200, [products[index]]);
    }

    return sendJson(response, 404, { error: `Route Supabase simulata non gestita: ${request.method} ${url.pathname}` });
  });

  const supabasePort = await listen(supabaseServer);
  t.after(() => new Promise((resolve) => supabaseServer.close(resolve)));

  const appPort = await freePort();
  const child = spawn(process.execPath, [path.join(ROOT, "server.js")], {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: "development",
      PORT: String(appPort),
      SUPABASE_URL: `http://127.0.0.1:${supabasePort}`,
      SUPABASE_SERVICE_KEY: "test-service-role-key",
      ADMIN_USER: adminUser,
      ADMIN_PASSWORD: adminPassword,
      SESSION_SECRET: "product-sync-test-session-secret-at-least-32-bytes"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  t.after(() => {
    if (child.exitCode === null) child.kill("SIGTERM");
  });
  await waitForServer(child, appPort);

  const loginResponse = await fetch(`http://127.0.0.1:${appPort}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ username: adminUser, password: adminPassword })
  });
  assert.equal(loginResponse.status, 200);
  const loginPayload = await loginResponse.json();
  const cookie = loginResponse.headers.get("set-cookie").split(";", 1)[0];

  const adminResponse = await fetch(`http://127.0.0.1:${appPort}/api/admin/products`, {
    headers: { "Accept": "application/json", "Cookie": cookie }
  });
  assert.equal(adminResponse.status, 200);
  const payload = await adminResponse.json();

  assert.deepEqual(payload.products, CURRENT_PRODUCTS, "il gestionale deve mostrare esattamente il catalogo della landing");
  assert.deepEqual(
    products.map((product) => product.id).sort(),
    CURRENT_PRODUCTS.map((product) => product.id).sort(),
    "la riparazione deve essere persistita in Supabase e rimuovere i record legacy"
  );

  const changedProduct = { ...payload.products[0], price: "199,99 €" };
  const updateResponse = await fetch(
    `http://127.0.0.1:${appPort}/api/admin/products/${encodeURIComponent(changedProduct.id)}`,
    {
      method: "PUT",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Cookie": cookie,
        "X-CSRF-Token": loginPayload.csrfToken
      },
      body: JSON.stringify(changedProduct)
    }
  );
  assert.equal(updateResponse.status, 200);

  const publicResponse = await fetch(`http://127.0.0.1:${appPort}/api/products`);
  assert.equal(publicResponse.status, 200);
  const publicPayload = await publicResponse.json();
  assert.equal(
    publicPayload.products.find((product) => product.id === changedProduct.id).price,
    changedProduct.price,
    "una modifica del gestionale deve essere visibile immediatamente dal frontend"
  );
});
