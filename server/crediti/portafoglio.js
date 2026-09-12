/**
 * portafoglio.js — Sistema di crediti interno "Token Storia".
 *
 * Regole (vedi docs/01-flussi-di-lavoro.md, flusso D):
 *  - Bonus di benvenuto: 1000 Token Storia (accredito automatico alla creazione della saga).
 *  - Costo di generazione: 10 Token Storia per capitolo.
 *  - Ricarica rapida gratuita: +500 Token, tramite missione giornaliera o spot fittizio.
 *  - Garanzia anti-blocco: se il saldo scende sotto il costo di un capitolo, la
 *    "Ricarica d'Emergenza" è sempre disponibile e ignora qualsiasi cooldown.
 *  - Nessun pagamento reale, nessuna integrazione di pagamento: la valuta è fittizia.
 */

export const VALUTA = "Token Storia";
export const BONUS_BENVENUTO = 1000;
export const COSTO_CAPITOLO = 10;
export const QUANTITA_RICARICA = 500;
export const MISSIONI_AL_GIORNO = 3;
export const COOLDOWN_MISSIONE_MS = 60 * 1000; // fra una missione e l'altra (simula l'attesa della quest)
export const COOLDOWN_SPOT_MS = 60 * 1000; // fra uno spot e l'altro

const MAX_MOVIMENTI = 60;

function iso(adesso) {
  return (adesso instanceof Date ? adesso : new Date()).toISOString();
}

function giorno(adesso) {
  return iso(adesso).slice(0, 10);
}

export function portafoglioIniziale(adesso = new Date()) {
  const quando = iso(adesso);
  return {
    valuta: VALUTA,
    saldo: BONUS_BENVENUTO,
    costoCapitolo: COSTO_CAPITOLO,
    bonusBenvenuto: BONUS_BENVENUTO,
    ricaricaQuantita: QUANTITA_RICARICA,
    spesoTotale: 0,
    guadagnatoTotale: BONUS_BENVENUTO,
    missioneGiornaliera: { giorno: giorno(adesso), completateOggi: 1, ultima: quando },
    spotFittizio: { giorno: giorno(adesso), completatiOggi: 0, ultimo: null },
    movimenti: [
      { tipo: "bonus", importo: BONUS_BENVENUTO, causale: "Bonus di benvenuto", data: quando, saldoDopo: BONUS_BENVENUTO }
    ]
  };
}

function registra(economia, tipo, importo, causale, adesso) {
  economia.saldo += importo;
  economia.movimenti.push({ tipo, importo, causale, data: iso(adesso), saldoDopo: economia.saldo });
  if (economia.movimenti.length > MAX_MOVIMENTI) {
    economia.movimenti = economia.movimenti.slice(-MAX_MOVIMENTI);
  }
}

/** Accredito generico (bonus, ricariche). */
export function accredita(economia, importo, causale, adesso = new Date()) {
  const quantita = Math.abs(Math.round(Number(importo) || 0));
  registra(economia, causale === "Bonus di benvenuto" ? "bonus" : "ricarica", quantita, causale, adesso);
  economia.guadagnatoTotale = (economia.guadagnatoTotale || 0) + quantita;
  return economia;
}

/** Addebito (generazione di un capitolo). */
export function addebita(economia, importo, causale, adesso = new Date()) {
  const quantita = Math.abs(Math.round(Number(importo) || 0));
  if (economia.saldo < quantita) {
    const errore = new Error(`Saldo insufficiente: servono ${quantita} ${VALUTA}, ne hai ${economia.saldo}.`);
    errore.codice = "SALDO_INSUFFICIENTE";
    errore.dettagli = { saldo: economia.saldo, richiesto: quantita, valuta: VALUTA };
    throw errore;
  }
  registra(economia, "spesa", -quantita, causale, adesso);
  economia.spesoTotale = (economia.spesoTotale || 0) + quantita;
  return economia;
}

function puoRicarica(cooldownMs, ultimo, adesso) {
  if (!ultimo) return true;
  return new Date(adesso).getTime() - new Date(ultimo).getTime() >= cooldownMs;
}

function secondiMancanti(cooldownMs, ultimo, adesso) {
  if (!ultimo) return 0;
  const trascorsi = new Date(adesso).getTime() - new Date(ultimo).getTime();
  return Math.max(0, Math.ceil((cooldownMs - trascorsi) / 1000));
}

/** Stato corrente delle ricariche gratuite, per l'interfaccia. */
export function statoRicariche(economia, adesso = new Date()) {
  const oggi = giorno(adesso);
  const missione = economia.missioneGiornaliera || {};
  const spot = economia.spotFittizio || {};

  const completateOggi = missione.giorno === oggi ? missione.completateOggi || 0 : 0;
  const missioniRestanti = Math.max(0, MISSIONI_AL_GIORNO - completateOggi);
  const attesaMissione = secondiMancanti(COOLDOWN_MISSIONE_MS, missione.ultima, adesso);

  const completatiSpot = spot.giorno === oggi ? spot.completatiOggi || 0 : 0;
  const attesaSpot = secondiMancanti(COOLDOWN_SPOT_MS, spot.ultimo, adesso);

  const emergenzaNecessaria = economia.saldo < COSTO_CAPITOLO;

  return {
    valuta: VALUTA,
    saldo: economia.saldo,
    costoCapitolo: COSTO_CAPITOLO,
    quantitaRicarica: QUANTITA_RICARICA,
    missioneGiornaliera: {
      etichetta: "Missione giornaliera",
      descrizione: "Completa una quest rapida per la gilda e ricevi 500 Token Storia gratis.",
      disponibile: missioniRestanti > 0 && attesaMissione === 0,
      restantiOggi: missioniRestanti,
      totaleOggi: MISSIONI_AL_GIORNO,
      attendiSecondi: attesaMissione
    },
    spotFittizio: {
      etichetta: "Spot fittizio",
      descrizione: "Guarda un breve spot immaginario (nessun annuncio reale) e ricevi 500 Token Storia.",
      disponibile: attesaSpot === 0,
      completatiOggi: completatiSpot,
      attendiSecondi: attesaSpot
    },
    emergenza: {
      etichetta: "Ricarica d'Emergenza",
      descrizione: "Quando il saldo non basta per un capitolo, questa ricarica è sempre disponibile: il gioco non si blocca mai.",
      disponibile: emergenzaNecessaria,
      necessaria: emergenzaNecessaria
    },
    capitoliPossibili: Math.floor(economia.saldo / COSTO_CAPITOLO)
  };
}

/**
 * Esegue una ricarica gratuita.
 * @param {object} economia portafoglio della partita
 * @param {"missione"|"spot"|"emergenza"} modalita
 */
export function ricarica(economia, modalita = "missione", adesso = new Date()) {
  const stato = statoRicariche(economia, adesso);
  const oggi = giorno(adesso);

  if (modalita === "emergenza") {
    if (!stato.emergenza.necessaria) {
      const errore = new Error("La Ricarica d'Emergenza si attiva solo quando il saldo non basta per un capitolo.");
      errore.codice = "RICARICA_NON_NECESSARIA";
      throw errore;
    }
    economia.missioneGiornaliera = { ...(economia.missioneGiornaliera || {}), ultima: iso(adesso) };
    accredita(economia, QUANTITA_RICARICA, "Ricarica d'Emergenza (garanzia anti-blocco)", adesso);
    return {
      economia,
      importo: QUANTITA_RICARICA,
      messaggio: `Ricarica d'Emergenza completata: +${QUANTITA_RICARICA} ${VALUTA}. La tua saga può continuare.`,
      modalita
    };
  }

  if (modalita === "spot") {
    if (!stato.spotFittizio.disponibile) {
      const errore = new Error(`Lo spot è già stato usato: riprova fra ${stato.spotFittizio.attendiSecondi} secondi.`);
      errore.codice = "RICARICA_IN_ATTESA";
      errore.dettagli = { attendiSecondi: stato.spotFittizio.attendiSecondi };
      throw errore;
    }
    economia.spotFittizio = {
      giorno: oggi,
      completatiOggi: (economia.spotFittizio?.giorno === oggi ? economia.spotFittizio.completatiOggi || 0 : 0) + 1,
      ultimo: iso(adesso)
    };
    accredita(economia, QUANTITA_RICARICA, "Spot fittizio completato", adesso);
    return {
      economia,
      importo: QUANTITA_RICARICA,
      messaggio: `Spot fittizio completato: +${QUANTITA_RICARICA} ${VALUTA}. Nessun annuncio reale è stato mostrato.`,
      modalita
    };
  }

  // Modalità predefinita: missione giornaliera
  if (!stato.missioneGiornaliera.disponibile) {
    const dettaglio = stato.missioneGiornaliera.restantiOggi === 0
      ? "Hai completato tutte le missioni di oggi: puoi usare lo spot fittizio."
      : `La prossima missione si sblocca fra ${stato.missioneGiornaliera.attendiSecondi} secondi.`;
    const errore = new Error(`Missione giornaliera non disponibile. ${dettaglio}`);
    errore.codice = "RICARICA_IN_ATTESA";
    errore.dettagli = stato.missioneGiornaliera;
    throw errore;
  }

  const completateOggi = economia.missioneGiornaliera?.giorno === oggi
    ? (economia.missioneGiornaliera.completateOggi || 0) + 1
    : 1;
  economia.missioneGiornaliera = { giorno: oggi, completateOggi, ultima: iso(adesso) };
  accredita(economia, QUANTITA_RICARICA, `Missione giornaliera completata (${completateOggi}/${MISSIONI_AL_GIORNO})`, adesso);

  return {
    economia,
    importo: QUANTITA_RICARICA,
    messaggio: `Missione giornaliera completata: +${QUANTITA_RICARICA} ${VALUTA}.`,
    modalita: "missione"
  };
}

/** Verifica (senza spendere) se il saldo basta per un capitolo. */
export function puoGenerare(economia) {
  return economia.saldo >= COSTO_CAPITOLO;
}
