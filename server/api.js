/**
 * api.js — API REST dell'applicazione (nessuna dipendenza esterna).
 *
 * Tutte le risposte sono JSON con messaggi in italiano; gli errori di gioco
 * (saldo insufficiente, ricarica in attesa, saga inesistente) usano codici
 * HTTP semanticamente corretti così che l'interfaccia possa reagire.
 */

import { creaPartita, TONI_DISPONIBILI, COSTO_CAPITOLO } from "./stato/modello.js";
import { digest, scheda } from "./stato/memoria.js";
import { statoRicariche, ricarica, VALUTA, BONUS_BENVENUTO, MISSIONI_AL_GIORNO } from "./crediti/portafoglio.js";
import { generaCapitoloNarrativo, ErroreGioco, modalitaMotore } from "./motore/narratore.js";
import { AMBIENTAZIONI, ARCHETIPI, TRATTI, NOMI_SUGGERITI } from "./motore/lessico.js";
import * as archivio from "./stato/archivio.js";

const MAX_CORPO = 64 * 1024; // 64 KB: più che sufficiente per un'azione di gioco

// ---------------------------------------------------------------------------
// Utilità HTTP
// ---------------------------------------------------------------------------
function invia(res, stato, dati, intestazioni = {}) {
  const corpo = typeof dati === "string" ? dati : JSON.stringify(dati);
  res.writeHead(stato, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...intestazioni
  });
  res.end(corpo);
}

function erroreHttp(res, errore) {
  const stato = errore.stato || (errore.codice === "SALDO_INSUFFICIENTE" ? 402 : 400);
  invia(res, stato, {
    errore: errore.codice || "ERRORE",
    messaggio: errore.message || "Si è verificato un errore imprevisto.",
    dettagli: errore.dettagli || undefined
  });
}

async function leggiCorpo(req) {
  let dimensione = 0;
  const pezzi = [];
  for await (const pezzo of req) {
    dimensione += pezzo.length;
    if (dimensione > MAX_CORPO) {
      throw new ErroreGioco("Richiesta troppo grande.", "CORPO_TROPPO_GRANDE", 413);
    }
    pezzi.push(pezzo);
  }
  if (!pezzi.length) return {};
  const testo = Buffer.concat(pezzi).toString("utf8").trim();
  if (!testo) return {};
  try {
    return JSON.parse(testo);
  } catch {
    throw new ErroreGioco("Il corpo della richiesta non è un JSON valido.", "JSON_NON_VALIDO", 400);
  }
}

// ---------------------------------------------------------------------------
// Viste
// ---------------------------------------------------------------------------
export function vistaConfig() {
  return {
    nome: "MasterRPG — Cronache Infinite",
    versione: "1.0.0",
    lingua: "it-IT",
    motore: modalitaMotore(),
    motoreDescrizione: modalitaMotore() === "llm"
      ? "Game Master: modello linguistico esterno configurato sul server."
      : "Game Master: Motore Narrativo Locale (funziona anche offline, senza chiavi API).",
    crediti: {
      valuta: VALUTA,
      costoCapitolo: COSTO_CAPITOLO,
      bonusBenvenuto: BONUS_BENVENUTO,
      missioniAlGiorno: MISSIONI_AL_GIORNO,
      pagamentiReali: false
    },
    ambientazioni: AMBIENTAZIONI.map((a) => ({
      id: a.id,
      nome: a.nome,
      sottotitolo: a.sottotitolo,
      descrizione: a.descrizione,
      emoji: a.emoji,
      colori: a.colori
    })),
    toni: TONI_DISPONIBILI,
    archetipi: ARCHETIPI,
    tratti: TRATTI,
    nomiSuggeriti: NOMI_SUGGERITI,
    regoleParoleCapitolo: { min: 150, max: 200 },
    opzioniMinime: 3
  };
}

/** Vista completa della partita per il client (scheda + cronaca + economia). */
export function vistaPartita(partita, adesso = new Date()) {
  return {
    id: partita.id,
    creataIl: partita.creataIl,
    aggiornataIl: partita.aggiornataIl,
    configurazione: partita.configurazione,
    stato: partita.stato,
    scheda: scheda(partita),
    economia: {
      ...partita.economia,
      movimenti: partita.economia.movimenti.slice(-25).reverse()
    },
    ricariche: statoRicariche(partita.economia, adesso),
    memoria: {
      ...partita.memoria,
      digest: digest(partita)
    },
    storia: partita.storia,
    capitoliTotali: partita.storia.length
  };
}

// ---------------------------------------------------------------------------
// Rotte
// ---------------------------------------------------------------------------
const ROTTE = [
  {
    metodo: "GET",
    schema: ["api", "config"],
    gestore: async () => vistaConfig()
  },
  {
    metodo: "GET",
    schema: ["api", "partite"],
    gestore: async () => ({ partite: await archivio.elenca() })
  },
  {
    metodo: "POST",
    schema: ["api", "partite"],
    gestore: async (ctx) => {
      const corpo = ctx.corpo || {};
      const partita = creaPartita(
        {
          ambientazione: corpo.ambientazione,
          tono: corpo.tono,
          protagonista: corpo.protagonista,
          titoloSaga: corpo.titoloSaga
        },
        ctx.adesso
      );
      await archivio.salva(partita);
      return { partita: vistaPartita(partita, ctx.adesso), bonus: BONUS_BENVENUTO };
    }
  },
  {
    metodo: "GET",
    schema: ["api", "partite", ":id"],
    gestore: async (ctx) => ({ partita: vistaPartita(await archivio.leggi(ctx.params.id), ctx.adesso) })
  },
  {
    metodo: "DELETE",
    schema: ["api", "partite", ":id"],
    gestore: async (ctx) => {
      const eliminata = await archivio.elimina(ctx.params.id);
      if (!eliminata) throw new ErroreGioco("Saga non trovata.", "NON_TROVATA", 404);
      return { messaggio: "Saga eliminata. Le cronache restano nella tua memoria, non nel server." };
    }
  },
  {
    metodo: "GET",
    schema: ["api", "partite", ":id", "memoria"],
    gestore: async (ctx) => {
      const partita = await archivio.leggi(ctx.params.id);
      return {
        scheda: scheda(partita),
        digest: digest(partita),
        spiegazione:
          "Questo è esattamente il testo di memoria che il Game Master riceve prima di scrivere il prossimo capitolo."
      };
    }
  },
  {
    metodo: "POST",
    schema: ["api", "partite", ":id", "capitolo"],
    gestore: async (ctx) => {
      const partita = await archivio.leggi(ctx.params.id);
      const { capitolo, note } = await generaCapitoloNarrativo({
        partita,
        azione: ctx.corpo,
        adesso: ctx.adesso
      });
      await archivio.salva(partita);
      return {
        capitolo,
        note,
        partita: vistaPartita(partita, ctx.adesso)
      };
    }
  },
  {
    metodo: "POST",
    schema: ["api", "partite", ":id", "ricarica"],
    gestore: async (ctx) => {
      const partita = await archivio.leggi(ctx.params.id);
      const modalita = ["missione", "spot", "emergenza"].includes(ctx.corpo?.modalita)
        ? ctx.corpo.modalita
        : "missione";
      const esito = ricarica(partita.economia, modalita, ctx.adesso);
      await archivio.salva(partita);
      return {
        messaggio: esito.messaggio,
        modalita: esito.modalita,
        importo: esito.importo,
        partita: vistaPartita(partita, ctx.adesso)
      };
    }
  },
  {
    metodo: "GET",
    schema: ["api", "partite", ":id", "esporta"],
    gestore: async (ctx) => {
      const partita = await archivio.leggi(ctx.params.id);
      const markdown = esportaRomanzo(partita);
      const nome = `${(partita.configurazione.titoloSaga || "saga").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-").toLowerCase() || "saga"}.md`;
      return {
        __raw: markdown,
        __intestazioni: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${nome}"`
        }
      };
    }
  }
];

/** Esporta l'intera saga come romanzo in Markdown. */
export function esportaRomanzo(partita) {
  const c = partita.configurazione;
  const righe = [];
  righe.push(`# ${c.titoloSaga}`);
  righe.push("");
  righe.push(`*Ambientazione: ${c.ambientazione.nome}${c.ambientazione.personalizzata ? " (creata dal giocatore)" : ""} · Tono: ${c.tono}*`);
  if (c.ambientazione.testoUtente) righe.push(`\n> ${c.ambientazione.testoUtente}`);
  righe.push("");
  righe.push(`**Protagonista:** ${c.protagonista.nome} — ${c.protagonista.archetipo} (${c.protagonista.tratto})`);
  righe.push("");
  righe.push(`*Saga generata con MasterRPG — ${partita.storia.length} capitoli, ${partita.memoria?.paroleTotali || 0} parole.*`);
  righe.push("");
  righe.push("---");
  righe.push("");

  for (const cap of partita.storia) {
    righe.push(`## Capitolo ${cap.numero} — ${cap.titolo}`);
    righe.push("");
    righe.push(cap.testo);
    righe.push("");
    if (cap.azioneGiocatore?.testo) {
      righe.push(cap.azioneGiocatore.tipo === "scelta"
        ? `> *Scelta del giocatore:* ${cap.azioneGiocatore.testo}`
        : `> *Azione personalizzata:* ${cap.azioneGiocatore.testo}`);
      righe.push("");
    }
  }

  righe.push("---");
  righe.push("");
  righe.push("## Scheda finale del personaggio");
  righe.push("");
  righe.push(`- **Protagonista:** ${c.protagonista.nome} (${c.protagonista.archetipo}, ${c.protagonista.tratto})`);
  righe.push(`- **Vitali:** vita ${partita.stato.vitali.vita}/100 · energia ${partita.stato.vitali.energia}/100 · tensione ${partita.stato.vitali.tensione}/100`);
  righe.push(`- **Inventario:** ${partita.stato.inventario.length ? partita.stato.inventario.map((o) => o.nome).join(", ") : "vuoto"}`);
  righe.push("- **Relazioni:**");
  for (const r of partita.stato.relazioni) {
    righe.push(`  - ${r.npc} — ${r.ruolo} (fiducia ${r.fiducia}/100)${r.nota ? ` · ${r.nota}` : ""}`);
  }
  righe.push("- **Sinossi:**");
  for (const v of partita.stato.sinossi) {
    righe.push(`  - ${v.compresso ? `Capitoli ${v.capitolo}-${v.capitoloFine}` : `Capitolo ${v.capitolo}`}: ${v.testo}`);
  }
  righe.push("");
  righe.push(`*Token Storia residui: ${partita.economia.saldo} (spesi: ${partita.economia.spesoTotale}). Nessun pagamento reale è mai stato effettuato.*`);
  righe.push("");
  return righe.join("\n");
}

// ---------------------------------------------------------------------------
// Instradamento
// ---------------------------------------------------------------------------
function confronta(schema, segmenti) {
  if (schema.length !== segmenti.length) return null;
  const params = {};
  for (let i = 0; i < schema.length; i++) {
    const atteso = schema[i];
    if (atteso.startsWith(":")) {
      params[atteso.slice(1)] = decodeURIComponent(segmenti[i]);
    } else if (atteso !== segmenti[i]) {
      return null;
    }
  }
  return params;
}

/**
 * Gestisce una richiesta /api/*.
 * @returns {Promise<boolean>} true se la richiesta è stata gestita qui.
 */
export async function gestisciApi(req, res, url) {
  const segmenti = url.pathname.split("/").filter(Boolean);
  if (segmenti[0] !== "api") return false;

  let schemaRiconosciuto = false;
  for (const rotta of ROTTE) {
    const params = confronta(rotta.schema, segmenti);
    if (!params) continue;
    schemaRiconosciuto = true;
    // Il metodo viene verificato solo fra le rotte con schema compatibile:
    // così GET e POST su /api/partite convivono correttamente.
    if (req.method !== rotta.metodo) continue;

    try {
      const corpo = ["POST", "PUT", "PATCH"].includes(req.method) ? await leggiCorpo(req) : {};
      const esito = await rotta.gestore({ params, corpo, adesso: new Date(), req, res });
      if (esito && esito.__raw !== undefined) {
        invia(res, 200, esito.__raw, esito.__intestazioni || {});
      } else {
        invia(res, req.method === "POST" ? 201 : 200, esito);
      }
    } catch (errore) {
      if (!(errore instanceof ErroreGioco)) {
        console.error("[api] errore su", url.pathname, "-", errore?.message);
      }
      erroreHttp(res, errore);
    }
    return true;
  }

  if (schemaRiconosciuto) {
    invia(res, 405, {
      errore: "METODO_NON_CONSENTITO",
      messaggio: `Il metodo ${req.method} non è supportato per questa rotta.`
    });
    return true;
  }

  invia(res, 404, { errore: "ROTTA_NON_TROVATA", messaggio: "Rotta API inesistente." });
  return true;
}
