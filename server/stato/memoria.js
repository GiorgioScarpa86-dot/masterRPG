/**
 * memoria.js — State Engine: la memoria a lungo termine della saga.
 *
 * Responsabilità:
 *  1. mantenere la sinossi (una voce per capitolo) e comprimerla quando cresce;
 *  2. costruire il "digest" di memoria che viene iniettato implicitamente
 *     in ogni prompt narrativo (evita allucinazioni e perdita di trama);
 *  3. esporre la scheda leggibile usata dal pannello
 *     "Scheda del Personaggio e Storia";
 *  4. MEMORIA PROFONDA in stile OOC: ogni NPC conserva fatti, promesse e
 *     un'impressione del protagonista che evolve con capitoli e conversazioni;
 *  5. PROFILO DEL GIOCATORE: lo stile di gioco (scelte, lunghezze, intenti)
 *     viene osservato e iniettato nel prompt perché l'IA vi si adatti;
 *  6. RICHIAMO DELLA MEMORIA: data un'azione, si selezionano i ricordi più
 *     pertinenti (sinossi, obiettivi, ricordi degli NPC) da iniettare in scena.
 */

import { quadrante } from "./relazioni.js";

const MAX_SINOSSI_DETTAGLIATA = 8;      // capitoli tenuti per esteso nella sinossi
const MAX_CARATTERI_VOCE = 240;        // lunghezza massima di una voce di sinossi
const MAX_PAROLE_RIASSUNTO_ANTICO = 150; // il riassunto compresso non cresce mai oltre
const MAX_CARATTERI_DIGEST = 7000;     // limite di sicurezza del testo iniettato nel prompt
const MAX_FATTI_NPC = 8;               // ricordi conservati per ogni NPC
const MAX_PROMESSE_NPC = 4;            // promesse/segreti conservati per ogni NPC

/** Parole troppo comuni per essere indizi di richiamo della memoria. */
const STOPWORD_MEMORIA = new Set([
  "il", "lo", "la", "i", "gli", "le", "un", "uno", "una", "di", "a", "da", "in", "con", "su", "per",
  "tra", "fra", "e", "ed", "o", "ma", "che", "chi", "cui", "non", "del", "della", "dei", "delle",
  "al", "alla", "ai", "alle", "dal", "dalla", "nel", "nella", "sul", "sulla", "sono", "era",
  "dove", "come", "quando", "questo", "questa", "questi", "queste", "suo", "sua", "suoi", "sue",
  "mio", "mia", "ci", "si", "ti", "mi", "vi", "ne", "più", "meno", "molto", "poco", "cosa",
  "tutto", "tutti", "tutta", "tutte", "essere", "avere", "fare", "può", "possono", "anche", "ancora",
  "voglio", "vorrei", "allora", "adesso", "qui", "lui", "lei", "noi", "voi", "loro", "dopo", "prima"
]);

/** Aggiunge la voce di sinossi del capitolo appena generato. */
export function aggiungiSinossi(stato, numero, testo) {
  const pulito = String(testo || "").trim();
  if (!pulito) return stato;
  if (stato.sinossi.some((v) => v.capitolo === numero)) return stato;
  stato.sinossi.push({ capitolo: numero, testo: pulito.slice(0, MAX_CARATTERI_VOCE) });
  comprimi(stato);
  return stato;
}

/**
 * Compatta le voci più vecchie in un riassunto unico, così la memoria
 * resta grande a piacere ma il prompt non esplode mai.
 */
export function comprimi(stato) {
  if (stato.sinossi.length <= MAX_SINOSSI_DETTAGLIATA) return stato;

  const vecchie = stato.sinossi.splice(0, stato.sinossi.length - MAX_SINOSSI_DETTAGLIATA);
  if (!vecchie.length) return stato;

  // Il riassunto delle parti antiche viene fuso con quello precedente e
  // troncato: la memoria resta fedele ai fatti recenti senza crescere all'infinito.
  let testoAntico = "";
  for (const voce of vecchie) {
    const pezzo = voce.compresso
      ? voce.testo.replace(/^(?:Capitoli\s[\d-]+\s\(riassunto\):\s*)/, "").replace(/[…\.]+$/, "")
      : voce.testo.replace(/\.$/, "");
    testoAntico = testoAntico ? `${testoAntico}; ${pezzo}` : pezzo;
  }

  let parole = testoAntico.split(/\s+/);
  if (parole.length > MAX_PAROLE_RIASSUNTO_ANTICO) {
    parole = parole.slice(-MAX_PAROLE_RIASSUNTO_ANTICO);
    testoAntico = `…${parole.join(" ")}`;
  }

  const primo = vecchie[0].capitolo;
  const fine = vecchie[vecchie.length - 1].capitoloFine || vecchie[vecchie.length - 1].capitolo;

  stato.sinossi = [
    { capitolo: primo, capitoloFine: fine, compresso: true, testo: `${testoAntico}.` },
    ...stato.sinossi
  ];

  if (stato.memoria) {
    stato.memoria.capitoliRiassunti = stato.sinossi.reduce(
      (acc, v) => acc + (v.compresso ? (v.capitoloFine || v.capitolo) - v.capitolo + 1 : 1),
      0
    );
  }
  return stato;
}

/** Digest testuale della memoria: è QUESTO il testo iniettato nel prompt del Game Master. */
export function digest(partita) {
  const { configurazione: config, stato } = partita;
  const righe = [];

  righe.push("=== SCHEDA DEL PERSONAGGIO ===");
  righe.push(`Protagonista: ${config.protagonista.nome} — ${config.protagonista.archetipo} (${config.protagonista.tratto})`);
  righe.push(`Tono narrativo richiesto: ${config.tono}`);
  righe.push(`Vitali: Vita ${stato.vitali.vita}/100 · Energia ${stato.vitali.energia}/100 · Tensione ${stato.vitali.tensione}/100`);
  righe.push(`Luogo attuale: ${stato.luogo || "da definire"}`);

  const profilo = descriviProfilo(stato.profiloGiocatore);
  if (profilo.length) {
    righe.push("=== PROFILO DEL GIOCATORE (adatta la narrazione al suo stile) ===");
    for (const riga of profilo) righe.push(`  - ${riga}`);
  }

  righe.push("Inventario:");
  if (!stato.inventario.length) {
    righe.push("  - (vuoto: il protagonista non possiede ancora nulla)");
  } else {
    for (const o of stato.inventario) {
      righe.push(`  - ${o.nome} [${o.rarita}]${o.quantita > 1 ? ` x${o.quantita}` : ""}${o.descrizione ? ` — ${o.descrizione}` : ""}`);
    }
  }

  righe.push("=== ALBERO DI FIDUCIA — RELAZIONI CON GLI NPC (assi: Vincolo / Tensione / Rispetto) ===");
  if (!stato.relazioni.length) {
    righe.push("  - (nessun NPC incontrato finora)");
  } else {
    for (const r of stato.relazioni) {
      const q = quadrante(r);
      const tappe = (r.tappe || []).slice(-2).map((t) => `${t.nome} (cap. ${t.capitolo})`).join(", ");
      righe.push(`  - ${r.npc} — ${r.ruolo} · ${q.nome} · Vincolo ${r.vincolo ?? r.fiducia ?? 50} / Tensione ${r.tensione ?? 30} / Rispetto ${r.rispetto ?? 50}`);
      if (r.nota) righe.push(`      nota: ${r.nota}`);
      if (tappe) righe.push(`      tappe: ${tappe}`);
      // Memoria profonda dell'NPC: ciò che ricorda davvero di te
      const mem = r.memoria;
      if (mem?.impressione) righe.push(`      impressione che ha di te: ${mem.impressione}`);
      if (mem?.fatti?.length) righe.push(`      ricorda: ${mem.fatti.slice(-4).join(" · ")}`);
      if (mem?.promesse?.length) righe.push(`      promesse fra voi: ${mem.promesse.join(" · ")}`);
      if (mem?.ultimaConversazione) righe.push(`      ultima conversazione: cap. ${mem.ultimaConversazione.capitolo}, a proposito di «${mem.ultimaConversazione.argomento}»`);
    }
  }

  righe.push("=== SINOSSI DELLA STORIA (canonica, non contraddire) ===");
  if (!stato.sinossi.length) {
    righe.push("  - (nessun capitolo precedente: è l'inizio della saga)");
  } else {
    for (const v of stato.sinossi) {
      const etichetta = v.compresso
        ? `Cap. ${v.capitolo}-${v.capitoloFine} (riassunto)`
        : `Cap. ${v.capitolo}`;
      righe.push(`  - ${etichetta} — ${v.testo}`);
    }
  }

  righe.push("=== OBIETTIVI ===");
  const aperti = stato.obiettivi.filter((o) => o.stato === "aperto");
  if (!aperti.length) righe.push("  - (nessun obiettivo aperto)");
  else for (const o of aperti) righe.push(`  - ${o.testo}`);

  if (stato.ultimaScelta) {
    righe.push("=== ULTIMA AZIONE DEL GIOCATORE ===");
    righe.push(`  - ${stato.ultimaScelta}`);
  }

  if (stato.luoghiVisitati?.length) {
    righe.push("=== LUOGHI GIÀ VISITATI ===");
    righe.push(`  - ${stato.luoghiVisitati.slice(-6).join(" · ")}`);
  }

  if (stato.arco?.beat) {
    righe.push("=== ARCO NARRATIVO ===");
    righe.push(`  - Beat corrente: ${stato.arco.beat} · capitolo ${stato.arco.capitoloBeat}`);
  }

  return limitaDigest(righe);
}

/**
 * Rete di sicurezza: il digest iniettato nel prompt non supera mai una
 * dimensione ragionevole, anche in saghe di centinaia di capitoli.
 * Si eliminano prima le voci di sinossi più antiche (dopo il riassunto).
 */
function limitaDigest(righe) {
  let testo = righe.join("\n");
  if (testo.length <= MAX_CARATTERI_DIGEST) return testo;

  const righeSinossi = righe
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => /^ {2}- (Cap\.|Capitoli )/.test(r))
    .map(({ i }) => i);

  for (const indice of righeSinossi) {
    righe[indice] = null;
    testo = righe.filter(Boolean).join("\n");
    if (testo.length <= MAX_CARATTERI_DIGEST) break;
  }
  return testo;
}

/** Versione strutturata del digest, per il pannello della UI e per l'endpoint /memoria. */
export function scheda(partita) {
  const { configurazione: config, stato, economia, memoria } = partita;
  return {
    protagonista: {
      nome: config.protagonista.nome,
      archetipo: config.protagonista.archetipo,
      tratto: config.protagonista.tratto,
      vitali: { ...stato.vitali },
      luogo: stato.luogo,
      capitolo: stato.capitolo,
      arco: stato.arco
    },
    inventario: stato.inventario,
    relazioni: stato.relazioni,
    sinossi: stato.sinossi,
    obiettivi: stato.obiettivi,
    luoghiVisitati: stato.luoghiVisitati,
    titoli: stato.titoli,
    ultimaScelta: stato.ultimaScelta,
    contatori: stato.contatori,
    token: {
      valuta: economia.valuta,
      saldo: economia.saldo,
      costoCapitolo: economia.costoCapitolo
    },
    memoria: {
      riassuntoCompresso: memoria?.riassuntoCompresso || "",
      paroleTotali: memoria?.paroleTotali || 0,
      capitoliRiassunti: memoria?.capitoliRiassunti || 0
    },
    profiloGiocatore: stato.profiloGiocatore || null,
    battuteDialogo: stato.contatori?.battute || 0
  };
}

// ---------------------------------------------------------------------------
// Profilo del giocatore — "i personaggi si adattano al tuo stile" (stile OOC)
// ---------------------------------------------------------------------------

/** Struttura iniziale del profilo di stile del giocatore. */
export function profiloIniziale() {
  return {
    azioni: 0,
    scelteRapide: 0,
    azioniLibere: 0,
    stili: { audace: 0, prudente: 0, astuta: 0, empatica: 0 },
    intenti: {},
    lunghezzaTotale: 0
  };
}

/**
 * Osserva l'azione appena giocata e aggiorna il profilo di stile.
 * Il profilo viene iniettato nel prompt perché il Game Master si adatti
 * al modo di giocare della persona (come fanno i personaggi di OOC).
 */
export function aggiornaProfiloGiocatore(stato, azione, intento = null) {
  if (!azione || typeof azione !== "object") return stato;
  const profilo = stato.profiloGiocatore || (stato.profiloGiocatore = profiloIniziale());
  profilo.azioni += 1;

  if (azione.tipo === "scelta") {
    profilo.scelteRapide += 1;
    if (azione.tipoScelta && profilo.stili[azione.tipoScelta] !== undefined) {
      profilo.stili[azione.tipoScelta] += 1;
    }
  } else if (azione.testo) {
    profilo.azioniLibere += 1;
    profilo.lunghezzaTotale += String(azione.testo).length;
  }

  if (intento) profilo.intenti[intento] = (profilo.intenti[intento] || 0) + 1;
  return stato;
}

/** Descrizione leggibile del profilo, pronta per il prompt e per la scheda. */
export function descriviProfilo(profilo) {
  if (!profilo || !profilo.azioni) return [];
  const righe = [];
  righe.push(
    `${profilo.azioni} azioni giocate finora: ${profilo.azioniLibere} personalizzate e ${profilo.scelteRapide} scelte rapide.`
  );

  const stili = Object.entries(profilo.stili || {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  if (stili.length) {
    const [stile, volte] = stili[0];
    righe.push(
      `Stile preferito: ${stile} (${volte} volte su ${profilo.azioni}). Asseconda questo stile nelle conseguenze, ma ogni tanto sorprendi il giocatore con una situazione che lo costringe a cambiare registro.`
    );
  }

  if (profilo.azioniLibere > 0) {
    const media = Math.round(profilo.lunghezzaTotale / profilo.azioniLibere);
    righe.push(
      media >= 120
        ? "Il giocatore scrive azioni lunghe e dettagliate: premia la sua creatività facendo reagire il mondo ad almeno un dettaglio specifico di ciò che ha scritto."
        : "Il giocatore scrive azioni brevi e dirette: tieni il ritmo svelto e le scene concrete."
    );
  }

  const intenti = Object.entries(profilo.intenti || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([nome]) => nome);
  if (intenti.length) {
    righe.push(`Tendenze ricorrenti del giocatore: ${intenti.join(", ")}.`);
  }
  return righe;
}

// ---------------------------------------------------------------------------
// Memoria profonda degli NPC — "compagni che ricordano e crescono" (stile OOC)
// ---------------------------------------------------------------------------

/**
 * Aggiunge un ricordo alla memoria di un NPC.
 * I ricordi arrivano dai capitoli (deltaStato) e dalla Modalità Personaggio
 * (le conversazioni dirette): fatti condivisi, promesse, impressioni che
 * evolvono nel tempo.
 */
export function registraMemoriaNpc(stato, nomeNpc, { fatto = null, promessa = null, impressione = null, capitolo = null, argomento = null } = {}) {
  const cercato = String(nomeNpc || "").toLowerCase();
  const relazione = (stato.relazioni || []).find((r) => r.npc.toLowerCase() === cercato);
  if (!relazione) return stato;

  const memoria = relazione.memoria || (relazione.memoria = { fatti: [], promesse: [], impressione: "", conversazioni: 0, ultimaConversazione: null });

  if (fatto) {
    const testo = String(fatto).trim().slice(0, 180);
    if (testo && !memoria.fatti.some((f) => f.toLowerCase() === testo.toLowerCase())) {
      memoria.fatti = [...memoria.fatti, testo].slice(-MAX_FATTI_NPC);
    }
  }
  if (promessa) {
    const testo = String(promessa).trim().slice(0, 180);
    if (testo && !memoria.promesse.some((p) => p.toLowerCase() === testo.toLowerCase())) {
      memoria.promesse = [...memoria.promesse, testo].slice(-MAX_PROMESSE_NPC);
    }
  }
  if (impressione) memoria.impressione = String(impressione).trim().slice(0, 220);

  if (argomento) {
    memoria.conversazioni += 1;
    memoria.ultimaConversazione = {
      capitolo: capitolo ?? stato.capitolo ?? 0,
      argomento: String(argomento).slice(0, 80)
    };
  }
  return stato;
}

// ---------------------------------------------------------------------------
// Richiamo della memoria — i ricordi pertinenti riaffiorano al momento giusto
// ---------------------------------------------------------------------------

/** Estrae le parole significative da un testo (per il richiamo dei ricordi). */
export function paroleRilevanti(testo) {
  const parole = String(testo || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .split(/\s+/)
    .filter((p) => p.length > 3 && !STOPWORD_MEMORIA.has(p));
  return [...new Set(parole)];
}

/**
 * Seleziona i ricordi più pertinenti rispetto all'azione del giocatore:
 * sinossi dei capitoli, obiettivi aperti e memoria degli NPC. Sono questi i
 * "ricordi che riaffiorano" iniettati nel prompt della scena corrente.
 */
export function richiamaMemoria(partita, testoAzione, max = 6) {
  const chiavi = paroleRilevanti(testoAzione);
  if (!chiavi.length) return [];
  const stato = partita.stato;
  const candidati = [];

  const punteggio = (testo) => {
    const basso = String(testo || "").toLowerCase();
    return chiavi.reduce((punti, chiave) => (basso.includes(chiave) ? punti + 1 : punti), 0);
  };

  for (const voce of stato.sinossi || []) {
    const p = punteggio(voce.testo);
    if (p > 0) {
      candidati.push({
        punteggio: p,
        fonte: voce.compresso ? `Capitoli ${voce.capitolo}-${voce.capitoloFine}` : `Capitolo ${voce.capitolo}`,
        testo: voce.testo
      });
    }
  }

  for (const obiettivo of (stato.obiettivi || []).filter((o) => o.stato === "aperto")) {
    const p = punteggio(obiettivo.testo);
    if (p > 0) candidati.push({ punteggio: p + 1, fonte: "Obiettivo aperto", testo: obiettivo.testo });
  }

  for (const r of stato.relazioni || []) {
    for (const fatto of r.memoria?.fatti || []) {
      const p = punteggio(fatto);
      if (p > 0) candidati.push({ punteggio: p + 1, fonte: `${r.npc} ricorda`, testo: fatto });
    }
    for (const promessa of r.memoria?.promesse || []) {
      const p = punteggio(promessa);
      if (p > 0) candidati.push({ punteggio: p + 2, fonte: `Promessa con ${r.npc}`, testo: promessa });
    }
  }

  return candidati
    .sort((a, b) => b.punteggio - a.punteggio)
    .slice(0, max)
    .map(({ fonte, testo }) => ({ fonte, testo }));
}

/**
 * Riepilogo compresso della saga: usato per l'esportazione e per l'header
 * "sinossi della storia" del pannello.
 */
export function riassuntoCompresso(partita) {
  const { stato } = partita;
  if (!stato.sinossi.length) return "La saga non è ancora cominciata.";

  const pezzi = [];
  const inizio = stato.sinossi[0];
  pezzi.push(`Come tutto è cominciato: ${inizio.testo}`);
  const recenti = stato.sinossi.slice(-4);
  for (const v of recenti) {
    const etichetta = v.compresso ? `Capitoli ${v.capitolo}-${v.capitoloFine}` : `Capitolo ${v.capitolo}`;
    pezzi.push(`${etichetta}: ${v.testo}`);
  }
  let testo = pezzi.join(" ");
  if (testo.length > MAX_CARATTERI_DIGEST) testo = `${testo.slice(0, MAX_CARATTERI_DIGEST).trimEnd()}…`;
  return testo;
}

/** Aggiorna i campi di memoria dopo la generazione di un capitolo. */
export function aggiornaMemoria(partita, capitolo) {
  const stato = partita.stato;
  aggiungiSinossi(stato, capitolo.numero, capitolo.deltaStato?.sinossi);
  partita.memoria = partita.memoria || { riassuntoCompresso: "", paroleTotali: 0, capitoliRiassunti: 0 };
  partita.memoria.paroleTotali = (partita.memoria.paroleTotali || 0) + (capitolo.parole || 0);
  partita.memoria.riassuntoCompresso = riassuntoCompresso(partita);
  return partita;
}
