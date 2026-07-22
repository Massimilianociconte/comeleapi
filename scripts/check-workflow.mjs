import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const workflowPath = path.join(ROOT, ".github/workflows/keep-alive.yml");
const workflow = await readFile(workflowPath, "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(workflow.includes("https://comeleapi-backend.onrender.com/api/health"), "Workflow: endpoint health profondo mancante");
assert(!/(?:curl[^\n]*\s-I\b|--head\b)/.test(workflow), "Workflow: non usare HEAD per il keep-alive");
assert(!/\|\|\s*echo/.test(workflow), "Workflow: errore mascherato da || echo");
assert(workflow.includes("permissions: {}"), "Workflow: permissions least-privilege mancanti");
assert(workflow.includes("timeout-minutes: 5"), "Workflow: timeout job mancante");
assert(workflow.includes("for attempt in 1 2 3 4 5 6"), "Workflow: ciclo di verifica completa mancante");
assert(workflow.includes("--max-time 30") && workflow.includes("sleep 15"), "Workflow: budget cold-start non coerente");
assert(workflow.includes("health_payload_ok"), "Workflow: retry del payload health mancante");
assert(workflow.includes("payload.database !== 'reachable'"), "Workflow: verifica Supabase mancante");
assert(workflow.includes("cron: '7,17,27,37,47,57 * * * *'"), "Workflow: schedule non scaglionato");
assert(workflow.includes("cancel-in-progress: true"), "Workflow: i run bloccati devono cedere al ping piu recente");

const yamlCheck = spawnSync(
  "ruby",
  ["-e", "require 'psych'; Psych.parse_file(ARGV.fetch(0))", workflowPath],
  { encoding: "utf8" }
);
assert(yamlCheck.status === 0, `Workflow: YAML non valido (${yamlCheck.stderr.trim()})`);

const runMatch = workflow.match(/\n        run: \|\n([\s\S]+)$/);
assert(runMatch, "Workflow: blocco run non trovato");
const shell = runMatch[1]
  .split("\n")
  .map((line) => line.startsWith("          ") ? line.slice(10) : line)
  .join("\n");
const shellCheck = spawnSync("bash", ["-n"], { input: shell, encoding: "utf8" });
assert(shellCheck.status === 0, `Workflow: shell non valida (${shellCheck.stderr.trim()})`);

console.log("Check workflow completato: YAML e shell validi, GET health profondo e failure non mascherate.");
