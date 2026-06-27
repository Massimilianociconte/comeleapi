# Sara — Benessere & Massaggi

Sito web moderno, elegante e professionale per la presentazione online di **Sara**,
massaggiatrice. Include un sito pubblico a singola pagina e un **gestionale**
collegato per amministrare la vetrina di oli essenziali consigliati.

Nessun framework, nessun build step: **HTML, CSS e JavaScript vaniglia**. Si apre
direttamente nel browser.

---

## ✨ Cosa contiene

### Sito pubblico (`index.html`)
1. **Hero** — presentazione di Sara, titolo forte, CTA per la consulenza gratuita.
2. **Chi è Sara** — presentazione personale e professionale, valori, firma.
3. **Trattamenti** — 6 servizi in card eleganti con benefici e durata.
4. **Certificazioni & Formazione** — card con attestati e anno di conseguimento.
5. **Consulenza gratuita** — form completo (nome, telefono, email, giorno/orario, messaggio).
6. **Vetrina Oli Essenziali** — schede prodotto con immagine, prezzo, benefici e bottone di acquisto esterno.
7. **Elementi di fiducia** — pilastri professionali + testimonianze con stelle.
8. **Footer** — contatti, social, privacy/cookie policy, link all'area riservata.

### Gestionale (`admin.html`)
Pannello pensato per una persona **non tecnica**, con:
- ➕ **Aggiungere** nuovi prodotti
- ✎ **Modificare** nome, descrizione, benefici, prezzo, immagine, link, visibilità
- 🗑 **Eliminare** prodotti (con conferma)
- 👁️ **Nascondere/mostrare** prodotti senza cancellarli
- ▲▼ **Riordinare** le schede con semplici frecce
- 📊 **Statistiche** sintetiche (totali, visibili, nascosti, con prezzo)
- ↺ **Ripristinare** i prodotti di esempio

---

## 🚀 Come usarlo

### Visualizzare il sito
Apri `index.html` con un doppio clic, oppure servi la cartella con un piccolo
server locale (consigliato per il corretto funzionamento di alcune funzionalità):

```bash
# Python 3
python3 -m http.server 8000

# oppure Node
npx serve
```

Poi vai su <http://localhost:8000>.

### Aprire il gestionale
Vai su `admin.html` (o clicca **"Area riservata"** nel footer del sito / **"Gestisci la
vetrina dal pannello"** sotto la sezione prodotti).

Le modifiche fatte nel gestionale si riflettono **immediatamente** sulla vetrina pubblica.

---

## 🎨 Scelte di design

- **Palette naturale & premium**: crema, sabbia, salvia, terracotta.
- **Tipografia elegante**: *Cormorant Garamond* (display) + *Mulish* (testo).
- **Animazioni leggere**: reveal allo scroll, hover morbidi, blob galleggianti.
- **Accessibilità**: contrasti curati, `aria-*`, focus visibili, supporto
  `prefers-reduced-motion`.
- **Responsive**: ottimizzato per mobile, tablet e desktop.

---

## 🗂 Struttura del progetto

```
.
├── index.html              # Sito pubblico
├── admin.html              # Gestionale prodotti
├── README.md
└── assets/
    ├── css/
    │   ├── styles.css      # Stili del sito
    │   └── admin.css       # Stili del gestionale
    └── js/
        ├── data.js         # Dati condivisi (localStorage)
        ├── app.js          # Logica del sito
        └── admin.js        # Logica del gestionale
```

---

## 💾 Dove sono salvati i prodotti?

I prodotti sono memorizzati nel **localStorage** del browser (chiave
`sara_products_v1`). Questo significa che:

- ✅ Funziona subito, senza backend né database.
- ✅ Persiste tra le sessioni sullo stesso browser.
- ⚠️ I dati sono **per dispositivo/browser**: se vuoi una gestione condivisa
  online (multi-utente, sincronizzata) serve collegare un backend
  (es. Firebase, Supabase o una piccola API).
- 🔄 Il pulsante **"Ripristina esempio"** nel gestionale ricarica i prodotti di default.

---

## 🔧 Personalizzazioni rapide

| Cosa fare | Dove |
|---|---|
| Cambiare colori / font | `:root` in `assets/css/styles.css` e `assets/css/admin.css` |
| Modificare testi del sito | `index.html` |
| Modificare testi del gestionale | `index.html` |
| Aggiungere/rimuovere servizi o certificazioni | `index.html` (sezioni `#servizi`, `#certificazioni`) |
| Cambiare i prodotti di default | array `DEFAULT_PRODUCTS` in `assets/js/data.js` |
| Sostituire le immagini | URL dentro `index.html` e `data.js` |
| Collegare il form a un'email/servizio | funzione submit in `assets/js/app.js` (vedi sezione sotto) |

### Inviare davvero le richieste del form
Attualmente il form mostra solo un messaggio di conferma (nessun backend).
Per ricevere le richieste puoi integrare, ad esempio:

- **Formspree** (<https://formspree.io>) — basta impostare `action` e `method` sul form.
- **EmailJS** — invio via email lato client.
- Un tuo endpoint/server.

Esempio con Formspree (sostituisci l'`id` form):
```html
<form id="bookingForm" action="https://formspree.io/f/TUOID" method="POST">
```
E in `app.js` rimuovi il `e.preventDefault()` lasciando l'invio nativo
(opzionale: gestione AJAX per mantenere il messaggio di successo).

---

## 🖼️ Immagini
Le immagini sono caricate da **Unsplash** (placeholder di alta qualità).
Per uso in produzione, sostituiscile con foto reali di Sara e del suo studio.

---

## 📄 Licenza d'uso
Codice realizzato su richiesta come template personalizzato. Libero da utilizzare
e modificare per Sara. Le immagini demo mantengono la licenza dei rispettivi autori.
