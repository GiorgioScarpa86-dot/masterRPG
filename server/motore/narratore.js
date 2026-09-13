/**
 * narratore.js — Orchestratore del Game Master.
 *
 * Flusso di un capitolo (docs/01-flussi-di-lavoro.md, flusso B):
 *   1. verifica del saldo Token Storia e addebito del costo;
 *   2. costruzione del prompt con la memoria iniettata (State Engine);
 *   3. generazione: provider LLM esterno se configurato, altrimenti motore locale;
 *   4. normalizzazione del capitolo (schema.js);
 *   5. applicazione del delta allo stato + aggiornamento della memoria;
 *   6. registrazione nella cronaca della saga.
 *
 * Principio guida: il giocatore non deve mai restare bloccato. Se il provider
 * esterno fallisce, il capitolo viene comunque consegnato dal motore locale.
 */

import { generaCapitolo as generaCapitoloLocale, generaBattuta as generaBattutaLocale, analizzaIntento } from "./motore_locale.js";
import { costruisciPrompt, costruisciPromptDialogo } from "./prompt.js";
import { configurazioneLLM, generaConLLM } from "./provider_llm.js";
import { normalizzaCapitolo, normalizzaBattuta } from "./schema.js";
import { addebita, puoGenerare, COSTO_CAPITOLO, VALUTA } from "../crediti/portafoglio.js";
import { applicaDelta, avanzaArco, chiudiObiettivo } from "../stato/modello.js";
import { aggiornaMemoria, aggiornaProfiloGiocatore, digest, registraMemoriaNpc } from "../stato/memoria.js";
import { applicaAssi } from "../stato/relazioni.js";

/** Errore di gioco con codice e stato HTTP, usato dalle rotte. */
export class ErroreGioco extends Error {
  constructor(messaggio, codice, stato = 400, dettagli = {}) {
    super(messaggio);
    this.name = "ErroreGioco";
    this.codice = codice;
    this.stato = stato;
    this.dettagli = dettagli;
  }
}

export function modalitaMotore(env = process.env) {
  const config = configurazioneLLM(env);
  return config.attiva ? "llm" : "locale";
}

/**
 * Genera il capitolo successivo e muta la partita.
 * @returns {{capitolo:object, partita:object, memoria:string, note:string[]}}
 */
export async function generaCapitoloNarrativo({ partita, azione = null, adesso = new Date(), forzaMotore = null }) {
  if (!puoGenerare(partita.economia)) {
    throw new ErroreGioco(
      `Per generare un capitolo servono ${COSTO_CAPITOLO} ${VALUTA}: il tuo saldo è di ${partita.economia.saldo}.`,
      "SALDO_INSUFFICIENTE",
      402,
      { saldo: partita.economia.saldo, richiesto: COSTO_CAPITOLO, valuta: VALUTA }
    );
  }

  const numero = (partita.stato.capitolo || 0) + 1;
  const azioneNormalizzata = normalizzaAzione(azione);

  if (numero > 1 && !azioneNormalizzata) {
    throw new ErroreGioco(
      "Per proseguire la storia scegli una delle opzioni rapide oppure scrivi la tua Azione Personalizzata.",
      "AZIONE_MANCANTE",
      400
    );
  }

  // Profilo del giocatore (stile OOC): l'IA osserva lo stile di chi gioca e
  // vi si adatta. L'osservazione avviene PRIMA del prompt, così lo stile di
  // quest'azione orienta già la scena corrente.
  const intentoAzione = azioneNormalizzata
    ? analizzaIntento(azioneNormalizzata.testo, azioneNormalizzata.tipoScelta)
    : null;
  aggiornaProfiloGiocatore(partita.stato, azioneNormalizzata, intentoAzione);

  const { sistema, utente, memoriaDigest } = costruisciPrompt({ partita, azione: azioneNormalizzata, numero });

  // --- Generazione ---------------------------------------------------------
  const config = configurazioneLLM();
  const note = [];
  let grezzo = null;
  let provenienza = "motore-locale";
  let usoMotore = "locale";

  const usaLLM = forzaMotore ? forzaMotore === "llm" : config.attiva;
  if (usaLLM && config.attiva) {
    try {
      const risposta = await generaConLLM({ sistema, utente, configurazione: config });
      grezzo = risposta.contenuto;
      provenienza = risposta.provenienza;
      usoMotore = "llm";
    } catch (errore) {
      note.push(`Game Master esterno non disponibile (${errore.message}). Il capitolo è stato scritto dal Motore Narrativo Locale.`);
      grezzo = null;
    }
  }

  let capitolo;
  if (grezzo) {
    try {
      capitolo = normalizzaCapitolo(grezzo, { numero, provenienza, azione: azioneNormalizzata });
    } catch (errore) {
      note.push(`Risposta del modello non utilizzabile (${errore.message}). Subentra il Motore Narrativo Locale.`);
      grezzo = null;
    }
  }

  if (!grezzo) {
    const locale = generaCapitoloLocale({ partita, azione: azioneNormalizzata, numero });
    capitolo = normalizzaCapitolo(locale, { numero, provenienza: "motore-locale", azione: azioneNormalizzata });
    capitolo.parole = locale.parole;
    capitolo.testiConsumati = locale.meta?.testiConsumati || [];
    provenienza = "motore-locale";
    usoMotore = "locale";
  }

  // --- Addebito dei Token Storia -------------------------------------------
  addebita(
    partita.economia,
    partita.economia.costoCapitolo || COSTO_CAPITOLO,
    `Capitolo ${numero} generato`,
    adesso
  );

  // --- Applicazione dello stato --------------------------------------------
  const delta = { ...capitolo.deltaStato, testiConsumati: capitolo.testiConsumati || [] };
  applicaDelta(partita.stato, delta);

  // Memoria profonda degli NPC (stile OOC): i fatti, le promesse e le
  // impressioni seminati dal capitolo diventano ricordi permanenti.
  for (const rel of delta.relazioni || []) {
    if (rel.fatto || rel.promessa || rel.impressione) {
      registraMemoriaNpc(partita.stato, rel.npc, {
        fatto: rel.fatto,
        promessa: rel.promessa,
        impressione: rel.impressione,
        capitolo: numero
      });
    }
  }

  if (delta.obiettivoChiuso) chiudiObiettivo(partita.stato, delta.obiettivoChiuso);
  avanzaArco(partita.stato, delta.beat);

  partita.stato.capitolo = numero;
  partita.stato.ultimaScelta = azioneNormalizzata?.testo || null;
  if (!partita.stato.titoli.includes(capitolo.titolo)) partita.stato.titoli.push(capitolo.titolo);
  if (delta.momento) partita.stato.momento = delta.momento;

  if (delta.relazioni?.length) {
    partita.stato.contatori.dialoghi = (partita.stato.contatori.dialoghi || 0) + 1;
  }
  if ((delta.vitali?.vita || 0) < 0) {
    partita.stato.contatori.combattimenti = (partita.stato.contatori.combattimenti || 0) + 1;
  }

  // --- Cronaca --------------------------------------------------------------
  const voce = {
    numero,
    titolo: capitolo.titolo,
    testo: capitolo.testo,
    opzioni: capitolo.opzioni,
    azioneGiocatore: azioneNormalizzata,
    deltaStato: delta,
    provenienza,
    motore: usoMotore,
    parole: capitolo.parole,
    note: [...(capitolo.note || []), ...note],
    creatoIl: adesso.toISOString()
  };
  partita.storia.push(voce);

  aggiornaMemoria(partita, { ...capitolo, deltaStato: delta });

  return { capitolo: voce, partita, memoria: digest(partita), note: voce.note };
}

/** Valida e normalizza l'azione del giocatore. */
export function normalizzaAzione(azione) {
  // Nessuna azione (es. capitolo d'apertura): il corpo vuoto è legittimo
  if (!azione || typeof azione !== "object") return null;
  const testoGrezzo = String(azione.testo || "").trim();
  if (!testoGrezzo && !azione.opzioneId && !azione.tipo) return null;
  const testo = testoGrezzo.replace(/\s+/g, " ").trim().slice(0, 400);

  if (azione.opzioneId) {
    return {
      tipo: "scelta",
      opzioneId: String(azione.opzioneId).slice(0, 20),
      tipoScelta: ["audace", "prudente", "astuta", "empatica"].includes(azione.tipoScelta) ? azione.tipoScelta : null,
      testo
    };
  }

  if (testo.length < 3) {
    throw new ErroreGioco("L'azione personalizzata deve contenere almeno 3 caratteri.", "AZIONE_NON_VALIDA", 400);
  }
  return { tipo: "libera", testo, opzioneId: null, tipoScelta: null };
}

// ---------------------------------------------------------------------------
// Modalità Personaggio — conversazione diretta con un NPC (stile OOC)
// ---------------------------------------------------------------------------

/**
 * Genera la risposta in prima persona di un NPC a un messaggio del giocatore.
 * È la Character Mode di OOC: chat libera, gratuita, senza blocchi. Se il
 * provider esterno non è disponibile risponde il motore locale.
 * @returns {{battuta:object, relazione:object, partita:object, note:string[]}}
 */
export async function generaDialogoNarrativo({ partita, npc, testo, adesso = new Date(), forzaMotore = null }) {
  if (!partita.storia?.length) {
    throw new ErroreGioco(
      "Prima di parlare con qualcuno, scrivi il proemio: è lì che incontri i primi personaggi.",
      "SAGA_SENZA_CAPITOLI",
      400
    );
  }

  const nomeNpc = String(npc || "").trim();
  const cercato = nomeNpc.toLowerCase();
  const relazione = (partita.stato.relazioni || []).find((r) => r.npc.toLowerCase() === cercato);
  if (!relazione) {
    throw new ErroreGioco(
      `Non conosci ancora nessun personaggio di nome «${nomeNpc}»: lo incontrerai nel corso della storia.`,
      "NPC_NON_TROVATO",
      404
    );
  }

  const messaggio = normalizzaMessaggio(testo);
  if (!messaggio) {
    throw new ErroreGioco(
      "Scrivi almeno 2 caratteri per parlare con questo personaggio.",
      "MESSAGGIO_NON_VALIDO",
      400
    );
  }

  const { sistema, utente } = costruisciPromptDialogo({ partita, relazione, messaggio });

  // --- Generazione ---------------------------------------------------------
  const config = configurazioneLLM();
  const note = [];
  let grezzo = null;
  let provenienza = "motore-locale";

  const usaLLM = forzaMotore ? forzaMotore === "llm" : config.attiva;
  if (usaLLM && config.attiva) {
    try {
      const risposta = await generaConLLM({ sistema, utente, configurazione: config });
      grezzo = risposta.contenuto;
      provenienza = risposta.provenienza;
    } catch (errore) {
      note.push(`Personaggio non raggiungibile (${errore.message}). Risponde la voce locale.`);
      grezzo = null;
    }
  }

  let battuta;
  if (grezzo) {
    try {
      battuta = normalizzaBattuta(grezzo, { npc: relazione.npc, provenienza });
    } catch (errore) {
      note.push(`Risposta non utilizzabile (${errore.message}). Subentra la voce locale.`);
      grezzo = null;
    }
  }
  if (!grezzo) {
    const locale = generaBattutaLocale({ partita, relazione, messaggio });
    battuta = normalizzaBattuta(locale, { npc: relazione.npc, provenienza: "motore-locale" });
    battuta.testiConsumati = locale.meta?.testiConsumati || [];
    provenienza = "motore-locale";
  }

  // --- Applicazione: assi, memoria profonda, cronologia --------------------
  const variazione = {
    vincolo: battuta.deltaVincolo || 0,
    tensione: battuta.deltaTensione || 0,
    rispetto: battuta.deltaRispetto || 0
  };
  if (variazione.vincolo || variazione.tensione || variazione.rispetto) {
    applicaAssi(relazione, variazione, partita.stato.capitolo || 1);
  }
  registraMemoriaNpc(partita.stato, relazione.npc, {
    fatto: battuta.fatto,
    promessa: battuta.promessa,
    impressione: battuta.impressione,
    capitolo: partita.stato.capitolo || 1,
    argomento: messaggio
  });
  aggiungiScambio(partita, relazione, messaggio, battuta, adesso);

  partita.stato.contatori.battute = (partita.stato.contatori.battute || 0) + 1;
  partita.aggiornataIl = adesso.toISOString();

  return {
    battuta: { ...battuta, npc: relazione.npc, creatoIl: adesso.toISOString() },
    relazione,
    partita,
    note: [...note, ...(battuta.note || [])]
  };
}

/** Valida il messaggio del giocatore nella Modalità Personaggio. */
export function normalizzaMessaggio(testo) {
  const pulito = String(testo || "").replace(/\s+/g, " ").trim().slice(0, 400);
  return pulito.length >= 2 ? pulito : null;
}

/** Aggiunge lo scambio (giocatore + NPC) alla cronologia della conversazione. */
function aggiungiScambio(partita, relazione, messaggio, battuta, adesso) {
  partita.dialoghi = partita.dialoghi || {};
  const chiave = relazione.npc;
  const conversazione = partita.dialoghi[chiave] || (partita.dialoghi[chiave] = {
    npc: chiave,
    messaggi: [],
    testiUsati: [],
    aggiornatoIl: null
  });

  const iso = adesso.toISOString();
  conversazione.messaggi.push({ da: "tu", testo: messaggio, creatoIl: iso });
  conversazione.messaggi.push({
    da: relazione.npc,
    testo: battuta.testo,
    emozione: battuta.emozione || null,
    motore: battuta.provenienza === "motore-locale" ? "locale" : "llm",
    creatoIl: iso
  });
  // Le conversazioni restano leggere: si conservano gli ultimi 40 messaggi
  conversazione.messaggi = conversazione.messaggi.slice(-40);
  conversazione.testiUsati = [...(conversazione.testiUsati || []), ...(battuta.testiConsumati || [])].slice(-40);
  conversazione.aggiornatoIl = iso;
  return conversazione;
}
