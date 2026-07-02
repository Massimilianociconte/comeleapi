/* =============================================================
   SARA — app.js
   Logica del sito pubblico: rendering contenuti, form, animazioni
   ============================================================= */

(function () {
  "use strict";

  /* ---------- Helpers ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function apiBase() {
    return String(window.COMELEAPI_API_BASE || "").trim().replace(/\/+$/, "");
  }

  function apiUrl(path) {
    const base = apiBase();
    return base ? `${base}${path}` : path;
  }

  /* ---------- Year ---------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Header scroll state ---------- */
  const header = $("#siteHeader");
  const onScroll = () => {
    if (window.scrollY > 30) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile nav ---------- */
  const navToggle = $("#navToggle");
  const mainNav = $("#mainNav");
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", () => {
      const open = mainNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    // chiudi al click su un link
    $$("a", mainNav).forEach((a) =>
      a.addEventListener("click", () => {
        mainNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  /* ---------- Reveal on scroll ---------- */
  const reveals = $$(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Smooth scroll offset per header fisso ---------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (ev) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      ev.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: "smooth" });
    });
  });

  /* ---------- Rendering proposte legacy ---------- */
  const grid = $("#productsGrid");
  if (grid && window.SaraData) {
    const fallbackProductImage = "assets/img/hero/hero-massage-sara.jpg";
    const render = async () => {
      grid.classList.add("is-loading");
      const products = await window.SaraData.getVisibleProducts();
      if (!products.length) {
        grid.innerHTML = `
          <p style="grid-column:1/-1;text-align:center;color:var(--ink-soft);padding:2rem;">
            Al momento non ci sono prodotti in vetrina. Torna a trovarci presto.
          </p>`;
        grid.classList.remove("is-loading");
        return;
      }
      grid.innerHTML = products.map((p, i) => {
        const unavailable = p.visible === false;
        return `
        <article class="product-card ${unavailable ? "product-card--unavailable" : ""} reveal" data-delay="${(i % 3)}" aria-disabled="${unavailable ? "true" : "false"}">
          <div class="product-img">
            <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async" />
            ${unavailable ? `<span class="availability-badge">Esaurito</span>` : ""}
          </div>
          <div class="product-body">
            <h3>${escapeHtml(p.name)}</h3>
            <p class="desc">${escapeHtml(p.shortDesc)}</p>
            <div class="benefits"><b>Benefici:</b> ${escapeHtml(p.benefits)}</div>
            ${unavailable ? `
            <span class="btn btn--disabled btn--sm" aria-label="${escapeHtml(p.name)} non disponibile">
              Prossimamente disponibile
            </span>` : `
            <a class="btn btn--dark btn--sm" href="${escapeHtml(p.link)}" target="_blank" rel="noopener nofollow">
              Richiedi dettagli
              <img class="btn-icon" src="assets/img/icons/icon-arrow.png" width="16" height="16" alt="" loading="lazy" decoding="async" />
            </a>`}
          </div>
        </article>
      `;
      }).join("");
      $$("img", grid).forEach((img) => {
        img.addEventListener("error", () => {
          img.src = fallbackProductImage;
        }, { once: true });
      });
      grid.classList.remove("is-loading");

      // riattiva reveal per le nuove card
      $$(".product-card.reveal", grid).forEach((el) => {
        if ("IntersectionObserver" in window) {
          const io2 = new IntersectionObserver(
            (entries) => entries.forEach((e) => {
              if (e.isIntersecting) { e.target.classList.add("in"); io2.unobserve(e.target); }
            }),
            { threshold: 0.12 }
          );
          io2.observe(el);
        } else {
          el.classList.add("in");
        }
      });
    };
    render();

    grid.addEventListener("pointerdown", (e) => {
      const btn = e.target.closest(".product-card .btn--dark");
      if (!btn) return;
      btn.classList.remove("is-tapping");
      void btn.offsetWidth;
      btn.classList.add("is-tapping");
      setTimeout(() => btn.classList.remove("is-tapping"), 420);
    });

    // Aggiorna la vetrina quando l'utente torna sulla pagina dopo modifiche dal gestionale.
    window.addEventListener("focus", render);
    window.addEventListener("pageshow", (e) => {
      if (e.persisted) render();
    });
  }

  /* ---------- Form di prenotazione ---------- */
  const form = $("#bookingForm");
  if (form) {
    const success = $("#bookingSuccess");
    const showError = (input, show) => {
      input.classList.toggle("invalid", show);
      input.closest(".field")?.classList.toggle("invalid", show);
      input.setAttribute("aria-invalid", String(show));
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      let ok = true;
      const required = ["#bf-name", "#bf-phone", "#bf-email"];
      const submit = form.querySelector('button[type="submit"]');
      const originalText = submit?.textContent || "";

      required.forEach((sel) => {
        const input = $(sel, form);
        const valid = input.value.trim().length > 0;
        showError(input, !valid);
        if (!valid) ok = false;
      });

      const email = $("#bf-email", form);
      if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        showError(email, true);
        ok = false;
      }

      if (!ok) {
        const firstInvalid = $(".field.invalid input, .field.invalid select, .field.invalid textarea", form);
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const payload = {
        name: $("#bf-name", form).value.trim(),
        phone: $("#bf-phone", form).value.trim(),
        email: $("#bf-email", form).value.trim(),
        day: $("#bf-day", form).value.trim(),
        slot: $("#bf-slot", form).value.trim(),
        message: $("#bf-msg", form).value.trim()
      };

      try {
        if (submit) {
          submit.disabled = true;
          submit.textContent = "Invio in corso...";
        }
        const response = await fetch(apiUrl("/api/contact"), {
          method: "POST",
          credentials: apiBase() ? "omit" : "same-origin",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Invio non riuscito. Riprova tra poco.");
        success.textContent = "✓ Richiesta inviata. Ti ricontatto entro 24 ore con disponibilità e dettagli.";
        success.classList.remove("err");
        success.classList.add("show");
        form.reset();
        success.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => success.classList.remove("show"), 6000);
      } catch (error) {
        success.textContent = error.message || "Invio non riuscito. Riprova tra poco.";
        success.classList.add("err", "show");
        success.scrollIntoView({ behavior: "smooth", block: "center" });
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.textContent = originalText;
        }
      }
    });

    // pulisci errore mentre l'utente corregge
    $$("input, textarea, select", form).forEach((el) =>
      el.addEventListener("input", () => {
        el.classList.remove("invalid");
        el.closest(".field")?.classList.remove("invalid");
        el.removeAttribute("aria-invalid");
      })
    );
  }

  /* ---------- Privacy, Cookie policy e consenso cookie ---------- */
  const overlay = $("#policyOverlay");
  const modal = $("#policyModal");
  const title = $("#policyTitle");
  const body = $("#policyBody");

  const CONSENT_COOKIE = "comeleapi_cookie_consent";
  const CONSENT_VERSION = "2026-07-02";
  const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;
  const scrollLock = { active: false, y: 0 };

  function hasBlockingPopup() {
    return modal?.classList.contains("show") || $("#cookieBanner")?.classList.contains("show");
  }

  function syncScrollLock() {
    const shouldLock = hasBlockingPopup();
    if (shouldLock && !scrollLock.active) {
      scrollLock.y = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      document.documentElement.classList.add("is-scroll-locked");
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollLock.y}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      scrollLock.active = true;
      return;
    }
    if (!shouldLock && scrollLock.active) {
      document.documentElement.classList.remove("is-scroll-locked");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollLock.y);
      scrollLock.active = false;
    }
  }

  function defaultConsent() {
    return {
      version: CONSENT_VERSION,
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    };
  }

  function readCookie(name) {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`));
    if (!match) return "";
    return decodeURIComponent(match.split("=").slice(1).join("="));
  }

  function writeCookie(name, value, maxAge) {
    document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  }

  function normalizeConsent(raw) {
    if (!raw || typeof raw !== "object") return null;
    return {
      version: String(raw.version || ""),
      necessary: true,
      analytics: raw.analytics === true,
      marketing: raw.marketing === true,
      timestamp: raw.timestamp || ""
    };
  }

  function storedConsent() {
    try {
      const fromCookie = readCookie(CONSENT_COOKIE);
      const parsed = fromCookie ? JSON.parse(fromCookie) : null;
      const normalized = normalizeConsent(parsed);
      if (normalized) return normalized;
    } catch (e) {
      console.warn("[cookie] preferenze cookie non leggibili da cookie.", e);
    }
    try {
      const fallback = window.localStorage?.getItem(CONSENT_COOKIE);
      return normalizeConsent(fallback ? JSON.parse(fallback) : null);
    } catch (e) {
      console.warn("[cookie] preferenze cookie non leggibili da localStorage.", e);
      return null;
    }
  }

  function isConsentFresh(consent) {
    if (!consent || consent.version !== CONSENT_VERSION || !consent.timestamp) return false;
    const savedAt = Date.parse(consent.timestamp);
    if (Number.isNaN(savedAt)) return false;
    return Date.now() - savedAt < CONSENT_MAX_AGE * 1000;
  }

  function saveConsent(partial) {
    const consent = {
      ...defaultConsent(),
      ...partial,
      necessary: true,
      timestamp: new Date().toISOString()
    };
    const value = JSON.stringify(consent);
    try {
      writeCookie(CONSENT_COOKIE, value, CONSENT_MAX_AGE);
    } catch (e) {
      console.warn("[cookie] impossibile scrivere il cookie tecnico.", e);
    }
    try {
      window.localStorage?.setItem(CONSENT_COOKIE, value);
    } catch (e) {
      console.warn("[cookie] impossibile salvare fallback localStorage.", e);
    }
    applyConsent(consent);
    hideCookieBanner();
    return consent;
  }

  function applyConsent(consent) {
    document.documentElement.dataset.analyticsConsent = consent.analytics ? "granted" : "denied";
    document.documentElement.dataset.marketingConsent = consent.marketing ? "granted" : "denied";

    $$('script[type="text/plain"][data-cookie-category]').forEach((placeholder) => {
      const category = placeholder.dataset.cookieCategory;
      if (!consent[category] || placeholder.dataset.loaded === "true") return;
      const script = document.createElement("script");
      Array.from(placeholder.attributes).forEach((attr) => {
        if (attr.name === "type" || attr.name === "data-cookie-category" || attr.name === "data-loaded") return;
        script.setAttribute(attr.name, attr.value);
      });
      script.text = placeholder.textContent || "";
      placeholder.dataset.loaded = "true";
      placeholder.after(script);
    });

    document.dispatchEvent(new CustomEvent("comeleapi:cookie-consent", { detail: consent }));
  }

  function consentStatusHtml() {
    const consent = storedConsent();
    if (!isConsentFresh(consent)) {
      return "<p><strong>Stato attuale:</strong> nessuna scelta salvata o scelta scaduta. Sono attive solo le impostazioni tecniche necessarie.</p>";
    }
    const saved = new Date(consent.timestamp).toLocaleDateString("it-IT");
    return `
      <p><strong>Stato attuale:</strong> preferenze salvate il ${saved}.</p>
      <ul class="policy-list">
        <li>Cookie tecnici necessari: sempre attivi.</li>
        <li>Cookie analytics/statistici: ${consent.analytics ? "accettati" : "rifiutati"}.</li>
        <li>Cookie marketing/profilazione: ${consent.marketing ? "accettati" : "rifiutati"}.</li>
      </ul>`;
  }

  function privacyHtml() {
    return `
      <div class="policy-content">
        <p><strong>Ultimo aggiornamento:</strong> 2 luglio 2026.</p>
        <p>La presente informativa è resa ai sensi degli articoli 12, 13 e 14 del Regolamento (UE) 2016/679 ("GDPR") e descrive come Come le Api tratta i dati personali raccolti tramite questo sito e tramite i canali di contatto collegati.</p>

        <h4>Titolare del trattamento</h4>
        <p><strong>Come le Api - Sara</strong>, progetto di benessere con riferimento territoriale a 20091 Bresso (Milano). Per richieste privacy: <a href="mailto:info@comeleapi.it">info@comeleapi.it</a>.</p>

        <h4>Dati trattati</h4>
        <ul class="policy-list">
          <li><strong>Dati di navigazione:</strong> informazioni tecniche trasmesse dal browser, come indirizzo IP, user agent, data/ora della richiesta e URL richiesto, trattate dai fornitori tecnici per erogare e proteggere il sito.</li>
          <li><strong>Dati inviati volontariamente:</strong> nome, recapiti, contenuto dei messaggi, preferenze sul trattamento o richieste inviate via email, WhatsApp o eventuali moduli.</li>
          <li><strong>Preferenze cookie:</strong> scelta di accettazione o rifiuto delle categorie non necessarie, conservata tramite cookie tecnico.</li>
        </ul>

        <h4>Finalità e basi giuridiche</h4>
        <table class="policy-table">
          <thead><tr><th>Finalità</th><th>Base giuridica</th><th>Conservazione</th></tr></thead>
          <tbody>
            <tr><td>Funzionamento, sicurezza e manutenzione del sito.</td><td>Legittimo interesse del titolare e necessità tecnica del servizio, art. 6 par. 1 lett. f GDPR.</td><td>Log tecnici per il tempo necessario alla sicurezza e comunque secondo i tempi dei fornitori tecnici.</td></tr>
            <tr><td>Rispondere a richieste su trattamenti, oli essenziali e disponibilità.</td><td>Esecuzione di misure precontrattuali o contratto, art. 6 par. 1 lett. b GDPR.</td><td>Per il tempo necessario alla risposta e, salvo obblighi ulteriori, non oltre 24 mesi dall'ultimo contatto utile.</td></tr>
            <tr><td>Gestione delle preferenze cookie.</td><td>Obbligo di documentare la scelta e consenso per eventuali categorie non tecniche, art. 6 par. 1 lett. a GDPR ed ePrivacy.</td><td>180 giorni, salvo modifica anticipata delle preferenze.</td></tr>
          </tbody>
        </table>

        <h4>Destinatari e fornitori</h4>
        <p>I dati possono essere trattati da fornitori tecnici strettamente necessari alla gestione del sito, hosting, sicurezza, manutenzione, email o strumenti di messaggistica. I link verso WhatsApp, Instagram, Facebook e WebNovis aprono servizi esterni: dopo il click, i relativi gestori trattano i dati secondo le proprie informative.</p>

        <h4>Trasferimenti extra SEE</h4>
        <p>Il sito è stato configurato per caricare font e immagini principali da asset locali, evitando richieste a Google Fonts o servizi immagine esterni durante la navigazione ordinaria. L'uso volontario di servizi esterni, come WhatsApp o social network, può comportare trattamenti o trasferimenti secondo le condizioni dei rispettivi fornitori.</p>

        <h4>Diritti dell'interessato</h4>
        <p>Puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità, opposizione e revoca del consenso quando applicabile, scrivendo a <a href="mailto:info@comeleapi.it">info@comeleapi.it</a>. Hai inoltre diritto di proporre reclamo al <a href="https://www.garanteprivacy.it/" target="_blank" rel="noopener">Garante per la protezione dei dati personali</a>.</p>

        <h4>Riferimenti normativi</h4>
        <ul class="policy-list">
          <li><a href="https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng" target="_blank" rel="noopener">Regolamento (UE) 2016/679 - GDPR</a>.</li>
          <li><a href="https://eur-lex.europa.eu/eli/dir/2002/58/oj/eng" target="_blank" rel="noopener">Direttiva 2002/58/CE ePrivacy</a>.</li>
          <li><a href="https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876" target="_blank" rel="noopener">Linee guida cookie e altri strumenti di tracciamento del Garante, 10 giugno 2021</a>.</li>
        </ul>
      </div>`;
  }

  function cookieHtml() {
    return `
      <div class="policy-content">
        <p><strong>Ultimo aggiornamento:</strong> 2 luglio 2026.</p>
        <p>Questa Cookie Policy descrive l'uso di cookie e strumenti analoghi sul sito Come le Api. Per impostazione predefinita sono attivi solo strumenti tecnici necessari. Eventuali strumenti analytics o marketing vengono attivati solo dopo consenso espresso.</p>

        <h4>Cosa sono i cookie</h4>
        <p>I cookie sono piccoli file o informazioni salvate nel dispositivo dell'utente. La normativa europea e le indicazioni del Garante distinguono i cookie tecnici, necessari o assimilabili, dai cookie usati per finalità ulteriori, come analytics non tecnici o profilazione, che richiedono consenso preventivo e informato.</p>

        <h4>Cookie usati da questo sito</h4>
        <table class="policy-table">
          <thead><tr><th>Nome</th><th>Tipo</th><th>Finalità</th><th>Durata</th></tr></thead>
          <tbody>
            <tr><td><code>comeleapi_cookie_consent</code></td><td>Tecnico, prima parte</td><td>Memorizza la scelta dell'utente su accettazione o rifiuto delle categorie non necessarie. Non traccia la navigazione.</td><td>180 giorni</td></tr>
          </tbody>
        </table>

        <h4>Categorie di consenso</h4>
        <ul class="policy-list">
          <li><strong>Necessari:</strong> sempre attivi, servono al funzionamento del sito e alla conservazione della preferenza privacy.</li>
          <li><strong>Statistiche:</strong> al momento non sono installati strumenti analytics. La categoria è predisposta per eventuali statistiche future, da caricare solo dopo consenso.</li>
          <li><strong>Marketing:</strong> al momento non sono installati pixel o cookie di profilazione. La categoria è predisposta per eventuali strumenti futuri, da caricare solo dopo consenso.</li>
        </ul>

        <h4>Come funziona il consenso</h4>
        <p>Il rifiuto non limita l'accesso al sito. Il pulsante "Rifiuta" e la chiusura del banner mantengono attivi solo i cookie tecnici. Lo scrolling o la semplice prosecuzione della navigazione non sono considerati consenso. Puoi modificare la scelta in qualsiasi momento da questa sezione.</p>
        ${consentStatusHtml()}
        <p><button class="btn btn--primary btn--sm" type="button" id="manageCookiePrefs">Gestisci preferenze cookie</button></p>

        <h4>Riferimenti ufficiali</h4>
        <ul class="policy-list">
          <li><a href="https://www.garanteprivacy.it/faq/cookie" target="_blank" rel="noopener">FAQ Cookie del Garante Privacy</a>.</li>
          <li><a href="https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876" target="_blank" rel="noopener">Linee guida cookie e altri strumenti di tracciamento del Garante</a>.</li>
          <li><a href="https://www.edpb.europa.eu/our-work-tools/our-documents/topic/consent_en" target="_blank" rel="noopener">Linee guida EDPB sul consenso</a>.</li>
        </ul>
      </div>`;
  }

  function openModal(kind) {
    title.textContent = kind === "cookie" ? "Cookie Policy" : "Privacy Policy";
    body.innerHTML = kind === "cookie" ? cookieHtml() : privacyHtml();
    overlay.classList.add("show");
    modal.classList.add("show");
    syncScrollLock();
    $("#manageCookiePrefs")?.addEventListener("click", () => {
      closePolicy();
      showCookieBanner(true);
    });
  }

  function closePolicy() {
    overlay.classList.remove("show");
    modal.classList.remove("show");
    syncScrollLock();
  }

  $("#openPrivacy")?.addEventListener("click", (e) => { e.preventDefault(); openModal("privacy"); });
  $("#openCookie")?.addEventListener("click", (e) => { e.preventDefault(); openModal("cookie"); });
  $("#closePolicy")?.addEventListener("click", closePolicy);
  overlay?.addEventListener("click", closePolicy);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("show")) closePolicy();
  });

  function cookieBannerTemplate() {
    const consent = storedConsent() || defaultConsent();
    return `
      <section class="cookie-banner" id="cookieBanner" role="dialog" aria-labelledby="cookieBannerTitle" aria-live="polite">
        <button class="cookie-banner__close" type="button" data-cookie-action="reject" aria-label="Chiudi e rifiuta i cookie non necessari">×</button>
        <div class="cookie-banner__copy">
          <span class="contact-kicker">Privacy e cookie</span>
          <h3 id="cookieBannerTitle">Scegli quali cookie autorizzare</h3>
          <p>Usiamo solo cookie tecnici necessari e un cookie tecnico per ricordare questa scelta. Eventuali strumenti statistici o marketing saranno attivati solo con il tuo consenso.</p>
        </div>
        <div class="cookie-banner__prefs" id="cookiePrefsPanel" hidden>
          <label class="cookie-choice cookie-choice--locked">
            <input type="checkbox" checked disabled />
            <span><strong>Necessari</strong><small>Sempre attivi per funzionamento e sicurezza.</small></span>
          </label>
          <label class="cookie-choice">
            <input type="checkbox" id="cookieAnalytics" ${consent.analytics ? "checked" : ""} />
            <span><strong>Statistiche</strong><small>Attualmente non attivi; predisposti solo previo consenso.</small></span>
          </label>
          <label class="cookie-choice">
            <input type="checkbox" id="cookieMarketing" ${consent.marketing ? "checked" : ""} />
            <span><strong>Marketing</strong><small>Attualmente non attivi; mai caricati senza consenso.</small></span>
          </label>
        </div>
        <div class="cookie-banner__actions">
          <button class="btn btn--ghost btn--sm" type="button" data-cookie-action="settings">Personalizza</button>
          <button class="btn btn--ghost btn--sm" type="button" data-cookie-action="reject">Rifiuta</button>
          <button class="btn btn--primary btn--sm" type="button" data-cookie-action="accept">Accetta tutto</button>
          <button class="btn btn--primary btn--sm cookie-save" type="button" data-cookie-action="save" hidden>Salva preferenze</button>
        </div>
        <p class="cookie-banner__links"><a href="#" data-cookie-action="policy">Leggi la Cookie Policy</a></p>
      </section>`;
  }

  function ensureCookieBanner() {
    let banner = $("#cookieBanner");
    if (!banner) {
      document.body.insertAdjacentHTML("beforeend", cookieBannerTemplate());
      banner = $("#cookieBanner");
      bindCookieBanner(banner);
    }
    return banner;
  }

  function setPrefsVisible(show) {
    const banner = ensureCookieBanner();
    $("#cookiePrefsPanel", banner).hidden = !show;
    $(".cookie-save", banner).hidden = !show;
    banner.classList.toggle("is-expanded", show);
  }

  function showCookieBanner(expand = false) {
    const banner = ensureCookieBanner();
    banner.classList.add("show");
    banner.removeAttribute("aria-hidden");
    setPrefsVisible(expand);
    syncScrollLock();
  }

  function hideCookieBanner() {
    const banner = $("#cookieBanner");
    if (!banner) return;
    banner.classList.remove("show");
    banner.setAttribute("aria-hidden", "true");
    syncScrollLock();
  }

  function bindCookieBanner(banner) {
    banner.addEventListener("click", (e) => {
      const action = e.target.closest("[data-cookie-action]")?.dataset.cookieAction;
      if (!action) return;
      e.preventDefault();
      if (action === "settings") {
        setPrefsVisible(true);
        return;
      }
      if (action === "policy") {
        openModal("cookie");
        return;
      }
      if (action === "accept") {
        saveConsent({ analytics: true, marketing: true });
        return;
      }
      if (action === "reject") {
        saveConsent({ analytics: false, marketing: false });
        return;
      }
      if (action === "save") {
        saveConsent({
          analytics: $("#cookieAnalytics", banner)?.checked === true,
          marketing: $("#cookieMarketing", banner)?.checked === true
        });
      }
    });
  }

  const initialConsent = storedConsent();
  if (isConsentFresh(initialConsent)) {
    applyConsent(initialConsent);
  } else {
    showCookieBanner(false);
  }

  window.ComeLeApiConsent = {
    get: () => storedConsent(),
    openPreferences: () => showCookieBanner(true),
    reject: () => saveConsent({ analytics: false, marketing: false }),
    acceptAll: () => saveConsent({ analytics: true, marketing: true })
  };
})();
