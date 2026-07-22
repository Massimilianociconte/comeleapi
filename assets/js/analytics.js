/* =============================================================
   comeleapi — eventi analytics senza impatto visivo

   Nessun dato viene trasmesso finche l'utente non ha autorizzato
   la categoria analytics e non e presente un provider compatibile.
   ============================================================= */

(function () {
  "use strict";

  const CONSENT_COOKIE = "comeleapi_cookie_consent";
  const CONSENT_VERSION = "2026-07-11";
  const CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
  const SAFE_KEY = /^[a-z][a-z0-9_]{0,39}$/;
  let pageViewSent = false;

  function readConsent() {
    try {
      const raw = document.cookie
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${CONSENT_COOKIE}=`));
      if (!raw) return null;
      return JSON.parse(decodeURIComponent(raw.slice(CONSENT_COOKIE.length + 1)));
    } catch {
      return null;
    }
  }

  function analyticsAllowed() {
    if (document.documentElement.dataset.analyticsConsent === "granted") return true;
    const consent = readConsent();
    const savedAt = Date.parse(consent?.timestamp || "");
    return consent?.version === CONSENT_VERSION &&
      consent.analytics === true &&
      Number.isFinite(savedAt) &&
      Date.now() - savedAt < CONSENT_MAX_AGE_MS;
  }

  function sanitizeParameters(parameters) {
    const clean = {};
    for (const [key, value] of Object.entries(parameters || {})) {
      if (!SAFE_KEY.test(key)) continue;
      if (!["string", "number", "boolean"].includes(typeof value)) continue;
      clean[key] = typeof value === "string" ? value.slice(0, 120) : value;
    }
    return clean;
  }

  function track(eventName, parameters = {}) {
    if (!analyticsAllowed() || !SAFE_KEY.test(String(eventName || ""))) return false;
    const detail = {
      event: eventName,
      page_path: window.location.pathname,
      page_language: document.documentElement.lang || "it",
      ...sanitizeParameters(parameters)
    };

    document.dispatchEvent(new CustomEvent("comeleapi:analytics", { detail }));
    if (typeof window.gtag === "function") {
      const { event, ...providerParameters } = detail;
      window.gtag("event", eventName, providerParameters);
    } else if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push(detail);
    }
    return true;
  }

  function acquisitionSource() {
    const source = new URLSearchParams(window.location.search).get("utm_source");
    if (source) return source.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) || "campaign";
    if (!document.referrer) return "direct";

    let host;
    try {
      host = new URL(document.referrer).hostname.toLowerCase();
    } catch {
      return "unknown";
    }
    if (host.includes("instagram.com") || host === "l.instagram.com") return "instagram";
    if (host.includes("chatgpt.com") || host.includes("openai.com")) return "chatgpt";
    if (host.includes("claude.ai") || host.includes("anthropic.com")) return "claude";
    if (host.includes("perplexity.ai")) return "perplexity";
    if (host.includes("bing.com")) return "bing";
    if (host.includes("google.")) return "google";
    return "referral";
  }

  function trackPageView() {
    if (pageViewSent) return;
    pageViewSent = track("page_view", { acquisition_source: acquisitionSource() });
  }

  function locationLabel(link) {
    if (link.closest("header")) return "header";
    if (link.closest("footer")) return "footer";
    if (link.closest("#prodotti")) return "products";
    if (link.closest("#servizi")) return "services";
    if (window.location.pathname.startsWith("/links")) return "links";
    return "content";
  }

  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!link) return;

    const rawHref = String(link.getAttribute("href") || "");
    const location = locationLabel(link);
    const productCard = link.closest("[data-product-id]");
    let destination;
    try {
      destination = new URL(link.href, window.location.href);
    } catch {
      return;
    }

    if (destination.hostname === "wa.me") {
      track("click_whatsapp", { link_location: location });
    } else if (rawHref.startsWith("tel:")) {
      track("click_phone", { link_location: location });
    } else if (rawHref.startsWith("mailto:")) {
      track("click_email", { link_location: location });
    }

    if (/\/assets\/pdf\/[^?#]+\.pdf$/i.test(destination.pathname)) {
      track("download_pdf", {
        link_location: location,
        interaction_type: link.hasAttribute("download") ? "download" : "open"
      });
    }

    if (productCard) {
      track("click_product", {
        product_id: String(productCard.dataset.productId || "").slice(0, 80),
        link_location: location
      });
    }

    if (destination.hostname === "www.youngliving.com" || destination.hostname.endsWith(".youngliving.com")) {
      track("click_young_living", {
        product_id: String(productCard?.dataset.productId || "").slice(0, 80),
        link_location: location
      });
    }

    if (
      window.location.pathname.startsWith("/links") &&
      destination.origin === window.location.origin &&
      destination.pathname === "/"
    ) {
      track("links_to_landing", {
        destination_hash: destination.hash.slice(0, 40) || "home"
      });
    }
  }, { passive: true });

  document.addEventListener("comeleapi:cookie-consent", (event) => {
    if (event.detail?.analytics === true) trackPageView();
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", trackPageView, { once: true });
  } else {
    trackPageView();
  }

  window.ComeLeApiAnalytics = Object.freeze({ track, acquisitionSource });
})();
