/* =============================================================
   COME LE API — admin.js
   Gestionale prodotti con sessione server, CSRF e API protette.
   ============================================================= */

(function () {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const FALLBACK_IMG = "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=160&q=70";

  const state = {
    csrfToken: "",
    products: [],
    leads: [],
    leadStats: null,
    leadsInitialized: false,
    knownLeadIds: new Set(),
    user: null,
    editingId: null,
    pendingConfirm: null,
    leadPollTimer: null
  };

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  const iconMap = {
    box: "admin-box",
    eye: "admin-eye",
    "eye-off": "admin-eye-off",
    tag: "admin-tag",
    plus: "admin-plus",
    reset: "admin-reset",
    external: "admin-external",
    up: "admin-up",
    down: "admin-down",
    edit: "admin-edit",
    trash: "admin-trash",
    chat: "icon-chat",
    calendar: "icon-calendar",
    mail: "admin-external",
    seal: "icon-seal",
    spark: "icon-spark"
  };

  function icon(name) {
    const file = iconMap[name] || name;
    return `<img class="generated-icon admin-generated-icon" src="assets/img/icons/${file}.png" alt="" loading="lazy" decoding="async" />`;
  }

  const tbody = $("#productsBody");
  const statsEl = $("#stats");
  const drawer = $("#drawer");
  const overlay = $("#overlay");
  const form = $("#productForm");
  const drawerTitle = $("#drawerTitle");
  const imgPreview = $("#imgPreview");
  const imageFileInput = $("#f-imageFile");
  const uploadHelp = $("#uploadHelp");
  const toastWrap = $("#toastWrap");
  const syncStatus = $("#syncStatus");
  const userChip = $("#adminUser");
  const confirmModal = $("#confirmModal");
  const leadsList = $("#leadsList");
  const leadsStatsEl = $("#leadsStats");
  const confirmOk = $("#confirmOk");
  const leadSearch = $("#leadSearch");
  const productSearch = $("#productSearch");
  const leadFilter = $("#leadFilter");

  function setStatus(message, type = "") {
    if (!syncStatus) return;
    syncStatus.textContent = message;
    syncStatus.classList.toggle("ok", type === "ok");
    syncStatus.classList.toggle("warn", type === "warn");
  }

  function toast(msg, type = "") {
    const t = document.createElement("div");
    t.className = `toast ${type}`.trim();
    t.textContent = msg;
    toastWrap.appendChild(t);
    setTimeout(() => {
      t.style.opacity = "0";
      t.style.transform = "translateX(120%)";
      setTimeout(() => t.remove(), 300);
    }, 2800);
  }

  function redirectToLogin() {
    window.location.assign(`/login.html?next=${encodeURIComponent("/admin.html")}`);
  }

  function apiBase() {
    return String(window.COMELEAPI_API_BASE || "").trim().replace(/\/+$/, "");
  }

  function apiUrl(path) {
    const base = apiBase();
    return base ? `${base}${path}` : path;
  }

  async function api(path, options = {}) {
    const method = options.method || "GET";
    const headers = {
      "Accept": "application/json",
      ...(options.headers || {})
    };

    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (!["GET", "HEAD", "OPTIONS"].includes(method) && state.csrfToken) {
      headers["X-CSRF-Token"] = state.csrfToken;
    }

    const response = await fetch(apiUrl(path), {
      method,
      credentials: apiBase() ? "include" : "same-origin",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });

    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
      redirectToLogin();
      throw new Error("Sessione scaduta.");
    }
    if (!response.ok) throw new Error(payload.error || "Operazione non riuscita.");
    if (payload.csrfToken) state.csrfToken = payload.csrfToken;
    return payload;
  }

  async function uploadImage(file) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast("Formato non supportato. Usa JPG, PNG o WebP.", "err");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("Immagine troppo grande: massimo 5 MB.", "err");
      return;
    }

    const data = new FormData();
    data.append("image", file);
    const previousHelp = uploadHelp.textContent;
    uploadHelp.textContent = "Caricamento immagine in corso...";
    imageFileInput.disabled = true;

    try {
      const response = await fetch(apiUrl("/api/admin/uploads"), {
        method: "POST",
        credentials: apiBase() ? "include" : "same-origin",
        headers: {
          "Accept": "application/json",
          "X-CSRF-Token": state.csrfToken
        },
        body: data
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        redirectToLogin();
        throw new Error("Sessione scaduta.");
      }
      if (!response.ok) throw new Error(payload.error || "Upload non riuscito.");
      $("#f-image").value = payload.url;
      updatePreview();
      toast("Immagine caricata", "ok");
      setStatus("Immagine salvata sul server.", "ok");
    } catch (error) {
      toast(error.message, "err");
      setStatus(error.message, "warn");
    } finally {
      imageFileInput.disabled = false;
      imageFileInput.value = "";
      uploadHelp.textContent = previousHelp;
    }
  }

  async function initSession() {
    const payload = await api("/api/auth/session");
    state.user = payload.user;
    state.csrfToken = payload.csrfToken;
    window.ComeLeApiAdmin = {
      getCsrfToken: () => state.csrfToken
    };
    userChip.textContent = `${payload.user.username} · ${payload.user.role}`;
    setStatus("Sessione verificata. Dati sincronizzati con il server.", "ok");
  }

  async function loadProducts(message = "Dati aggiornati.") {
    setStatus("Caricamento prodotti dal server...");
    const payload = await api("/api/admin/products");
    state.products = Array.isArray(payload.products) ? payload.products : [];
    render();
    setStatus(message, "ok");
  }

  function renderStats(list) {
    const total = list.length;
    const visible = list.filter((p) => p.visible !== false).length;
    const hidden = total - visible;
    const withPrice = list.filter((p) => p.price && p.price.trim()).length;

    statsEl.innerHTML = `
      <div class="stat">
        <div class="ic">${icon("box")}</div>
        <div><b>${total}</b><span>Prodotti totali</span></div>
      </div>
      <div class="stat">
        <div class="ic">${icon("eye")}</div>
        <div><b>${visible}</b><span>Visibili in vetrina</span></div>
      </div>
      <div class="stat">
        <div class="ic">${icon("eye-off")}</div>
        <div><b>${hidden}</b><span>Nascosti</span></div>
      </div>
      <div class="stat">
        <div class="ic">${icon("tag")}</div>
        <div><b>${withPrice}</b><span>Con prezzo</span></div>
      </div>
    `;
  }

  function formatDate(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Data non disponibile";
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function leadLabel(status) {
    if (status === "reviewed") return "Gestita";
    if (status === "archived") return "Archiviata";
    return "Nuova";
  }

  function leadMailHref(lead) {
    const subject = `Richiesta consulenza Come le Api`;
    const body = [
      `Ciao ${lead.name || ""},`,
      "",
      "ti scrivo in merito alla richiesta di consulenza inviata dal sito Come le Api.",
      "",
      "A presto,",
      "Sara",
      "",
      "---",
      `Richiesta ricevuta il ${formatDate(lead.createdAt)}`,
      lead.phone ? `Telefono: ${lead.phone}` : "",
      lead.day ? `Giorno preferito: ${lead.day}` : "",
      lead.slot ? `Fascia oraria: ${lead.slot}` : "",
      lead.message ? `Messaggio: ${lead.message}` : ""
    ].filter(Boolean).join("\n");
    return `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function renderLeadStats(stats) {
    const safe = stats || { total: 0, new: 0, reviewed: 0, archived: 0 };
    const nav = window.navigator || {};
    if (nav.setAppBadge) {
      const count = Number(safe.new || 0);
      const badgeTask = count > 0 ? nav.setAppBadge(count) : nav.clearAppBadge?.();
      badgeTask?.catch?.(() => undefined);
    }
    leadsStatsEl.innerHTML = `
      <div class="lead-mini-stat"><b>${safe.total || 0}</b><span>Totali</span></div>
      <div class="lead-mini-stat"><b>${safe.new || 0}</b><span>Nuove</span></div>
      <div class="lead-mini-stat"><b>${safe.reviewed || 0}</b><span>Riviste</span></div>
      <div class="lead-mini-stat"><b>${safe.archived || 0}</b><span>Archiviate</span></div>
    `;
  }

  function renderLeads() {
    renderLeadStats(state.leadStats);

    if (!state.leads.length) {
      leadsList.innerHTML = `
        <div class="lead-empty">
          <strong>Nessuna richiesta trovata</strong>
          <span>Quando una persona compila il form del sito, la troverai qui.</span>
        </div>`;
      return;
    }

    leadsList.innerHTML = state.leads.map((lead) => {
      const status = lead.status || "new";
      const daySlot = [lead.day, lead.slot].filter(Boolean).join(" · ") || "Preferenza non indicata";
      return `
        <article class="lead-card ${status === "new" ? "is-new" : ""} ${status === "archived" ? "is-archived" : ""}" data-id="${escapeHtml(lead.id)}">
          <div class="lead-main">
            <div class="lead-title">
              <strong>${escapeHtml(lead.name)}</strong>
              <span class="lead-status ${escapeHtml(status)}">${escapeHtml(leadLabel(status))}</span>
            </div>
            <div class="lead-meta">
              <span>${escapeHtml(formatDate(lead.createdAt))}</span>
              <span>${escapeHtml(lead.email)}</span>
              <span>${escapeHtml(lead.phone)}</span>
              <span>${escapeHtml(daySlot)}</span>
            </div>
            <p class="lead-message">${escapeHtml(lead.message)}</p>
          </div>
          <div class="lead-card-actions">
            <a class="btn btn--sm lead-mail" href="${escapeHtml(leadMailHref(lead))}">
              ${icon("mail")} Scrivi email
            </a>
            ${status !== "reviewed" ? `
              <button class="btn btn--ghost btn--sm" data-lead-act="reviewed" data-id="${escapeHtml(lead.id)}">
                ${icon("seal")} Segna come gestita
              </button>` : `
              <button class="btn btn--ghost btn--sm" data-lead-act="new" data-id="${escapeHtml(lead.id)}">
                ${icon("spark")} Riapri
              </button>`}
            ${status !== "archived" ? `
              <button class="btn btn--ghost btn--sm" data-lead-act="archived" data-id="${escapeHtml(lead.id)}">
                Archivia
              </button>` : `
              <button class="btn btn--ghost btn--sm" data-lead-act="reviewed" data-id="${escapeHtml(lead.id)}">
                Ripristina
              </button>`}
          </div>
        </article>
      `;
    }).join("");
  }

  async function loadLeads(options = {}) {
    const q = leadSearch?.value.trim() || "";
    const status = leadFilter?.value || "active";
    const previousIds = new Set(state.knownLeadIds);
    const params = new URLSearchParams({ status });
    if (q) params.set("q", q);

    const payload = await api(`/api/admin/leads?${params.toString()}`);
    state.leads = Array.isArray(payload.leads) ? payload.leads : [];
    state.leadStats = payload.stats || null;
    renderLeads();
    state.leads.forEach((lead) => state.knownLeadIds.add(lead.id));

    if (options.silent && state.leadsInitialized) {
      const fresh = state.leads.filter((lead) => lead.status === "new" && !previousIds.has(lead.id));
      fresh.forEach((lead) => notifyLead(lead));
      if (fresh.length) toast(`${fresh.length} nuova richiesta ricevuta`, "ok");
    }
    state.leadsInitialized = true;
  }

  async function pollNewLeads() {
    const previousIds = new Set(state.knownLeadIds);
    const payload = await api("/api/admin/leads?status=active");
    const leads = Array.isArray(payload.leads) ? payload.leads : [];
    state.leadStats = payload.stats || state.leadStats;
    renderLeadStats(state.leadStats);
    leads.forEach((lead) => state.knownLeadIds.add(lead.id));
    if (!state.leadsInitialized) return;
    const fresh = leads.filter((lead) => lead.status === "new" && !previousIds.has(lead.id));
    fresh.forEach((lead) => notifyLead(lead));
    if (fresh.length) {
      toast(`${fresh.length} nuova richiesta ricevuta`, "ok");
      if (!leadSearch.value.trim() && (leadFilter.value || "active") === "active") {
        state.leads = leads;
        renderLeads();
      }
    }
  }

  async function updateLead(id, status) {
    const previousLeads = [...state.leads];
    const leadIndex = state.leads.findIndex(l => l.id === id);
    if (leadIndex >= 0) {
      state.leads[leadIndex] = { ...state.leads[leadIndex], status };
      if (leadFilter.value !== "all" && leadFilter.value !== status && (leadFilter.value !== "active" || status === "archived")) {
         state.leads.splice(leadIndex, 1);
      }
      renderLeads();
    }

    try {
      await api(`/api/admin/leads/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: { status }
      });
      loadLeads({ silent: true });
      toast(status === "archived" ? "Richiesta archiviata" : "Richiesta gestita", "ok");
    } catch (error) {
      state.leads = previousLeads;
      renderLeads();
      toast(error.message, "err");
      setStatus(error.message, "warn");
    }
  }

  async function updatePushUI() {
    if (!window.ComeLeApiPWA?.getPushStatus) return;
    const isEnabled = await window.ComeLeApiPWA.getPushStatus();
    const btnEnable = $("#btnEnableNotifications");
    const btnDisable = $("#btnDisableNotifications");
    if (btnEnable) btnEnable.style.display = isEnabled ? "none" : "";
    if (btnDisable) btnDisable.style.display = isEnabled ? "" : "none";
  }

  async function enableNotifications() {
    if (!window.ComeLeApiPWA?.enablePush) {
      toast("Funzioni PWA non disponibili in questo browser.", "err");
      return;
    }
    try {
      const result = await window.ComeLeApiPWA.enablePush({ csrfToken: state.csrfToken });
      toast(result.message || "Notifiche aggiornate", result.ok ? "ok" : "err");
      if (result.ok) await updatePushUI();
    } catch (error) {
      toast(error.message || "Notifiche non attivate", "err");
    }
  }

  async function disableNotifications() {
    if (!window.ComeLeApiPWA?.disablePush) return;
    try {
      const result = await window.ComeLeApiPWA.disablePush({ csrfToken: state.csrfToken });
      toast(result.message || "Notifiche disattivate", result.ok ? "ok" : "err");
      if (result.ok) await updatePushUI();
    } catch (error) {
      toast(error.message || "Errore disattivazione notifiche", "err");
    }
  }

  async function testNotifications() {
    try {
      await window.ComeLeApiPWA?.showLeadNotification?.({ name: "test" });
      const result = await api("/api/admin/notifications/test", { method: "POST", body: {} });
      toast(result.sent ? "Notifica push di test inviata" : "Test locale eseguito. Nessun dispositivo push registrato.", "ok");
    } catch (error) {
      toast(error.message || "Test notifica non riuscito", "err");
    }
  }

  async function installPwa() {
    if (!window.ComeLeApiPWA?.installApp) {
      toast("Installazione PWA non disponibile in questo browser.", "err");
      return;
    }
    const result = await window.ComeLeApiPWA.installApp();
    toast(result.message || (result.ok ? "Installazione avviata" : "Installazione non completata"), result.ok ? "ok" : "");
  }

  async function notifyLead(lead) {
    const nav = window.navigator || {};
    if (nav.setAppBadge && state.leadStats?.new) {
      nav.setAppBadge(state.leadStats.new).catch(() => undefined);
    }
    if (window.ComeLeApiPWA?.showLeadNotification) {
      window.ComeLeApiPWA.showLeadNotification(lead).catch(() => undefined);
    }
  }

  function startLeadPolling() {
    if (state.leadPollTimer) clearInterval(state.leadPollTimer);
    state.leadPollTimer = setInterval(() => {
      pollNewLeads().catch(() => undefined);
    }, 25000);
  }

  function debounce(fn, delay = 250) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function bindImageFallbacks() {
    $$(".thumb", tbody).forEach((img) => {
      img.addEventListener("error", () => {
        img.src = FALLBACK_IMG;
      }, { once: true });
    });
  }

  function render() {
    let list = state.products.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const pq = productSearch?.value.trim().toLowerCase() || "";
    if (pq) {
      list = list.filter(p => 
        (p.name || "").toLowerCase().includes(pq) ||
        (p.shortDesc || "").toLowerCase().includes(pq) ||
        (p.benefits || "").toLowerCase().includes(pq) ||
        (p.price || "").toLowerCase().includes(pq)
      );
    }
    
    renderStats(list);

    if (!list.length) {
      tbody.innerHTML = `
        <tr><td colspan="6" class="empty-row">
          <div class="empty-inline">
            <p>Nessun prodotto presente.</p>
            <button class="btn btn--primary" data-act="new-empty">${icon("plus")} Aggiungi il primo prodotto</button>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((p, idx) => {
      const isOn = p.visible !== false;
      const last = list.length - 1;
      return `
        <tr class="${isOn ? "" : "hidden-row"}" data-id="${escapeHtml(p.id)}">
          <td data-label="Ordine">
            <div class="order-controls">
              <button class="btn btn--ghost btn--sm" data-act="up" data-id="${escapeHtml(p.id)}"
                      ${idx === 0 ? "disabled" : ""} title="Sposta su" aria-label="Sposta su">${icon("up")}</button>
              <button class="btn btn--ghost btn--sm" data-act="down" data-id="${escapeHtml(p.id)}"
                      ${idx === last ? "disabled" : ""} title="Sposta giu" aria-label="Sposta giu">${icon("down")}</button>
            </div>
            <span class="row-index">#${idx + 1}</span>
          </td>
          <td data-label="Immagine">
            <img class="thumb" src="${escapeHtml(p.image)}" alt="" loading="lazy" decoding="async" />
          </td>
          <td class="cell-name" data-label="Prodotto">
            ${escapeHtml(p.name)}
            <small>${escapeHtml(p.shortDesc)}</small>
          </td>
          <td class="cell-price" data-label="Prezzo">${p.price ? escapeHtml(p.price) : "—"}</td>
          <td data-label="Visibilita">
            <button class="status-pill ${isOn ? "on" : "off"}" data-act="toggle" data-id="${escapeHtml(p.id)}"
                    title="${isOn ? "Nascondi dalla vetrina" : "Mostra in vetrina"}">
              <span class="dot"></span> ${isOn ? "Visibile" : "Nascosto"}
            </button>
          </td>
          <td data-label="Azioni">
            <div class="row-actions">
              <button class="btn btn--ghost btn--sm" data-act="edit" data-id="${escapeHtml(p.id)}" title="Modifica">${icon("edit")} Modifica</button>
              <button class="btn btn--danger btn--sm" data-act="delete" data-id="${escapeHtml(p.id)}" title="Elimina">${icon("trash")} Elimina</button>
            </div>
          </td>
        </tr>`;
    }).join("");

    bindImageFallbacks();
  }

  async function move(id, delta) {
    try {
      const payload = await api(`/api/admin/products/${encodeURIComponent(id)}/move`, {
        method: "POST",
        body: { direction: delta }
      });
      state.products = payload.products;
      render();
      toast("Ordine aggiornato", "ok");
      setStatus("Ordine salvato sul server.", "ok");
    } catch (error) {
      toast(error.message, "err");
      setStatus(error.message, "warn");
    }
  }

  async function toggleVisible(id) {
    const product = state.products.find((p) => p.id === id);
    if (!product) return;
    try {
      const payload = await api(`/api/admin/products/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: { visible: product.visible === false }
      });
      state.products = payload.products;
      render();
      toast(product.visible === false ? "Prodotto reso visibile" : "Prodotto nascosto", "ok");
      setStatus("Visibilita aggiornata.", "ok");
    } catch (error) {
      toast(error.message, "err");
      setStatus(error.message, "warn");
    }
  }

  function openDrawer(id) {
    state.editingId = id || null;
    form.reset();
    clearErrors();

    if (id) {
      const p = state.products.find((x) => x.id === id);
      if (!p) return;
      drawerTitle.textContent = "Modifica prodotto";
      $("#f-id").value = p.id;
      $("#f-name").value = p.name || "";
      $("#f-shortDesc").value = p.shortDesc || "";
      $("#f-benefits").value = p.benefits || "";
      $("#f-price").value = p.price || "";
      $("#f-image").value = p.image || "";
      $("#f-link").value = p.link || "";
      $("#f-visible").checked = p.visible !== false;
      updatePreview();
    } else {
      drawerTitle.textContent = "Nuovo prodotto";
      $("#f-id").value = "";
      $("#f-visible").checked = true;
      imgPreview.style.display = "none";
    }

    overlay.classList.add("show");
    drawer.classList.add("show");
    drawer.setAttribute("aria-hidden", "false");
    setTimeout(() => $("#f-name").focus(), 250);
  }

  function closeDrawer() {
    drawer.classList.remove("show");
    overlay.classList.remove("show");
    drawer.setAttribute("aria-hidden", "true");
    state.editingId = null;
  }

  function updatePreview() {
    const url = $("#f-image").value.trim();
    if (url && (/^https?:\/\//i.test(url) || /^\/uploads\/[a-z0-9._-]+\.(jpe?g|png|webp)$/i.test(url))) {
      imgPreview.src = url;
      imgPreview.style.display = "block";
      imgPreview.onerror = () => { imgPreview.style.display = "none"; };
    } else {
      imgPreview.style.display = "none";
    }
  }

  function clearErrors() {
    $$(".field", form).forEach((f) => f.classList.remove("invalid"));
  }

  function setFieldError(input, show) {
    input.closest(".field").classList.toggle("invalid", show);
  }

  function isValidUrl(v) {
    if (/^\/uploads\/[a-z0-9._-]+\.(jpe?g|png|webp)$/i.test(v)) return true;
    try {
      const url = new URL(v);
      return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
    } catch {
      return false;
    }
  }

  async function save() {
    clearErrors();
    let ok = true;
    ["#f-name", "#f-shortDesc", "#f-benefits"].forEach((sel) => {
      const el = $(sel);
      const valid = el.value.trim().length > 0;
      setFieldError(el, !valid);
      if (!valid) ok = false;
    });

    const imgEl = $("#f-image");
    if (!isValidUrl(imgEl.value.trim())) { setFieldError(imgEl, true); ok = false; }

    const linkEl = $("#f-link");
    if (!isValidUrl(linkEl.value.trim())) { setFieldError(linkEl, true); ok = false; }

    if (!ok) {
      const firstInvalid = $(".field.invalid input, .field.invalid textarea", form);
      if (firstInvalid) firstInvalid.focus();
      toast("Controlla i campi evidenziati", "err");
      return;
    }

    const data = {
      name: $("#f-name").value.trim(),
      shortDesc: $("#f-shortDesc").value.trim(),
      benefits: $("#f-benefits").value.trim(),
      price: $("#f-price").value.trim(),
      image: imgEl.value.trim(),
      link: linkEl.value.trim(),
      visible: $("#f-visible").checked
    };

    const saveBtn = $("#drawerSave");
    saveBtn.disabled = true;
    saveBtn.textContent = "Salvataggio...";
    try {
      const isEditing = Boolean(state.editingId);
      const path = state.editingId
        ? `/api/admin/products/${encodeURIComponent(state.editingId)}`
        : "/api/admin/products";
      const method = state.editingId ? "PUT" : "POST";
      const payload = await api(path, { method, body: data });
      state.products = payload.products;
      render();
      closeDrawer();
      toast(isEditing ? "Prodotto aggiornato" : "Prodotto aggiunto", "ok");
      setStatus("Modifica salvata sul server.", "ok");
    } catch (error) {
      toast(error.message, "err");
      setStatus(error.message, "warn");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Salva prodotto";
    }
  }

  function openConfirm(options) {
    state.pendingConfirm = options.onConfirm;
    $("#confirmTitle").textContent = options.title;
    $("#confirmText").textContent = options.text;
    $("#confirmOk").textContent = options.actionLabel || "Conferma";
    $("#confirmOk").classList.toggle("btn--danger", options.danger !== false);
    confirmModal.classList.add("show");
  }

  function closeConfirm() {
    confirmModal.classList.remove("show");
    state.pendingConfirm = null;
  }

  function askDelete(id) {
    const p = state.products.find((x) => x.id === id);
    if (!p) return;
    openConfirm({
      title: "Eliminare il prodotto?",
      text: `Vuoi eliminare definitivamente "${p.name}"? L'azione non e reversibile.`,
      actionLabel: "Elimina",
      onConfirm: async () => {
        const payload = await api(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
        state.products = payload.products;
        render();
        toast("Prodotto eliminato", "ok");
        setStatus("Prodotto eliminato dal server.", "ok");
      }
    });
  }

  function askReset() {
    openConfirm({
      title: "Ripristinare i prodotti di esempio?",
      text: "Le modifiche salvate sul server verranno sostituite con la vetrina di esempio.",
      actionLabel: "Ripristina",
      onConfirm: async () => {
        const payload = await api("/api/admin/products/reset", { method: "POST" });
        state.products = payload.products;
        render();
        toast("Prodotti di esempio ripristinati", "ok");
        setStatus("Vetrina ripristinata.", "ok");
      }
    });
  }

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST", body: {} });
    } finally {
      window.location.assign("/login.html");
    }
  }

  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    const id = btn.dataset.id;

    if (act === "new-empty") openDrawer(null);
    else if (act === "up") move(id, -1);
    else if (act === "down") move(id, +1);
    else if (act === "toggle") toggleVisible(id);
    else if (act === "edit") openDrawer(id);
    else if (act === "delete") askDelete(id);
  });

  leadsList.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-lead-act]");
    if (!btn) return;
    updateLead(btn.dataset.id, btn.dataset.leadAct);
  });

  $("#confirmCancel").addEventListener("click", closeConfirm);
  $("#confirmOk").addEventListener("click", async () => {
    if (!state.pendingConfirm) return closeConfirm();
    const action = state.pendingConfirm;
    $("#confirmOk").disabled = true;
    try {
      await action();
      closeConfirm();
    } catch (error) {
      toast(error.message, "err");
      setStatus(error.message, "warn");
    } finally {
      $("#confirmOk").disabled = false;
    }
  });
  confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) closeConfirm();
  });

  $("#btnReset").addEventListener("click", askReset);
  $("#btnNew").addEventListener("click", () => openDrawer(null));
  $("#btnRefreshLeads").addEventListener("click", () => loadLeads().then(() => toast("Richieste aggiornate", "ok")).catch((error) => toast(error.message, "err")));
  $("#btnDisableNotifications")?.addEventListener("click", disableNotifications);
  $("#btnEnableNotifications").addEventListener("click", enableNotifications);
  $("#btnTestNotifications").addEventListener("click", testNotifications);
  $("#btnInstallPwa").addEventListener("click", installPwa);
  $("#btnLogout").addEventListener("click", logout);
  $("#drawerClose").addEventListener("click", closeDrawer);
  $("#drawerCancel").addEventListener("click", closeDrawer);
  $("#drawerSave").addEventListener("click", save);
  $("#f-image").addEventListener("input", updatePreview);
  imageFileInput.addEventListener("change", () => uploadImage(imageFileInput.files?.[0]));
  const debouncedSearch = debounce(async () => {
    try {
      await loadLeads();
    } catch (error) {
      toast(error.message, "err");
    } finally {
      leadSearch.parentElement.classList.remove("is-loading");
      const list = $("#leadsList");
      if (list) list.classList.remove("is-updating");
    }
  });

  leadSearch.addEventListener("input", () => {
    leadSearch.parentElement.classList.add("is-loading");
    const list = $("#leadsList");
    if (list) list.classList.add("is-updating");
    debouncedSearch();
  });

  const debouncedProductSearch = debounce(() => {
    render();
    productSearch.parentElement.classList.remove("is-loading");
    const pTable = $("#productsTable");
    if (pTable) pTable.classList.remove("is-updating");
  }, 250);

  productSearch?.addEventListener("input", () => {
    productSearch.parentElement.classList.add("is-loading");
    const pTable = $("#productsTable");
    if (pTable) pTable.classList.add("is-updating");
    debouncedProductSearch();
  });
  leadFilter.addEventListener("change", () => loadLeads().catch((error) => toast(error.message, "err")));
  overlay.addEventListener("click", closeDrawer);
  form.addEventListener("submit", (e) => { e.preventDefault(); save(); });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (drawer.classList.contains("show")) closeDrawer();
      if (confirmModal.classList.contains("show")) closeConfirm();
    }
  });

  $$("input, textarea", form).forEach((el) =>
    el.addEventListener("input", () => el.closest(".field")?.classList.remove("invalid"))
  );

  (async function init() {
    try {
      await initSession();
      await loadProducts("Gestionale pronto. Dati sincronizzati.");
      await loadLeads();
      startLeadPolling();
      updatePushUI().catch(() => undefined);
    } catch (error) {
      setStatus(error.message, "warn");
      toast(error.message, "err");
    }
  })();
})();
