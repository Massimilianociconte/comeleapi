(function () {
  "use strict";

  const policy = window.trustedTypes?.createPolicy("comeleapi", {
    createHTML(value) {
      return String(value);
    }
  });

  Object.defineProperty(window, "ComeLeApiTrustedHTML", {
    configurable: false,
    writable: false,
    value(value) {
      return policy ? policy.createHTML(String(value)) : String(value);
    }
  });
})();
