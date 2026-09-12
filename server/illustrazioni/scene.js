/**
 * scene.js — Motore di illustrazioni di scena.
 *
 * Per ogni capitolo genera 5 illustrazioni coerenti con la narrazione:
 *   1. Il luogo            (panorama d'ambientazione)
 *   2. Volto dell'NPC      (ritratto in controluce)
 *   3. La tua mossa        (scena d'azione)
 *   4. Il colpo di scena   (rivelazione drammatica)
 *   5. Continua…           (cliffhanger finale)
 *
 * Le immagini sono SVG generate proceduralmente: nessuna dipendenza esterna,
 * nessun costo, funzionamento offline. Sono deterministiche (stessa saga +
 * stesso capitolo + stesso indice ⇒ stessa illustrazione) e scalano su
 * qualsiasi schermo, dal telefono al desktop.
 */

import { creaSeme, creaRng } from "../motore/motore_locale.js";
import { tavolozza, eInterno } from "./palette.js";

export const SCENE_PER_CAPITOLO = 5;
export const LARGHEZZA = 1280;
export const ALTEZZA = 720;

export const TIPI = ["panorama", "ritratto", "azione", "svolta", "cliffhanger"];

// ---------------------------------------------------------------------------
// Utilità
// ---------------------------------------------------------------------------
/** Mescola due colori esadecimali (fattore 0 = primo, 1 = secondo). */
function mescola(a, b, fattore) {
  const leggi = (c) => {
    const pulito = String(c).replace("#", "");
    const pieno = pulito.length === 3 ? pulito.split("").map((ch) => ch + ch).join("") : pulito;
    return [0, 2, 4].map((i) => parseInt(pieno.slice(i, i + 2), 16));
  };
  try {
    const [r1, g1, b1] = leggi(a);
    const [r2, g2, b2] = leggi(b);
    const mix = (x, y) => Math.round(x + (y - x) * fattore).toString(16).padStart(2, "0");
    return `#${mix(r1, r2)}${mix(g1, g2)}${mix(b1, b2)}`;
  } catch {
    return a;
  }
}

const esc = (testo) =>
  String(testo ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const numero = (n, decimali = 1) => Number(n).toFixed(decimali);

function ellisse(cx, cy, rx, ry, riempimento, opacita = 1) {
  return `<ellipse cx="${numero(cx)}" cy="${numero(cy)}" rx="${numero(rx)}" ry="${numero(ry)}" fill="${riempimento}" opacity="${numero(opacita, 2)}"/>`;
}

function rettangolo(x, y, w, h, riempimento, opacita = 1, raggio = 0) {
  return `<rect x="${numero(x)}" y="${numero(y)}" width="${numero(w)}" height="${numero(h)}" rx="${numero(raggio)}" fill="${riempimento}" opacity="${numero(opacita, 2)}"/>`;
}

function percorso(d, riempimento, opacita = 1, tratto = null, spessore = 2) {
  const bordo = tratto ? ` stroke="${tratto}" stroke-width="${numero(spessore)}" stroke-linejoin="round" stroke-linecap="round"` : "";
  return `<path d="${d}" fill="${riempimento}" opacity="${numero(opacita, 2)}"${bordo}/>`;
}

function poligono(punti, riempimento, opacita = 1) {
  return `<polygon points="${punti.map(([x, y]) => `${numero(x)},${numero(y)}`).join(" ")}" fill="${riempimento}" opacity="${numero(opacita, 2)}"/>`;
}

function linea(x1, y1, x2, y2, colore, spessore = 2, opacita = 1, tratteggio = null) {
  const dash = tratteggio ? ` stroke-dasharray="${tratteggio}"` : "";
  return `<line x1="${numero(x1)}" y1="${numero(y1)}" x2="${numero(x2)}" y2="${numero(y2)}" stroke="${colore}" stroke-width="${numero(spessore)}" opacity="${numero(opacita, 2)}" stroke-linecap="round"${dash}/>`;
}

/** Catena di colline/montagne: profilo morbido generato casualmente. */
function profiloMontagne(rng, base, altezza, larghezza, picchi) {
  let d = `M 0 ${numero(base)}`;
  const passo = larghezza / picchi;
  for (let i = 0; i < picchi; i++) {
    const cx = passo * (i + 0.5);
    const h = altezza * (0.45 + rng() * 0.55);
    d += ` Q ${numero(cx - passo * 0.3)} ${numero(base - h * 0.55)} ${numero(cx)} ${numero(base - h)}`;
    d += ` Q ${numero(cx + passo * 0.3)} ${numero(base - h * 0.5)} ${numero(cx + passo)} ${numero(base - h * 0.12)}`;
  }
  d += ` L ${numero(larghezza)} ${numero(base)} Z`;
  return d;
}

/** Cielo, stelle e astri. */
function cielo(t, rng) {
  const pezzi = [`<rect width="${LARGHEZZA}" height="${ALTEZZA}" fill="url(#cielo)"/>`];

  // Stelle
  const stelle = Math.round(60 * (t.stelle || 0));
  for (let i = 0; i < stelle; i++) {
    const x = rng() * LARGHEZZA;
    const y = rng() * ALTEZZA * 0.62;
    const r = 0.7 + rng() * 1.6;
    pezzi.push(ellisse(x, y, r, r, "#ffffff", 0.25 + rng() * 0.6));
  }

  // Astro principale
  if (t.astro === "luna") {
    const x = 900 + rng() * 220;
    const y = 120 + rng() * 80;
    pezzi.push(ellisse(x, y, 150, 150, "url(#alone)", 0.55));
    pezzi.push(ellisse(x, y, 56, 56, "#eef4ff", 0.95));
    pezzi.push(ellisse(x - 16, y - 10, 11, 11, "#cdd8f0", 0.5));
    pezzi.push(ellisse(x + 14, y + 12, 8, 8, "#cdd8f0", 0.45));
    pezzi.push(ellisse(x + 4, y - 24, 6, 6, "#cdd8f0", 0.35));
    if (t.sfondo?.atmosfera === "due-lune") {
      const x2 = 250 + rng() * 120;
      const y2 = 180 + rng() * 60;
      pezzi.push(ellisse(x2, y2, 74, 74, "url(#alone)", 0.35));
      pezzi.push(ellisse(x2, y2, 26, 26, "#ffd9c2", 0.85));
    }
  } else if (t.astro === "spazio") {
    // Anello orbitale e pianeta
    const cy = 470 + rng() * 60;
    pezzi.push(percorso(`M -100 ${numero(cy)} Q 640 ${numero(cy - 120)} 1380 ${numero(cy)}`, "none", 1, t.accenti.primo, 3));
    pezzi.push(ellisse(1020, 200 + rng() * 60, 110, 110, "url(#pianeta)", 0.9));
    pezzi.push(ellisse(1020, 200, 110, 110, t.accenti.secondo, 0.12));
  } else {
    const y = t.astro === "sole-basso" ? 520 : t.astro === "sole-medio" ? 400 : 190;
    const x = 240 + rng() * 420;
    pezzi.push(ellisse(x, y, 190, 190, "url(#alone)", 0.7));
    pezzi.push(ellisse(x, y, 58, 58, t.luce, 0.95));
    pezzi.push(ellisse(x, y, 120, 120, t.luce, 0.12));
  }

  // Nuvole / velature
  const nuvole = 3 + Math.round(rng() * 3);
  for (let i = 0; i < nuvole; i++) {
    const y = 120 + rng() * 280;
    const x = rng() * LARGHEZZA;
    const larghezza = 200 + rng() * 320;
    pezzi.push(ellisse(x, y, larghezza, 26 + rng() * 18, t.basso, 0.10 + rng() * 0.12));
  }
  return pezzi.join("");
}

/** Strati di silhouette sullo sfondo (3 livelli per la profondità). */
function stratoFondo(t, rng, livello) {
  const profilo = t.sfondo?.profilo || "montagne";
  const dettagli = t.sfondo?.dettagli || [];
  const base = 470 + livello * 62;
  const opacita = [0.55, 0.78, 1][livello];
  const inchiostro = livello === 2 ? t.inchiostro : mescola(t.inchiostro, t.medio, livello === 0 ? 0.45 : 0.22);
  const pezzi = [];

  if (profilo === "montagne" || profilo === "dune" || profilo === "soglia") {
    const altezza = profilo === "dune" ? 110 : 210;
    pezzi.push(percorso(profiloMontagne(rng, base, altezza, LARGHEZZA, 4 + livello * 2), inchiostro, opacita));
  } else {
    // Orizzonti urbani: isolati di edifici con finestre accese
    pezzi.push(percorso(`M -20 ${numero(base)} L -20 ${numero(base - 40)} L ${numero(LARGHEZZA + 20)} ${numero(base - 40)} L ${numero(LARGHEZZA + 20)} ${numero(base)} Z`, inchiostro, opacita * 0.5));
    let x = -30;
    while (x < LARGHEZZA + 40) {
      const w = 60 + rng() * (livello === 2 ? 130 : 100);
      const h = 80 + rng() * (livello === 2 ? 260 : 190);
      const y = base - h;
      pezzi.push(rettangolo(x, y, w, h, inchiostro, opacita));

      // Finestre accese
      const colonne = Math.max(1, Math.floor(w / 26));
      const righe = Math.max(1, Math.floor(h / 34));
      for (let cx = 0; cx < colonne; cx++) {
        for (let cy = 0; cy < righe; cy++) {
          if (rng() < 0.42) continue;
          const finestra = livello === 2 && rng() < 0.35 ? t.accenti.secondo : t.luce;
          pezzi.push(rettangolo(x + 9 + cx * 26, y + 12 + cy * 34, 10, 14, finestra, 0.10 + rng() * 0.35, 2));
        }
      }
      x += w + 6 + rng() * 16;
    }
  }

  // Dettagli caratteristici dell'ambientazione
  const scegliDettaglio = () => dettagli[Math.floor(rng() * dettagli.length)] || "alberi";
  const quanti = livello === 2 ? 3 : 2;
  for (let i = 0; i < quanti; i++) {
    const x = 80 + rng() * (LARGHEZZA - 160);
    const dettaglio = scegliDettaglio();
    const y = base - 10;
    if (dettaglio === "alberi") {
      pezzi.push(rettangolo(x - 5, y - 70, 10, 70, inchiostro, opacita));
      pezzi.push(ellisse(x, y - 92, 42 + rng() * 18, 36 + rng() * 14, inchiostro, opacita));
    } else if (dettaglio === "alberi-morti") {
      pezzi.push(percorso(`M ${numero(x)} ${numero(y)} L ${numero(x)} ${numero(y - 90)} M ${numero(x)} ${numero(y - 60)} L ${numero(x - 34)} ${numero(y - 86)} M ${numero(x)} ${numero(y - 74)} L ${numero(x + 30)} ${numero(y - 104)}`, inchiostro, opacita, inchiostro, 7));
    } else if (dettaglio === "castello") {
      pezzi.push(rettangolo(x - 26, y - 130, 52, 130, inchiostro, opacita));
      pezzi.push(poligono([[x - 34, y - 130], [x, y - 182], [x + 34, y - 130]], inchiostro, opacita));
      pezzi.push(rettangolo(x - 58, y - 96, 22, 96, inchiostro, opacita));
      pezzi.push(poligono([[x - 64, y - 96], [x - 47, y - 132], [x - 30, y - 96]], inchiostro, opacita));
    } else if (dettaglio === "torre") {
      pezzi.push(rettangolo(x - 30, y - 190, 60, 190, inchiostro, opacita));
      pezzi.push(ellisse(x, y - 196, 34, 34, t.luce, 0.35));
      pezzi.push(linea(x, y - 226, x, y - 250, inchiostro, 4, opacita));
    } else if (dettaglio === "ciliegi") {
      pezzi.push(rettangolo(x - 5, y - 64, 10, 64, inchiostro, opacita));
      pezzi.push(ellisse(x, y - 86, 52, 40, inchiostro, opacita));
      for (let k = 0; k < 8; k++) {
        pezzi.push(ellisse(x - 40 + rng() * 80, y - 100 + rng() * 30, 5, 3, t.accenti.secondo, 0.5));
      }
    } else if (dettaglio === "insegne") {
      const colore = rng() < 0.5 ? t.accenti.primo : t.accenti.secondo;
      pezzi.push(rettangolo(x - 9, y - 150, 18, 108, colore, 0.85, 6));
      pezzi.push(rettangolo(x - 9, y - 150, 18, 108, colore, 0.25, 6));
      pezzi.push(linea(x, y - 150, x, y - 172, inchiostro, 3, 0.9));
    } else if (dettaglio === "lampioni") {
      pezzi.push(linea(x, y, x, y - 120, inchiostro, 5, opacita));
      pezzi.push(ellisse(x, y - 126, 26, 26, t.luce, 0.25));
      pezzi.push(ellisse(x, y - 126, 10, 10, t.luce, 0.8));
    } else if (dettaglio === "fili") {
      pezzi.push(percorso(`M ${numero(x - 120)} ${numero(y - 150)} Q ${numero(x)} ${numero(y - 118)} ${numero(x + 120)} ${numero(y - 152)}`, "none", 0.7, inchiostro, 2));
    } else if (dettaglio === "rovine" || dettaglio === "relitti") {
      pezzi.push(percorso(`M ${numero(x - 44)} ${numero(y)} L ${numero(x - 44)} ${numero(y - 74)} L ${numero(x - 14)} ${numero(y - 96)} L ${numero(x - 6)} ${numero(y - 52)} L ${numero(x + 16)} ${numero(y - 66)} L ${numero(x + 26)} ${numero(y - 20)} L ${numero(x + 44)} ${numero(y)} Z`, inchiostro, opacita));
    } else if (dettaglio === "moduli") {
      pezzi.push(rettangolo(x - 70, y - 60, 140, 60, inchiostro, opacita, 10));
      pezzi.push(rettangolo(x - 30, y - 84, 60, 26, inchiostro, opacita, 8));
      pezzi.push(ellisse(x + 40, y - 30, 7, 7, t.accenti.secondo, 0.9));
      pezzi.push(ellisse(x - 46, y - 30, 7, 7, t.accenti.primo, 0.9));
    } else if (dettaglio === "antenna") {
      pezzi.push(linea(x, y, x, y - 140, inchiostro, 6, opacita));
      pezzi.push(percorso(`M ${numero(x - 36)} ${numero(y - 140)} Q ${numero(x)} ${numero(y - 168)} ${numero(x + 36)} ${numero(y - 140)}`, "none", opacita, inchiostro, 5));
      pezzi.push(ellisse(x, y - 152, 8, 8, t.accenti.primo, 0.9));
    } else if (dettaglio === "palazzi") {
      pezzi.push(rettangolo(x - 46, y - 118, 92, 118, inchiostro, opacita));
    }
  }
  return pezzi.join("");
}

/** Interno: pareti, finestra illuminata, arredi in controluce. */
function interno(t, rng, luogo) {
  const pezzi = [];
  pezzi.push(rettangolo(0, 0, LARGHEZZA, ALTEZZA, "url(#interno)"));
  pezzi.push(percorso(`M 0 ${numero(470)} L ${LARGHEZZA} ${numero(470)} L ${LARGHEZZA} ${numero(ALTEZZA)} L 0 ${numero(ALTEZZA)} Z`, t.inchiostro, 0.55));
  pezzi.push(linea(0, 470, LARGHEZZA, 470, t.luce, 2, 0.18));

  // Finestra (o porta) con luce che entra
  const wx = 160 + rng() * 420;
  const altezzaFinestra = 190 + rng() * 70;
  pezzi.push(rettangolo(wx, 470 - altezzaFinestra, 200, altezzaFinestra, t.luce, 0.20, 6));
  pezzi.push(rettangolo(wx + 10, 470 - altezzaFinestra + 10, 180, altezzaFinestra - 20, "url(#finestra)", 0.55, 4));
  pezzi.push(poligono([[wx, 470], [wx + 200, 470], [wx + 330, ALTEZZA], [wx - 130, ALTEZZA]], t.luce, 0.10));

  // Arredi in controluce
  const quanti = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < quanti; i++) {
    const x = rng() * LARGHEZZA;
    const w = 90 + rng() * 160;
    const h = 40 + rng() * 70;
    pezzi.push(rettangolo(x, 470 - h, w, h, t.inchiostro, 0.95, 4));
    pezzi.push(rettangolo(x, 470 - h - 12, w, 12, t.inchiostro, 0.95, 3));
  }

  // Pavimento a listoni, per dare profondità alla stanza
  for (let i = 0; i < 9; i++) {
    const y = 500 + i * 26;
    pezzi.push(linea(0, y, LARGHEZZA, y, t.luce, 1, 0.05 + i * 0.012));
  }
  // Pareti laterali in scorcio
  pezzi.push(poligono([[0, 0], [140, 90], [140, 470], [0, ALTEZZA]], t.inchiostro, 0.35));
  pezzi.push(poligono([[LARGHEZZA, 0], [LARGHEZZA - 140, 90], [LARGHEZZA - 140, 470], [LARGHEZZA, ALTEZZA]], t.inchiostro, 0.42));

  // Quadri o mensole sulla parete di fondo
  const quantiQuadri = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < quantiQuadri; i++) {
    const qx = 60 + rng() * (LARGHEZZA - 220);
    const qy = 90 + rng() * 180;
    pezzi.push(rettangolo(qx, qy, 90 + rng() * 90, 60 + rng() * 50, t.inchiostro, 0.75, 4));
    pezzi.push(rettangolo(qx + 6, qy + 6, 78 + rng() * 70, 48 + rng() * 36, t.luce, 0.08 + rng() * 0.1, 3));
  }

  // Lampada appesa con cono di luce
  const lx = 200 + rng() * 880;
  pezzi.push(linea(lx, 0, lx, 120, t.inchiostro, 3, 0.9));
  pezzi.push(poligono([[lx - 26, 120], [lx + 26, 120], [lx + 76, 470], [lx - 76, 470]], t.luce, 0.12));
  pezzi.push(ellisse(lx, 124, 30, 16, t.luce, 0.85));
  pezzi.push(ellisse(lx, 60, 120, 90, "url(#alone)", 0.5));

  // Candele o lanterne sul pavimento
  const quantiLumi = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < quantiLumi; i++) {
    const cx = 120 + rng() * (LARGHEZZA - 240);
    const cy = 520 + rng() * 150;
    pezzi.push(rettangolo(cx - 9, cy - 26, 18, 26, t.inchiostro, 0.95, 3));
    pezzi.push(ellisse(cx, cy - 32, 16, 22, t.luce, 0.55));
    pezzi.push(ellisse(cx, cy - 32, 5, 9, "#ffffff", 0.75));
  }

  if (/biblioteca|biblioteca|libri|archivio/i.test(luogo)) {
    for (let s = 0; s < 3; s++) {
      const x = 40 + s * 60;
      pezzi.push(rettangolo(x, 150, 44, 320, t.inchiostro, 0.9, 3));
      for (let r = 0; r < 7; r++) {
        pezzi.push(rettangolo(x + 5, 162 + r * 42, 34, 26, t.luce, 0.12 + rng() * 0.12, 2));
      }
    }
  }
  return pezzi.join("");
}

/** Figura umana stilizzata (silhouette da anime, in controluce). */
function figura({ x = 640, y = 620, scala = 1, rng, colore, accento, modo = "busto", capelli = "lungo", arma = false, opacita = 1, inclinazione = 0, luce = null }) {
  const pettinature = {
    lungo: `M -30 -126 C -36 -168 -20 -186 0 -186 C 20 -186 36 -168 30 -126 C 42 -104 40 -70 32 -46 L 20 -58 C 28 -96 26 -122 20 -138 L -20 -138 C -26 -122 -28 -96 -20 -58 L -32 -46 C -40 -70 -42 -104 -30 -126 Z`,
    corto: `M -30 -124 C -34 -164 -18 -180 0 -180 C 18 -180 34 -164 30 -124 C 24 -142 12 -150 0 -150 C -12 -150 -24 -142 -30 -124 Z`,
    spiky: `M -32 -120 L -22 -156 L -12 -134 L 0 -170 L 12 -134 L 24 -158 L 32 -120 C 22 -134 12 -140 0 -140 C -12 -140 -22 -136 -32 -120 Z`,
    treccia: `M -30 -126 C -34 -164 -18 -180 0 -180 C 18 -180 34 -164 30 -126 C 32 -104 30 -80 28 -60 L 40 -58 C 44 -92 44 -128 34 -146 L -30 -126 Z M 26 -66 C 40 -60 46 -34 34 -6 L 22 -14 C 32 -36 30 -54 20 -60 Z`,
    cappuccio: `M -38 -128 C -38 -178 -16 -192 0 -192 C 16 -192 38 -178 38 -128 C 44 -80 34 -46 22 -34 L -22 -34 C -34 -46 -44 -80 -38 -128 Z`,
    casco: `M -32 -128 C -34 -168 -16 -184 0 -184 C 16 -184 34 -168 32 -128 C 34 -108 30 -92 24 -84 L -24 -84 C -30 -92 -34 -108 -32 -128 Z`
  };
  const pettinatura = pettinature[capelli] || pettinature.lungo;
  const pezzi = [];

  if (modo === "azione") {
    // Posa di scatto: bacino ruotato, gamba anteriore protesa, arma estesa
    pezzi.push(percorso("M -30 -74 L 34 -74 L 46 -8 L 6 -6 L -48 -22 Z", colore, opacita));            // cappotto/mantello
    pezzi.push(percorso("M -20 -152 L 22 -152 L 30 -68 L -28 -68 Z", colore, opacita));               // torso
    pezzi.push(percorso("M -14 -72 L -2 -72 L -12 6 L -30 6 Z", colore, opacita));                    // gamba posteriore
    pezzi.push(percorso("M 12 -70 L 24 -70 L 58 2 L 40 4 Z", colore, opacita));                       // gamba anteriore
    pezzi.push(percorso("M 14 -146 L 56 -128 L 74 -140 L 30 -162 Z", colore, opacita));               // braccio armato
    pezzi.push(percorso("M -14 -146 L -50 -118 L -62 -128 L -24 -158 Z", colore, opacita));           // braccio indietro
    pezzi.push(ellisse(0, -174, 26, 29, colore, opacita));                                            // testa
    pezzi.push(percorso(pettinatura, colore, opacita));
    if (arma) {
      pezzi.push(poligono([[70, -146], [200, -188], [202, -174], [72, -132]], accento, 0.98));
      pezzi.push(percorso("M 196 -188 L 224 -196 L 214 -176 Z", accento, 0.9));                        // punta
      pezzi.push(rettangolo(56, -150, 18, 20, colore, opacita, 4));
    }
    // Scia di movimento
    pezzi.push(percorso("M -120 -172 Q -66 -212 4 -214", "none", 0.6, accento, 6));
    pezzi.push(percorso("M -140 -142 Q -80 -184 -18 -190", "none", 0.35, accento, 3));
    pezzi.push(percorso("M -104 -104 Q -56 -140 8 -146", "none", 0.22, accento, 2));
  } else if (modo === "distante") {
    pezzi.push(percorso("M -18 -150 L 18 -150 L 22 -70 L -22 -70 Z", colore, opacita));
    pezzi.push(percorso("M -18 -70 L 18 -70 L 28 0 L 8 0 L 0 -40 L -8 0 L -28 0 Z", colore, opacita));
    pezzi.push(ellisse(0, -170, 24, 27, colore, opacita));
    pezzi.push(percorso(pettinatura, colore, opacita));
    pezzi.push(percorso("M -34 -140 L -46 -60 L -34 -58 L -24 -134 Z", colore, opacita));
    pezzi.push(percorso("M 34 -140 L 46 -60 L 34 -58 L 24 -134 Z", colore, opacita));
  } else {
    // Busto in primo piano: spalle, collo, testa, capelli e colletto
    pezzi.push(percorso("M -96 10 C -92 -52 -66 -80 -34 -86 L 34 -86 C 66 -80 92 -52 96 10 Z", colore, opacita));
    pezzi.push(percorso("M -22 -84 L 22 -84 L 16 -108 L -16 -108 Z", colore, opacita));               // collo
    pezzi.push(ellisse(0, -146, 34, 40, colore, opacita));                                            // testa
    pezzi.push(percorso(pettinatura, colore, opacita));
    pezzi.push(percorso("M -34 -84 C -12 -66 12 -66 34 -84 L 50 -54 C 18 -38 -18 -38 -50 -54 Z", accento, 0.5)); // colletto/sciarpa
    if (arma) pezzi.push(poligono([[-84, -44], [84, -104], [88, -90], [-78, -30]], accento, 0.85));
  }

  // Rim-light anime: la stessa sagoma, spostata verso la fonte di luce e
  // disegnata dietro in un colore d'accento.
  // Contorno luminoso: una copia identica della sagoma, tracciata con uno
  // spessore e disegnata DIETRO al corpo. Si vede soltanto il bordo esterno.
  let contorno = "";
  if (luce && luce.opacita > 0) {
    const sorgente = pezzi
      .join("")
      .replace(/\sstroke="[^"]*"/g, "")
      .replace(/\sstroke-width="[^"]*"/g, "")
      .replace(/fill="(?!none)[^"]*"/g, `fill="${luce.colore}"`)
      .replace(/<path /g, `<path stroke="${luce.colore}" stroke-width="${numero(luce.spessore ?? 7)}" `);
    contorno = `<g transform="translate(${numero(luce.dx ?? -4)} ${numero(luce.dy ?? -3)})" opacity="${numero(luce.opacita, 2)}">${sorgente}</g>`;
  }

  return `<g transform="translate(${numero(x)} ${numero(y)}) rotate(${numero(inclinazione, 2)}) scale(${numero(scala, 3)})">${contorno}${pezzi.join("")}</g>`;
}

/** Particelle atmosferiche: pioggia, neve, braci, petali, polvere. */
function particelle(t, rng, quante = 90) {
  const atmosfera = t.sfondo?.atmosfera || "nebbia";
  const pezzi = [];
  for (let i = 0; i < quante; i++) {
    const x = rng() * LARGHEZZA;
    const y = rng() * ALTEZZA;
    if (atmosfera === "pioggia" || atmosfera === "pioggia-neon") {
      const lunghezza = 26 + rng() * 40;
      pezzi.push(linea(x, y, x - 8, y + lunghezza, t.luce, 1.4, 0.12 + rng() * 0.22));
    } else if (atmosfera === "petali") {
      pezzi.push(`<g transform="translate(${numero(x)} ${numero(y)}) rotate(${numero(rng() * 360)})">${ellisse(0, 0, 7, 3.4, t.accenti.secondo, 0.35 + rng() * 0.4)}</g>`);
    } else if (atmosfera === "polvere") {
      pezzi.push(ellisse(x, y, 1.6 + rng() * 3, 1.6 + rng() * 3, t.basso, 0.15 + rng() * 0.35));
    } else if (atmosfera === "spazio") {
      pezzi.push(ellisse(x, y, 1 + rng() * 1.6, 1 + rng() * 1.6, "#ffffff", 0.2 + rng() * 0.5));
    } else {
      pezzi.push(ellisse(x, y, 1.5 + rng() * 2.4, 1.5 + rng() * 2.4, t.bagliore, 0.12 + rng() * 0.3));
    }
  }
  return pezzi.join("");
}

/** Raggi di luce che scendono dall'alto. */
function raggi(t, rng, quanti = 5) {
  const pezzi = [];
  for (let i = 0; i < quanti; i++) {
    const x = rng() * LARGHEZZA;
    const larghezza = 40 + rng() * 110;
    pezzi.push(poligono([[x, -40], [x + larghezza, -40], [x + larghezza * 2.2, ALTEZZA], [x + larghezza * 0.8, ALTEZZA]], t.bagliore, 0.05 + rng() * 0.07));
  }
  return pezzi.join("");
}

/** Linee di velocità per le scene d'azione. */
function lineeVelocita(rng, colore, quante = 42) {
  const pezzi = [];
  const cx = 640;
  const cy = 400;
  for (let i = 0; i < quante; i++) {
    const angolo = rng() * Math.PI * 2;
    const r1 = 220 + rng() * 240;
    const r2 = r1 + 90 + rng() * 220;
    pezzi.push(linea(
      cx + Math.cos(angolo) * r1, cy + Math.sin(angolo) * r1 * 0.7,
      cx + Math.cos(angolo) * r2, cy + Math.sin(angolo) * r2 * 0.7,
      colore, 1 + rng() * 3, 0.10 + rng() * 0.22
    ));
  }
  return pezzi.join("");
}

/** Oggetto simbolo al centro della scena di svolta. */
function oggettoSimbolo(t, rng, bancheDa) {
  const scelta = Math.floor(rng() * 4);
  const cx = 640;
  const cy = 330;
  const pezzi = [ellisse(cx, cy, 210, 210, "url(#alone)", 0.5)];

  if (scelta === 0 || bancheDa === "fantasy") {
    // Frammento di specchio / cristallo
    pezzi.push(poligono([[cx, cy - 150], [cx + 96, cy - 20], [cx + 30, cy + 150], [cx - 74, cy + 60]], t.accenti.primo, 0.85));
    pezzi.push(poligono([[cx, cy - 150], [cx + 30, cy + 150], [cx - 20, cy + 96]], "#ffffff", 0.28));
    pezzi.push(linea(cx, cy - 150, cx + 96, cy - 20, "#ffffff", 2, 0.5));
  } else if (scelta === 1) {
    // Lama conficcata
    pezzi.push(poligono([[cx - 12, cy + 170], [cx + 12, cy + 170], [cx + 22, cy - 120], [cx, cy - 170], [cx - 22, cy - 120]], "#e8ecff", 0.9));
    pezzi.push(rettangolo(cx - 62, cy - 132, 124, 16, t.accenti.secondo, 0.9, 4));
    pezzi.push(rettangolo(cx - 12, cy - 178, 24, 46, t.inchiostro, 0.9, 6));
  } else if (scelta === 2) {
    // Occhio / sigillo che osserva
    pezzi.push(percorso(`M ${numero(cx - 180)} ${numero(cy)} Q ${numero(cx)} ${numero(cy - 130)} ${numero(cx + 180)} ${numero(cy)} Q ${numero(cx)} ${numero(cy + 130)} ${numero(cx - 180)} ${numero(cy)} Z`, t.inchiostro, 0.85, t.accenti.primo, 4));
    pezzi.push(ellisse(cx, cy, 54, 54, t.accenti.primo, 0.9));
    pezzi.push(ellisse(cx, cy, 22, 34, t.inchiostro, 1));
    pezzi.push(ellisse(cx - 14, cy - 16, 9, 9, "#ffffff", 0.8));
  } else {
    // Chiave / reliquia tecnologica
    pezzi.push(ellisse(cx, cy - 70, 52, 52, t.accenti.secondo, 0.9));
    pezzi.push(ellisse(cx, cy - 70, 26, 26, t.inchiostro, 1));
    pezzi.push(rettangolo(cx - 14, cy - 20, 28, 190, t.accenti.secondo, 0.9, 6));
    pezzi.push(rettangolo(cx - 14, cy + 96, 60, 20, t.accenti.secondo, 0.9, 4));
    pezzi.push(rettangolo(cx - 14, cy + 134, 44, 20, t.accenti.secondo, 0.9, 4));
  }

  // Crepe che si propagano
  for (let i = 0; i < 7; i++) {
    const angolo = rng() * Math.PI * 2;
    let px = cx + Math.cos(angolo) * 120;
    let py = cy + Math.sin(angolo) * 120;
    let d = `M ${numero(px)} ${numero(py)}`;
    for (let k = 0; k < 3; k++) {
      px += Math.cos(angolo + (rng() - 0.5) * 0.8) * 90;
      py += Math.sin(angolo + (rng() - 0.5) * 0.8) * 90;
      d += ` L ${numero(px)} ${numero(py)}`;
    }
    pezzi.push(percorso(d, "none", 0.35 + rng() * 0.3, "#ffffff", 1.5));
  }
  return pezzi.join("");
}

/** Vignettatura e velo finale per uniformare la scena. */
function vignettatura(t) {
  return `<rect width="${LARGHEZZA}" height="${ALTEZZA}" fill="url(#vignetta)"/>` + rettangolo(0, 0, LARGHEZZA, ALTEZZA, t.bagliore, 0.04);
}

/** Cornice, targhetta del titolo e didascalia. */
function cornice(t, { titolo, didascalia, capitolo, indice }) {
  const pezzi = [];
  pezzi.push(rettangolo(0, ALTEZZA - 108, LARGHEZZA, 108, "#05040c", 0.72));
  pezzi.push(linea(0, ALTEZZA - 108, LARGHEZZA, ALTEZZA - 108, t.accenti.primo, 3, 0.9));
  pezzi.push(rettangolo(0, ALTEZZA - 108, LARGHEZZA, 3, "url(#barra)"));
  pezzi.push(rettangolo(40, ALTEZZA - 84, 6, 56, t.accenti.secondo, 0.95, 3));

  pezzi.push(`<text x="66" y="${ALTEZZA - 72}" font-family="Georgia, 'Times New Roman', serif" font-size="30" fill="#ffffff" opacity="0.97">${esc(titolo)}</text>`);
  pezzi.push(`<text x="66" y="${ALTEZZA - 42}" font-family="Helvetica, Arial, sans-serif" font-size="17" fill="#cfcbe8" opacity="0.85">${esc(didascalia).slice(0, 118)}</text>`);
  pezzi.push(`<text x="${LARGHEZZA - 44}" y="${ALTEZZA - 42}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="15" fill="${t.accenti.primo}" opacity="0.85">Capitolo ${capitolo} · scena ${indice + 1}/${SCENE_PER_CAPITOLO}</text>`);
  pezzi.push(`<text x="${LARGHEZZA - 44}" y="${ALTEZZA - 70}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="15" fill="#8e8ab0" opacity="0.9">Cronache Infinite</text>`);

  // Angoli decorativi
  const c = 26;
  pezzi.push(percorso(`M 14 14 L ${14 + c} 14 M 14 14 L 14 ${14 + c}`, "none", 0.7, t.accenti.primo, 3));
  pezzi.push(percorso(`M ${LARGHEZZA - 14} 14 L ${LARGHEZZA - 14 - c} 14 M ${LARGHEZZA - 14} 14 L ${LARGHEZZA - 14} ${14 + c}`, "none", 0.7, t.accenti.primo, 3));
  pezzi.push(`<rect x="1.5" y="1.5" width="${LARGHEZZA - 3}" height="${ALTEZZA - 3}" fill="none" stroke="#ffffff" stroke-opacity="0.10" stroke-width="3"/>`);
  return pezzi.join("");
}

// ---------------------------------------------------------------------------
// Descrizione delle scene (metadati, senza generare l'SVG)
// ---------------------------------------------------------------------------

/** Estrae dal testo del capitolo la frase più "drammatica" o la domanda finale. */
export function frasiChiave(testo = "") {
  const frasi = String(testo).split(/(?<=[.!?»])\s+/).map((f) => f.trim()).filter((f) => f.length > 24);
  const domanda = [...frasi].reverse().find((f) => f.endsWith("?") && !f.includes("«")) || frasi.at(-1) || "";
  // Punteggio delle frasi: si premiano i momenti di rivelazione
  const marcatoriForti = ["colpo", "improvviso", "all'improvviso", "gelido", "ghiaccio", "sangue", "morte", "verità", "segreto", "nome", "ombra", "sparisce", "scompare", "compare", "tradimento", "rivelazione", "crolla", "si spezza", "si accende"];
  const marcatoriDeboli = ["ma ", "poi ", "però", "tuttavia", "non è", "invece", "eppure", "capisci", "scopri"];
  const narrative = frasi.filter((f) => !f.includes("«") && !f.includes("»") && !/^Avevi deciso/i.test(f));
  const candidati = narrative.length ? narrative : frasi;

  const punteggio = (frase) => {
    const basso = frase.toLowerCase();
    let punti = 0;
    for (const m of marcatoriForti) if (basso.includes(m)) punti += 4;
    for (const m of marcatoriDeboli) if (basso.includes(m)) punti += 2;
    if (frase.length > 60 && frase.length < 150) punti += 2;   // lunghezza ideale per una didascalia
    if (frase.endsWith("!")) punti += 2;
    return punti;
  };

  const svolta = [...candidati].sort((a, b) => punteggio(b) - punteggio(a))[0] || candidati[0] || "";
  const apertura = frasi[0] || "";
  return { apertura, svolta, domanda };
}

/** Elenco delle 5 illustrazioni di un capitolo (leggero: nessun SVG). */
export function descriviIllustrazioni(partita, capitolo) {
  const luogo = capitolo?.deltaStato?.luogo || partita?.stato?.luogo || "un luogo senza nome";
  const momento = partita?.stato?.momento || "";
  const relazioni = capitolo?.deltaStato?.relazioni || [];
  const npc = relazioni[0]?.npc || partita?.stato?.relazioni?.at(-1)?.npc || "lo sconosciuto";
  const ruolo = relazioni[0]?.ruolo || partita?.stato?.relazioni?.at(-1)?.ruolo || "figura misteriosa";
  const azione = capitolo?.azioneGiocatore?.testo || "L'inizio della saga";
  const { svolta, domanda } = frasiChiave(capitolo?.testo || "");

  const titoli = [
    { tipo: "panorama", titolo: luogo, didascalia: `${momento ? `${momento} · ` : ""}${partita?.configurazione?.ambientazione?.nome || "La scena si apre"}` },
    { tipo: "ritratto", titolo: npc, didascalia: `${ruolo} · primo piano` },
    { tipo: "azione", titolo: "La tua mossa", didascalia: azione },
    { tipo: "svolta", titolo: "Il colpo di scena", didascalia: svolta || "Qualcosa cambia, e nulla sarà più come prima." },
    { tipo: "cliffhanger", titolo: "Continua…", didascalia: domanda || "Cosa farai adesso?" }
  ];

  return titoli.map((voce, indice) => ({
    indice,
    tipo: TIPI[indice],
    titolo: String(voce.titolo).slice(0, 60),
    didascalia: String(voce.didascalia).replace(/\s+/g, " ").slice(0, 120),
    url: `/api/partite/${partita.id}/illustrazioni/${capitolo.numero}/${indice}`
  }));
}

// ---------------------------------------------------------------------------
// Generazione dell'illustrazione
// ---------------------------------------------------------------------------
function definizioni(t) {
  return `
  <defs>
    <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${t.alto}"/>
      <stop offset="52%" stop-color="${t.medio}"/>
      <stop offset="100%" stop-color="${t.basso}"/>
    </linearGradient>
    <linearGradient id="interno" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${t.alto}"/>
      <stop offset="70%" stop-color="${t.medio}"/>
      <stop offset="100%" stop-color="${t.inchiostro}"/>
    </linearGradient>
    <linearGradient id="finestra" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${t.luce}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${t.basso}" stop-opacity="0.35"/>
    </linearGradient>
    <linearGradient id="barra" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${t.accenti.primo}"/>
      <stop offset="60%" stop-color="${t.accenti.secondo}"/>
      <stop offset="100%" stop-color="${t.accenti.primo}" stop-opacity="0.2"/>
    </linearGradient>
    <radialGradient id="alone">
      <stop offset="0%" stop-color="${t.bagliore}" stop-opacity="0.85"/>
      <stop offset="55%" stop-color="${t.bagliore}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="${t.bagliore}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="pianeta">
      <stop offset="0%" stop-color="${t.basso}"/>
      <stop offset="70%" stop-color="${t.medio}"/>
      <stop offset="100%" stop-color="${t.alto}"/>
    </radialGradient>
    <radialGradient id="vignetta" cx="50%" cy="45%" r="72%">
      <stop offset="55%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="${t.contrasto}"/>
    </radialGradient>
    <pattern id="puntini" width="14" height="14" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.4" fill="#ffffff" opacity="0.10"/>
    </pattern>
  </defs>`;
}

/**
 * Genera l'illustrazione di una scena.
 * @returns {{svg:string, tipo:string, titolo:string, didascalia:string}}
 */
export function generaScena({ partita, capitolo, indice }) {
  const info = descriviIllustrazioni(partita, capitolo)[indice];
  if (!info) throw new Error("Scena inesistente");

  const ambito = partita.configurazione.ambientazione;
  const tipo = info.tipo;
  const t = tavolozza({
    momento: partita.stato?.momento || capitolo?.deltaStato?.momento || (capitolo?.numero === 1 ? "crepuscolo" : "notte"),
    bancheDa: ambito.bancheDa || ambito.id,
    colori: ambito.colori,
    tipo
  });

  const rng = creaRng(creaSeme(partita.id, "scena", capitolo.numero, indice, ambito.id));
  const luogo = info.tipo === "panorama" ? info.titolo : (capitolo?.deltaStato?.luogo || partita.stato?.luogo || "il luogo");
  const relazioni = capitolo?.deltaStato?.relazioni || [];
  const npc = relazioni[0]?.npc || partita.stato?.relazioni?.at(-1)?.npc || "sconosciuto";
  const capelli = scegliCapelli(rng, npc, ambito.id);

  const corpo = [];

  if (tipo === "panorama") {
    const alChiuso = eInterno(luogo);
    if (alChiuso) {
      corpo.push(interno(t, rng, luogo));
    } else {
      corpo.push(cielo(t, rng));
      corpo.push(raggi(t, rng, 4));
      for (let livello = 0; livello < 3; livello++) corpo.push(stratoFondo(t, rng, livello));
    }
    corpo.push(particelle(t, rng, alChiuso ? 40 : 90));
    corpo.push(figura({
      x: 300 + rng() * 120, y: 660, scala: 1.05, rng, colore: t.inchiostro, accento: t.accenti.primo,
      modo: "distante", capelli, opacita: 0.98,
      luce: { colore: t.bagliore, dx: -9, dy: -4, opacita: 0.55 }
    }));
  } else if (tipo === "ritratto") {
    corpo.push(cielo(t, rng));
    corpo.push(ellisse(760, 300, 330, 330, "url(#alone)", 0.75));
    corpo.push(stratoFondo(t, rng, 0));
    corpo.push(stratoFondo(t, rng, 1));
    corpo.push(rettangolo(0, 0, LARGHEZZA, ALTEZZA, "url(#puntini)", 0.35));
    corpo.push(figura({
      x: 780, y: 700, scala: 2.55, rng, colore: t.inchiostro, accento: t.accenti.secondo,
      modo: "busto", capelli, arma: rng() < 0.35,
      luce: { colore: t.accenti.secondo, dx: 8, dy: -5, opacita: 0.45 }
    }));
    corpo.push(percorso("M 640 690 L 620 90", "none", 0.35, t.accenti.primo, 6));
    corpo.push(particelle(t, rng, 70));
  } else if (tipo === "azione") {
    corpo.push(cielo(t, rng));
    corpo.push(ellisse(640, 380, 460, 380, "url(#alone)", 0.45));
    corpo.push(lineeVelocita(rng, t.luce, 54));
    corpo.push(figura({
      x: 600, y: 700, scala: 2.45, rng, colore: t.inchiostro, accento: t.accenti.secondo,
      modo: "azione", capelli, arma: true, opacita: 1, inclinazione: -6,
      luce: { colore: t.accenti.primo, dx: 7, dy: -4, opacita: 0.5 }
    }));
    // Esplosione d'impatto
    const punte = [];
    for (let i = 0; i < 18; i++) {
      const angolo = (i / 18) * Math.PI * 2;
      const raggio = i % 2 === 0 ? 210 : 96;
      punte.push([900 + Math.cos(angolo) * raggio, 330 + Math.sin(angolo) * raggio * 0.8]);
    }
    corpo.push(poligono(punte, t.accenti.primo, 0.28));
    for (let i = 0; i < 24; i++) {
      const x = 700 + rng() * 520;
      const y = 200 + rng() * 420;
      corpo.push(`<g transform="translate(${numero(x)} ${numero(y)}) rotate(${numero(rng() * 360)})">${rettangolo(-4, -9, 8 + rng() * 16, 6 + rng() * 10, t.inchiostro, 0.85, 2)}</g>`);
    }
    corpo.push(particelle(t, rng, 60));
  } else if (tipo === "svolta") {
    corpo.push(rettangolo(0, 0, LARGHEZZA, ALTEZZA, t.inchiostro, 1));
    corpo.push(ellisse(640, 340, 640, 420, "url(#alone)", 0.5));
    corpo.push(poligono([[520, -40], [700, -40], [980, ALTEZZA], [420, ALTEZZA]], t.bagliore, 0.12));
    corpo.push(oggettoSimbolo(t, rng, ambito.bancheDa || ambito.id));
    corpo.push(particelle(t, rng, 90));
    corpo.push(figura({
      x: 205, y: 720, scala: 1.65, rng, colore: "#02020a", accento: t.accenti.secondo,
      modo: "busto", capelli, opacita: 0.96,
      luce: { colore: t.accenti.primo, dx: 6, dy: -4, opacita: 0.5 }
    }));
  } else {
    // Cliffhanger: figura minuscola davanti a una presenza gigantesca
    corpo.push(cielo(t, rng));
    corpo.push(ellisse(760, 300, 620, 470, "url(#alone)", 0.6));
    corpo.push(stratoFondo(t, rng, 0));

    // Presenza incombente: sagoma frastagliata che occupa il lato destro
    const presenza = [[LARGHEZZA + 40, ALTEZZA], [LARGHEZZA + 40, 40]];
    let px = LARGHEZZA - 30;
    let py = 70;
    for (let i = 0; i < 8; i++) {
      px -= 28 + rng() * 62;
      py += 52 + rng() * 58;
      presenza.push([px, py]);
    }
    presenza.push([560, ALTEZZA]);
    corpo.push(poligono(presenza, "#02020a", 0.97));
    // Bordo luminoso sulla sagoma
    corpo.push(percorso(`M ${numero(LARGHEZZA + 40)} 40 ${presenza.slice(2).map(([x, y]) => `L ${numero(x)} ${numero(y)}`).join(" ")}`, "none", 0.35, t.accenti.primo, 3));

    // Due sagome più lontane, per profondità
    corpo.push(poligono([[1240, ALTEZZA], [1240, 150], [1120, 260], [1010, 420], [940, ALTEZZA]], "#0a0820", 0.75));
    corpo.push(poligono([[LARGHEZZA, 520], [LARGHEZZA, 250], [1180, 360], [1120, ALTEZZA]], "#080716", 0.85));

    // Occhi brillanti, dentro la parte alta della sagoma
    const occhio1 = { x: 1080, y: 300 };
    const occhio2 = { x: 1168, y: 272 };
    corpo.push(ellisse(occhio1.x, occhio1.y, 62, 30, "url(#alone)", 0.8));
    corpo.push(ellisse(occhio1.x, occhio1.y, 34, 12, t.accenti.primo, 0.95));
    corpo.push(ellisse(occhio2.x, occhio2.y, 26, 9.5, t.accenti.primo, 0.8));
    corpo.push(ellisse(occhio1.x, occhio1.y, 15, 5, "#ffffff", 0.9));

    corpo.push(particelle(t, rng, 110));
    corpo.push(stratoFondo(t, rng, 1));

    // Il protagonista, minuscolo, visto di spalle
    corpo.push(ellisse(400, 690, 190, 70, t.inchiostro, 0.5));
    corpo.push(figura({
      x: 400, y: 700, scala: 1.15, rng, colore: "#04030a", accento: t.accenti.primo,
      modo: "distante", capelli, opacita: 1,
      luce: { colore: t.bagliore, dx: -4, dy: -3, opacita: 0.3 }
    }));
    corpo.push(percorso("M 250 700 Q 400 660 556 702", "none", 0.35, t.bagliore, 4));

    // Targhetta del cliffhanger, in alto a sinistra (non copre la scena)
    corpo.push(rettangolo(52, 52, 300, 62, "#05040c", 0.72, 12));
    corpo.push(rettangolo(52, 52, 8, 62, t.accenti.primo, 1, 4));
    corpo.push(`<text x="82" y="94" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="#ffffff" opacity="0.97">Continua…</text>`);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGHEZZA} ${ALTEZZA}" width="${LARGHEZZA}" height="${ALTEZZA}" role="img" aria-label="${esc(info.titolo)} — ${esc(info.didascalia)}">
${definizioni(t)}
${corpo.filter(Boolean).join("\n")}
${vignettatura(t)}
${cornice(t, { titolo: info.titolo, didascalia: info.didascalia, capitolo: capitolo.numero, indice })}
</svg>`;

  return { svg, tipo: info.tipo, titolo: info.titolo, didascalia: info.didascalia, indice };
}

/** Sceglie una pettinatura coerente con il nome dell'NPC (stabile nel tempo). */
function scegliCapelli(rng, npc, bancheDa) {
  const varianti = bancheDa === "scifi" || bancheDa === "cyberpunk"
    ? ["corto", "spiky", "casco", "corto"]
    : ["lungo", "treccia", "corto", "cappuccio", "spiky"];
  const semeNome = [...String(npc)].reduce((a, c) => a + c.charCodeAt(0), 0);
  if (semeNome % 3 === 0) return varianti[0];
  return varianti[(semeNome + Math.floor(rng() * 3)) % varianti.length];
}

/** Prompt per un eventuale modello di immagini esterno (opzionale). */
export function promptImmagine(partita, capitolo, indice) {
  const info = descriviIllustrazioni(partita, capitolo)[indice];
  const stile = "anime key visual, cel shading, cinematic lighting, detailed background, no text, no watermark, 16:9";
  const descrizioni = {
    panorama: `wide establishing shot of ${info.titolo}, ${info.didascalia}`,
    ritratto: `close-up portrait of ${info.titolo}, ${info.didascalia}, dramatic rim light`,
    azione: `dynamic action scene, ${info.titolo}: ${info.didascalia}, motion blur, impact`,
    svolta: `dramatic reveal, ${info.titolo}: ${info.didascalia}, high contrast, god rays`,
    cliffhanger: `cliffhanger shot, small figure facing a huge silhouette, ${info.didascalia}`
  };
  return `${descrizioni[info.tipo]}. Ambientazione: ${partita.configurazione.ambientazione.nome}. ${partita.configurazione.ambientazione.descrizione} Stile: ${stile}.`;
}
