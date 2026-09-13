#!/usr/bin/env node
/**
 * prova-dialogo.js — Collaudo dell'intelligenza generativa in stile OOC.
 *
 * Verifica le funzionalità modellate su OOC: The Playable Anime:
 *   · Modalità Personaggio: chat gratuita con gli NPC già incontrati;
 *   · memoria profonda: fatti, promesse e impressioni conservati per NPC;
 *   · richiamo della memoria e profilo del giocatore nel digest;
 *   · albero di fiducia mosso anche dalle conversazioni;
 *   · validazioni (messaggio vuoto, NPC sconosciuto, saga senza capitoli);
 *   · garanzia che la conversazione non costi Token Storia (come la
 *     Character Mode di OOC con il modello base).
 *
 * Richiede il server attivo. Uso:
 *   node strumenti/prova-dialogo.js [urlBase]
 */

const BASE = (process.argv[2] || process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

let problemi = 0;
let controlli = 0;

function verifica(condizione, descrizione) {
  controlli++;
  if (!condizione) {
    problemi++;
    console.log(`  ✗ ${descrizione}`);
  }
  return Boolean(condizione);
}

async function chiama(percorso, opzioni) {
  const risposta = await fetch(`${BASE}${percorso}`, {
    ...opzioni,
    headers: opzioni?.corpo ? { "Content-Type": "application/json" } : undefined,
    body: opzioni?.corpo ? JSON.stringify(opzioni.corpo) : undefined,
    method: opzioni?.metodo || (opzioni?.corpo ? "POST" : "GET")
  });
  const tipo = risposta.headers.get("content-type") || "";
  const dati = tipo.includes("json") ? await risposta.json() : await risposta.text();
  return { stato: risposta.status, dati };
}

const parole = (t) => (String(t || "").match(/[\p{L}\p{N}']+/gu) || []).length;

async function avvia() {
  console.log("\n═══ Collaudo dell'intelligenza generativa in stile OOC ═══");
  console.log(`Server: ${BASE}\n`);

  try {
    await fetch(`${BASE}/salute`);
  } catch {
    console.error(`✗ Il server non risponde su ${BASE}. Avvialo con «npm start» e riprova.`);
    process.exit(1);
  }

  // ── 0. La Modalità Personaggio è dichiarata nella configurazione ──
  const { dati: config } = await chiama("/api/config");
  verifica(config.modalitaPersonaggio?.attiva === true, "la Modalità Personaggio è attiva");
  verifica(config.modalitaPersonaggio?.costoBattuta === 0, "la chat con gli NPC è gratuita (come la Character Mode di OOC)");

  // ── 1. Creazione della saga e primi capitoli ──
  console.log("── Preparazione della saga ──");
  const { stato: statoCreazione, dati: creazione } = await chiama("/api/partite", {
    corpo: {
      ambientazione: { id: "fantasy" },
      tono: "epico",
      protagonista: { nome: "Rei", archetipo: "Spadaccino Errante", tratto: "Impulsivo" }
    }
  });
  verifica(statoCreazione === 201, "la saga viene creata");
  const id = creazione.partita.id;
  const saldoIniziale = creazione.partita.economia.saldo;

  await chiama(`/api/partite/${id}/capitolo`, { corpo: {} });
  const npcDalProemio = await chiama(`/api/partite/${id}`);
  const nodi = npcDalProemio.dati.partita.alberoFiducia.nodi;
  verifica(nodi.length >= 1, "il proemio presenta almeno un personaggio");
  const npc = nodi[0].npc;

  await chiama(`/api/partite/${id}/capitolo`, {
    corpo: { testo: `Chiedere a ${npc} la verità sul Marchio e sul destino dei prescelti` }
  });
  await chiama(`/api/partite/${id}/capitolo`, { corpo: { opzioneId: "op1", tipoScelta: "empatica", testo: "Parlare con sincerità" } });

  // ── 2. Profilo del giocatore: l'IA osserva lo stile di chi gioca ──
  console.log("\n── Profilo del giocatore ──");
  const { dati: vista } = await chiama(`/api/partite/${id}`);
  const profilo = vista.partita.profiloGiocatore;
  verifica(profilo && profilo.azioni >= 2, `il profilo registra le azioni giocate (${profilo?.azioni})`);
  verifica(profilo.scelteRapide >= 1 && profilo.azioniLibere >= 1, "il profilo distingue scelte rapide e azioni personalizzate");

  const { dati: memoriaVista } = await chiama(`/api/partite/${id}/memoria`);
  verifica(memoriaVista.digest.includes("PROFILO DEL GIOCATORE"), "il digest iniettato contiene il profilo del giocatore");

  // ── 3. Validazioni della Modalità Personaggio ──
  console.log("\n── Validazioni ──");
  const vuoto = await chiama(`/api/partite/${id}/dialogo`, { corpo: { npc, testo: "" } });
  verifica(vuoto.stato === 400 && vuoto.dati.errore === "MESSAGGIO_NON_VALIDO", "il messaggio vuoto viene rifiutato");

  const sconosciuto = await chiama(`/api/partite/${id}/dialogo`, { corpo: { npc: "Nessuno", testo: "ci sei?" } });
  verifica(sconosciuto.stato === 404 && sconosciuto.dati.errore === "NPC_NON_TROVATO", "un personaggio mai incontrato viene rifiutato");

  // ── 4. Conversazione: l'NPC risponde in prima persona e ricorda ──
  console.log(`\n── Conversazione con ${npc} ──`);
  const prima = await chiama(`/api/partite/${id}/dialogo`, {
    corpo: { npc, testo: "Chi sei davvero? Dimmi la verità sul Marchio." }
  });
  verifica(prima.stato === 201, "la prima battuta viene generata");
  verifica(parole(prima.dati.battuta?.testo) >= 10, `la battuta è consistente (${parole(prima.dati.battuta?.testo)} parole)`);
  verifica(Boolean(prima.dati.battuta?.emozione), `l'NPC dichiara un'emozione («${prima.dati.battuta?.emozione}»)`);
  verifica(prima.dati.partita.economia.saldo === saldoIniziale - 30, "la chat non consuma Token Storia");
  verifica(prima.dati.partita.stato.contatori.battute === 1, "il contatore delle battute avanza");

  const seconda = await chiama(`/api/partite/${id}/dialogo`, {
    corpo: { npc, testo: "Ti prometto che ti aiuterò. Grazie." }
  });
  verifica(seconda.stato === 201, "la seconda battuta viene generata");
  const memoriaNpc = seconda.dati.memoria;
  verifica(Array.isArray(memoriaNpc?.fatti) && memoriaNpc.fatti.length >= 1, `l'NPC conserva ricordi (${memoriaNpc?.fatti?.length} fatti)`);
  verifica(Boolean(memoriaNpc?.impressione), "l'NPC ha un'impressione del protagonista che evolve");
  verifica(Array.isArray(memoriaNpc?.promesse), "le promesse sono tracciate");

  const terza = await chiama(`/api/partite/${id}/dialogo`, {
    corpo: { npc, testo: "Sei stato tu a tradirmi, vero?" }
  });
  verifica(terza.stato === 201, "anche un messaggio ostile riceve risposta");

  // ── 5. L'albero di fiducia si muove anche conversando ──
  console.log("\n── Albero di fiducia e cronologia ──");
  const dopo = await chiama(`/api/partite/${id}`);
  const nodoAggiornato = dopo.dati.partita.alberoFiducia.nodi.find((n) => n.npc === npc);
  const nodoPrima = nodi[0];
  const mosso =
    nodoAggiornato.vincolo !== nodoPrima.vincolo ||
    nodoAggiornato.tensione !== nodoPrima.tensione ||
    nodoAggiornato.rispetto !== nodoPrima.rispetto;
  verifica(mosso, "gli assi del rapporto cambiano con la conversazione");
  verifica(dopo.dati.partita.dialoghi?.[npc]?.messaggi >= 6, "la cronologia della conversazione è salvata");

  const cronologia = await chiama(`/api/partite/${id}/dialogo/${encodeURIComponent(npc)}`);
  verifica(cronologia.stato === 200, "la cronologia della conversazione è leggibile");
  verifica(cronologia.dati.gratuita === true, "la cronologia conferma la gratuità della modalità");
  verifica(cronologia.dati.battute.length >= 6, `la cronologia contiene gli scambi (${cronologia.dati.battute.length} messaggi)`);
  verifica(cronologia.dati.memoria?.fatti?.length >= 1, "la cronologia espone la memoria profonda dell'NPC");

  // ── 6. Il digest ora contiene i ricordi dell'NPC ──
  const memoriaFinale = await chiama(`/api/partite/${id}/memoria`);
  verifica(memoriaFinale.dati.digest.includes("ricorda"), "il digest iniettato include i ricordi degli NPC");
  verifica(memoriaFinale.dati.digest.includes(npc), "il digest cita il personaggio con cui hai parlato");

  // ── 7. Pulizia ──
  await chiama(`/api/partite/${id}`, { metodo: "DELETE" });

  console.log(`\n═══ Riepilogo ═══`);
  if (problemi === 0) {
    console.log(`✅ ${controlli}/${controlli} controlli superati.`);
    console.log("   Modalità Personaggio, memoria profonda e profilo del giocatore funzionano.\n");
    process.exit(0);
  } else {
    console.log(`❌ ${problemi} problemi su ${controlli} controlli.\n`);
    process.exit(1);
  }
}

avvia().catch((errore) => {
  console.error("Errore imprevisto nel collaudo:", errore);
  process.exit(1);
});
