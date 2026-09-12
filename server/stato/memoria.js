/**
 * memoria.js — State Engine: la memoria a lungo termine della saga.
 *
 * Responsabilità:
 *  1. mantenere la sinossi (una voce per capitolo) e comprimerla quando cresce;
 *  2. costruire il "digest" di memoria che viene iniettato implicitamente
 *     in ogni prompt narrativo (evita allucinazioni e perdita di trama);
 *  3. esporre la scheda leggibile usata dal pannello
 *     "Scheda del Personaggio e Storia".
 */

const MAX_SINOSSI_DETTAGLIATA = 8;      // capitoli tenuti per esteso nella sinossi
const MAX_CARATTERI_VOCE = 240;        // lunghezza massima di una voce di sinossi
const MAX_PAROLE_RIASSUNTO_ANTICO = 150; // il riassunto compresso non cresce mai oltre
const MAX_CARATTERI_DIGEST = 7000;     // limite di sicurezza del testo iniettato nel prompt

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

  righe.push("Inventario:");
  if (!stato.inventario.length) {
    righe.push("  - (vuoto: il protagonista non possiede ancora nulla)");
  } else {
    for (const o of stato.inventario) {
      righe.push(`  - ${o.nome} [${o.rarita}]${o.quantita > 1 ? ` x${o.quantita}` : ""}${o.descrizione ? ` — ${o.descrizione}` : ""}`);
    }
  }

  righe.push("=== RELAZIONI CON GLI NPC ===");
  if (!stato.relazioni.length) {
    righe.push("  - (nessun NPC incontrato finora)");
  } else {
    for (const r of stato.relazioni) {
      righe.push(`  - ${r.npc} — ${r.ruolo} · fiducia ${r.fiducia}/100 · ${r.nota || "nessuna nota"}`);
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
    }
  };
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
