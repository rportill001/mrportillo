#!/usr/bin/env node
/* Péptidos Sin Caos — build estático
   Fuente única: data/peptides.json
   Genera:
     - /peptidos/index.html  (catálogo completo, agrupado por categoría)
     - /peptides/<slug>/      (ficha por péptido, con mecanismo/vía)
     - inyecta tarjetas de categoría en index.html (marcadores BUILD:CATS)
   Uso: node scripts/build.mjs
*/
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = JSON.parse(readFileSync(join(ROOT, "data", "peptides.json"), "utf8"));
const structures = JSON.parse(readFileSync(join(ROOT, "data", "structures.json"), "utf8"));
const { peptides, categories, evidenceLevels } = db;
const CAT_ORDER = ["gh", "metabolic", "healing"];

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const evClass = (lvl) => `ev-${lvl}`;
const evLabel = (lvl) => evidenceLevels[lvl]?.label ?? lvl;
const formula = (s = "") => esc(s).replace(/(\d+)/g, "<sub>$1</sub>");
// negritas **texto** -> <strong>; cursivas *texto* -> <em>
const md = (s = "") => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");

const NAV = `<header class="nav">
  <div class="container nav-in">
    <a class="brand" href="/"><span class="brand-mark">Ψ</span><span>Péptidos Sin Caos<small>por Roberto Portillo</small></span></a>
    <nav class="nav-links">
      <a href="/peptidos/">Péptidos</a>
      <a href="/#como">Cómo funciona</a>
      <a href="/guia/">La guía</a>
    </nav>
    <div class="nav-cta"><a class="btn btn-primary" href="/guia/">Ver la guía · $29</a></div>
  </div>
</header>`;

const FOOT = `<footer class="footer">
  <div class="container">
    <div class="footer-bottom" style="border:0;padding-top:0">
      <span>© 2026 Roberto Portillo · mrportillo.com</span>
      <a href="/" style="color:var(--teal)">← Inicio</a>
    </div>
  </div>
</footer>`;

const HEAD = (title, desc) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/assets/styles.css" />
</head>
<body>`;

/* ---------- tarjeta de péptido ---------- */
function card(p) {
  const cat = categories[p.category] || { label: "", icon: "" };
  return `      <a class="pcard" data-category="${p.category}" href="/peptides/${p.slug}/">
        <div class="pcard-visual">
          <img src="/assets/images/peptide-cards/${esc(p.slug)}.svg" alt="Ilustración conceptual de ${esc(p.name)}" loading="lazy" />
        </div>
        <div class="pcard-top">
          <div class="pcard-icon">${cat.icon}</div>
          <span class="badge ${evClass(p.evidenceLevel)}">${evLabel(p.evidenceLevel)}</span>
        </div>
        <h3>${esc(p.name)}</h3>
        <p class="aka">${esc(p.aka || cat.label)}</p>
        <p class="goal">${esc(p.goal)}</p>
        <div class="pcard-foot">
          <span class="cat-tag">${cat.icon} ${cat.label}</span>
          <span class="more">Ver ficha →</span>
        </div>
      </a>`;
}

/* ---------- tarjeta de categoría (teaser para el home) ---------- */
function catTeaser(key) {
  const c = categories[key];
  const count = peptides.filter((p) => p.category === key).length;
  return `      <a class="cat-card" href="/peptidos/#${key}">
        <div class="cat-ic">${c.icon}</div>
        <h3>${esc(c.label)}</h3>
        <p>${esc(c.blurb)}</p>
        <span class="cat-count">${count} péptidos →</span>
      </a>`;
}

/* ---------- bloque de categoría (para /peptidos/) ---------- */
function categoryBlock(key) {
  const c = categories[key];
  const cards = peptides.filter((p) => p.category === key).map(card).join("\n");
  return `<section class="cat-section" id="${key}">
  <div class="container">
    <div class="cat-head">
      <div class="pcard-icon">${c.icon}</div>
      <h2>${esc(c.label)}</h2>
    </div>
    <p class="cat-context">${md(c.context)}</p>
    <div class="grid">
${cards}
    </div>
  </div>
</section>`;
}

/* ---------- página /peptidos/ (catálogo completo) ---------- */
function peptidosIndex() {
  const anchors = CAT_ORDER.map((k) => `<a class="chip" href="#${k}">${categories[k].icon} ${esc(categories[k].label)}</a>`).join("\n      ");
  const blocks = CAT_ORDER.map(categoryBlock).join("\n");
  return `${HEAD("Biblioteca de péptidos — por categoría | Péptidos Sin Caos", "Explora los péptidos agrupados por categoría: hormona de crecimiento, metabólicos/GLP-1 y reparación. Objetivo, mecanismo, evidencia y riesgos de cada uno.")}
${NAV}
<section class="detail-hero">
  <div class="container">
    <a class="back-link" href="/">← Inicio</a>
    <h1>Biblioteca de péptidos</h1>
    <p class="lead">Todos los péptidos, organizados por categoría. Cada uno con su objetivo, mecanismo, nivel de evidencia y riesgos. Da clic en cualquiera para abrir su ficha.</p>
    <div class="anchor-nav">
      ${anchors}
    </div>
  </div>
</section>
${blocks}
<section class="disclaimer">
  <div class="container">
    <p><strong>Aviso educativo.</strong> Esta información es solo educativa y no constituye consejo médico ni protocolo de uso. Consulta a un profesional de salud calificado antes de tomar cualquier decisión.</p>
  </div>
</section>
${FOOT}
<script src="/assets/app.js"></script>
</body>
</html>
`;
}

/* ---------- página de detalle ---------- */
function detailPage(p) {
  const cat = categories[p.category] || { label: "", icon: "" };
  const ev = evidenceLevels[p.evidenceLevel] || {};
  const chem = structures[p.slug];
  const risks = (p.risks || []).map((r) => `        <li>${esc(r)}</li>`).join("\n");
  const releaseLabel = { 1: "Release 1 · GH", 2: "Release 2 · Metabólico", 3: "Release 3 · Healing" }[p.release] || "—";
  const structureCard = chem ? `      <div class="aside-card molecule-card">
        <div class="mol-top">
          <h4>Estructura molecular</h4>
        </div>
        <div class="mol-image">
          <img src="${esc(chem.image)}" alt="Estructura química de ${esc(chem.label)}" loading="lazy" />
        </div>
        <div class="mol-meta">
          <strong>${esc(chem.label)}</strong>
          <span>${formula(chem.formula)} · ${esc(chem.molecularWeight)} Da</span>
          <a href="${esc(chem.sourceUrl)}" target="_blank" rel="noopener noreferrer">PubChem CID ${esc(chem.cid)}</a>
        </div>
      </div>
` : "";
  return `${HEAD(`${p.name} — qué es, mecanismo, evidencia y riesgos | Péptidos Sin Caos`, `${p.name}: ${p.goal}. ${p.mechanism} Nivel de evidencia: ${evLabel(p.evidenceLevel)}. Información educativa.`)}

${NAV}

<section class="detail-hero">
  <div class="container">
    <a class="back-link" href="/peptidos/">← Volver a la biblioteca</a>
    <div class="detail-head">
      <div class="pcard-icon">${cat.icon}</div>
      <div>
        <h1>${esc(p.name)}</h1>
        ${p.aka ? `<p class="aka">también conocido como ${esc(p.aka)}</p>` : ""}
        <div class="detail-badges">
          <span class="badge ${evClass(p.evidenceLevel)}">${evLabel(p.evidenceLevel)}</span>
          <span class="badge" style="color:var(--petrol);background:rgba(11,110,122,.10)">${cat.icon} ${cat.label}</span>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section" style="padding-top:46px">
  <div class="container detail-grid">
    <div class="detail-main">
      <div class="block">
        <div class="micro">Objetivo común</div>
        <h2>${esc(p.goal)}</h2>
      </div>
      <div class="block">
        <div class="micro">Cómo actúa · la vía (pathway)</div>
        <div class="pathway-box">${md(p.pathway || p.mechanism)}</div>
      </div>
      <div class="block">
        <div class="micro">Qué dice la evidencia</div>
        <p><strong>${evLabel(p.evidenceLevel)}.</strong> ${esc(p.evidenceNote)} ${esc(ev.desc || "")}</p>
      </div>
      <div class="block">
        <div class="micro">Riesgos y señales a vigilar</div>
        <ul class="risk-list">
${risks}
        </ul>
      </div>
      <div class="block">
        <div class="micro">Reconstitución / almacenamiento</div>
        <p>${esc(p.storage)}</p>
      </div>
    </div>

    <aside class="detail-aside">
${structureCard}      <div class="aside-card structure-note">
        <h4>Lectura correcta</h4>
        <p>La imagen molecular identifica el compuesto; no implica calidad, pureza, seguridad del vial ni que sea adecuado para una persona.</p>
      </div>
      <div class="aside-card">
        <h4>Ficha rápida</h4>
        <div class="aside-row"><span>Categoría</span><span>${cat.label}</span></div>
        <div class="aside-row"><span>Evidencia</span><span>${evLabel(p.evidenceLevel)}</span></div>
        <div class="aside-row"><span>Prioridad</span><span>${esc(p.priority)}</span></div>
        <div class="aside-row"><span>Módulo</span><span>${releaseLabel}</span></div>
      </div>
      <div class="aside-card aside-cta">
        <h4>¿Quieres el panorama completo?</h4>
        <p>La guía <strong>Péptidos Sin Caos</strong> reúne fundamentos, unidades, reconstitución segura y triage de efectos en un solo lugar.</p>
        <a class="btn btn-light" href="/guia/" style="width:100%;margin-top:8px">Ver la guía · $29</a>
      </div>
    </aside>
  </div>
</section>

<section class="disclaimer">
  <div class="container">
    <p><strong>Aviso educativo.</strong> Esta ficha es solo educativa y no constituye consejo médico, instrucciones de uso ni venta de sustancias. La información sobre ${esc(p.name)} resume mecanismo, nivel de evidencia y riesgos generales; no es un protocolo. Consulta a un profesional de salud calificado antes de tomar cualquier decisión.</p>
  </div>
</section>

${FOOT}
<script src="/assets/app.js"></script>
</body>
</html>
`;
}

/* ---------- ejecutar ---------- */
let count = 0;
for (const p of peptides) {
  const dir = join(ROOT, "peptides", p.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), detailPage(p), "utf8");
  count++;
}

// página /peptidos/
mkdirSync(join(ROOT, "peptidos"), { recursive: true });
writeFileSync(join(ROOT, "peptidos", "index.html"), peptidosIndex(), "utf8");

// inyectar tarjetas de categoría en el home
const teasers = CAT_ORDER.map(catTeaser).join("\n");
const indexPath = join(ROOT, "index.html");
let index = readFileSync(indexPath, "utf8");
if (/<!-- BUILD:CATS:START -->[\s\S]*?<!-- BUILD:CATS:END -->/.test(index)) {
  index = index.replace(
    /<!-- BUILD:CATS:START -->[\s\S]*?<!-- BUILD:CATS:END -->/,
    `<!-- BUILD:CATS:START -->\n${teasers}\n      <!-- BUILD:CATS:END -->`
  );
  writeFileSync(indexPath, index, "utf8");
  console.log("✓ tarjetas de categoría inyectadas en index.html");
} else {
  console.log("⚠ no se encontraron marcadores BUILD:CATS en index.html (revisar home)");
}

console.log(`✓ ${count} fichas de péptido generadas en /peptides/`);
console.log(`✓ /peptidos/ generado (catálogo por categoría: ${CAT_ORDER.length} categorías)`);
console.log(`✓ build completo — ${db.meta.brand}`);
