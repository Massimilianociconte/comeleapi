# Come le Api — Diagnosi Tecnica & Strategia SEO/GEO Locale
### Massaggi e benessere a Bresso e comuni limitrofi (Area Metropolitana Milano Nord)

> **Nota metodologica preliminare.** Il progetto è in fase pre-launch (sito non ancora online). Questo è un vantaggio strategico enorme: non c'è debito tecnico da disfare, posso disegnare l'architettura SEO *dall'inizio* invece di rattoppare un sito già indicizzato male. I file ricevuti coprono: link-bio page, gestionale prodotti (CRUD oli essenziali), modulo dati, logica applicativa. La homepage completa (hero, chi è Sara, trattamenti, certificazioni, form) esiste per ora solo come descrizione nel README — la tratto quindi come **pagina da progettare**, non da correggere riga per riga. Le certificazioni di Sara sono ancora da raccogliere: dove serve un esempio concreto uso placeholder espliciti, mai dati inventati spacciati per reali.

---

## 1. Diagnosi critica del sito attuale

### 1.1 Cosa funziona già bene (da non toccare)

| Aspetto | Valutazione |
|---|---|
| Architettura senza framework (HTML/CSS/JS vaniglia) | Ottimo per performance: zero overhead di bundle JS, caricamento rapido per natura. |
| `admin.html` con `<meta name="robots" content="noindex,nofollow">` | Corretto — il gestionale non deve mai finire nell'indice di Google. |
| Accessibilità di base in `links.css` | `:focus-visible`, `prefers-reduced-motion`, contrasti curati: buona base, raro vedere questa cura in un progetto a questo stadio. |
| Mobile-first nella link-bio | `clamp()`, breakpoint dedicato, `100svh`: tecnicamente solido. |
| Separazione dati/logica (`data.js` come modulo unico) | Buona pratica: un solo punto di verità per i prodotti, facile da migrare a un backend in futuro. |

### 1.2 Criticità rilevate — ordinate per impatto

#### 🔴 CRITICA 1 — Il form di prenotazione non invia nulla a nessuno
In `app.js`, il submit del form chiama `e.preventDefault()` e mostra un messaggio di successo *simulato*. Nessun dato raggiunge davvero un'email, un CRM o un foglio di calcolo. Il README lo conferma come funzionalità da implementare.

**Perché è critica:** è il cuore della conversione. Se domani il sito fosse online e ben posizionato, ogni richiesta di consulenza andrebbe persa. È priorità assoluta, prima ancora della SEO: non ha senso portare traffico a un imbuto che perde tutto.

**Soluzione concreta:** integrare Formspree (gratuito fino a 50 invii/mese, attivabile in 10 minuti senza backend) come soluzione-ponte, oppure un endpoint serverless minimale (es. su Vercel/Netlify Functions) che inoltri a un'email reale e salvi una copia su Google Sheets via Apps Script. Per un singolo professionista, Formspree è sufficiente anche in produzione stabile.

#### 🔴 CRITICA 2 — I prodotti (vetrina oli essenziali) sono invisibili ai motori di ricerca al primo caricamento
In `app.js`, la vetrina viene costruita così:

```js
const grid = $("#productsGrid");
if (grid && window.SaraData) {
  const render = () => {
    const products = window.SaraData.getVisibleProducts();
    grid.innerHTML = products.map(...).join("");
```

Il contenuto (nomi prodotto, descrizioni, benefici, prezzi) esiste **solo dentro `localStorage`** e viene scritto nel DOM via JavaScript dopo il caricamento. Non c'è alcun HTML statico di partenza con questi contenuti.

**Perché è critica, soprattutto qui:** hai indicato che gli oli essenziali sono una priorità di revenue reale, non un elemento decorativo. Significa che le pagine prodotto devono competere per query commerciali ("olio essenziale lavanda prezzo", "dove comprare olio essenziale rosa damascena"). Google oggi *esegue* JavaScript, ma con ritardo e budget limitato per siti piccoli/nuovi — nella finestra critica delle prime settimane post-lancio (quella in cui un sito nuovo si gioca la prima impressione con Google), un contenuto reso solo client-side parte in salita.

**Soluzione concreta:** generare l'HTML dei prodotti **server-side o a build-time**, non a runtime nel browser dell'utente. Tre opzioni realistiche, in ordine di sforzo crescente:
1. **Minimo sforzo:** uno script Node che, ad ogni modifica nel gestionale, rigenera un blocco HTML statico dei prodotti visibili e lo inietta nel file `index.html` pubblico (pre-render). Il gestionale resta identico, cambia solo il "publish".
2. **Sforzo medio:** migrare da localStorage a un piccolo backend (es. Supabase, gratuito nel tier base) con una singola pagina HTML per prodotto (`/prodotti/olio-lavanda.html`), generata anch'essa server-side. Questo abilita anche URL indicizzabili singolarmente — fondamentale per il punto 1.3 più sotto.
3. **Sforzo maggiore ma più scalabile:** framework di generazione statica (es. Astro, leggerissimo, compatibile con la filosofia "no build step pesante" del progetto) che legge i dati e produce pagine HTML reali in fase di deploy.

Per la fase attuale consiglio l'opzione 1 come passo immediato, opzione 2 entro 2-3 mesi se il canale prodotti cresce.

#### 🟠 CRITICA 3 — Nessun dato strutturato (Schema.org/JSON-LD)
Nessuno dei file HTML forniti contiene markup `LocalBusiness`, `Service`, `Product`, `FAQPage` o `Review`. Questo è il singolo intervento a più alto rapporto impatto/sforzo per un local business, ed è trattato in dettaglio nella Sezione 4.

#### 🟠 CRITICA 4 — Vetrina prodotti senza monetizzazione reale
In `data.js`, ogni prodotto di default punta a:
```js
link: "https://www.google.com/search?q=olio+essenziale+lavanda"
```
Sono link a una ricerca Google generica, non a uno shop reale né a un programma di affiliazione. Dato che hai confermato che questo canale deve generare fatturato, oggi sta **regalando il click a Google senza ritorno**: l'utente clicca "Acquista" e abbandona il sito per finire su una SERP che potrebbe anche non contenere il prodotto giusto.

**Soluzione concreta:** prima del lancio, sostituire ogni `link` con uno dei seguenti, in base al modello di business scelto:
- Link di affiliazione Amazon (programma Amazon Associates Italia, commissioni 1-3% su salute/bellezza ma volume alto e fiducia consolidata);
- Affiliazione con e-commerce italiani specializzati in aromaterapia (es. Naturando, Flora, Aboca hanno programmi affiliati o partnership rivenditore);
- Se Sara vuole vendere lei stessa: integrazione minimale con Stripe Payment Links (zero sviluppo backend, link di pagamento generati dalla dashboard Stripe, perfettamente compatibile con l'architettura "no backend" attuale).

#### 🟡 IMPORTANTE 5 — Metadati generici, nessuna keyword locale
La meta description della link-bio è: *"Tutti i link utili di Come le Api: consulenza gratuita, trattamenti, oli essenziali, WhatsApp e Instagram."* Zero menzione di Bresso, zero menzione di "massaggi" come termine di ricerca. Stessa cosa per il title. Dettaglio completo in Sezione 4.

#### 🟡 IMPORTANTE 6 — Dati di contatto placeholder
I recapiti provvisori sono stati sostituiti con i dati forniti dalla cliente: Sara Bordenga, `sara.bordenga@gmail.com` e `+39 388 163 9306`.

#### 🟡 IMPORTANTE 7 — Nessun canonical tag, nessuna immagine Open Graph
Assenza di `<link rel="canonical">` e `<meta property="og:image">`. Su WhatsApp/Instagram (i due canali social citati nella link-bio stessa) un link condiviso senza `og:image` mostra una card vuota o generica — un problema diretto per chi userà proprio quei canali per promuoversi.

#### 🟢 MINORE 8 — Performance immagini
Le immagini prodotto sono caricate da Unsplash (placeholder). In produzione vanno sostituite con foto reali, idealmente in formato WebP con dimensioni responsive (`srcset`), seguendo lo stesso pattern già usato correttamente per il logo nella link-bio.

### 1.3 Architettura URL — la decisione più importante prima del lancio

Questo è probabilmente il punto tecnico con il maggiore impatto SEO a lungo termine, e va deciso **prima** di scrivere altro codice.

Dal README risulta un sito a singola pagina (`index.html` con sezioni `#servizi`, `#prodotti`, ecc.) più una link-bio separata. Per gli obiettivi che hai descritto — posizionarsi su query locali a Bresso *e* su query commerciali per i prodotti — una singola pagina con anchor (`#`) è strutturalmente limitante:

- Google assegna **rilevanza per URL**, non per sezione di pagina. Una sola homepage non può competere efficacemente sia per "massaggio Bresso" sia per "olio essenziale lavanda prezzo": sono intenti di ricerca troppo diversi per la stessa URL.
- I prodotti, se mai diventeranno indicizzabili singolarmente (Critica 2), hanno bisogno ciascuno di un proprio URL per posizionarsi sulla query specifica del singolo olio.

**Raccomandazione:** passare da sito-one-page a sito multi-pagina leggero, mantenendo la stessa filosofia "no framework pesante". Struttura URL consigliata in Sezione 6.

---

## 2. Strategia SEO Locale (Local SEO) — il nucleo della crescita

### 2.1 Inquadramento corretto: "service-area business", non storefront

Punto tecnico decisivo: Sara **non ha una sede fisica con cui i clienti interagiscono** — lavora a domicilio/itinerante su Bresso e comuni limitrofi. In terminologia Google Business Profile (GBP) questo si chiama **Service Area Business (SAB)**, ed è un'impostazione diversa da quella di un negozio con vetrina:

- Nel profilo GBP, l'opzione corretta è *"Questa attività non riceve clienti presso il suo indirizzo"* + dichiarazione dell'**area di servizio** (lista di comuni, non un singolo indirizzo pubblico).
- Lo schema.org da usare in pagina non è semplicemente `LocalBusiness` con un `address`, ma `LocalBusiness` (o più specificamente `HealthAndBeautyBusiness` / sottotipo affine) con proprietà `areaServed` contenente l'elenco dei comuni coperti — dettaglio tecnico in Sezione 4.

Questa distinzione cambia tutto l'impianto local SEO: non si compete per "essere il negozio più vicino", si compete per **"chi risponde meglio nei comuni X, Y, Z"**, il che apre la porta a una strategia di pagine locali multiple (Sezione 6) che per uno storefront fisso avrebbe meno senso.

### 2.2 Comuni target — raggio di azione realistico

Bresso è un comune satellite di Milano Nord, ben collegato. Senza dati su quanto Sara sia disposta a spostarsi, propongo un raggio a 3 cerchi concentrici basato sulla prossimità geografica e densità abitativa, da validare con Sara su tempi di spostamento reali:

| Cerchio | Comuni | Priorità SEO |
|---|---|---|
| **Primario** (limitrofi diretti) | Bresso, Cusano Milanino, Cormano, Niguarda (quartiere Milano), Bruzzano (quartiere Milano), Sesto San Giovanni | Massima — pagine locali dedicate fin da subito |
| **Secondario** (area Nord Milano) | Cinisello Balsamo, Bollate, Paderno Dugnano, Affori (quartiere Milano) | Alta — pagine locali entro 2-3 mesi |
| **Terziario** (Milano città + hinterland nord) | Milano (zone Nord: Affori, Comasina, Dergano), Senago, Garbagnate Milanese | Media — copertura via contenuti, non necessariamente pagina dedicata singola |

> Prima di investire tempo su pagine per comuni del cerchio secondario/terziario, conviene verificare con dati reali (richieste già arrivate, distanza percorribile) quali comuni generano davvero domanda. Il piano in Sezione 8 prevede questa validazione nel mese 1.

### 2.3 Google Business Profile — configurazione corretta

1. Categoria principale: **"Servizio di massaggi"** (non "Centro benessere" se non c'è una sede fisica visitabile — la categoria deve riflettere il servizio reale).
2. Categorie secondarie: aggiungere in base alle certificazioni reali una volta raccolte (es. "Servizio di riflessologia", "Centro shiatsu") — vedi placeholder in Sezione 7.
3. Area di servizio: impostare i comuni del cerchio primario + secondario.
4. Foto: minimo 10 immagini reali (Sara al lavoro con consenso del soggetto se presente un cliente, ambiente di lavoro, certificati). Le foto reali pesano sul ranking locale più di quanto si pensi — i profili con foto autentiche e aggiornate regolarmente hanno tassi di interazione misurabilmente più alti.
5. Post GBP settimanali: non sono solo vetrina, contano come segnale di attività per l'algoritmo del Local Pack.
6. **Recensioni** — vedi Sezione 7 (E-E-A-T e fiducia), è il singolo fattore di local ranking più influente dopo la pertinenza della categoria.

### 2.4 Citazioni locali (Local Citations / NAP consistency)

NAP = Nome, Address (o area di servizio), Phone — deve essere **identico carattere per carattere** su ogni piattaforma esterna. Le incongruenze (es. "Sara Massaggi" vs "Come le Api - Sara" vs numero scritto con o senza spazi) confondono l'algoritmo di local ranking.

Piattaforme italiane da popolare in ordine di priorità:
1. Google Business Profile (già trattato)
2. Pagine Gialle / PagineBianche
3. Bing Places
4. Directory di settore: portali di massaggiatori/benessere certificati (da individuare in base all'albo/associazione professionale di cui Sara è eventualmente membro — collegato al punto certificazioni)
5. Directory locali specifiche di Bresso/Cusano Milanino (associazioni di categoria comunali, gruppi Facebook locali "Sei di Bresso se...", spesso sottovalutati ma con autorità locale reale)

---

## 3. Strategia GEO (Generative Engine Optimization) — ottimizzazione per AI Overviews e assistenti LLM

Questo è il capitolo che differenzia un piano SEO "standard" da uno aggiornato al 2026. Gli assistenti AI (AI Overviews di Google, ChatGPT, Perplexity, Claude stesso quando naviga) non leggono il web come un crawler classico: **estraggono e sintetizzano risposte**, citando le fonti che strutturano l'informazione nel modo più estraibile.

### 3.1 Principi specifici del GEO (diversi dalla SEO classica)

- **Risposte autocontenute in linguaggio naturale.** Un AI Overview preferisce estrarre un paragrafo che risponde compiutamente a una domanda ("Quanto dura un massaggio decontratturante?") piuttosto che dover ricostruire la risposta da frammenti sparsi in più pagine.
- **Struttura a domanda-risposta esplicita.** Sezioni FAQ ben marcate (con schema `FAQPage`, Sezione 4) sono tra i contenuti più citati dai motori generativi, perché il formato domanda→risposta è già nella forma che l'AI deve produrre.
- **Specificità batte genericità.** "Il massaggio decontratturante di 50 minuti a Bresso costa X€ e si rivolge a chi soffre di tensione cervicale da postura" viene citato più facilmente di "Offriamo massaggi di qualità". Le AI premiano la concretezza verificabile.
- **Coerenza multi-fonte.** Se Google Business Profile, sito e directory locali raccontano la stessa storia con le stesse informazioni (stessi orari, stessa area di servizio, stesso linguaggio sui trattamenti), il motore generativo costruisce più fiducia nel sintetizzare quella fonte come autorevole.

### 3.2 Azioni concrete GEO

1. **Pagina FAQ dedicata e robusta** (non 3 domande di facciata, ma 15-20 domande reali che un potenziale cliente farebbe a un assistente AI: "Il massaggio [tipo] fa male?", "Quante sedute servono per [problema]?", "Posso fare un massaggio in gravidanza?"). Ogni risposta in 2-4 frasi dirette, poi eventualmente approfondimento.
2. **Markup FAQPage** su quella pagina (dettaglio tecnico Sezione 4) — è il ponte diretto tra contenuto testuale e capacità dell'AI di estrarlo come risposta.
3. **Contenuti "definizionali" per ogni trattamento.** Una pagina per trattamento che apre con una definizione chiara e citabile ("Il massaggio linfodrenante è una tecnica manuale che..."), seguita da indicazioni, controindicazioni, durata, prezzo indicativo. Questo formato è esattamente quello che un'AI estrae per rispondere a "cos'è il linfodrenaggio".
4. **Coerenza del NAP e della narrazione professionale** ovunque, come già detto in 2.4 — vale doppio per il GEO perché i motori generativi spesso incrociano più fonti per validare un'affermazione su un'attività locale.
5. **robots.txt che non blocchi i crawler AI legittimi.** Verificare che user-agent come `GPTBot`, `PerplexityBot`, `Google-Extended` non siano bloccati di default (a meno di una scelta consapevole contraria) — molti generatori di siti li bloccano per errore lasciando le impostazioni predefinite di template generici.
6. **Citazioni esterne autorevoli.** Un articolo su una rivista di settore, un'intervista locale, una menzione in un blog di benessere della zona — i motori generativi pesano la presenza del brand in fonti terze indipendenti, non solo sul sito stesso.

---

## 4. Schema Markup — implementazione tecnica concreta

Da inserire come JSON-LD nell'`<head>` della homepage. Esempio concreto basato sui dati reali confermati (Bresso, service-area, no sede fissa) con placeholder evidenti dove i dati sono ancora da raccogliere:

```json
{
  "@context": "https://schema.org",
  "@type": "HealthAndBeautyBusiness",
  "name": "Come le Api",
  "description": "Servizio di massaggi e benessere a domicilio a Bresso e comuni limitrofi.",
  "url": "https://www.comeleapi.it",
  "telephone": "+39-XXX-XXXXXXX",
  "image": "https://www.comeleapi.it/assets/img/sara-ritratto.jpg",
  "areaServed": [
    { "@type": "City", "name": "Bresso" },
    { "@type": "City", "name": "Cusano Milanino" },
    { "@type": "City", "name": "Cormano" },
    { "@type": "City", "name": "Sesto San Giovanni" },
    { "@type": "City", "name": "Cinisello Balsamo" }
  ],
  "priceRange": "€€",
  "founder": {
    "@type": "Person",
    "name": "Sara [COGNOME DA CONFERMARE]",
    "jobTitle": "Massaggiatrice professionale certificata"
  }
}
```

Da affiancare con:
- **`Service`** per ogni trattamento (nome, descrizione, durata, eventuale prezzo) sulla relativa pagina.
- **`FAQPage`** sulla pagina FAQ (Sezione 3.2).
- **`Product`** + **`Offer`** per ogni olio essenziale, una volta risolta la Critica 2 (rendering server-side) — senza HTML statico indicizzabile, lo schema da solo non basta.
- **`AggregateRating`** + **`Review`** solo quando esisteranno recensioni reali verificabili — **non generare mai recensioni o rating fittizi**: oltre a essere contro le linee guida di Google (rischio penalizzazione), mina esattamente la fiducia (E-E-A-T) che la strategia vuole costruire.

---

## 5. Mappa delle keyword

### 5.1 Cluster "servizi di massaggio" (intento locale/transazionale)

| Keyword | Intento | Priorità |
|---|---|---|
| massaggiatrice Bresso | Transazionale locale | Alta |
| massaggio a domicilio Bresso | Transazionale locale | Alta |
| massaggio decontratturante Cusano Milanino | Transazionale locale | Alta |
| massaggio rilassante Milano Nord | Transazionale locale | Media-Alta |
| dove fare un massaggio vicino a Bresso | Transazionale locale (anche voice/AI) | Media-Alta |
| massaggiatrice certificata Bresso | Transazionale + fiducia | Media |
| [tipo trattamento, da definire con certificazioni] Bresso | Transazionale locale | Alta una volta note le certificazioni |

### 5.2 Cluster "informativo" (top/middle funnel, alimenta GEO e topical authority)

| Keyword | Intento | Funzione |
|---|---|---|
| benefici del massaggio decontratturante | Informativo | Topical authority + estrazione AI |
| differenza tra massaggio rilassante e terapeutico | Informativo | Topical authority |
| quanto dura un massaggio | Informativo | FAQ/GEO |
| massaggio fa bene allo stress | Informativo | Top funnel |
| controindicazioni massaggio gravidanza | Informativo (alta sensibilità, scrivere con cura medica) | FAQ/GEO |

### 5.3 Cluster "prodotto" (oli essenziali — commerciale)

| Keyword | Intento | Priorità |
|---|---|---|
| olio essenziale lavanda prezzo | Transazionale | Alta |
| olio essenziale lavanda benefici | Informativo→Transazionale | Alta |
| miglior olio essenziale per il relax | Informativo→Transazionale | Media |
| dove comprare olio essenziale [tipo] | Transazionale | Media |
| olio essenziale eucalipto raffreddore | Informativo | Media |

### 5.4 Cluster "brand + locale combinato"

| Keyword | Intento |
|---|---|
| Come le Api Bresso | Navigazionale (da costruire nel tempo) |
| Come le Api massaggi | Navigazionale/brand |

> Nota metodologica: questi cluster sono costruiti su logica di intento di ricerca e struttura del settore, non su dati di Keyword Planner/Ahrefs reali (che richiederebbero accesso a un account collegato — se vuoi, posso usare il connector Ahrefs già disponibile per validare volumi di ricerca effettivi su queste keyword prima di finalizzare il piano contenuti).

---

## 6. Struttura delle pagine consigliata

Sostituendo l'attuale impianto one-page con architettura multi-pagina (motivazione in 1.3):

```
/                                  → Homepage (hero, presentazione sintetica, CTA, riepilogo servizi)
/chi-sono/                        → Storia di Sara, certificazioni reali, valori, foto
/servizi/                         → Pagina indice di tutti i trattamenti
/servizi/massaggio-decontratturante/   → Pagina singola per trattamento (schema Service)
/servizi/[altro-trattamento]/     → Una pagina per ogni trattamento reale
/zone/bresso/                     → Pagina locale dedicata
/zone/cusano-milanino/            → Pagina locale dedicata
/zone/cormano/                    → Pagina locale dedicata
/zone/[altri comuni cerchio 1-2]/ → Una per comune ad alta priorità
/prodotti/                        → Vetrina oli essenziali (indice)
/prodotti/olio-lavanda/           → Pagina singola prodotto (schema Product) — risolve indicizzabilità
/blog/                            → Contenuti informativi (cluster 5.2)
/prenota/                         → Form di consulenza gratuita (con invio funzionante, Critica 1)
/faq/                             → FAQ robusta (schema FAQPage, leva GEO principale)
/link-utili/                      → L'attuale link-bio, mantenuta com'è (funziona bene per social)
```

**Sulle pagine `/zone/`:** non devono essere copie identiche con solo il nome del comune cambiato (è la causa più comune di penalizzazione per contenuto duplicato/sottile nelle pagine locali). Ognuna deve avere almeno un elemento distintivo reale: una menzione di un quartiere/zona specifica, tempo di spostamento indicativo, eventualmente una testimonianza di un cliente di quella zona quando disponibile.

---

## 7. Fiducia, autorevolezza, E-E-A-T e conversioni

### 7.1 Le certificazioni: come strutturarle correttamente (anche prima di conoscerle)

Hai detto che le certificazioni reali sono ancora da definire con Sara. Ecco esattamente cosa chiederle, e perché ogni dato serve alla SEO/GEO, non solo all'estetica:

| Da chiedere a Sara | Perché serve |
|---|---|
| Nome esatto del corso/diploma e ente che lo rilascia | Verificabilità = E-E-A-T. Google e gli utenti distinguono un "corso weekend" da un percorso riconosciuto. |
| Anno di conseguimento | Segnale di esperienza consolidata nel tempo (la "E" di Experience in E-E-A-T). |
| Numero di ore di formazione, se disponibile | Dettaglio concreto e citabile, utile sia per fiducia utente sia per estrazione GEO. |
| Eventuale iscrizione ad associazione di categoria (es. CIM, FIM, o altre sigle di settore) | Le associazioni professionali spesso hanno directory pubbliche: è anche una citazione locale gratuita (Sezione 2.4). |
| Numero di clienti/anni di attività (anche approssimativo, se onesto) | "Più di 5 anni di esperienza" è un dato semplice ma ad alto impatto su fiducia e conversione. |

**Nel frattempo**, nella struttura del sito si può lasciare la sezione `/chi-sono/` con placeholder espliciti del tipo `[Certificazione da inserire]` visibili solo in ambiente di sviluppo — mai pubblicare online prima che siano dati reali, per le ragioni di danno reputazionale già discusse al punto 1.2.

### 7.2 Recensioni — la leva di fiducia più potente, gestita correttamente

- Richiedere recensioni Google attivamente dopo ogni sessione (un link diretto via WhatsApp post-trattamento converte molto meglio di un cartello in studio, specie per chi non ha sede fissa).
- Mai comprare o generare recensioni false: rischio di rimozione del profilo GBP e, più semplicemente, è eticamente scorretto verso clienti reali che si affidano a quelle recensioni.
- Rispondere a ogni recensione, anche positiva: i profili con risposte attive hanno engagement misurabilmente migliore ed è anche un segnale comportamentale che pesa nel local ranking.

### 7.3 Conversion Rate Optimization (CRO) — micro-interventi ad alto impatto

1. CTA "Prenota consulenza gratuita" già presente e ben posizionata nella link-bio — corretto, mantenere questo pattern anche sulla homepage completa.
2. Aggiungere **prova sociale visibile above the fold** appena disponibile (es. "★ 4.9/5 su Google Recensioni — 30+ clienti soddisfatti") non appena ci sono recensioni reali da mostrare.
3. Il bottone WhatsApp è già un'ottima scelta per il target: in Italia, per servizi locali personali, il tasso di risposta a un contatto WhatsApp supera nettamente quello di un form email tradizionale — da mantenere come canale primario, sistemando però il numero placeholder.
4. Tempo di risposta dichiarato ("Rispondo entro 24h") riduce l'attrito percepito nel contattare.

---

## 8. Piano d'azione — priorità per urgenza e impatto

### 🔴 Mese 1 — Fondamenta (bloccanti, da fare prima del lancio)
- [ ] Sistemare il form di prenotazione con invio reale funzionante (Formspree o equivalente) — **Critica 1**
- [ ] Sostituire tutti i dati placeholder (telefono, WhatsApp, email, cognome) con dati reali verificati
- [ ] Decidere e implementare l'architettura multi-pagina (Sezione 6)
- [ ] Raccogliere con Sara: certificazioni reali, anni di esperienza, area di servizio definitiva
- [ ] Risolvere link di affiliazione/vendita reali per i prodotti — **Critica 4**
- [ ] Configurare Google Business Profile come Service Area Business (Sezione 2.3)
- [ ] Acquistare dominio e hosting, impostare `robots.txt` e `sitemap.xml`

### 🟠 Mese 2 — Visibilità tecnica e contenuti core
- [ ] Risolvere il rendering server-side dei prodotti (almeno opzione 1 di Critica 2)
- [ ] Implementare schema markup `HealthAndBeautyBusiness` + `Service` su tutte le pagine trattamento
- [ ] Pubblicare pagine `/zone/` per i comuni del cerchio primario (Sezione 2.2)
- [ ] Scrivere e pubblicare la pagina FAQ con 15-20 domande reali + schema `FAQPage`
- [ ] Iniziare la raccolta sistematica di recensioni Google dai primi clienti reali
- [ ] Registrare il business su Pagine Gialle, Bing Places, directory di settore (Sezione 2.4)

### 🟡 Mese 3 — Espansione contenuti e prodotti
- [ ] Pubblicare le pagine singole di ogni trattamento con schema `Service`
- [ ] Avviare il blog con i primi contenuti del cluster informativo (Sezione 5.2)
- [ ] Risolvere indicizzabilità dei singoli prodotti (`/prodotti/[nome]/`) con schema `Product`
- [ ] Pagine `/zone/` per il cerchio secondario, solo se i dati del mese 1-2 confermano domanda reale in quei comuni

### 🟢 Mese 4-6 — Consolidamento e scala
- [ ] Link building locale attivo: contatti con directory di categoria, associazioni, eventuali collaborazioni con altri professionisti del benessere della zona (cross-link reciproci genuini, non scambi di massa)
- [ ] Prima rilevazione `AggregateRating`/`Review` schema, solo con recensioni reali accumulate
- [ ] Valutazione dati reali di Search Console/GBP per ri-bilanciare priorità tra cluster servizi e cluster prodotti in base a cosa converte meglio
- [ ] Eventuale ampliamento del cerchio comuni in base ai dati di provenienza delle richieste reali

---

## 9. Cosa NON fare (errori comuni da evitare esplicitamente)

- Non comprare backlink di massa da directory irrilevanti o straniere: per un local business italiano sono inutili o controproducenti.
- Non duplicare il testo delle pagine `/zone/` cambiando solo il nome del comune.
- Non inventare recensioni, certificazioni o numeri (clienti, anni di esperienza) per "sembrare" più affidabili nel breve periodo: il danno alla fiducia, se scoperto, è permanente e in un mercato locale piccolo come Bresso la reputazione passa anche per passaparola reale, non solo online.
- Non bloccare i crawler AI in `robots.txt` per impostazione predefinita senza una scelta consapevole — taglierebbe fuori il sito dalla strategia GEO descritta in Sezione 3.
- Non lanciare il sito pubblico con dati di contatto placeholder, anche per errore temporaneo.

---

## In sintesi

Il progetto parte da una base tecnica onesta (niente framework superflui, buone fondamenta di accessibilità) ma con due falle bloccanti per gli obiettivi di business dichiarati: **il form non invia nulla** e **i prodotti non sono indicizzabili**. Risolte queste due, il vantaggio di essere ancora pre-lancio permette di costruire da subito un'architettura multi-pagina corretta, uno schema markup completo e una strategia di local + GEO SEO che — per un service-area business in un comune satellite come Bresso, con poca concorrenza diretta strutturata in questo modo — ha margini realistici di posizionamento in tempi relativamente brevi (3-4 mesi per le query locali a bassa-media concorrenza, 5-6 mesi per consolidare il cluster prodotto).
