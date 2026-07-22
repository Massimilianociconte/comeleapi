# comeleapi

Sito pubblico di comeleapi con vetrina, pagina link-in-bio e gestionale separato.

Il frontend pubblico è HTML, CSS e JavaScript vanilla, ma la versione pubblicabile
viene generata da una build Node. Il gestionale e le API sono serviti dal backend
Node su Render; Supabase è la persistenza prevista quando le variabili provider
sono configurate.

## Architettura

### Sito pubblico — Netlify

- index.html: homepage;
- links/index.html: pagina link-in-bio;
- robots.txt: policy aperta per crawler SEO, GEO/AI e training;
- sitemap.xml: indice delle URL pubbliche canoniche;
- products.json: catalogo pubblico di fallback;
- assets/: CSS, JavaScript, font, immagini e PDF;
- scripts/build-netlify.mjs: build allowlist verso dist/;
- netlify.toml: redirect, cache e security header.

La build copia soltanto gli asset pubblici approvati. Gestionale, backend, dati
locali, configurazioni e sorgenti non devono entrare in dist/.

### Gestionale e API — Render

- server.js: API, sessioni, catalogo, lead, upload e push;
- login.html e admin.html: interfacce private;
- render.yaml: configurazione del servizio;
- supabase/: schema e seed.

Quando Supabase non è configurato, il backend usa fallback locali soltanto in
sviluppo. In `NODE_ENV=production` l'avvio è fail-closed se mancano Supabase,
secret di sessione o credenziali amministrative valide.

## Requisiti

- Node.js 24.18.0 LTS, fissato in `.node-version` e limitato alla major 24 in `package.json`;
- npm;
- variabili provider per l’uso del backend in produzione.

Non aggiungere credenziali al repository o alla documentazione.

## Installazione

~~~bash
npm ci
~~~

## Sviluppo locale

Avvio del backend e delle pagine servite da Node:

~~~bash
npm start
~~~

La porta predefinita è 4173, salvo variabile PORT.

Per controllare soltanto la build pubblica:

~~~bash
npm run build
python3 -m http.server 4174 --directory dist
~~~

## Comandi

| Comando | Funzione |
|---|---|
| npm run check | syntax check dei file JavaScript principali |
| npm run build | build Netlify e tutti i gate SEO, schema, analytics, integrità visuale, privacy, workflow e sicurezza |
| npm run build:netlify | genera dist/ tramite allowlist |
| npm run check:seo | verifica canonical, H1, sitemap e robots |
| npm run check:schema | verifica il grafo JSON-LD, prezzi, privacy e coerenza catalogo |
| npm run check:analytics | verifica eventi e consenso senza trasmissione diretta |
| npm run check:catalog-live | confronta tutti i campi del catalogo Render con `products.json` |
| npm run check:visual-integrity | verifica hash degli asset e, con Poppler disponibile, la resa di ogni pagina PDF |
| npm run check:push-privacy | verifica che le push non includano dati del lead |
| npm run check:workflow | verifica YAML/shell e health check GitHub Actions |
| npm run check:security | verifica credenziali, CORS, cookie, health e RLS |
| npm run check:server | verifica la sintassi di backend e seed prima del deploy Render |
| npm run seed | inizializza i dati previsti dallo script Supabase |

## Deploy

### Netlify

Netlify esegue `npm run build` e pubblica `dist/` soltanto dopo i gate. Prima di promuovere una
modifica verificare almeno:

1. npm run check;
2. npm run build;
3. redirect e header su una deploy preview;
4. homepage e /links/ su mobile e desktop;
5. `npm run check:catalog-live`;
6. assenza di file privati in dist/.

Il frontend può mostrare il catalogo dell'API Render, mentre il JSON-LD viene
generato in build da `products.json`. Dopo ogni modifica prodotti nel gestionale
occorre sincronizzare `products.json`, eseguire `npm run check:catalog-live` e
ridistribuire Netlify; fino ad allora catalogo visibile e dati strutturati possono
divergire. L'automazione con un deploy hook Netlify resta un'attività provider.

Il PDF usa un URL canonico stabile nei dati strutturati: la sua cache richiede
rivalidazione, mentre i link visibili ricevono un hash di contenuto in build.

### Render e Supabase

Le modifiche di autenticazione, segreti, sessioni, CORS o RLS richiedono una
verifica coordinata sul provider. Un test locale non prova lo stato del database
o delle variabili live. Prima del deploy applicare la migrazione
`supabase/migrations/20260722_harden_private_tables.sql`, ruotare la password
amministrativa e verificare `/api/health`.

Un push su `main` avvia normalmente sia Netlify sia Render. Questa release è
compatibile anche se Netlify termina per primo: applicare la migrazione prima del
push, monitorare entrambi i deploy e lanciare manualmente il workflow GitHub solo
dopo che `/api/health` restituisce database `reachable`.

## SEO, GEO e contenuti sensibili

Il documento SEO_GEO_AUDIT_IMPLEMENTATION_2026-07-22.md contiene:

- evidenze verificate e limiti;
- modifiche tecniche applicate;
- P0 di sicurezza, privacy e contenuto;
- decisioni owner ancora aperte;
- rollback e test;
- roadmap e criteri di accettazione.

Il grafo strutturato usa i fatti confermati e omette soltanto le proprietà ancora
ignote. Le proposte di correzione dei testi sensibili sono documentate in
`CLAIM_AUDIT_2026-07-22.md` e non vanno applicate senza revisione e approvazione.

## Design

L’identità approvata usa Cormorant Garamond e Mulish, palette crema/rosa/terra,
asset locali e layout responsive. Le ottimizzazioni tecniche devono preservare
grafica, copy approvato e interazioni finché non esiste un before/after approvato.

## Dati e file locali

- dist/ è un output di build e non è la fonte;
- data/ e uploads/ possono contenere dati locali del backend;
- output/ contiene artefatti di lavoro e non deve essere pubblicato;
- i file .env non devono essere committati o condivisi.

## Licenza

Progetto realizzato per comeleapi. Verificare separatamente diritti e licenze di
immagini, font, marchi e materiali cliente prima della redistribuzione.
