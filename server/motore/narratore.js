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

import { generaCapitolo as generaCapitoloLocale } from "./motore_locale.js";
import { costruisciPrompt } from "./prompt.js";
import { configurazioneLLM, generaConLLM } from "./provider_llm.js";
import { normalizzaCapitolo } from "./schema.js";
import { addebita, puoGenerare, COSTO_CAPITOLO, VALUTA } from "../crediti/portafoglio.js";
import { applicaDelta, avanzaArco, chiudiObiettivo } from "../stato/modello.js";
import { aggiornaMemoria, digest } from "../stato/memoria.js";

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
