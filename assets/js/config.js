/* =============================================================
   COME LE API — configurazione frontend pubblico

   In localhost lascia vuoto: il sito usa lo stesso dominio.

   Per la produzione con hosting separato (Netlify + Render):
   imposta l'URL HTTPS del backend su Render, per esempio:
   window.COMELEAPI_API_BASE = "https://comeleapi-backend.onrender.com";

   Per GitHub Pages:
   window.COMELEAPI_API_BASE = "https://comeleapi-backend.onrender.com";
   ============================================================= */

window.COMELEAPI_API_BASE = window.COMELEAPI_API_BASE || "";
