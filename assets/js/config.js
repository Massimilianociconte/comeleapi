/* =============================================================
   comeleapi — configurazione frontend pubblico

   Rileva automaticamente se l'applicazione è in esecuzione in locale
   o in produzione su Netlify per impostare il corretto indirizzo del backend.
   ============================================================= */

const isLocalHost = ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(window.location.hostname);

window.COMELEAPI_API_BASE = isLocalHost 
  ? "" 
  : "https://comeleapi-backend.onrender.com";
