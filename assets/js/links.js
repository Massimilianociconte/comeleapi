(function () {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
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

  function setText(selector, text, ctx = document) {
    const el = $(selector, ctx);
    if (el) el.textContent = text;
  }

  function setHtml(selector, html, ctx = document) {
    const el = $(selector, ctx);
    if (el) el.innerHTML = html;
  }

  function setAttr(selector, attr, value, ctx = document) {
    const el = $(selector, ctx);
    if (el) el.setAttribute(attr, value);
  }

  function whatsAppUrl(message) {
    return `https://wa.me/393881639306?text=${encodeURIComponent(message)}`;
  }

  if (resolveLocale() !== "en") return;

  document.documentElement.lang = "en";
  document.title = "comeleapi - Useful links";
  setAttr('meta[name="description"]', "content", "Useful comeleapi links: essential oils guide, essences, treatments and the @come_le_api Instagram profile.");
  setAttr('meta[property="og:title"]', "content", "comeleapi - Useful links");
  setAttr('meta[property="og:description"]', "content", "In harmony with nature: a project curated by Sara for your daily wellbeing.");
  setAttr(".logo-link", "aria-label", "Go to the official comeleapi website");
  setHtml(".intro", "<span>In harmony with nature.</span><span>A project curated by Sara for your daily wellbeing.</span>");
  setAttr(".links-list", "aria-label", "Main links");

  const links = $$(".links-list .link-button");
  const copy = [
    {
      strong: "<em>The Essential</em>",
      small: "A concise guide to essential oils for your natural wellbeing",
      href: "../assets/pdf/mini-guida-oli-comeleapi.pdf?v=20260717-v3"
    },

    {
      strong: "Visit the official website",
      small: "Discover the comeleapi method and approach",
      href: "../index.html?lang=en"
    },
    {
      strong: "Choose your essences",
      small: "Collections and aromatic paths",
      href: "../index.html?lang=en#prodotti"
    },
    {
      strong: "Discover my treatments",
      small: "Regenerate body and mind with a tailored massage",
      href: "../index.html?lang=en#servizi"
    },
    {
      strong: "Join the Community",
      small: "Support for all your questions and tailored advice, the first place to discover promotions and news."
    },
    {
      strong: "Message Sara on WhatsApp",
      small: "For availability, details and costs",
      href: whatsAppUrl("Hi Sara, I would like information about availability, details and costs.")
    },
    {
      strong: "Follow Sara on Instagram",
      small: "Tips, news and wellbeing moments",
      href: "https://www.instagram.com/comeleapi/"
    }
  ];

  links.forEach((link, index) => {
    const item = copy[index];
    if (!item) return;
    const strong = $("strong", link);
    if (strong) strong.innerHTML = item.strong;
    setText("small", item.small, link);
    if (link.tagName === "A") {
      link.setAttribute("href", item.href);
    }
  });

  const downloadBtn = $(".download-action-btn");
  if (downloadBtn) {
    downloadBtn.setAttribute("href", "../assets/pdf/mini-guida-oli-comeleapi.pdf?v=20260717-v3");
    downloadBtn.setAttribute("aria-label", "Download PDF");
  }
})();
