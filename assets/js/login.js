(function () {
  "use strict";

  const form = document.getElementById("loginForm");
  const errorEl = document.getElementById("loginError");
  const button = document.getElementById("loginButton");
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || "/admin.html";

  function safeNext(value) {
    if (!value || !value.startsWith("/") || value.startsWith("//")) return "/admin.html";
    return value;
  }

  function apiBase() {
    return String(window.COMELEAPI_API_BASE || "").trim().replace(/\/+$/, "");
  }

  function apiUrl(path) {
    const base = apiBase();
    return base ? `${base}${path}` : path;
  }

  function setError(message) {
    errorEl.textContent = message || "";
  }

  function setLoading(isLoading) {
    form.classList.toggle("is-loading", isLoading);
    button.disabled = isLoading;
    button.textContent = isLoading ? "Verifica in corso..." : "Entra nel gestionale";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setError("");

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      setError("Inserisci utente e password.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        credentials: apiBase() ? "include" : "same-origin",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Accesso non riuscito.");
      }
      window.location.assign(safeNext(next));
    } catch (error) {
      setError(error.message || "Accesso non riuscito.");
      setLoading(false);
    }
  });
})();
