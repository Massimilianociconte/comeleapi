/* =============================================================
   * comeleapi — PWA helpers
   Installazione gestionale + notifiche web push dove disponibili.
   ============================================================= */

(function () {
  "use strict";

  let deferredInstallPrompt = null;
  let registrationPromise = null;
  const nav = window.navigator || {};

  function isStandalone() {
    return window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true;
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  function canUseNotifications() {
    return "Notification" in window && "serviceWorker" in nav && window.isSecureContext;
  }

  if ("serviceWorker" in nav) {
    registrationPromise = nav.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[pwa] service worker non registrato", error);
      return null;
    });
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    window.dispatchEvent(new CustomEvent("comeleapi:install-ready"));
  });

  async function installApp() {
    if (!deferredInstallPrompt) {
      return {
        ok: false,
        message: isStandalone()
          ? "Il gestionale risulta gia aperto come app."
          : "Su iPhone usa Condividi > Aggiungi alla schermata Home. Su Android usa il menu del browser se il prompt non appare."
      };
    }
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    return { ok: choice.outcome === "accepted", outcome: choice.outcome };
  }

  async function requestPermission() {
    if (!canUseNotifications()) {
      return {
        ok: false,
        message: "Notifiche non disponibili in questo contesto. Per il push reale serve app installata e connessione sicura HTTPS."
      };
    }
    if (window.Notification.permission === "granted") return { ok: true };
    if (window.Notification.permission === "denied") {
      return { ok: false, message: "Notifiche bloccate dal browser. Riattivale dalle impostazioni del sito." };
    }
    const permission = await window.Notification.requestPermission();
    return {
      ok: permission === "granted",
      message: permission === "granted" ? "Permesso notifiche concesso." : "Permesso notifiche non concesso."
    };
  }

  async function enablePush(options = {}) {
    const permission = await requestPermission();
    if (!permission.ok) return permission;

    const registration = await registrationPromise;
    if (!registration) return { ok: false, message: "Service worker non disponibile." };

    if (!("PushManager" in window)) {
      return {
        ok: true,
        fallback: true,
        message: "Notifiche locali abilitate. Per il push in background installa la PWA da browser compatibile."
      };
    }

    const keyResponse = await fetch("/api/admin/notifications/public-key", {
      credentials: "same-origin",
      headers: { "Accept": "application/json" }
    });
    const keyPayload = await keyResponse.json().catch(() => ({}));
    if (!keyResponse.ok || !keyPayload.publicKey) {
      return { ok: false, message: keyPayload.error || "Chiave notifiche non disponibile." };
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyPayload.publicKey)
      });
    }

    const saveResponse = await fetch("/api/admin/notifications/subscribe", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-CSRF-Token": options.csrfToken || ""
      },
      body: JSON.stringify({ subscription: subscription.toJSON() })
    });
    const savePayload = await saveResponse.json().catch(() => ({}));
    if (!saveResponse.ok) {
      return { ok: false, message: savePayload.error || "Registrazione notifiche non riuscita." };
    }
    return { ok: true, message: "Notifiche PWA attivate per questo dispositivo.", registered: savePayload.registered };
  }

  async function showLeadNotification(lead) {
    if (!canUseNotifications() || window.Notification.permission !== "granted") {
      return { ok: false, message: "Permesso notifiche non ancora attivo." };
    }
    const registration = await registrationPromise;
    if (!registration) return { ok: false, message: "Service worker non disponibile." };
    const title = lead?.name ? `Nuova richiesta da ${lead.name}` : "Nuova richiesta comeleapi";
    if (nav.serviceWorker?.controller) {
      nav.serviceWorker.controller.postMessage({ type: "SHOW_LEAD_NOTIFICATION", title });
      return { ok: true };
    }
    await registration.showNotification(title, {
      body: "Apri il gestionale per leggere e rispondere dalla sezione Richieste.",
      icon: "/assets/img/logo-comeleapi-512.png",
      badge: "/assets/img/logo-comeleapi-256.png",
      tag: "comeleapi-new-lead",
      renotify: true,
      data: { url: "/admin.html#richieste" }
    });
    return { ok: true };
  }
  async function disablePush(options = {}) {
    const registration = await registrationPromise;
    if (!registration) return { ok: false, message: "Service worker non disponibile." };

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return { ok: true, message: "Nessuna sottoscrizione attiva." };

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    const saveResponse = await fetch("/api/admin/notifications/unsubscribe", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-CSRF-Token": options.csrfToken || ""
      },
      body: JSON.stringify({ endpoint })
    });
    
    return { ok: true, message: "Notifiche disattivate per questo dispositivo." };
  }

  async function getPushStatus() {
    if (!canUseNotifications()) return false;
    if (window.Notification.permission !== "granted") return false;
    const registration = await registrationPromise;
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  }

  window.ComeLeApiPWA = {
    ready: registrationPromise,
    canUseNotifications,
    enablePush,
    disablePush,
    getPushStatus,
    installApp,
    isStandalone,
    showLeadNotification
  };
  document.documentElement.dataset.pwaReady = "true";
  window.dispatchEvent(new CustomEvent("comeleapi:pwa-ready"));
})();
