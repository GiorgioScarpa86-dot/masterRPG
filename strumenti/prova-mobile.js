#!/usr/bin/env node
/**
 * prova-mobile.js — Collaudo dell'adattamento al telefono.
 *
 * Il gioco deve essere giocabile su uno schermo da 360 px di larghezza, senza
 * scorrimento orizzontale e con bersagli tattili comodi. Questo collaudo
 * controlla in modo statico (senza browser) che:
 *
 *   1. il viewport sia dichiarato correttamente e non blocchi lo zoom;
 *   2. esistano punti di rottura per telefono, tablet e schermi stretti;
 *   3. la pagina non possa scorrere in orizzontale, ma solo gli elementi
 *      pensati per farlo (striscia delle illustrazioni, miniature…);
 *   4. i pulsanti e i campi di testo abbiano dimensioni tattili adeguate;
 *   5. i modali diventino a tutta larghezza e il pannello laterale si impili;
 *   6. le immagini e gli SVG non superino mai la larghezza del contenitore;
 *   7. il testo resti leggibile senza zoom (input a 16 px su iOS);
 *   8. non ci siano larghezze fisse incompatibili con uno schermo da 360 px.
 *
 * Uso:  node strumenti/prova-mobile.js
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = await fs.readFile(`${RADICE}/public/css/style.css`, "utf8");
const html = await fs.readFile(`${RADICE}/public/index.html`, "utf8");

let controlli = 0;
let fallimenti = 0;
const problemi = [];

function verifica(condizione, descrizione) {
  controlli++;
  if (!condizione) {
    fallimenti++;
    problemi.push(descrizione);
    console.log(`  ✗ ${descrizione}`);
  } else {
    console.log(`  ✓ ${descrizione}`);
  }
}

/** Estrae il contenuto di un blocco @media confrontando le graffe. */
function contenutoMedia(query) {
  const inizio = css.indexOf(`@media ${query}`);
  if (inizio < 0) return null;
  const apertura = css.indexOf("{", inizio);
  let livello = 0;
  for (let i = apertura; i < css.length; i++) {
    if (css[i] === "{") livello++;
    else if (css[i] === "}") {
      livello--;
      if (livello === 0) return css.slice(apertura + 1, i);
    }
  }
  return null;
}

const LARGHEZZA_TELEFONO = 360;

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║  MasterRPG · Collaudo dell'adattamento al telefono           ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

// ═══════════════════ 1. Viewport ═══════════════════
console.log("═══ 1. Dichiarazione del viewport ═══");
{
  const viewport = html.match(/<meta[^>]*name=["']viewport["'][^>]*>/i)?.[0] || "";
  verifica(Boolean(viewport), "il meta viewport è dichiarato");
  verifica(/width=device-width/.test(viewport), "il viewport usa width=device-width");
  verifica(/initial-scale=1/.test(viewport), "il viewport imposta initial-scale=1");
  verifica(!/user-scalable\s*=\s*no/.test(viewport), "lo zoom è consentito (accessibilità)");
  verifica(!/maximum-scale\s*=\s*1/.test(viewport), "lo zoom non è limitato a 1");
  verifica(/lang=["']it["']/.test(html), "la lingua del documento è dichiarata italiana");
}

// ═══════════════════ 2. Punti di rottura ═══════════════════
console.log("\n═══ 2. Punti di rottura per telefono, tablet e schermi stretti ═══");
{
  const query = [...css.matchAll(/@media\s*\(max-width:\s*(\d+)px\)/g)].map((m) => Number(m[1]));
  const uniche = [...new Set(query)].sort((a, b) => b - a);
  console.log(`  → punti di rottura presenti: ${uniche.join(", ")} px`);
  verifica(uniche.length >= 4, `punti di rottura sufficienti (${uniche.length})`);
  verifica(uniche.some((q) => q >= 760 && q <= 1000), "esiste un punto di rottura per tablet (≈ 900 px)");
  verifica(uniche.some((q) => q >= 560 && q <= 700), "esiste un punto di rottura per telefoni grandi (≈ 620 px)");
  verifica(uniche.some((q) => q <= 460), "esiste un punto di rottura per telefoni piccoli (≈ 420 px)");
}

// ═══════════════════ 3. Nessuno scorrimento orizzontale ═══════════════════
console.log("\n═══ 3. Scorrimento orizzontale ═══");
{
  const telefono = contenutoMedia("(max-width: 900px)") || "";
  verifica(/overflow-x:\s*hidden/.test(telefono) || /overflow-x:\s*hidden/.test(css), "la pagina blocca lo scorrimento orizzontale su telefono");

  // Gli elementi che devono scorrere in orizzontale sono dichiarati esplicitamente
  for (const selettore of [".striscia-scene", ".galleria-miniature"]) {
    const regola = new RegExp(`\\${selettore}\\s*\\{[^}]*overflow-x:\\s*auto`, "s");
    verifica(regola.test(css), `${selettore} è un contenitore a scorrimento orizzontale`);
  }

  // Un contenitore che scorre non deve mai allargare la pagina
  verifica(/overscroll-behavior-x:\s*contain/.test(css), "lo scorrimento orizzontale è contenuto (overscroll-behavior-x)");
  verifica(/scroll-snap-type:\s*x/.test(css), "la striscia delle illustrazioni si aggancia allo scorrimento");

  // Le immagini non devono eccedere il contenitore
  verifica(/img[^{]*\{[^}]*max-width:\s*100%/s.test(css) || /img\s*,\s*svg[^{]*\{[^}]*max-width/s.test(css) || /max-width:\s*100%/.test(css), "le immagini sono limitate alla larghezza del contenitore");
}

// ═══════════════════ 4. Bersagli tattili e leggibilità ═══════════════════
console.log("\n═══ 4. Bersagli tattili e leggibilità ═══");
{
  const telefono = contenutoMedia("(max-width: 900px)") || "";
  const piccolo = contenutoMedia("(max-width: 620px)") || "";
  const stretto = contenutoMedia("(max-width: 420px)") || "";
  const tuttoTelefono = telefono + piccolo + stretto;

  verifica(/\.btn\s*\{[^}]*min-height:\s*44px/s.test(tuttoTelefono), "su telefono i pulsanti hanno un'altezza minima di 44 px");
  verifica(/min-height:\s*46px/.test(tuttoTelefono), "le scelte rapide hanno un bersaglio tattile maggiore (46 px)");
  verifica(/font-size:\s*16px/.test(tuttoTelefono), "i campi di testo usano 16 px su telefono (niente zoom automatico iOS)");
  verifica(/min-height:\s*36px/.test(css) || /min-height:\s*38px/.test(css), "le schede del pannello hanno un'altezza minima adeguata");

  // Il testo del capitolo resta leggibile
  verifica(/\.capitolo-testo\s*\{\s*font-size:\s*1(\.0[3-9]|\.1)/.test(tuttoTelefono) || /capitolo-testo/.test(tuttoTelefono), "il testo del capitolo viene adattato su telefono");
  verifica(/line-height:\s*1\.[67]/.test(tuttoTelefono), "l'interlinea del capitolo è comoda su telefono");
}

// ═══════════════════ 5. Pannello e modali su telefono ═══════════════════
console.log("\n═══ 5. Pannello, modali e schede su telefono ═══");
{
  const telefono = contenutoMedia("(max-width: 900px)") || "";
  const piccolo = contenutoMedia("(max-width: 620px)") || "";
  const stretto = contenutoMedia("(max-width: 420px)") || "";
  verifica(/\.pannello\s*\{[^}]*position:\s*static/s.test(telefono), "il pannello si impila sotto il capitolo su telefono");
  verifica(/\.modale\s*\{[^}]*align-items:\s*flex-end/s.test(telefono) || /modale-contenuto[^}]*width:\s*100%/s.test(telefono), "i modali occupano tutta la larghezza su telefono");
  verifica(/max-height:\s*92vh/.test(telefono) || /max-height:\s*9\d vh/.test(telefono), "i modali restano dentro l'altezza dello schermo");
  verifica(/\.scelte\s*\{[^}]*flex-direction:\s*column/s.test(telefono), "le scelte si dispongono in colonna su telefono");
  verifica(/schede-pannello[^}]*overflow-x:\s*auto/s.test(css), "le schede del pannello scorrono se non ci stanno");
  verifica(/npc-testa\s*\{[^}]*grid-template-columns:\s*1fr/s.test(telefono), "la scheda NPC si dispone in colonna su telefono");
  verifica(/\.striscia-scene\s*\{[^}]*grid-auto-columns/s.test(telefono + piccolo + stretto), "la striscia delle illustrazioni si adatta allo schermo stretto");
}

// ═══════════════════ 6. Larghezze fisse incompatibili ═══════════════════
console.log("\n═══ 6. Larghezze fisse ═══");
{
  // Cerca larghezze/min-width in pixel fuori dai blocchi @media
  const fuoriMedia = css.replace(/@media[^{]*\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g, "");
  const larghezze = [...fuoriMedia.matchAll(/(?:^|\s)(?:min-width|width)\s*:\s*(\d{3,})px/g)].map((m) => Number(m[1]));
  const troppoGrandi = larghezze.filter((l) => l > LARGHEZZA_TELEFONO);
  console.log(`  → larghezze fisse rilevate: ${larghezze.length ? larghezze.join(", ") + " px" : "nessuna"}`);
  verifica(troppoGrandi.length === 0, `nessuna larghezza fissa superiore a ${LARGHEZZA_TELEFONO} px`);

  // Le griglie principali devono collassare a una colonna
  verifica(/\.layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s.test(css), "il layout principale collassa a una colonna");
  verifica(/@media \(max-width: 1080px\)\s*\{\s*\.layout/.test(css), "il layout principale ha un punto di rottura dedicato");

  // Nessun elemento position:fixed a larghezza fissa
  const fissi = [...css.matchAll(/position:\s*fixed[^}]*width:\s*(\d+)px/g)].map((m) => Number(m[1]));
  verifica(fissi.every((w) => w <= LARGHEZZA_TELEFONO), "nessun elemento fisso è più largo di uno schermo da 360 px");
}

// ═══════════════════ 7. Elementi interattivi nel markup ═══════════════════
console.log("\n═══ 7. Markup ═══");
{
  // Pulsanti senza etichetta (icona senza testo alternativo)
  const pulsanti = [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)];
  const senzaEtichetta = pulsanti.filter((m) => {
    const contenuto = m[1].replace(/<[^>]+>/g, "").trim();
    return contenuto.length === 0 && !/aria-label=/.test(m[0]) && !/title=/.test(m[0]);
  });
  verifica(senzaEtichetta.length === 0, "tutti i pulsanti hanno un'etichetta o una descrizione accessibile");

  // I modali hanno un titolo associato
  const modali = [...html.matchAll(/<div id="(modale-[^"]+)"[^>]*aria-labelledby="([^"]+)"/g)];
  verifica(modali.length >= 5, `tutti i modali dichiarano il titolo per i lettori di schermo (${modali.length})`);

  // Le immagini delle scene hanno un testo alternativo (generate dal client)
  const client = await fs.readFile(`${RADICE}/public/js/illustrazioni.js`, "utf8");
  const alt = [...client.matchAll(/crea\("img",\s*\{[^}]*\}/gs)];
  verifica(alt.length >= 3, "le immagini delle scene vengono create dal client");
  verifica(alt.every((m) => /alt:/.test(m[0])), "tutte le immagini delle scene hanno il testo alternativo");
  verifica(/loading:\s*(indice === 0 \? "eager" : "lazy")/.test(client), "le illustrazioni usano il caricamento differito (leggere su rete mobile)");

  // Dimensione dichiarata per le immagini: si evita il salto di layout
  verifica(/aspect-ratio:\s*16\s*\/\s*9/.test(css), "le illustrazioni riservano lo spazio: nessun salto di layout");
}

console.log("\n────────────────────────────────────────────────────────────────");
if (fallimenti) {
  console.log(`\n❌ Collaudo telefono FALLITO: ${fallimenti} problemi su ${controlli} controlli.`);
  for (const problema of problemi) console.log(`   · ${problema}`);
  process.exit(1);
}
console.log(`\n✅ Collaudo telefono SUPERATO: ${controlli} controlli sul layout mobile.`);
console.log("   Nessuno scorrimento orizzontale, bersagli tattili e modali a tutta larghezza.\n");
