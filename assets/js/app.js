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

  /* ---------- Lingua pubblica ---------- */
  const ITALIAN_TIMEZONES = new Set(["Europe/Rome", "Europe/San_Marino", "Europe/Vatican"]);

  function resolveLocale() {
    const params = new URLSearchParams(window.location.search);
    const forced = (params.get("lang") || "").trim().toLowerCase();
    if (forced === "it" || forced === "en") return forced;

    const languages = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language || ""];
    const primaryLanguage = String(languages[0] || "").toLowerCase();
    const browserLooksItalian = primaryLanguage.startsWith("it");
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const timezoneLooksItalian = !timeZone || ITALIAN_TIMEZONES.has(timeZone);

    return browserLooksItalian && timezoneLooksItalian ? "it" : "en";
  }

  const currentLocale = resolveLocale();
  const isEnglish = currentLocale === "en";
  const instagramUrl = "https://www.instagram.com/comeleapi/";
  const productDisplayOverrides = {
    "p-collezione-essenziale": {
      name: "Collezione Essenziale",
      icon: "assets/img/icons/products/collezione-essenziale.png"
    },
    "p-baby-essentials": {
      icon: "assets/img/icons/products/baby-essentials.png"
    },
    "p-sweet-home": {
      icon: "assets/img/icons/products/sweet-home.png"
    },
    "p-dolce-notte": {
      icon: "assets/img/icons/products/dolce-notte.png"
    },
    "p-gym-rat": {
      name: "Sport & Wellness",
      icon: "assets/img/icons/products/sport-wellness.png"
    },
    "p-per-lui": {
      icon: "assets/img/icons/products/per-lui.png"
    },
    "p-per-lei": {
      icon: "assets/img/icons/products/per-lei.png"
    },
    "p-animal-scents": {
      icon: "assets/img/icons/products/animal-scents.png"
    },
    "p-balance-skin": {
      icon: "assets/img/icons/products/balance-skin.png"
    },
    "p-bloom-skin": {
      icon: "assets/img/icons/products/bloom-skin.png"
    },
    "p-shine-bright-like-a-diamond": {
      icon: "assets/img/icons/products/shine-bright.png"
    },
    "p-bye-bye-menopausa": {
      icon: "assets/img/icons/products/bye-bye-menopausa.png"
    }
  };

  function setText(selector, text, ctx = document) {
    const el = $(selector, ctx);
    if (el) el.textContent = text;
  }

  function setAllText(selector, text, ctx = document) {
    $$(selector, ctx).forEach((el) => { el.textContent = text; });
  }

  function setHtml(selector, html, ctx = document) {
    const el = $(selector, ctx);
    if (el) el.innerHTML = html;
  }

  function setAttr(selector, attr, value, ctx = document) {
    const el = $(selector, ctx);
    if (el) el.setAttribute(attr, value);
  }

  function setAllAttr(selector, attr, value, ctx = document) {
    $$(selector, ctx).forEach((el) => el.setAttribute(attr, value));
  }

  function setButtonText(selector, text) {
    const button = $(selector);
    if (!button) return;
    const icon = $("img", button);
    button.textContent = text;
    if (icon) {
      button.appendChild(document.createTextNode(" "));
      button.appendChild(icon);
    }
  }

  function whatsAppUrl(message) {
    return `https://wa.me/390000000000?text=${encodeURIComponent(message)}`;
  }

  function applyEnglishLocale() {
    document.documentElement.lang = "en";
    document.title = "Come le Api - Wellbeing, Massage & Personal Care";
    setAttr('meta[name="description"]', "content", "Come le Api is Sara's wellbeing and massage project: at-home treatments, tailored wellness paths and essential oils for daily balance.");
    setAttr('meta[property="og:title"]', "content", "Come le Api - Wellbeing & Massage");
    setAttr('meta[property="og:description"]', "content", "A wellbeing project curated by Sara: essential oils, tailored treatments and direct contact in 20091 Bresso, Milan.");

    setAllAttr(".brand", "aria-label", "Come le Api - home");
    setAttr("#mainNav", "aria-label", "Main navigation");
    setAttr("#navToggle", "aria-label", "Open menu");
    setAttr("#closePolicy", "aria-label", "Close");
    setText('.nav a[href="#prodotti"]', "Essential oils");
    setText('.nav a[href="#servizi"]', "Treatments");
    setText('.nav a[href="#chi-sono"]', "The Founder");
    setButtonText(".nav-cta", "Message me on WhatsApp");
    setAttr(".nav-cta", "href", whatsAppUrl("Hi Sara, I would like information about the treatments."));

    setAttr(".hero-frame img", "alt", "Professional shoulder and neck relaxation treatment");
    const heroTitle = $(".hero-title");
    if (heroTitle) {
      heroTitle.textContent = "Buzz back to you";
    }

    setText("#prodotti .eyebrow", "ESSENTIAL OILS");
    setText("#prodotti .section-title", "Pure essences, authentic wellbeing");
    setHtml("#prodotti .section-lead", "<span>Body care begins with listening, then asks for presence and consistency.</span><span>Essential oils are made to be simple to use.</span><span>They support you every day toward balance, energy and vitality.</span>");
    setHtml(".aroma-feature h3", "<em>The Essential</em>");
    setText(".aroma-feature p", "A concise guide to the fundamentals, created to help you begin exploring essential oils.");
    setHtml(".aroma-feature .btn", "Discover<em>The Essential</em>");
    const aromaCards = $$(".aroma-cards-grid .aroma-card");
    if (aromaCards[0]) {
      setText("h3", "Essential Collection", aromaCards[0]);
      setText("p", "A starter kit with the 12 fundamental essential oils, selected for you and suited to cover all everyday needs.", aromaCards[0]);
      setText(".btn", "Request info on WhatsApp", aromaCards[0]);
    }
    if (aromaCards[1]) {
      setText("h3", "Signature Blend", aromaCards[1]);
      setText("p", "Personalised aromatic consultation: together we will choose the essential oils best suited to your needs for a tailored wellness path.", aromaCards[1]);
      setText(".btn", "Message me on WhatsApp", aromaCards[1]);
    }
    setText(".products-showcase__head h3", "Recommended collections");
    setText(".products-showcase__head p", "Young Living bundles and aromatic paths selected to support home, body and everyday rituals with simplicity.");

    setText("#servizi .eyebrow", "Treatments");
    setText("#servizi .section-title", "A need, not a luxury");
    setHtml("#servizi .section-lead", "<span>Hands have always spoken: they hold, soothe, pray, love.</span><span>Massage is born from this ancient language.</span><span>A contact that listens to the body and guides it back toward balance.</span>");
    const serviceNames = [
      "Sports massage",
      "Decontracting massage",
      "Relaxing massage",
      "Lymphatic drainage massage",
      "Focused 30-minute treatment",
      "Kinesio taping",
      "Therapeutic massage with essential oils"
    ];
    $$("#servizi .service-card h3").forEach((el, index) => {
      if (serviceNames[index]) el.textContent = serviceNames[index];
    });

    setText(".slogan-kicker", "My mission");
    setText("#slogan-title", "Every drop is an act of care for you");
    setHtml(".slogan-wrap p", "<span>Like bees, which gather only the best from every flower, I select pure essential oils and natural treatments that bring the body back to its original balance.</span><span>One scent, one pressure, one breath at a time. Follow the official profile <strong>@comeleapi</strong>.</span>");
    setButtonText(".slogan-actions .btn--instagram", "Follow @comeleapi on Instagram");
    setAttr(".slogan-actions .btn--instagram", "href", instagramUrl);

    setText(".about-text .eyebrow", "THE FOUNDER");
    setText(".about-text .section-title", "Sara Bordenga");
    setHtml(".about-quote", "<span>\"The body is a perfect machine.</span><span>If you listen to it and nourish it with balance, it gives you wellbeing.</span><span>Self-love is the highest expression of health.\"</span>");
    setHtml(".about-story--intro", "<span>Sara has been a professional athlete from an early age.</span><span>Sport taught her a simple truth: the body never lies.</span>");
    setHtml(".about-story--tools", "<span>Listening to it, respecting it, nourishing it consistently: it is the only real secret to feeling well.</span><span>Massage and essential oils are natural and pure tools, capable of bringing the body back to its balance.</span>");
    setHtml(".about-story--goal", "<span>Her goal is to help you restore energy and vitality.</span><span>Because feeling well is not a luxury, but a daily ritual.</span><span>Your body is already speaking to you. Listen to it, do not wait!</span>");
    const miniCards = ["Professional Diploma", "Aromatherapy", "Hygiene and safety"];
    $$(".about-mini-card p").forEach((el, index) => {
      if (miniCards[index]) el.innerHTML = `<b>${miniCards[index]}</b>`;
    });
    setHtml(".community-cta__copy", "<strong>Community</strong><small>Support and conversation in the WhatsApp group</small>");
    setAttr(".community-cta", "href", whatsAppUrl("Hi Sara, I would like to join the Come le Api Community."));

    setHtml(".about-photo .tag", '<img class="tag-icon" src="assets/img/icons/icon-seal.png" width="18" height="18" alt="" loading="lazy" decoding="async" /> Massage & holistic wellbeing');
    setText(".booking .eyebrow", "Direct contact");
    setText(".booking .section-title", "Let's talk about the treatment best suited to you.");
    setText(".booking .section-lead", "Message me on WhatsApp to tell me what you are looking for, check availability and receive costs and details clearly and confidentially.");
    setText(".benefits-box h3", "At-home treatments");
    const benefits = [
      "Treatments are available at home in the Bresso and Cusano Milanino areas.",
      "For Milan, availability is assessed based on the area and the needs of the treatment.",
      "An operating space with a dedicated treatment room is being defined, designed to offer an even more welcoming, private and professional environment."
    ];
    $$(".benefits-box li span:last-child").forEach((el, index) => {
      if (benefits[index]) el.textContent = benefits[index];
    });
    setText(".booking .contact-kicker", "Availability and costs");
    setText(".booking .contact-card h3", "One simple message, then we evaluate it together.");
    setText(".booking .contact-card > p", "For information, availability and treatment details, WhatsApp is the quickest channel. I reply discreetly and help you understand which option may suit you best.");
    setButtonText(".booking .contact-actions .btn--primary", "Request costs and details");
    setAttr(".booking .contact-actions .btn--primary", "href", whatsAppUrl("Hi Sara, I would like to receive costs and details for a treatment."));
    setText(".booking .contact-actions .btn--ghost", "Call Sara");
    setHtml(".booking .form-note", 'Messages remain confidential and are used only to reply to your request. Read the <a href="#footer">privacy policy</a>.');

    const footerCols = $$(".footer-col");
    if (footerCols[0]) setText("h5", "Navigation", footerCols[0]);
    if (footerCols[1]) setText("h5", "Contact", footerCols[1]);
    if (footerCols[2]) setText("h5", "Legal", footerCols[2]);
    setText('.footer-col a[href="#prodotti"]', "Essential oils");
    setText('.footer-col a[href="#servizi"]', "Treatments");
    setText('.footer-col a[href="#chi-sono"]', "The founder");
    setText("#openCookie", "Cookie policy");
    setText("#openPrivacy", "Privacy policy");
    setHtml(".footer-bottom > span", '© <span id="year"></span> comeleapi. All rights reserved.');
    setText(".btn-webnovis", "Crafted with care by WebNovis");
    setAllAttr('.social-link--instagram', "href", instagramUrl);
    setAllAttr('.social-link--instagram', "aria-label", "Come le Api on Instagram");
  }

  if (isEnglish) applyEnglishLocale();

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

  /* ---------- Rendering vetrina oli essenziali ---------- */
  const grid = $("#productsGrid");
  if (grid && window.SaraData) {
    const fallbackProductImage = "assets/img/hero/hero-massage-sara.jpg";
    const productTranslations = {
      "p-collezione-essenziale": {
        name: "Essential collection",
        shortDesc: "Introductory kit with essential oils and a diffuser for simple, versatile daily rituals.",
        benefits: "Combines aromatic diffusion and versatile oils to support home atmosphere, energy, breathing rituals and calm moments with a structured approach."
      },
      "p-baby-essentials": {
        name: "Baby Essentials",
        shortDesc: "Gentle starter kit with the Feather the Owl diffuser and KidScents oils for small family rituals.",
        benefits: "Created for little ones' routines: bedtime atmosphere, comfort and soft aromas, always with mindful, age-appropriate use."
      },
      "p-sweet-home": {
        name: "Sweet Home",
        shortDesc: "A selection to make home feel fresher, warmer and more harmonious through clean natural notes.",
        benefits: "Combines bright and soft aromas to scent living spaces and turn the home into a calmer, more familiar place."
      },
      "p-dolce-notte": {
        name: "Sweet Night",
        shortDesc: "Blends and oils for the evening ritual, created to prepare a softer, more relaxed atmosphere.",
        benefits: "Warm, restful notes to slow down, breathe and close the day with a simple act of care."
      },
      "p-gym-rat": {
        name: "Sport & Wellness",
        shortDesc: "Aromatic set for movement, training and recovery routines with fresh energy.",
        benefits: "Fresh, tonic notes to include before or after activity, supporting focus, breath and a lighter body-care ritual."
      },
      "p-per-lui": {
        name: "For Him",
        shortDesc: "Clean, woody and decisive selection for a natural masculine routine.",
        benefits: "Combines fresh and deeper notes for personal care, home atmosphere and daily reset moments without feeling overpowering."
      },
      "p-per-lei": {
        name: "For Her",
        shortDesc: "Soft, luminous feminine aromatic path for balance and daily care.",
        benefits: "Floral and harmonious notes for skin, breath and presence rituals, with an elegant natural profile."
      },
      "p-animal-scents": {
        name: "Animal scents",
        shortDesc: "Line dedicated to aromatic care for animals, with specific products and a gentle approach.",
        benefits: "Helps build a more mindful home routine with dedicated products chosen for this context, not improvised blends."
      },
      "p-balance-skin": {
        name: "BALANCE skin",
        shortDesc: "Essential skincare routine for skin seeking balance, freshness and simplicity.",
        benefits: "Combines focused steps for cleansing, hydration and skin comfort with a light, clean and orderly feel."
      },
      "p-bloom-skin": {
        name: "BLOOM skin",
        shortDesc: "Luminous skincare treatment for skin that looks more vital and even.",
        benefits: "Designed for a more refined face ritual: textures, aroma and cosmetic actives work together for a brighter-looking complexion."
      },
      "p-shine-bright-like-a-diamond": {
        name: "Shine Bright like a Diamond",
        shortDesc: "Beauty and wellness selection for a luminous, energetic and polished routine.",
        benefits: "Brings together products chosen for glow, freshness and presence: ideal when you want to feel bright, vital and put together."
      },
      "p-bye-bye-menopausa": {
        name: "Bye Bye Menopause",
        shortDesc: "Natural path designed to accompany women through phases of change.",
        benefits: "A daily wellbeing routine with oils and products chosen for balance, presence and listening to the body."
      }
    };
    const displayProduct = (product) => {
      const override = productDisplayOverrides[product.id] || {};
      const base = {
        ...product,
        ...(override.name ? { name: override.name } : {})
      };
      if (!isEnglish) return base;
      const translation = productTranslations[product.id];
      return {
        ...base,
        ...(translation || {}),
        price: base.price === "Prezzo sul link" ? "Price on link" : base.price
      };
    };
    const productIcon = (product) => (
      productDisplayOverrides[product.id]?.icon || "assets/img/icons/icon-drop.png"
    );
    const render = async () => {
      grid.classList.add("is-loading");
      const products = await window.SaraData.getVisibleProducts();
      if (!products.length) {
        grid.innerHTML = `
          <p style="grid-column:1/-1;text-align:center;color:var(--ink-soft);padding:2rem;">
            ${isEnglish ? "There are no featured products at the moment. Please come back soon." : "Al momento non ci sono prodotti in vetrina. Torna a trovarci presto."}
          </p>`;
        grid.classList.remove("is-loading");
        return;
      }
      grid.innerHTML = products.map((product, i) => {
        const p = displayProduct(product);
        const unavailable = p.visible === false;
        const image = p.image || fallbackProductImage;
        const icon = productIcon(p);
        const price = String(p.price || "").trim();
        return `
        <article class="product-card ${unavailable ? "product-card--unavailable" : ""} reveal" data-delay="${(i % 3)}" aria-disabled="${unavailable ? "true" : "false"}">
          <div class="product-img">
            <img class="product-photo" src="${escapeHtml(image)}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async" />
            ${unavailable ? `<span class="availability-badge">${isEnglish ? "Sold out" : "Esaurito"}</span>` : ""}
          </div>
          <div class="product-body">
            <div class="product-heading">
              <span class="product-kit-icon" aria-hidden="true">
                <img class="product-icon-img" src="${escapeHtml(icon)}" alt="" decoding="async" />
              </span>
              <div>
                <h3>${escapeHtml(p.name)}</h3>
                ${p.shortDesc ? `<p class="desc">${escapeHtml(p.shortDesc)}</p>` : ""}
              </div>
            </div>
            ${price ? `<span class="product-price">${escapeHtml(price)}</span>` : ""}
            ${unavailable ? `
            <span class="btn btn--disabled btn--sm" aria-label="${escapeHtml(p.name)} ${isEnglish ? "not available" : "non disponibile"}">
              ${isEnglish ? "Coming soon" : "Prossimamente disponibile"}
            </span>` : `
            <a class="btn btn--dark btn--sm" href="${escapeHtml(p.link)}" target="_blank" rel="noopener nofollow">
              ${isEnglish ? "Buy now" : "Acquista"}
              <img class="btn-icon" src="assets/img/icons/icon-arrow.png" width="16" height="16" alt="" loading="lazy" decoding="async" />
            </a>`}
          </div>
        </article>
      `;
      }).join("");
      $$(".product-photo", grid).forEach((img) => {
        img.addEventListener("error", () => {
          img.src = fallbackProductImage;
        }, { once: true });
      });
      $$(".product-icon-img", grid).forEach((img) => {
        img.addEventListener("error", () => {
          img.src = "assets/img/icons/icon-drop.png";
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
          submit.textContent = isEnglish ? "Sending..." : "Invio in corso...";
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
        if (!response.ok) throw new Error(result.error || (isEnglish ? "Sending failed. Please try again shortly." : "Invio non riuscito. Riprova tra poco."));
        success.textContent = isEnglish
          ? "✓ Request sent. I will get back to you within 24 hours with availability and details."
          : "✓ Richiesta inviata. Ti ricontatto entro 24 ore con disponibilità e dettagli.";
        success.classList.remove("err");
        success.classList.add("show");
        form.reset();
        success.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => success.classList.remove("show"), 6000);
      } catch (error) {
        success.textContent = error.message || (isEnglish ? "Sending failed. Please try again shortly." : "Invio non riuscito. Riprova tra poco.");
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
      if (isEnglish) {
        return "<p><strong>Current status:</strong> no saved choice or expired choice. Only strictly necessary technical settings are active.</p>";
      }
      return "<p><strong>Stato attuale:</strong> nessuna scelta salvata o scelta scaduta. Sono attive solo le impostazioni tecniche necessarie.</p>";
    }
    const saved = new Date(consent.timestamp).toLocaleDateString(isEnglish ? "en-GB" : "it-IT");
    if (isEnglish) {
      return `
      <p><strong>Current status:</strong> preferences saved on ${saved}.</p>
      <ul class="policy-list">
        <li>Strictly necessary technical cookies: always active.</li>
        <li>Analytics/statistics cookies: ${consent.analytics ? "accepted" : "rejected"}.</li>
        <li>Marketing/profiling cookies: ${consent.marketing ? "accepted" : "rejected"}.</li>
      </ul>`;
    }
    return `
      <p><strong>Stato attuale:</strong> preferenze salvate il ${saved}.</p>
      <ul class="policy-list">
        <li>Cookie tecnici necessari: sempre attivi.</li>
        <li>Cookie analytics/statistici: ${consent.analytics ? "accettati" : "rifiutati"}.</li>
        <li>Cookie marketing/profilazione: ${consent.marketing ? "accettati" : "rifiutati"}.</li>
      </ul>`;
  }

  function privacyHtml() {
    if (isEnglish) {
      return `
      <div class="policy-content">
        <p><strong>Last updated:</strong> 2 July 2026.</p>
        <p>This notice is provided under Articles 12, 13 and 14 of Regulation (EU) 2016/679 ("GDPR") and explains how Come le Api processes personal data collected through this website and through the linked contact channels.</p>

        <h4>Data controller</h4>
        <p><strong>Come le Api - Sara</strong>, wellbeing project based around 20091 Bresso, Milan. For privacy requests: <a href="mailto:info@comeleapi.it">info@comeleapi.it</a>.</p>

        <h4>Data processed</h4>
        <ul class="policy-list">
          <li><strong>Browsing data:</strong> technical information sent by the browser, such as IP address, user agent, request date/time and requested URL, processed by technical providers to deliver and protect the website.</li>
          <li><strong>Data voluntarily sent:</strong> name, contact details, message content, treatment preferences or requests sent by email, WhatsApp or any forms.</li>
          <li><strong>Cookie preferences:</strong> the acceptance or refusal of non-essential categories, stored through a technical cookie.</li>
        </ul>

        <h4>Purposes and legal bases</h4>
        <table class="policy-table">
          <thead><tr><th>Purpose</th><th>Legal basis</th><th>Retention</th></tr></thead>
          <tbody>
            <tr><td>Website operation, security and maintenance.</td><td>Controller's legitimate interest and technical necessity of the service, Article 6(1)(f) GDPR.</td><td>Technical logs for the time required for security and according to technical providers' retention periods.</td></tr>
            <tr><td>Replying to requests about treatments, essential oils and availability.</td><td>Performance of pre-contractual measures or contract, Article 6(1)(b) GDPR.</td><td>For the time required to reply and, unless further obligations apply, no longer than 24 months from the last useful contact.</td></tr>
            <tr><td>Managing cookie preferences.</td><td>Need to document the choice and consent for any non-technical categories, Article 6(1)(a) GDPR and ePrivacy rules.</td><td>180 days, unless preferences are changed earlier.</td></tr>
          </tbody>
        </table>

        <h4>Recipients and providers</h4>
        <p>Data may be processed by technical providers strictly necessary for website hosting, security, maintenance, email or messaging tools. Links to WhatsApp, Instagram, Facebook and WebNovis open external services: after the click, those providers process data under their own privacy notices.</p>

        <h4>Transfers outside the EEA</h4>
        <p>The website is configured to load main fonts and images from local assets, avoiding requests to Google Fonts or external image services during ordinary browsing. Voluntary use of external services, such as WhatsApp or social networks, may involve processing or transfers under the relevant providers' terms.</p>

        <h4>Data subject rights</h4>
        <p>You may request access, rectification, erasure, restriction, portability, objection and withdrawal of consent where applicable by writing to <a href="mailto:info@comeleapi.it">info@comeleapi.it</a>. You also have the right to lodge a complaint with the <a href="https://www.garanteprivacy.it/" target="_blank" rel="noopener">Italian Data Protection Authority</a>.</p>

        <h4>Official references</h4>
        <ul class="policy-list">
          <li><a href="https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng" target="_blank" rel="noopener">Regulation (EU) 2016/679 - GDPR</a>.</li>
          <li><a href="https://eur-lex.europa.eu/eli/dir/2002/58/oj/eng" target="_blank" rel="noopener">Directive 2002/58/EC - ePrivacy</a>.</li>
          <li><a href="https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876" target="_blank" rel="noopener">Italian Data Protection Authority cookie guidelines, 10 June 2021</a>.</li>
        </ul>
      </div>`;
    }
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
    if (isEnglish) {
      return `
      <div class="policy-content">
        <p><strong>Last updated:</strong> 2 July 2026.</p>
        <p>This Cookie Policy explains the use of cookies and similar tools on the Come le Api website. By default, only strictly necessary technical tools are active. Any analytics or marketing tools are activated only after express consent.</p>

        <h4>What cookies are</h4>
        <p>Cookies are small files or pieces of information stored on the user's device. European rules and the Italian Data Protection Authority distinguish technical cookies, which are necessary or equivalent, from cookies used for further purposes, such as non-technical analytics or profiling, which require prior informed consent.</p>

        <h4>Cookies used by this website</h4>
        <table class="policy-table">
          <thead><tr><th>Name</th><th>Type</th><th>Purpose</th><th>Duration</th></tr></thead>
          <tbody>
            <tr><td><code>comeleapi_cookie_consent</code></td><td>Technical, first party</td><td>Stores the user's acceptance or refusal of non-essential categories. It does not track browsing.</td><td>180 days</td></tr>
          </tbody>
        </table>

        <h4>Consent categories</h4>
        <ul class="policy-list">
          <li><strong>Necessary:</strong> always active, required for website operation and for storing the privacy preference.</li>
          <li><strong>Statistics:</strong> no analytics tools are currently installed. This category is prepared for any future statistics tools, to be loaded only after consent.</li>
          <li><strong>Marketing:</strong> no profiling pixels or cookies are currently installed. This category is prepared for any future tools, never loaded without consent.</li>
        </ul>

        <h4>How consent works</h4>
        <p>Refusing does not limit access to the website. The "Reject" button and closing the banner keep only technical cookies active. Scrolling or simply continuing navigation is not treated as consent. You can change your choice at any time from this section.</p>
        ${consentStatusHtml()}
        <p><button class="btn btn--primary btn--sm" type="button" id="manageCookiePrefs">Manage cookie preferences</button></p>

        <h4>Official references</h4>
        <ul class="policy-list">
          <li><a href="https://www.garanteprivacy.it/faq/cookie" target="_blank" rel="noopener">Italian Data Protection Authority cookie FAQ</a>.</li>
          <li><a href="https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876" target="_blank" rel="noopener">Cookie and tracking tools guidelines</a>.</li>
          <li><a href="https://www.edpb.europa.eu/our-work-tools/our-documents/topic/consent_en" target="_blank" rel="noopener">EDPB consent guidelines</a>.</li>
        </ul>
      </div>`;
    }
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
    title.textContent = kind === "cookie"
      ? (isEnglish ? "Cookie Policy" : "Cookie Policy")
      : (isEnglish ? "Privacy Policy" : "Privacy Policy");
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
    if (isEnglish) {
      return `
      <section class="cookie-banner" id="cookieBanner" role="dialog" aria-labelledby="cookieBannerTitle" aria-live="polite">
        <button class="cookie-banner__close" type="button" data-cookie-action="reject" aria-label="Close and reject non-essential cookies">×</button>
        <div class="cookie-banner__copy">
          <span class="contact-kicker">Privacy and cookies</span>
          <h3 id="cookieBannerTitle">Choose which cookies to allow</h3>
          <p>We use only strictly necessary technical cookies and one technical cookie to remember this choice. Any statistics or marketing tools will be activated only with your consent.</p>
        </div>
        <div class="cookie-banner__prefs" id="cookiePrefsPanel" hidden>
          <label class="cookie-choice cookie-choice--locked">
            <input type="checkbox" checked disabled />
            <span><strong>Necessary</strong><small>Always active for operation and security.</small></span>
          </label>
          <label class="cookie-choice">
            <input type="checkbox" id="cookieAnalytics" ${consent.analytics ? "checked" : ""} />
            <span><strong>Statistics</strong><small>Not currently active; prepared only with prior consent.</small></span>
          </label>
          <label class="cookie-choice">
            <input type="checkbox" id="cookieMarketing" ${consent.marketing ? "checked" : ""} />
            <span><strong>Marketing</strong><small>Not currently active; never loaded without consent.</small></span>
          </label>
        </div>
        <div class="cookie-banner__actions">
          <button class="btn btn--ghost btn--sm" type="button" data-cookie-action="settings">Customize</button>
          <button class="btn btn--ghost btn--sm" type="button" data-cookie-action="reject">Reject</button>
          <button class="btn btn--primary btn--sm" type="button" data-cookie-action="accept">Accept all</button>
          <button class="btn btn--primary btn--sm cookie-save" type="button" data-cookie-action="save" hidden>Save preferences</button>
        </div>
        <p class="cookie-banner__links"><a href="#" data-cookie-action="policy">Read the Cookie Policy</a></p>
      </section>`;
    }
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
