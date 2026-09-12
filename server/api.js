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
import { albero as alberoRelazioni, ASSI, QUADRANTI, TAPPE } from "./stato/relazioni.js";
import { descriviIllustrazioni, generaScena, SCENE_PER_CAPITOLO, promptImmagine } from "./illustrazioni/scene.js";
import * as archivio from "./stato/archivio.js";
import * as playtest from "./playtest/registro.js";

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
    opzioniMinime: 3,
    illustrazioni: {
      attive: true,
      perCapitolo: SCENE_PER_CAPITOLO,
      generatore: "motore-svg-integrato",
      descrizione: "Ogni capitolo riceve " + SCENE_PER_CAPITOLO + " illustrazioni generate dal contenuto della scena (luogo, volto dell'NPC, la tua mossa, colpo di scena, cliffhanger). Nessun servizio esterno, nessun costo.",
      urlPrompt: "/api/partite/:id/illustrazioni/:capitolo/:indice/prompt"
    },
    playtest: {
      attivo: playtest.attivo(),
      registrazione: "locale",
      nota: "Il registro degli eventi è locale (dati/playtest/) e non contiene dati personali: serve a valutare il test giocato.",
      feedbackDisponibile: true
    },
    alberoFiducia: {
      assi: ASSI,
      quadranti: QUADRANTI,
      tappe: TAPPE,
      descrizione: "Ogni NPC è descritto da Vincolo, Tensione e Rispetto: la combinazione genera quattro quadranti narrativi e uno storico di tappe."
    }
  };
}

/** Vista completa della partita per il client (scheda + cronaca + economia). */
export function vistaPartita(partita, adesso = new Date()) {
  // Le illustrazioni del capitolo più recente vengono inviate con la partita;
  // per i capitoli precedenti il client le richiede all'occorrenza.
  const ultimo = partita.storia?.at(-1);
  const capitoloCorrente = ultimo
    ? { numero: ultimo.numero, illustrazioni: descriviIllustrazioni(partita, ultimo) }
    : null;

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
    capitoliTotali: partita.storia.length,
    alberoFiducia: alberoRelazioni(partita),
    illustrazioniCorrenti: capitoloCorrente
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
      await playtest.registra("saga-creata", {
        saga: partita.id,
        ambientazione: partita.configurazione.ambientazione.id,
        tono: partita.configurazione.tono
      });
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
      const inizio = Date.now();
      try {
        const { capitolo, note } = await generaCapitoloNarrativo({
          partita,
          azione: ctx.corpo,
          adesso: ctx.adesso
        });
        await archivio.salva(partita);
        await playtest.registra("capitolo-generato", {
          saga: partita.id,
          numero: capitolo.numero,
          parole: capitolo.parole,
          opzioni: capitolo.opzioni.length,
          tipoAzione: ctx.corpo?.opzioneId ? "scelta" : ctx.corpo?.testo ? "personalizzata" : "proemio",
          motore: capitolo.motore || capitolo.provenienza,
          millisecondi: Date.now() - inizio
        });
        return {
          capitolo,
          note,
          partita: vistaPartita(partita, ctx.adesso)
        };
      } catch (errore) {
        await playtest.registra("capitolo-rifiutato", {
          saga: partita.id,
          numero: partita.storia.length + 1,
          motivo: errore?.codice || errore?.name || "ERRORE",
          millisecondi: Date.now() - inizio
        });
        throw errore;
      }
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
      await playtest.registra("ricarica", { saga: partita.id, modalita, saldo: esito.portafoglio?.saldo });
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
    schema: ["api", "partite", ":id", "illustrazioni", ":numero"],
    gestore: async (ctx) => {
      const partita = await archivio.leggi(ctx.params.id);
      const capitolo = trovaCapitolo(partita, ctx.params.numero);
      return {
        capitolo: capitolo.numero,
        titolo: capitolo.titolo,
        scene: descriviIllustrazioni(partita, capitolo),
        generatore: "motore-svg-integrato"
      };
    }
  },
  {
    metodo: "GET",
    schema: ["api", "partite", ":id", "illustrazioni", ":numero", ":indice"],
    gestore: async (ctx) => {
      const partita = await archivio.leggi(ctx.params.id);
      const capitolo = trovaCapitolo(partita, ctx.params.numero);
      const indice = Number(ctx.params.indice);
      if (!Number.isInteger(indice) || indice < 0 || indice >= SCENE_PER_CAPITOLO) {
        throw new ErroreGioco(`Indice di scena non valido: usare un numero da 0 a ${SCENE_PER_CAPITOLO - 1}.`, "SCENA_NON_VALIDA", 400);
      }
      const scena = generaScena({ partita, capitolo, indice });
      return {
        __raw: scena.svg,
        __intestazioni: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          // Le scene sono deterministiche: si possono mettere in cache a lungo
          "Cache-Control": "public, max-age=31536000, immutable"
        }
      };
    }
  },
  {
    metodo: "GET",
    schema: ["api", "partite", ":id", "illustrazioni", ":numero", ":indice", "prompt"],
    gestore: async (ctx) => {
      const partita = await archivio.leggi(ctx.params.id);
      const capitolo = trovaCapitolo(partita, ctx.params.numero);
      return {
        prompt: promptImmagine(partita, capitolo, Number(ctx.params.indice)),
        nota: "Prompt pronto per un eventuale generatore di immagini esterno (non necessario: il gioco include il proprio motore SVG)."
      };
    }
  },
  {
    metodo: "GET",
    schema: ["api", "partite", ":id", "albero"],
    gestore: async (ctx) => {
      const partita = await archivio.leggi(ctx.params.id);
      return {
        albero: alberoRelazioni(partita),
        spiegazione: "Assi: Vincolo (quanto vi lega), Tensione (quanto è conflittuale), Rispetto (quanto ti stima). I quadranti nascono da Vincolo × Tensione; le tappe segnano gli eventi decisivi."
      };
    }
  },
  {
    metodo: "POST",
    schema: ["api", "playtest", "evento"],
    gestore: async (ctx) => {
      const { tipo, ...dati } = ctx.corpo || {};
      if (!tipo) {
        throw new ErroreGioco("Indicare il tipo di evento.", "EVENTO_NON_VALIDO", 400);
      }
      const evento = await playtest.registra(String(tipo), dati);
      return { registrato: Boolean(evento), attivo: playtest.attivo() };
    }
  },
  {
    metodo: "GET",
    schema: ["api", "playtest", "riepilogo"],
    gestore: async (ctx) => ({
      riepilogo: await playtest.riepilogo(ctx.query?.data || null),
      cartella: playtest.CARTELLA_PLAYTEST
    })
  },
  {
    metodo: "GET",
    schema: ["api", "playtest", "eventi"],
    gestore: async (ctx) => ({
      eventi: await playtest.leggiEventi(ctx.query?.data || null)
    })
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

/** Trova un capitolo della saga per numero (1-based). */
export function trovaCapitolo(partita, numero) {
  const n = Number(numero);
  const capitolo = partita.storia.find((c) => c.numero === n);
  if (!capitolo) {
    throw new ErroreGioco(`Il capitolo ${numero} non esiste in questa saga.`, "CAPITOLO_NON_TROVATO", 404);
  }
  return capitolo;
}

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
  righe.push("- **Albero di fiducia:**");
  for (const nodo of alberoRelazioni(partita).nodi) {
    righe.push(`  - ${nodo.npc} — ${nodo.ruolo} · ${nodo.quadrante.nome} · Vincolo ${nodo.vincolo} / Tensione ${nodo.tensione} / Rispetto ${nodo.rispetto}`);
    if (nodo.tappe.length) righe.push(`    - tappe: ${nodo.tappe.map((t) => `${t.nome} (cap. ${t.capitolo})`).join(", ")}`);
    if (nodo.nota) righe.push(`    - nota: ${nodo.nota}`);
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
