/**
 * schema.js — Normalizzazione e validazione del capitolo generato.
 *
 * Qualunque sia la provenienza (LLM esterno o motore locale), il capitolo
 * consegnato all'applicazione ha SEMPRE questa forma, con i vincoli garantiti:
 *   - 3-4 opzioni con id univoci e tipi ammessi;
 *   - delta di stato numerico e limitato;
 *   - testo non vuoto, ripulito da markdown residuo.
 */

export const TIPI_SCELTA = ["audace", "prudente", "astuta", "empatica"];
export const RARITA = ["comune", "non comune", "raro", "leggendario"];
export const RUOLI = ["Alleata", "Alleato", "Amico", "Mentore", "Rivale", "Nemico", "Sospetto", "Conoscente", "Interesse Amoroso"];

export function contaParole(testo) {
  return ((testo || "").trim().match(/[\p{L}\p{N}']+/gu) || []).length;
}

function limita(valore, minimo, massimo, predefinito = 0) {
  const n = Number(valore);
  if (!Number.isFinite(n)) return predefinito;
  return Math.max(minimo, Math.min(massimo, n));
}

function stringaPulita(valore, max = 400) {
  return String(valore ?? "")
    .replace(/\r/g, "")
    .replace(/```[a-z]*/gi, "")
    .trim()
    .slice(0, max);
}

/** Estrae il primo oggetto JSON valido da una risposta testuale. */
export function estraiJson(testo) {
  if (typeof testo === "object" && testo !== null) return testo;
  const grezzo = String(testo || "").trim();

  const tentativi = [grezzo];
  const blocco = grezzo.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (blocco) tentativi.push(blocco[1].trim());
  const inizio = grezzo.indexOf("{");
  const fine = grezzo.lastIndexOf("}");
  if (inizio >= 0 && fine > inizio) tentativi.push(grezzo.slice(inizio, fine + 1));

  for (const tentativo of tentativi) {
    try {
      return JSON.parse(tentativo);
    } catch {
      // Prova il tentativo successivo
    }
  }
  return null;
}

/** Ripara le imperfezioni più comuni dei modelli (virgole finali, virgolette semplici). */
function riparazioneBestEffort(testo) {
  const inizio = testo.indexOf("{");
  const fine = testo.lastIndexOf("}");
  if (inizio < 0 || fine <= inizio) return null;
  const corpo = testo
    .slice(inizio, fine + 1)
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/[\u201c\u201d]/g, '"');
  try {
    return JSON.parse(corpo);
  } catch {
    return null;
  }
}

export function normalizzaOpzioni(opzioni) {
  const elenco = Array.isArray(opzioni) ? opzioni : [];
  const pulite = [];
  for (const o of elenco) {
    const etichetta = stringaPulita(typeof o === "string" ? o : o?.etichetta || o?.testo, 120);
    if (!etichetta || etichetta.length < 4) continue;
    const tipo = TIPI_SCELTA.includes(String(o?.tipo || "").toLowerCase())
      ? String(o.tipo).toLowerCase()
      : TIPI_SCELTA[pulite.length % TIPI_SCELTA.length];
    if (pulite.some((p) => p.etichetta.toLowerCase() === etichetta.toLowerCase())) continue;
    pulite.push({ etichetta, tipo });
    if (pulite.length === 4) break;
  }

  // Garantisce almeno 3 opzioni, riempiendo con scelte generiche coerenti
  const riempitivi = [
    { tipo: "audace", etichetta: "Agire subito, senza aspettare oltre" },
    { tipo: "prudente", etichetta: "Fermarti e valutare la situazione" },
    { tipo: "astuta", etichetta: "Trovare un espediente per girarla a tuo favore" },
    { tipo: "empatica", etichetta: "Parlare con sincerità a chi hai davanti" }
  ];
  let i = 0;
  while (pulite.length < 3 && i < riempitivi.length) {
    const r = riempitivi[i++];
    if (!pulite.some((p) => p.tipo === r.tipo)) pulite.push({ ...r });
  }

  return pulite.map((o, indice) => ({ id: `op${indice + 1}`, tipo: o.tipo, etichetta: o.etichetta }));
}

export function normalizzaDelta(delta = {}) {
  const d = delta && typeof delta === "object" ? delta : {};

  const inventario = (Array.isArray(d.inventario) ? d.inventario : [])
    .map((o) => ({
      nome: stringaPulita(typeof o === "string" ? o : o?.nome, 60),
      descrizione: stringaPulita(o?.descrizione, 200),
      rarita: RARITA.includes(String(o?.rarita || "").toLowerCase()) ? String(o.rarita).toLowerCase() : "comune"
    }))
    .filter((o) => o.nome.length > 1)
    .slice(0, 3);

  const oggettiPersi = (Array.isArray(d.oggettiPersi) ? d.oggettiPersi : [])
    .map((o) => stringaPulita(typeof o === "string" ? o : o?.nome, 60))
    .filter(Boolean)
    .slice(0, 3);

  // ⚠ I tre assi dell'albero di fiducia devono sopravvivere alla
  // normalizzazione: i delta vengono conservati come variazioni, i valori
  // assoluti solo se il narratore li ha indicati esplicitamente.
  const relazioni = (Array.isArray(d.relazioni) ? d.relazioni : [])
    .map((r) => {
      const deltaVincolo = r?.deltaVincolo !== undefined ? limita(r.deltaVincolo, -40, 40, 0) : undefined;
      const deltaTensione = r?.deltaTensione !== undefined ? limita(r.deltaTensione, -40, 40, 0) : undefined;
      const deltaRispetto = r?.deltaRispetto !== undefined ? limita(r.deltaRispetto, -40, 40, 0) : undefined;
      const haAssiAssoluti = r?.vincolo !== undefined || r?.tensione !== undefined || r?.rispetto !== undefined;
      const senzaDelta = deltaVincolo === undefined && deltaTensione === undefined && deltaRispetto === undefined;

      return {
        npc: stringaPulita(r?.npc || r?.nome, 40),
        ruolo: RUOLI.includes(r?.ruolo) ? r.ruolo : (RUOLI.includes(String(r?.ruolo || "")) ? String(r.ruolo) : "Conoscente"),
        nota: stringaPulita(r?.nota, 220),
        aspetto: stringaPulita(r?.aspetto, 120),
        tic: stringaPulita(r?.tic, 120),
        tappa: stringaPulita(r?.tappa, 40) || null,
        // Memoria profonda dell'NPC (stile OOC): ricordi seminati dal capitolo
        fatto: stringaPulita(r?.fatto, 180) || null,
        promessa: stringaPulita(r?.promessa, 180) || null,
        impressione: stringaPulita(r?.impressione, 220) || null,
        ...(deltaVincolo !== undefined ? { deltaVincolo } : {}),
        ...(deltaTensione !== undefined ? { deltaTensione } : {}),
        ...(deltaRispetto !== undefined ? { deltaRispetto } : {}),
        // Valori assoluti (o "fiducia" legacy interpretata come vincolo assoluto)
        ...(haAssiAssoluti
          ? {
              vincoloAssoluto: limita(r.vincolo, 0, 100, 50),
              tensioneAssoluta: limita(r.tensione, 0, 100, 30),
              rispettoAssoluto: limita(r.rispetto, 0, 100, 50)
            }
          : senzaDelta && r?.fiducia !== undefined
            ? { vincoloAssoluto: limita(r.fiducia, 0, 100, 50) }
            : {})
      };
    })
    .filter((r) => r.npc.length > 1)
    .slice(0, 4);

  const vitaliGrezzi = d.vitali && typeof d.vitali === "object" ? d.vitali : {};
  const vitali = {
    vita: limita(vitaliGrezzi.vita, -35, 35, 0),
    energia: limita(vitaliGrezzi.energia, -35, 35, 0),
    tensione: limita(vitaliGrezzi.tensione, -35, 35, 0)
  };

  return {
    inventario,
    oggettiPersi,
    relazioni,
    vitali,
    luogo: stringaPulita(d.luogo, 80) || null,
    momento: stringaPulita(d.momento, 40) || null,
    obiettivo: stringaPulita(d.obiettivo, 160) || null,
    obiettivoChiuso: stringaPulita(d.obiettivoChiuso, 160) || null,
    sinossi: stringaPulita(d.sinossi, 400),
    beat: stringaPulita(d.beat, 30) || null
  };
}

/**
 * Normalizza il capitolo grezzo in un oggetto sicuro per il gioco.
 * @param {string|object} grezzo risposta del modello o oggetto del motore locale
 * @param {{numero:number, provenienza:string, azione:object}} contesto
 */
export function normalizzaCapitolo(grezzo, { numero, provenienza = "locale", azione = null } = {}) {
  let dati = estraiJson(grezzo);
  const note = [];

  if (!dati && typeof grezzo === "string") {
    dati = riparazioneBestEffort(grezzo);
    if (dati) note.push("Il JSON del modello è stato riparato automaticamente.");
  }

  if (!dati || typeof dati !== "object") {
    const errore = new Error("Il capitolo generato non contiene un JSON valido.");
    errore.codice = "CAPITOLO_NON_VALIDO";
    throw errore;
  }

  const testo = stringaPulita(dati.testo || dati.capitolo || dati.contenuto, 6000);
  if (contaParole(testo) < 60) {
    const errore = new Error("Il capitolo generato è troppo breve o vuoto.");
    errore.codice = "CAPITOLO_TROPPO_BREVE";
    throw errore;
  }

  const parole = contaParole(testo);
  if (parole < 140) note.push(`Capitolo leggermente più breve del previsto (${parole} parole).`);
  if (parole > 230) note.push(`Capitolo più lungo del previsto (${parole} parole).`);

  const titolo = stringaPulita(dati.titolo, 90) || `Capitolo ${numero}`;
  const deltaStato = normalizzaDelta(dati.deltaStato || dati.delta || {});

  if (!deltaStato.sinossi) {
    deltaStato.sinossi = azione?.testo
      ? `Il protagonista ha scelto di «${String(azione.testo).slice(0, 120)}» e la storia è proseguita.`
      : `La saga ha avuto inizio nel capitolo ${numero}.`;
    note.push("Sinossi ricostruita automaticamente dal server.");
  }
  if (!deltaStato.luogo) deltaStato.luogo = dati.luogo || null;

  return {
    numero,
    titolo,
    testo,
    opzioni: normalizzaOpzioni(dati.opzioni || dati.scelte),
    deltaStato,
    provenienza,
    parole,
    note: [...note, ...(Array.isArray(dati.note) ? dati.note.map((n) => stringaPulita(n, 160)) : [])].filter(Boolean)
  };
}

/**
 * Normalizza la battuta di un NPC in Modalità Personaggio (stile OOC).
 * Accetta il JSON del modello oppure, come rete di sicurezza, testo semplice:
 * la conversazione non si blocca mai.
 */
export function normalizzaBattuta(grezzo, { npc = "il personaggio", provenienza = "locale" } = {}) {
  const note = [];
  let dati = estraiJson(grezzo);

  if (!dati && typeof grezzo === "string") {
    dati = riparazioneBestEffort(grezzo);
    if (dati) note.push("Il JSON del modello è stato riparato automaticamente.");
  }

  // Rete di sicurezza: testo semplice → battuta ricostruita
  if (!dati || typeof dati !== "object") {
    const testoPulito = stringaPulita(grezzo, 1600);
    if (contaParole(testoPulito) >= 5) {
      note.push("Risposta del modello usata come testo semplice.");
      return {
        npc,
        testo: testoPulito,
        emozione: "",
        deltaVincolo: 0,
        deltaTensione: 0,
        deltaRispetto: 0,
        fatto: null,
        promessa: null,
        impressione: null,
        provenienza,
        parole: contaParole(testoPulito),
        note
      };
    }
    const errore = new Error("La battuta generata non è utilizzabile.");
    errore.codice = "BATTUTA_NON_VALIDA";
    throw errore;
  }

  const testo = stringaPulita(dati.testo || dati.battuta || dati.contenuto || dati.messaggio, 1600);
  if (contaParole(testo) < 5) {
    const errore = new Error("La battuta generata è troppo breve o vuota.");
    errore.codice = "BATTUTA_NON_VALIDA";
    throw errore;
  }

  const parole = contaParole(testo);
  if (parole > 140) note.push(`Battuta più lunga del previsto (${parole} parole).`);

  return {
    npc,
    testo,
    emozione: stringaPulita(dati.emozione, 40),
    deltaVincolo: limita(dati.deltaVincolo, -12, 12, 0),
    deltaTensione: limita(dati.deltaTensione, -12, 12, 0),
    deltaRispetto: limita(dati.deltaRispetto, -12, 12, 0),
    fatto: stringaPulita(dati.fatto, 180) || null,
    promessa: stringaPulita(dati.promessa, 180) || null,
    impressione: stringaPulita(dati.impressione, 220) || null,
    provenienza,
    parole,
    note
  };
}
