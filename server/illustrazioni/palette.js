/**
 * palette.js — Tavolozze cromatiche delle illustrazioni di scena.
 *
 * Ogni scena eredita i colori dall'ambientazione e dal momento della giornata,
 * così le immagini restano coerenti con la narrazione (e con il tema della UI).
 */

/** Cieli per momento della giornata: dal più luminoso al più notturno. */
export const CIELI = {
  alba: { alto: "#2b1a45", medio: "#8a4a7d", basso: "#ff9d6b", luce: "#ffd2a1", astro: "sole-basso", stelle: 0.35, umidita: 0.5 },
  mattino: { alto: "#1f4f9e", medio: "#5aa0e8", basso: "#bfe6ff", luce: "#fff3d0", astro: "sole-alto", stelle: 0, umidita: 0.25 },
  mezzogiorno: { alto: "#1b6ec4", medio: "#4ea6ee", basso: "#d8f1ff", luce: "#ffffff", astro: "sole-alto", stelle: 0, umidita: 0.1 },
  pomeriggio: { alto: "#2b4ea0", medio: "#7a6fc0", basso: "#ffb27a", luce: "#ffd39a", astro: "sole-medio", stelle: 0, umidita: 0.2 },
  crepuscolo: { alto: "#150c33", medio: "#5b2a6e", basso: "#ff7a59", luce: "#ff8f6b", astro: "sole-basso", stelle: 0.6, umidita: 0.35 },
  notte: { alto: "#050818", medio: "#16234d", basso: "#2d3f7a", luce: "#9fc0ff", astro: "luna", stelle: 1, umidita: 0.3 },
  "notte fonda": { alto: "#02030a", medio: "#0a1030", basso: "#161f4d", luce: "#6f8de0", astro: "luna", stelle: 1, umidita: 0.4 }
};

/** Elementi di sfondo caratteristici di ciascuna ambientazione. */
export const SFONDI = {
  fantasy: { profilo: "montagne", dettagli: ["castello", "alberi", "alberi"], atmosfera: "due-lune", accenti: ["#c084fc", "#34d399"] },
  scifi: { profilo: "orbitale", dettagli: ["moduli", "antenna", "relitti"], atmosfera: "spazio", accenti: ["#2dd4bf", "#60a5fa"] },
  cyberpunk: { profilo: "metropoli", dettagli: ["insegne", "antenne", "palazzi"], atmosfera: "pioggia-neon", accenti: ["#f472b6", "#22d3ee"] },
  accademia: { profilo: "campus", dettagli: ["torre", "ciliegi", "alberi"], atmosfera: "petali", accenti: ["#a78bfa", "#fbcfe8"] },
  postapoc: { profilo: "dune", dettagli: ["rovine", "relitti", "alberi-morti"], atmosfera: "polvere", accenti: ["#fbbf24", "#fb7185"] },
  mistero: { profilo: "quartiere", dettagli: ["palazzi", "lampioni", "fili"], atmosfera: "pioggia", accenti: ["#818cf8", "#38bdf8"] },
  personalizzata: { profilo: "soglia", dettagli: ["alberi", "rovine", "antenne"], atmosfera: "nebbia", accenti: ["#c084fc", "#34d399"] }
};

/** Parole che rivelano un luogo chiuso (le scene interne hanno un'altra composizione). */
const PAROLE_INTERNO = [
  "aula", "sala", "biblioteca", "corridoio", "stiva", "ponte", "tettoia", "konbini", "sottopasso",
  "casa", "torre", "rifugio", "taverna", "mercato coperto", "navata", "santuario", "cabina", "ufficio",
  "camera", "cantina", "seminterrato", "laboratorio", "infermeria", "stanza", "atrio", "mensa"
];

export function eInterno(nomeLuogo = "") {
  const basso = String(nomeLuogo).toLowerCase();
  return PAROLE_INTERNO.some((p) => basso.includes(p));
}

export function cieloPer(momento) {
  const chiave = String(momento || "notte").toLowerCase();
  return CIELI[chiave] || CIELI.notte;
}

export function sfondoPer(bancheDa) {
  return SFONDI[bancheDa] || SFONDI.personalizzata;
}

/**
 * Tavolozza completa di una scena: cielo, accenti dell'ambientazione,
 * luci, atmosfera da particelle ed eventuale "modo drammatico".
 */
export function tavolozza({ momento, bancheDa, colori, tipo }) {
  const cielo = cieloPer(momento);
  const sfondo = sfondoPer(bancheDa);
  const accenti = {
    primo: colori?.primo || sfondo.accenti[0],
    secondo: colori?.secondo || sfondo.accenti[1]
  };

  // Le scene di svolta e di cliffhanger sono sempre più cupe e contrastate
  const drammatico = tipo === "svolta" || tipo === "cliffhanger" || tipo === "azione";
  const notte = ["notte", "notte fonda", "crepuscolo"].includes(String(momento || "").toLowerCase());

  return {
    ...cielo,
    accenti,
    sfondo,
    drammatico,
    notte,
    inchiostro: "#05040c",
    nebbia: cielo.basso,
    bagliore: drammatico ? accenti.primo : cielo.luce,
    contrasto: drammatico ? 0.92 : notte ? 0.8 : 0.72
  };
}
