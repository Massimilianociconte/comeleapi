import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const serverSource = await readFile(path.resolve(SCRIPT_DIR, "..", "server.js"), "utf8");
for (const helper of [
  "normalizePushSubscription",
  "loadPushSubscriptions",
  "savePushSubscriptions",
  "removePushSubscriptions"
]) {
  if (!serverSource.includes(`function ${helper}`)) {
    throw new Error(`Helper push mancante: ${helper}`);
  }
}
if (!serverSource.includes("results[index].remove") || !serverSource.includes("removePushSubscriptions(staleEndpoints)")) {
  throw new Error("La pulizia push deve rimuovere solo gli endpoint 404/410 dello snapshot inviato.");
}
const functionStart = serverSource.indexOf("async function notifyNewLead");
const functionEnd = serverSource.indexOf("// ── Auth", functionStart);

if (functionStart < 0 || functionEnd < 0) {
  throw new Error("Funzione notifyNewLead non trovata.");
}

const notificationSource = serverSource.slice(functionStart, functionEnd);
if (!notificationSource.startsWith("async function notifyNewLead()")) {
  throw new Error("notifyNewLead non deve ricevere dati personali del lead.");
}
if (/lead\s*\./i.test(notificationSource)) {
  throw new Error("La notifica push non deve leggere campi del lead.");
}
if (!notificationSource.includes("Apri il gestionale autenticato per visualizzare i dettagli.")) {
  throw new Error("La notifica push deve rimandare al gestionale senza mostrare dettagli personali.");
}

console.log("Check privacy push completato: nessun dato del lead nel payload.");
