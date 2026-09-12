/**
 * relazioni.js — Albero di fiducia evoluto.
 *
 * Ogni relazione con un NPC non è più un semplice numero di "fiducia", ma un
 * legame descritto da TRE assi indipendenti:
 *
 *   VINCOLO  (0-100) quanto vi lega: affetto, debito, storia condivisa
 *   TENSIONE (0-100) quanto è conflittuale: sospetto, risentimento, rivalità
 *   RISPETTO (0-100) quanto l'altro ti considera capace e degno di stima
 *
 * Dalla combinazione di Vincolo e Tensione nascono QUATTRO QUADRANTI narrativi
 * (Crocevia, Alleanza, Rivalità, Ostilità), mentre il Rispetto modula il tono
 * del rapporto (ammirazione, disprezzo, timore).
 *
 * Le relazioni hanno inoltre una memoria storica: eventi datati (capitolo per
 * capitolo) e TAPPE (milestone) che segnano i momenti decisivi — primo
 * incontro, primo scontro, patto, segreto condiviso, tradimento, riconciliazione.
 */

// ---------------------------------------------------------------------------
// Assi e quadranti
// ---------------------------------------------------------------------------
export const ASSI = {
  vincolo: {
    id: "vincolo",
    nome: "Vincolo",
    descrizione: "Quanto vi lega: affetto, debito, storia condivisa.",
    colore: "#4ade80"
  },
  tensione: {
    id: "tensione",
    nome: "Tensione",
    descrizione: "Quanto è conflittuale: sospetto, risentimento, rivalità.",
    colore: "#fb7185"
  },
  rispetto: {
    id: "rispetto",
    nome: "Rispetto",
    descrizione: "Quanto l'altro ti considera capace e degno di stima.",
    colore: "#60a5fa"
  }
};

export const QUADRANTI = {
  crocevia: {
    id: "crocevia",
    nome: "Crocevia",
    colore: "#a78bfa",
    descrizione: "Vi conoscete appena, oppure non avete ancora deciso cosa siete l'uno per l'altro."
  },
  alleanza: {
    id: "alleanza",
    nome: "Alleanza",
    colore: "#4ade80",
    descrizione: "Legame forte e pochi attriti: è il rapporto su cui puoi contare davvero."
  },
  rivalita: {
    id: "rivalita",
    nome: "Rivalità",
    colore: "#fbbf24",
    descrizione: "Vi lega molto e vi scontrate spesso: il rapporto più intenso e più fragile."
  },
  ostilita: {
    id: "ostilita",
    nome: "Ostilità",
    colore: "#fb7185",
    descrizione: "Poco legame e molta tensione: qui si combatte, non ci si capisce."
  }
};

/** Quadrante narrativo a partire dagli assi Vincolo/Tensione. */
export function quadrante(relazione) {
  const vincolo = Number(relazione?.vincolo ?? relazione?.fiducia ?? 50);
  const tensione = Number(relazione?.tensione ?? 30);
  if (vincolo >= 55 && tensione >= 55) return QUADRANTI.rivalita;
  if (vincolo >= 55) return QUADRANTI.alleanza;
  if (tensione >= 55) return QUADRANTI.ostilita;
  return QUADRANTI.crocevia;
}

/** Sfumatura del rapporto, dedotta dal Rispetto (indipendente dal quadrante). */
export function sfumatura(relazione) {
  const rispetto = Number(relazione?.rispetto ?? 50);
  const ruolo = relazione?.ruolo || "Conoscente";
  if (rispetto >= 72) return ["Ti ammira", "ammirazione"];
  if (rispetto >= 58) return ["Ti stima", "stima"];
  if (rispetto <= 28) return ["Ti disprezza", "disprezzo"];
  if (rispetto <= 42) return ["Ti sottovaluta", "sottovalutazione"];
  if (ruolo === "Nemico") return ["Ti teme", "timore"];
  return ["Neutrale", "neutrale"];
}

// ---------------------------------------------------------------------------
// Variazioni degli assi in base al tipo di azione del giocatore
// ---------------------------------------------------------------------------
export const DELTA_ASSI = {
  combattimento: { vincolo: -3, tensione: 18, rispetto: 11 },
  dialogo: { vincolo: 9, tensione: -4, rispetto: 5 },
  esplorazione: { vincolo: 3, tensione: 2, rispetto: 3 },
  fuga: { vincolo: -4, tensione: 7, rispetto: -5 },
  astuzia: { vincolo: -6, tensione: 9, rispetto: -2 },
  cura: { vincolo: 13, tensione: -11, rispetto: 6 },
  indagine: { vincolo: 6, tensione: 3, rispetto: 8 },
  proemio: { vincolo: 11, tensione: 2, rispetto: 1 },
  generico: { vincolo: 2, tensione: 3, rispetto: 1 }
};

/** Somma una variazione agli assi rispettando i limiti 0-100. */
export function applicaAssi(relazione, delta = {}, capitolo = 1) {
  const prima = {
    vincolo: relazione.vincolo ?? relazione.fiducia ?? 50,
    tensione: relazione.tensione ?? 30,
    rispetto: relazione.rispetto ?? 50
  };

  const limite = (v) => Math.max(0, Math.min(100, Math.round(v)));
  relazione.vincolo = limite(prima.vincolo + (Number(delta.vincolo) || 0));
  relazione.tensione = limite(prima.tensione + (Number(delta.tensione) || 0));
  relazione.rispetto = limite(prima.rispetto + (Number(delta.rispetto) || 0));

  // `fiducia` resta come alias del vincolo, per compatibilità e per la scheda
  relazione.fiducia = relazione.vincolo;

  relazione.quadrante = quadrante(relazione).id;
  relazione.sfumatura = sfumatura(relazione)[1];
  relazione.posizionePrecedente = prima;

  // Storico degli eventi: si conservano gli ultimi 12 per NPC
  const variazione = (chiave) => relazione[chiave] - prima[chiave];
  relazione.storico = [
    ...(relazione.storico || []),
    {
      capitolo,
      vincolo: variazione("vincolo"),
      tensione: variazione("tensione"),
      rispetto: variazione("rispetto")
    }
  ].slice(-12);

  // Ruolo aggiornato in coerenza con gli assi
  relazione.ruolo = ruoloDaAssi(relazione, relazione.ruolo);

  // Tappe raggiunte in questo capitolo
  const nuoveTappe = tappeDaAssi(relazione, prima, capitolo);
  if (nuoveTappe.length) relazione.tappe = [...(relazione.tappe || []), ...nuoveTappe];

  return relazione;
}

/** Ruolo sintetico dedotto dagli assi (rispetta i ruoli già presenti). */
export function ruoloDaAssi(relazione, ruoloAttuale) {
  const { vincolo, tensione, rispetto } = relazione;
  if (vincolo >= 72 && tensione <= 45) return "Amico";
  if (vincolo >= 58 && tensione >= 62) return "Rivale";
  if (vincolo <= 25 && tensione >= 62) return "Nemico";
  if (vincolo <= 30 && tensione <= 45) return "Conoscente";
  if (rispetto >= 75 && tensione <= 40 && vincolo >= 45) return "Mentore";
  return ruoloAttuale || "Conoscente";
}

// ---------------------------------------------------------------------------
// Tappe (milestone) del legame
// ---------------------------------------------------------------------------
export const TAPPE = [
  { id: "primo-incontro", nome: "Primo incontro", descrizione: "Vi siete visti per la prima volta.", icona: "✦" },
  { id: "legame", nome: "Legame", descrizione: "Qualcosa vi ha uniti: non siete più due estranei.", icona: "🔗" },
  { id: "primo-scontro", nome: "Primo scontro", descrizione: "Avete alzato la voce — o le armi.", icona: "⚔" },
  { id: "confidenza", nome: "Confidenza", descrizione: "Ti ha raccontato qualcosa che non racconta a nessuno.", icona: "🤫" },
  { id: "rispetto-guadagnato", nome: "Rispetto guadagnato", descrizione: "Ha ammesso, almeno con sé stesso, che vali.", icona: "🎖" },
  { id: "patto", nome: "Patto", descrizione: "Avete un accordo. E gli accordi si pagano.", icona: "🤝" },
  { id: "frattura", nome: "Frattura", descrizione: "La tensione ha superato il punto di rottura.", icona: "💥" },
  { id: "riconciliazione", nome: "Riconciliazione", descrizione: "Dopo la frattura, avete ricucito qualcosa.", icona: "🕊" }
];

const NOMI_TAPPE = Object.fromEntries(TAPPE.map((t) => [t.id, t]));

/** Determina le tappe sbloccate dal passaggio di stato di questo capitolo. */
export function tappeDaAssi(relazione, prima, capitolo) {
  const possedute = new Set((relazione.tappe || []).map((t) => t.id));
  const nuove = [];
  const aggiungi = (id) => {
    if (possedute.has(id)) return;
    const tappa = NOMI_TAPPE[id];
    if (!tappa) return;
    nuove.push({ ...tappa, capitolo });
    possedute.add(id);
  };

  if (!possedute.size) aggiungi("primo-incontro");
  if (relazione.vincolo >= 52 && prima.vincolo < 52) aggiungi("legame");
  if (relazione.tensione >= 62 && prima.tensione < 62) aggiungi("primo-scontro");
  if (relazione.vincolo >= 72 && relazione.tensione <= 45 && prima.vincolo < 72) aggiungi("confidenza");
  if (relazione.rispetto >= 76 && prima.rispetto < 76) aggiungi("rispetto-guadagnato");
  if (relazione.vincolo >= 64 && relazione.tensione <= 38 && relazione.rispetto >= 62) aggiungi("patto");
  if (relazione.vincolo <= 22 && relazione.tensione >= 70) aggiungi("frattura");
  if (possedute.has("frattura") && relazione.vincolo >= 45 && relazione.tensione <= 45) aggiungi("riconciliazione");

  return nuove;
}

// ---------------------------------------------------------------------------
// Descrizioni testuali (per scheda, digest e memoria del Game Master)
// ---------------------------------------------------------------------------
/** Lettura narrativa sintetica del rapporto. */
export function descrivi(relazione) {
  const q = quadrante(relazione);
  const [fraseRispetto] = sfumatura(relazione);
  const tappe = (relazione.tappe || []).slice(-1)[0];
  const parti = [
    `${q.nome}: ${q.descrizione}`,
    `${fraseRispetto} (rispetto ${relazione.rispetto ?? 50}/100).`
  ];
  if (tappe) parti.push(`Ultima tappa: ${tappe.nome} (capitolo ${tappe.capitolo}).`);
  return parti.join(" ");
}

/** Posizione normalizzata per l'albero visivo: x = tensione, y = vincolo. */
export function coordinate(relazione) {
  return {
    x: Math.max(0, Math.min(100, Number(relazione?.tensione ?? 30))) / 100,
    y: Math.max(0, Math.min(100, Number(relazione?.vincolo ?? relazione?.fiducia ?? 50))) / 100
  };
}

/** Struttura completa per il pannello "Albero di fiducia". */
export function albero(partita) {
  const relazioni = (partita?.stato?.relazioni || []).map((r) => {
    const q = quadrante(r);
    return {
      npc: r.npc,
      ruolo: r.ruolo,
      vincolo: r.vincolo ?? r.fiducia ?? 50,
      tensione: r.tensione ?? 30,
      rispetto: r.rispetto ?? 50,
      fiducia: r.fiducia ?? r.vincolo ?? 50,
      quadrante: { id: q.id, nome: q.nome, colore: q.colore },
      descrizione: descrivi(r),
      sfumatura: sfumatura(r)[1],
      coordinate: coordinate(r),
      posizionePrecedente: r.posizionePrecedente || null,
      tappe: r.tappe || [],
      storico: r.storico || [],
      ultimoIncontro: r.ultimoIncontro,
      nota: r.nota
    };
  });

  const conteggi = { crocevia: 0, alleanza: 0, rivalita: 0, ostilita: 0 };
  for (const r of relazioni) conteggi[r.quadrante.id]++;

  return {
    assi: ASSI,
    quadranti: QUADRANTI,
    nodi: relazioni,
    conteggi,
    legamePiuForte: relazioni.length
      ? relazioni.reduce((a, b) => ((b.vincolo - b.tensione * 0.35) > (a.vincolo - a.tensione * 0.35) ? b : a)).npc
      : null,
    conflittoMaggiore: relazioni.length
      ? relazioni.reduce((a, b) => (b.tensione > a.tensione ? b : a)).npc
      : null
  };
}
