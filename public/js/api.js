/**
 * api.js — Client REST dell'interfaccia.
 * Tutte le chiamate usano URL relative: funzionano identiche in locale e
 * dietro un proxy di anteprima.
 */

export class ErroreApi extends Error {
  constructor(messaggio, codice = "ERRORE", stato = 0, dettagli = {}) {
    super(messaggio);
    this.name = "ErroreApi";
    this.codice = codice;
    this.stato = stato;
    this.dettagli = dettagli;
  }
}

async function richiesta(percorso, { metodo = "GET", corpo } = {}) {
  let risposta;
  try {
    risposta = await fetch(percorso, {
      method: metodo,
      headers: corpo ? { "Content-Type": "application/json" } : undefined,
      body: corpo ? JSON.stringify(corpo) : undefined
    });
  } catch (errore) {
    throw new ErroreApi(
      "Impossibile contattare il server di gioco. Verifica che sia in esecuzione e riprova.",
      "RETE",
      0
    );
  }

  const tipo = risposta.headers.get("content-type") || "";
  if (!tipo.includes("application/json")) {
    if (!risposta.ok) {
      throw new ErroreApi(`Errore del server (${risposta.status}).`, "RISPOSTA_NON_VALIDA", risposta.status);
    }
    return risposta;
  }

  const dati = await risposta.json().catch(() => ({}));
  if (!risposta.ok) {
    throw new ErroreApi(
      dati.messaggio || `Errore ${risposta.status}.`,
      dati.errore || "ERRORE",
      risposta.status,
      dati.dettagli || {}
    );
  }
  return dati;
}

export const api = {
  config: () => richiesta("/api/config"),
  elencoSaghe: () => richiesta("/api/partite"),
  creaPartita: (dati) => richiesta("/api/partite", { metodo: "POST", corpo: dati }),
  leggiPartita: (id) => richiesta(`/api/partite/${encodeURIComponent(id)}`),
  generaCapitolo: (id, azione) => richiesta(`/api/partite/${encodeURIComponent(id)}/capitolo`, { metodo: "POST", corpo: azione || {} }),
  ricarica: (id, modalita) => richiesta(`/api/partite/${encodeURIComponent(id)}/ricarica`, { metodo: "POST", corpo: { modalita } }),
  memoria: (id) => richiesta(`/api/partite/${encodeURIComponent(id)}/memoria`),
  elimina: (id) => richiesta(`/api/partite/${encodeURIComponent(id)}`, { metodo: "DELETE" }),
  urlEsporta: (id) => `/api/partite/${encodeURIComponent(id)}/esporta`
};
