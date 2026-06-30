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
    const fallbackProductImage = "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=600&q=70";
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

  /* ---------- Modali Privacy / Cookie ---------- */
  const overlay = $("#policyOverlay");
  const modal = $("#policyModal");
  const title = $("#policyTitle");
  const body = $("#policyBody");

  const PRIVACY = `
    <p>La presente informativa descrive come Come le Api tratta i dati personali raccolti tramite i canali di contatto e richiesta informazioni.</p>
    <p><strong>Titolare del trattamento.</strong> Sara [cognome], referente di Come le Api, nella sua qualità di titolare autonomo.</p>
    <p><strong>Dati raccolti.</strong> Nome, email, telefono, eventuali preferenze e messaggio.</p>
    <p><strong>Finalità.</strong> Ricontattarti per rispondere alla tua richiesta, verificare disponibilità e fornire dettagli sui trattamenti.</p>
    <p><strong>Base giuridica.</strong> Consenso (art. 6 lett. a GDPR).</p>
    <p><strong>Conservazione.</strong> I dati sono conservati per il tempo strettamente necessario alla finalità e comunque non oltre 24 mesi.</p>
    <p><strong>Tuoi diritti.</strong> Accesso, rettifica, cancellazione, limitazione, portabilità, opposizione e revoca del consenso scrivendo a <a href="mailto:privacy@comeleapi.it" style="color:var(--terra-deep);">privacy@comeleapi.it</a>.</p>`;

  const COOKIE = `
    <p>Questo sito utilizza solo cookie tecnici necessari al funzionamento (es. salvataggio delle preferenze del gestionale sul browser).</p>
    <p>Non sono presenti cookie di profilazione né di terze parti a fini pubblicitari.</p>
    <p>Le immagini degli oli essenziali e dei contenuti possono essere caricate da fonti esterne (es. Unsplash) che potrebbero impostare cookie tecnici propri.</p>
    <p>Puoi gestire o disabilitare i cookie dalle impostazioni del tuo browser.</p>`;

  function openModal(kind) {
    title.textContent = kind === "cookie" ? "Cookie Policy" : "Privacy Policy";
    body.innerHTML = kind === "cookie" ? COOKIE : PRIVACY;
    overlay.classList.add("show");
    modal.classList.add("show");
  }
  function closePolicy() {
    overlay.classList.remove("show");
    modal.classList.remove("show");
  }

  $("#openPrivacy")?.addEventListener("click", (e) => { e.preventDefault(); openModal("privacy"); });
  $("#openCookie")?.addEventListener("click", (e) => { e.preventDefault(); openModal("cookie"); });
  $("#closePolicy")?.addEventListener("click", closePolicy);
  overlay?.addEventListener("click", closePolicy);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("show")) closePolicy();
  });
})();
