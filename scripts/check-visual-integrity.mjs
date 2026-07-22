import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function sha256File(file) {
  const content = await readFile(file);
  return createHash("sha256").update(content).digest("hex");
}

async function sha256(relativePath) {
  return sha256File(path.join(ROOT, relativePath));
}

const baseline = JSON.parse(
  await readFile(path.join(SCRIPT_DIR, "visual-integrity-baseline.json"), "utf8")
);
const products = JSON.parse(await readFile(path.join(ROOT, "products.json"), "utf8"));

const pdfHash = await sha256(baseline.pdf.path);
assert(pdfHash === baseline.pdf.approvedSha256, "PDF: hash diverso dal candidato approvato");
const pdfStats = await stat(path.join(ROOT, baseline.pdf.path));
assert(pdfStats.size === baseline.pdf.approvedBytes, "PDF: dimensione diversa dal candidato approvato");
assert(baseline.pdf.pageRenderSha256.length === baseline.pdf.pageCount, "PDF: baseline pagine incompleta");

const pdftoppmProbe = spawnSync("pdftoppm", ["-v"], { stdio: "ignore" });
let renderedPdfPagesVerified = false;
if (!pdftoppmProbe.error) {
  const renderDirectory = await mkdtemp(path.join(tmpdir(), "comeleapi-pdf-render-"));
  try {
    const renderPrefix = path.join(renderDirectory, "page");
    const render = spawnSync(
      "pdftoppm",
      ["-r", String(baseline.pdf.renderDpi), path.join(ROOT, baseline.pdf.path), renderPrefix],
      { encoding: "utf8" }
    );
    assert(render.status === 0, `PDF: rendering Poppler fallito: ${render.stderr || render.stdout}`);
    const pages = (await readdir(renderDirectory))
      .filter((name) => /^page-\d+\.ppm$/.test(name))
      .sort((left, right) => Number(left.match(/\d+/)[0]) - Number(right.match(/\d+/)[0]));
    assert(pages.length === baseline.pdf.pageCount, "PDF: numero di pagine renderizzate diverso dalla baseline");
    for (const [index, page] of pages.entries()) {
      assert(
        await sha256File(path.join(renderDirectory, page)) === baseline.pdf.pageRenderSha256[index],
        `PDF: resa pixel diversa dalla baseline a pagina ${index + 1}`
      );
    }
    renderedPdfPagesVerified = true;
  } finally {
    await rm(renderDirectory, { recursive: true, force: true });
  }
}

const referencedImages = products.map((product) => String(product.image || "").replace(/^\//, ""));
const approvedImages = Object.keys(baseline.productImages);
assert(
  JSON.stringify([...referencedImages].sort()) === JSON.stringify([...approvedImages].sort()),
  "Prodotti: insieme delle immagini diverso dalla baseline approvata"
);

for (const [imagePath, expectedHash] of Object.entries(baseline.productImages)) {
  assert((await sha256(imagePath)) === expectedHash, `Immagine prodotto alterata: ${imagePath}`);
  assert(
    (await sha256(path.join("dist", imagePath))) === expectedHash,
    `Immagine prodotto alterata nella build: ${imagePath}`
  );
}

assert(
  (await sha256(path.join("dist", baseline.pdf.path))) === baseline.pdf.approvedSha256,
  "PDF: la copia pubblicabile non coincide con il candidato approvato"
);

console.log(
  `Check integrità asset completato: ${approvedImages.length} immagini prodotto immutate, PDF approvato (${baseline.pdf.pageCount} pagine)` +
  (renderedPdfPagesVerified
    ? ` e resa raster ${baseline.pdf.renderDpi} dpi verificata pagina per pagina.`
    : "; Poppler non disponibile, resa pagina per pagina saltata (hash binario PDF verificato).")
);
