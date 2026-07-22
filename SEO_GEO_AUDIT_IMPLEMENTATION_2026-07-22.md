# comeleapi — Implementazione definitiva SEO/GEO 2026

Data: 22 luglio 2026
Ambiente verificato: repository locale, build `dist/`, sito e backend live prima del deploy
Stato: implementazione locale completata e validata; deploy e operazioni provider non eseguiti

## Premessa e gerarchia delle fonti

Sono stati letti integralmente e riconciliati:

1. `COMELEAPI_RICERCA_SEO_GEO_2026.md`;
2. `COMELEAPI_PROMPT_MASTER_SEO_GEO_2026.md`;
3. l'istruzione di completamento allegata il 22 luglio 2026, trattata come integrazione e correzione prioritaria;
4. repository, build e comportamento live osservabile.

In caso di dato incompleto è stata omessa la singola proprietà facoltativa, non l'intera entità. Nessun dato privato è stato inserito in HTML, JSON-LD, API, metadata, manifest, sitemap, robots o bundle. Nessun testo, immagine, etichetta, layout o interazione visibile è stato modificato in questa tranche.

## Completato nel codice

| File | Modifica applicata |
|---|---|
| `index.html` | grafo JSON-LD completo e script analytics non visivo; canonical e metadata tecnici già predisposti conservati |
| `links/index.html` | grafo minimo collegato per pagina, business e guida; analytics non visivo |
| `scripts/structured-data.mjs` | generatore unico del grafo da facts confermati e `products.json` |
| `scripts/check-structured-data.mjs` | verifica di nodi, relazioni, lingue runtime, aree, servizi, prezzi, prodotti, omissione della qualifica non visibile, privacy, immagini, PDF e secret |
| `scripts/check-live-catalog.mjs` | confronta tutti i campi pubblici del catalogo Render con la sorgente statica del JSON-LD |
| `robots.txt` | policy totalmente aperta, bot SEO/GEO/AI principali espliciti e wildcard `*` per ogni crawler conforme |
| `sitemap.xml` | URL canoniche `/` e `/links/` |
| `scripts/check-public-seo.mjs` | gate per canonical, H1, JSON-LD, sitemap, robots e contenuti tecnici |
| `assets/js/analytics.js` | eventi consent-aware senza provider, cookie aggiuntivi o PII |
| `scripts/check-analytics.mjs` | verifica eventi, consenso, assenza di trasmissioni e inclusione nelle due pagine |
| `assets/pdf/mini-guida-oli-comeleapi.pdf` | metadati, `it-IT`, XMP, OCR invisibile revisionato e 7 segnalibri; immagini e resa preservate byte/pixel per pagina |
| `scripts/visual-integrity-baseline.json` | baseline approvata di PDF e 12 immagini prodotto |
| `scripts/check-visual-integrity.mjs` | hash gate su PDF/immagini e confronto raster di tutte le pagine quando Poppler è disponibile |
| `.github/workflows/keep-alive.yml` | GET profondo su `/api/health`, verifica JSON backend+database, retry limitati, errori non mascherati, timeout, least privilege e cron scaglionato |
| `scripts/check-workflow.mjs` | parsing YAML, sintassi shell e asserzioni contro `HEAD`, false-green e schedule fragile |
| `server.js` | rimozione password hardcoded/bypass, configurazione production fail-closed, cookie/CORS/CSRF/header, errori minimizzati, health profondo, rate limit a memoria limitata, letture admin fail-closed, static/upload containment e runtime push ripristinato senza PII |
| `.env.example` | nessun valore admin/sessione predefinito; requisiti espliciti |
| `render.yaml` | build riproducibile con `npm ci --omit=dev` e health check profondo |
| `supabase/schema.sql` | RLS privata deny-by-default per le tabelle applicative |
| `supabase/migrations/20260722_harden_private_tables.sql` | migrazione transazionale pronta per rimuovere policy permissive, revocare `anon`/`authenticated` e impedire l'esecuzione RPC della funzione interna `rls_auto_enable()` |
| `scripts/check-security.mjs` | gate statico per credenziali, CORS, cookie, config, health, containment e RLS |
| `scripts/check-push-privacy.mjs` | impedisce il ritorno di nome o testo del lead nella push |
| `scripts/build-netlify.mjs` | allowlist di robots/sitemap/analytics, generazione JSON-LD dai prodotti e fingerprint degli asset |
| `netlify.toml` | full build con gate, redirect canonici e blocco dei percorsi privati |
| `.node-version`, `package.json` | Node 24.18.0 LTS riproducibile, major limitata e pipeline completa `check`/`build` |
| `CLAIM_AUDIT_2026-07-22.md` | audit frase per frase dei claim sensibili e alternative non applicate |
| `README.md` | architettura, comandi, deploy e gate aggiornati |

La cartella utente `output/moodboard-instagram/` non è stata toccata.

### Dati strutturati implementati

Il grafo homepage contiene 66 nodi collegati:

- un'identità unica `Organization` + `LocalBusiness`, senza duplicazione dell'entità;
- `Person`, `ContactPoint`, `ServiceChannel` e 6 `City`;
- 7 `Service`, tutti collegati alla pagina, più un `OfferCatalog` che elenca le 4 sole `Offer` servizio non ambigue;
- 12 `Product`, 12 `Offer` prodotto, 12 `ListItem` e un `ItemList`;
- brand `comeleapi` e brand `Young Living` distinti;
- `WebSite`, `WebPage`, `ImageObject` e `DigitalDocument`.

I 16 `Offer` totali sono 4 offerte servizio e 12 offerte prodotto. Le offerte prodotto non dichiarano `seller`; quelle servizio indicano il business che eroga il trattamento.

### Analytics implementato

Gli eventi predisposti sono:

- `page_view` con provenienza normalizzata (`instagram`, `chatgpt`, `claude`, `perplexity`, `bing`, `google`, referral, direct o `utm_source`);
- `click_whatsapp`, `click_phone`, `click_email`;
- `download_pdf`;
- `click_product`, `click_young_living`;
- `links_to_landing`.

Non viene inviato nulla finché il consenso analytics non è valido e non è presente un provider compatibile (`gtag` o `dataLayer`). Non vengono raccolti nome, telefono, email, messaggio o dati salute.

## Validato

### Pipeline automatica

Comandi superati:

```text
npm run check
npm run build
npm run check:seo
npm run check:schema
npm run check:analytics
npm run check:catalog-live
npm run check:visual-integrity
npm run check:push-privacy
npm run check:workflow
npm run check:security
```

Risultati principali:

- build pubblica: 6,44 MiB;
- 2 pagine canoniche e sitemap coerente;
- robots senza `Disallow`, sitemap assoluta e tutti i gruppi richiesti aperti;
- 66 nodi: 7 `Service`, 12 `Product`, 12 `ListItem`, 16 `Offer` e riferimenti `@id` risolti;
- catalogo live: 12/12 prodotti e tutti i campi confrontati coerenti con `products.json`;
- 12 immagini prodotto inalterate;
- nessun dato privato o secret nel bundle;
- YAML e shell del workflow validi;
- RLS sorgente/migrazione deny-by-default;
- JSON, JSON-LD e JavaScript validi.
- pipeline ripetuta con il runtime dichiarato Node.js 24.18.0 LTS.
- `npm audit --omit=dev`: zero vulnerabilità note nelle dipendenze di produzione.

Il progetto non contiene configurazioni ESLint o TypeScript né una suite test separata: non esistono quindi script `lint`, `typecheck` o `test` ulteriori da eseguire. `npm run check` copre la sintassi JavaScript; i gate sopra coprono le invarianti applicative richieste.

### Schema.org e rich result

- invio della homepage generata in `dist/` al `Schema.org Validator`: HTTP 200, zero errori segnalati;
- risposta finale conservata in `/Users/massimilianociconte/.codex/visualizations/2026/07/22/019f8b19-3bc2-7a61-8b42-a9ed66a9bf83/schema-org-validator-final.json` (715.326 byte, SHA-256 `3d4b2c91816d73d67032283916b65d85dcb8c445e6fa5ff0534164a17d50105f`, zero errori e zero avvisi);
- controllo locale più severo: 66 nodi, cardinalità, relazioni, prezzi e omissioni verificati.

Il nodo unico `Organization` + `LocalBusiness` descrive correttamente un'attività
ad area di servizio in Schema.org senza pubblicare l'indirizzo privato. Non è però
idoneo, allo stato attuale, al rich result Google `LocalBusiness`, perché la
documentazione Google richiede un indirizzo fisico. Questa limitazione del rich
result è distinta da Google Business Profile, che va configurato esternamente
come attività ad area di servizio con indirizzo nascosto.

Il Rich Results Test di Google non ha un'API pubblica supportata per validare questa build locale e non è stato simulato con endpoint non documentati. Va eseguito sull'URL pubblico dopo il deploy. Inoltre la homepage multi-prodotto con acquisto su sito esterno non deve essere presentata come garanzia di merchant listing o rich result.

Le pagine esistenti sono locale-adaptive via JavaScript sullo stesso URL e per
questo `WebSite`/`WebPage` dichiarano italiano e inglese. È una descrizione valida
del comportamento corrente, ma non equivale a una vera architettura SEO
multilingua: se l'inglese deve essere indicizzato autonomamente servono URL
distinti, copy/schema inglesi completi e `hreflang`, previa approvazione perché
la richiesta corrente impone di preservare interazioni e contenuti visibili.

### Workflow GitHub allegato

Run verificata: `29953417405`, SHA `d74e63eb663006eb93219e3e8517fbe7257be7ce`.

- job `ping` rimasto senza runner per circa 15 minuti;
- `runner_id` assente, zero step avviati, conclusione `cancelled`;
- annotazione GitHub: job non acquisito da un runner hosted;
- la stessa revisione ha prodotto run assegnati e conclusi sia prima sia dopo l'incidente.

Quella specifica schermata è quindi un incidente di assegnazione del runner GitHub, non un errore generato da `curl`. GitHub documenta che gli schedule possono essere ritardati o scartati in periodi di carico, soprattutto a inizio ora; il cron è stato spostato ai minuti 7/17/27/37/47/57.

È stato corretto anche un difetto reale e indipendente del vecchio workflow: usava `HEAD` su `/api/products` e mascherava i fallimenti con `|| echo`. Sul backend live, `HEAD /api/products` non è una prova valida; il nuovo workflow usa `GET /api/health` e fallisce se Render o Supabase non risultano raggiungibili.

Il retry ora comprende insieme trasporto, HTTP 200 e JSON semantico
`ok/database`: sei tentativi coprono anche la pagina HTML temporanea di spin-up
di Render. Un test locale con prima risposta HTML 200 e seconda risposta health
valida ha confermato che il workflow ritenta e conclude correttamente.

Il backend live pre-deploy risponde ancora `404` su `/api/health` e `200` su `/api/products`: il nuovo workflow non potrà riuscire finché backend e workflow non saranno pubblicati.

Il workflow schedulato non è una garanzia di uptime: GitHub può ritardarlo o
scartarlo e disabilita gli schedule dei repository pubblici dopo 60 giorni senza
attività. Inoltre il Blueprint mantiene `plan: free`, che Render non indica per
carichi production e che può effettuare spin-down. Per un servizio critico serve
un monitor esterno e/o un piano Render adeguato, non il solo keep-alive.

### Sicurezza e API

Test di integrazione eseguito in copia temporanea senza `.env` reale:

| Caso | Esito |
|---|---:|
| catalogo pubblico da origine consentita | 200, 12 prodotti |
| origine arbitraria `github.io` | 403 |
| API privata da origine pubblica | 403 |
| preflight endpoint pubblico | 204 |
| health senza database | 503 fail-closed |
| file privati e traversal upload | 404 |
| login corretto / sessione | 200 / 200 |
| 7 login errati con username variabile dalla stessa IP | 6 × 401, poi 429 |
| logout senza CSRF / con CSRF | 403 / 200 |
| avvio production senza Supabase/secret/admin | rifiutato |
| registrazione/rimozione sottoscrizione push autenticata | 201 / 200, conteggio 1 → 0 |
| font locale `.woff2` servito dal backend | 200, MIME `font/woff2`, byte-identico |

La cronologia Git contiene versioni precedenti della password amministrativa codificata. La rimozione dal codice è completa, ma la credenziale deve essere considerata compromessa e ruotata sul provider; la history non è stata riscritta automaticamente.

### Rendering, link e accessibilità HTML

Browser reale Chromium:

| Vista | H1 | Prodotti | Overflow X | Immagini rotte | Link interni |
|---|---:|---:|---:|---:|---:|
| homepage 390×844 | 1 | 12 | no | 0 | tutti 200 |
| homepage 1440×900 | 1 | 12 | no | 0 | tutti 200 |
| `/links/` 390×844 | 1 | n/a | no | 0 | tutti 200 |

I 12 link Young Living sono stati richiesti con redirect: 12/12 hanno risposto HTTP 200 sul dominio ufficiale.

Lighthouse 13.4.1 locale:

| Profilo | Performance | Accessibilità | Best Practices | SEO | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|---:|---:|
| mobile | 94 | 100 | 100 | 100 | 3,0 s | 0 | 0 ms |
| desktop | 100 | 100 | 100 | 100 | 0,7 s | 0 | 0 ms |

Sono dati di laboratorio locali, non Core Web Vitals di campo.

### Confronto visuale HTML

Le catture prima/dopo hanno hash SHA-256 identico:

| Cattura | SHA-256 identico prima/dopo |
|---|---|
| homepage desktop | `b58e273514e54c0dda0b4c8b8484a9eb9d7179a99402694bf82ce860e4192603` |
| homepage mobile | `d947b14c5e5ba92c934aed21762ccd2f03a0dd8870b5c6c09c0ce5bf0e91a38e` |
| `/links/` mobile | `8b7e22614caa82bb96d295ef411fcdb7b354ca9379f214ef59cfcaa08d9a6dac` |
| sezione kit desktop | `1c8525295085e4cb7113ce80a20edf5b7e55a35de8bf8170cd9ae5ada6eccea8` |

### PDF

Confronto originale/candidato approvato:

| Proprietà | Originale | Nuovo |
|---|---:|---:|
| pagine | 7 | 7 |
| peso | 2.898.061 byte | 2.917.777 byte |
| incremento | — | 19.716 byte, +0,6803% |
| testo estraibile | 7 byte, 0 righe | 3.516 byte, 185 righe |
| SHA-256 file | `5af783b335003a0920267392750a253603143230e192f7f5ec1df289a8b7b126` | `5b6b327893257d09eda9695461fbb84525f84ce67cef7af6f7220fbb99add4f4` |

- le 7 JPEG a piena pagina sono byte-identiche tra originale e nuovo PDF;
- render Poppler 144 dpi, 2174×3072: pixel-identico su 7/7 pagine;
- render PNG comparativi: hash identico prima/dopo su 7/7 pagine;
- `qpdf --check`: nessun errore;
- lingua `it-IT`, titolo, autore/creator corporate `comeleapi`, subject, keywords e XMP di produzione presenti;
- 7 segnalibri funzionanti;
- OCR invisibile revisionato manualmente.

Il PDF resta `Tagged: no` e non è PDF/UA: testo ricercabile non equivale a tagging semantico. Una struttura corretta con titoli, paragrafi, ordine di lettura e alternative richiede la sorgente editabile o una ricostruzione progettuale. Non viene quindi dichiarato “pienamente accessibile”.

Backup rollback verificato:

```text
/Users/massimilianociconte/Documents/COMELEAPI_BACKUP/2026-07-22/mini-guida-oli-comeleapi.original.pdf
```

### Controlli finali

- `git diff --check`: superato;
- snapshot live pre-deploy: `/robots.txt`, `/sitemap.xml` e backend `/api/health` rispondono ancora `404`; il preflight dell'API admin da un'origine arbitraria risponde ancora `204`, riflette l'origine e abilita credenziali/metodi mutativi;
- nessun commit, push, deploy, migrazione remota, rotazione provider o modifica account eseguiti;
- `dist/` generato localmente, non tracciato;
- la validità live di redirect, robots, sitemap, header e health resta subordinata al deploy.

## Front-end preservato

Conferme basate su hash, screenshot e diff:

- nessuna modifica visiva alla guida: 7/7 pagine pixel-identiche;
- nessuna modifica alle 12 immagini dei kit: hash baseline invariati;
- nessuna modifica a boccette, etichette o logo `comeleapi`;
- nessun nuovo disclaimer, sezione o testo visibile;
- nessuna modifica a CSS, layout o interazioni per schema/analytics;
- nessuna variazione grafica nelle quattro viste HTML comparative;
- PDF e immagini copiati in `dist/` senza trasformazione.

“PDF raster” indicava soltanto la struttura tecnica originaria: ogni pagina era una grande immagine JPEG senza vero livello testuale. Non indicava un problema di apertura del file, né una richiesta di cambiare flaconi, logo o grafica. Il miglioramento applicato è interamente invisibile.

## Richiede azione esterna

Soltanto attività non chiudibili localmente:

1. prima del deploy Render, ruotare `ADMIN_PASSWORD`, impostare `ADMIN_USER`, verificare `SESSION_SECRET` e le variabili Supabase; il backend pubblico pre-deploy conserva ancora il vecchio bypass nel commit remoto e un CORS credentialed permissivo, quindi il rischio P0 resta aperto live;
2. verificare/ruotare eventuali altri secret provider se riutilizzati fuori dal repository;
3. applicare `supabase/migrations/20260722_harden_private_tables.sql` al progetto Supabase e provare con chiavi `anon`, `authenticated` e backend `service_role`;
4. dopo la migrazione, pubblicare il commit: il push su `main` avvia normalmente Netlify e Render in parallelo ed è compatibile anche se Netlify termina per primo; attendere quindi `/api/health`, verificare il rifiuto delle origini arbitrarie e controllare login, robots, sitemap, redirect e header sul live;
5. rieseguire manualmente il workflow GitHub dopo il deploy; un incidente futuro di mancata assegnazione runner resta di competenza GitHub;
6. verificare Google Search Console e Bing Webmaster Tools, inviare la sitemap e controllare canonical/indexazione;
7. configurare Google Business Profile come attività ad area di servizio con indirizzo nascosto e le sei aree confermate; verificare analogamente Bing Places;
8. scegliere/configurare GA4 o provider equivalente e relativo ID solo dopo verifica privacy; il codice eventi è pronto ma non trasmette senza provider e consenso;
9. eseguire Rich Results Test e ispezione URL sul contenuto pubblicato;
10. ottenere revisione scientifica/legale e approvazione cliente prima di applicare le alternative visibili del claim audit;
11. fornire la sorgente editabile del PDF e un revisore accessibilità per un eventuale PDF/UA correttamente taggato.
12. dopo ogni modifica catalogo via gestionale, sincronizzare `products.json`, rieseguire `npm run check:catalog-live` e ridistribuire Netlify; in seguito collegare il salvataggio admin a un deploy hook autenticato.
13. monitorare la disattivazione degli schedule GitHub e decidere se sostituire il keep-alive con un servizio uptime indipendente e un piano Render adatto alla produzione.
14. se l'inglese è un obiettivo organico, approvare pagine `/en/` separate con copy/schema completi e `hreflang`; l'adattamento JavaScript corrente non garantisce l'indicizzazione di entrambe le varianti.

## Dati realmente mancanti

Non sono mancanti prodotti o prezzi: sono stati estratti dal progetto. Restano realmente assenti o non risolti:

- merchant of record effettivo per ogni acquisto Young Living;
- eventuale commissione/referral e regole contrattuali di reso/assistenza;
- SKU, GTIN, disponibilità, condizione, validità prezzo, spedizione e policy resi dei prodotti;
- significato operativo dell'importo minimo di 50 euro rispetto ai servizi visibili da 40, 30 e 10 euro;
- durata del kinesio taping e del massaggio con oli essenziali;
- documento completo e relazione precisa tra qualifica, Libertas e AIF necessaria per valorizzare `recognizedBy` o `credentialingOrganization`;
- copertura formativa/assicurativa specifica per ogni servizio;
- identità fiscale, fatturazione, assicurazione, cancellazioni, pagamenti e trattamento dei dati salute;
- accessi e stato corrente di GSC, GBP, Bing, analytics, Render e Supabase;
- sorgente editabile e struttura semantica originale della guida PDF.

Questi dati non bloccano i nodi già veri; bloccano soltanto le relative proprietà o azioni esterne.

## Decisioni semantiche

| Entità | Tipo Schema.org | Proprietà pubblicate | Fonte | Affidabilità | Proprietà omesse e motivo |
|---|---|---|---|---|---|
| comeleapi | `Organization`, `LocalBusiness` sullo stesso `@id` | nome, URL, logo, immagine, contatti, founder, brand, aree, catalogo, `publicAccess:false` | sito + istruzione prioritaria | alta | `address`, `geo`, orari, dati fiscali: privati o mancanti |
| Sara Bordenga | `Person` | nome, ruolo, contatti, lingue, occupazioni e relazione col business | istruzione committente | alta per identità; dichiarativa per ruolo | competenze dettagliate, alumni/affiliazioni e altri titoli non visibili o non confermati omessi |
| qualifica 2026 | non pubblicata nel JSON-LD | fatto confermato conservato nell'audit, ma non marcato | istruzione committente | dichiarativa | il dettaglio esatto, anno e durata non compaiono nel copy visibile; `recognizedBy`/provider restano inoltre non disambiguati |
| aree | 6 × `City` | Bresso, Cusano Milanino, Cormano, Cinisello Balsamo, Sesto San Giovanni, Milano | istruzione committente | alta | raggio e indirizzo omessi |
| servizi | 7 × `Service` | nome, descrizione neutra, immagine, provider mobile, aree e canale | HTML + documenti | alta per elenco | audience, durata e termini non confermati omessi |
| catalogo servizi | `OfferCatalog` | nome, URL, numero e riferimenti alle 4 offerte con prezzo non ambiguo | HTML + prezzi confermati | alta | i 3 servizi con conflitto sul minimo restano fuori dal catalogo offerte |
| prezzi servizi | 4 × `Offer` | 50/50/50/70 EUR, URL, seller business, servizio offerto | prezzi visibili + conflitto minimo | alta per questi quattro | nessun `Offer` per relax 40, mirato 30 e taping 10 finché il minimo non è chiarito |
| catalogo prodotti | `ItemList`, 12 × `ListItem` | ordine, nome, immagine, URL, riferimento Product | `products.json` | alta | nessun dato inventato |
| prodotti | 12 × `Product` | nome, URL, immagine, categoria, descrizione neutra, brand Young Living, Offer | `products.json` + ruolo confermato | alta per dati editoriali | `manufacturer` omesso: non verificato; `comeleapi` non è produttore |
| prezzi prodotti | 12 × `Offer` | prezzo EUR, URL, prodotto offerto | `products.json` | alta come dato pubblicato | `seller` omesso: merchant ignoto; anche availability/SKU/GTIN/condition/policy omessi |
| Young Living | `Brand` | nome e URL ufficiale | sito/link ufficiali + istruzione | alta | nessuna attribuzione produttore/seller non provata |
| prenotazione | `ContactPoint`, `ServiceChannel` | telefono, email, WhatsApp, lingue, aree | sito + istruzione | alta | orari/SLA omessi |
| guida | `DigitalDocument` | URL, titolo, lingua, formato, autore e publisher corporate `comeleapi`, tema neutro | PDF + branding visibile | alta | autorialità personale, claim e rating omessi |
| pagine | `WebSite`, `WebPage`, `ImageObject` | canonical, italiano/inglese runtime, relazioni e immagini | HTML/repository | alta | breadcrumb omesso perché non visibile; nessuna promessa di rich result |

### Perché questi schema non erano stati fatti prima

La prima tranche si era fermata a un grafo minimo perché i documenti iniziali segnalavano conflitti su area, qualifica, prezzi, ruolo Young Living e seller. Non era un limite tecnico. L'istruzione prioritaria successiva ha confermato identità, aree, ruolo e qualifica e ha imposto la strategia corretta: costruire ogni nodo supportato e omettere soltanto le proprietà irrisolte. Per questo ora `LocalBusiness`, `Service`, `OfferCatalog`, `Offer`, `ItemList` e `Product` sono presenti senza inventare dati. La qualifica esatta resta invece fuori dal markup finché non viene approvata anche nel copy visibile: pubblicarla soltanto nel JSON-LD sarebbe meno prudente e non conforme al principio di corrispondenza col contenuto di pagina.

## Claim visibili

L'audit frase per frase, con rischio, fonte e alternativa non applicata, è in `CLAIM_AUDIT_2026-07-22.md`. I claim non sono stati amplificati in metadata o schema e non sono stati corretti visivamente senza approvazione.

## Verdetto

Il perimetro tecnicamente realizzabile e non visivo è completato nel repository. Sono ancora aperti soltanto gate provider/account, dati realmente non disponibili, verifica live post-deploy e approvazioni necessarie per cambiamenti visibili o per un PDF/UA ricostruito. Non è stato dichiarato risolto ciò che richiede una di queste azioni.
