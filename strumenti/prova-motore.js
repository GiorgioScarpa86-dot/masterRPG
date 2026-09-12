#!/usr/bin/env node
/**
 * prova-motore.js — Collaudo automatico del motore di gioco.
 *
 * Richiede il server attivo (npm start) e verifica, su una saga completa:
 *   · bonus di benvenuto e addebito dei Token Storia;
 *   · vincoli di ogni capitolo (150-200 parole, 3-4 opzioni, dialoghi bilanciati);
 *   · memoria a lungo termine (sinossi, compressione, inventario, relazioni);
 *   · garanzia anti-blocco: quando il saldo finisce, la ricarica gratuita
 *     riporta sempre il gioco in condizioni di continuare;
 *   · coerenza del salvataggio e dell'esportazione in Markdown.
 *
 * Uso:  node strumenti/prova-motore.js [numeroCapitoli] [urlBase]
 */

const CAPITOLI = Number(process.argv[2]) || 100;
const BASE = (process.argv[3] || process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

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

const parole = (t) => (t.match(/[\p{L}\p{N}']+/gu) || []).length;
const AZIONI = [
  "Sguainare la spada e attaccare per primo",
  "Chiamare l'NPC per nome e chiedere la verità",
  "Esaminare ogni dettaglio del luogo con calma",
  "Fuggire e nascondermi tra le ombre",
  "Ribaltare la situazione con una mezza verità",
  "Fermarmi e medicare le ferite prima di proseguire",
  "Interrogare i presenti uno per uno",
  "Usare il potere che mi brucia dentro"
];

async function avvia() {
  console.log(`\n═══ Collaudo del motore narrativo ═══`);
  console.log(`Server: ${BASE} · Capitoli da generare: ${CAPITOLI}\n`);

  // ── 0. Il server risponde? ──
  try {
    const salute = await fetch(`${BASE}/salute`);
    const dati = await salute.json();
    console.log(`Motore attivo: ${dati.motore === "llm" ? "modello linguistico esterno" : "Motore Narrativo Locale"}\n`);
  } catch {
    console.error(`✗ Il server non risponde su ${BASE}. Avvialo con «npm start» e riprova.`);
    process.exit(1);
  }

  const { dati: config } = await chiama("/api/config");
  verifica(config.crediti.valuta === "Token Storia", "la valuta interna si chiama «Token Storia»");
  verifica(config.crediti.costoCapitolo === 10, "ogni capitolo costa 10 Token Storia");
  verifica(config.crediti.bonusBenvenuto === 1000, "il bonus di benvenuto è di 1000 Token Storia");
  verifica(config.crediti.pagamentiReali === false, "nessun pagamento reale è previsto");

  // ── 1. Creazione della saga ──
  console.log("\n── Creazione della saga ──");
  const { stato: statoCreazione, dati: creazione } = await chiama("/api/partite", {
    corpo: {
      ambientazione: { id: "fantasy" },
      tono: "epico",
      protagonista: { nome: "Rei", archetipo: "Spadaccino Errante", tratto: "Impulsivo" }
    }
  });
  verifica(statoCreazione === 201, `la saga viene creata (HTTP ${statoCreazione})`);
  const id = creazione.partita.id;
  const saldoIniziale = creazione.partita.economia.saldo;
  verifica(saldoIniziale === 1000, `bonus di benvenuto accreditato: ${saldoIniziale} Token Storia`);

  // ── 2. Generazione dei capitoli ──
  console.log(`\n── Generazione di ${CAPITOLI} capitoli ──`);
  const statistiche = { paroleMin: Infinity, paroleMax: 0, totaleParole: 0, dialoghi: 0, ricariche: 0, opzioni: 0, luoghi: new Set(), npc: new Set() };
  const testoIniziale = Date.now();
  let ultimaPartita = creazione.partita;

  for (let n = 1; n <= CAPITOLI; n++) {
    if (n > 1 && ultimaPartita.economia.saldo < ultimaPartita.economia.costoCapitolo) {
      // Garanzia anti-blocco: la ricarica d'emergenza è sempre disponibile
      const { stato, dati } = await chiama(`/api/partite/${id}/ricarica`, { corpo: { modalita: "emergenza" } });
      if (!verifica(stato === 201, `ricarica d'emergenza al capitolo ${n} (HTTP ${stato})`)) break;
      statistiche.ricariche++;
      ultimaPartita = dati.partita;
      console.log(`   ↻ Ricarica d'Emergenza gratuita: saldo ${ultimaPartita.economia.saldo} Token Storia (+500)`);
    }

    const azione = n === 1
      ? {}
      : { testo: AZIONI[(n - 2) % AZIONI.length], tipo: "libera" };

    const { stato, dati } = await chiama(`/api/partite/${id}/capitolo`, { corpo: azione });
    if (!verifica(stato === 201, `capitolo ${n} generato (HTTP ${stato})`)) {
      console.log(`     dettaglio: ${JSON.stringify(dati).slice(0, 200)}`);
      break;
    }

    const cap = dati.capitolo;
    ultimaPartita = dati.partita;

    // Vincoli sul capitolo
    verifica(cap.parole >= 150 && cap.parole <= 200, `capitolo ${n}: lunghezza ${cap.parole} parole (richiesto 150-200)`);
    verifica(cap.opzioni.length >= 3 && cap.opzioni.length <= 4, `capitolo ${n}: ${cap.opzioni.length} scelte rapide`);
    verifica(new Set(cap.opzioni.map((o) => o.etichetta)).size === cap.opzioni.length, `capitolo ${n}: le scelte sono tutte diverse`);
    const apri = (cap.testo.match(/«/g) || []).length;
    const chiudi = (cap.testo.match(/»/g) || []).length;
    verifica(apri === chiudi && apri > 0, `capitolo ${n}: dialoghi con virgolette bilanciate (${apri} battute)`);
    verifica(cap.testo.includes("?"), `capitolo ${n}: termina con una domanda al protagonista`);
    verifica(Boolean(cap.deltaStato.sinossi), `capitolo ${n}: sinossi registrata nello State Engine`);

    statistiche.paroleMin = Math.min(statistiche.paroleMin, cap.parole);
    statistiche.paroleMax = Math.max(statistiche.paroleMax, cap.parole);
    statistiche.totaleParole += cap.parole;
    statistiche.dialoghi += apri;
    statistiche.opzioni += cap.opzioni.length;
    if (cap.deltaStato.luogo) statistiche.luoghi.add(cap.deltaStato.luogo);
    for (const r of cap.deltaStato.relazioni || []) statistiche.npc.add(r.npc);

    if (n % 25 === 0) console.log(`   · ${n}/${CAPITOLI} capitoli (${Math.round((Date.now() - testoIniziale) / 1000)}s) — saldo ${ultimaPartita.economia.saldo} Token`);
  }

  // ── 3. Coerenza dello stato finale ──
  console.log("\n── Coerenza dello State Engine ──");
  const { dati: finale } = await chiama(`/api/partite/${id}`);
  const p = finale.partita;
  const scheda = p.scheda;

  verifica(p.storia.length === CAPITOLI, `la cronaca contiene tutti i ${CAPITOLI} capitoli (${p.storia.length})`);
  verifica(p.stato.capitolo === p.storia.length, "la numerazione dei capitoli non ha buchi");
  verifica(p.economia.saldo >= 0, `il saldo dei Token Storia non è mai negativo (${p.economia.saldo})`);
  verifica(p.economia.spesoTotale === CAPITOLI * 10, `totale speso coerente: ${p.economia.spesoTotale} Token Storia`);

  const nomiInventario = scheda.inventario.map((o) => o.nome.toLowerCase());
  verifica(new Set(nomiInventario).size === nomiInventario.length, "l'inventario non contiene duplicati");
  const nomiNpc = scheda.relazioni.map((r) => r.npc.toLowerCase());
  verifica(new Set(nomiNpc).size === nomiNpc.length, "le relazioni non contengono NPC duplicati");

  const vociDettagliate = scheda.sinossi.filter((v) => !v.compresso).length;
  verifica(vociDettagliate <= 8, `la memoria si comprime automaticamente (${vociDettagliate} capitoli dettagliati + ${scheda.sinossi.length - vociDettagliate} riassunti)`);
  verifica(Boolean(p.memoria.digest) && p.memoria.digest.length < 12000, `il digest di memoria resta compatto (${p.memoria.digest.length} caratteri)`);
  verifica(p.memoria.digest.includes("SINOSSI DELLA STORIA"), "il digest iniettato contiene la sinossi canonica");
  verifica(scheda.obiettivi.length >= 1, `la scheda mostra ${scheda.obiettivi.length} obiettivi`);
  verifica(scheda.relazioni.length >= 1, `la scheda traccia ${scheda.relazioni.length} relazioni con gli NPC`);
  verifica(scheda.inventario.length >= 1, `la scheda traccia ${scheda.inventario.length} oggetti`);

  // ── 4. Continuità della memoria fra capitoli ──
  const ultimo = p.storia[p.storia.length - 1];
  const penultimo = p.storia[p.storia.length - 2];
  if (ultimo && penultimo) {
    verifica(ultimo.numero === penultimo.numero + 1, "i capitoli sono consecutivi");
    verifica(ultimo.titolo !== penultimo.titolo, `i titoli non si ripetono (ultimo: «${ultimo.titolo}»)`);
    const azioneTrovata = ultimo.azioneGiocatore?.testo || "";
    verifica(ultimo.testo.includes(azioneTrovata.slice(0, 20)) || azioneTrovata.length === 0, "il capitolo richiama l'azione precedente del giocatore");
  }

  // ── 5. Esportazione ──
  console.log("\n── Esportazione della saga ──");
  const rispostaExport = await fetch(`${BASE}/api/partite/${id}/esporta`);
  const markdown = await rispostaExport.text();
  verifica(rispostaExport.ok, "l'esportazione risponde correttamente");
  verifica(markdown.includes("## Capitolo 1"), "il romanzo esportato contiene i capitoli");
  verifica(markdown.includes("## Scheda finale del personaggio"), "il romanzo esportato contiene la scheda finale");
  verifica(markdown.length > CAPITOLI * 400, `il romanzo esportato è completo (${Math.round(markdown.length / 1024)} KB)`);

  // ── 6. Riepilogo ──
  console.log("\n═══ Riepilogo ═══");
  console.log(`  Capitoli generati:     ${p.storia.length}`);
  console.log(`  Parole per capitolo:   min ${statistiche.paroleMin} · max ${statistiche.paroleMax} · media ${Math.round(statistiche.totaleParole / Math.max(1, p.storia.length))}`);
  console.log(`  Parole totali:         ${p.memoria.paroleTotali}`);
  console.log(`  Battute di dialogo:    ${statistiche.dialoghi}`);
  console.log(`  Scelte proposte:       ${statistiche.opzioni}`);
  console.log(`  Luoghi visitati:       ${statistiche.luoghi.size}`);
  console.log(`  NPC incontrati:        ${statistiche.npc.size} (${[...statistiche.npc].slice(0, 6).join(", ")}${statistiche.npc.size > 6 ? "…" : ""})`);
  console.log(`  Oggetti nell'inventario: ${scheda.inventario.length}`);
  console.log(`  Token Storia spesi:    ${p.economia.spesoTotale} · ricariche gratuite usate: ${statistiche.ricariche}`);
  console.log(`  Tempo totale:          ${Math.round((Date.now() - testoIniziale) / 1000)}s`);
  console.log(`\n  Anteprima dell'ultimo capitolo:\n  «${ultimo.titolo}»\n  ${ultimo.testo.slice(0, 320).replace(/\n/g, " ")}…`);

  console.log(`\n${problemi === 0 ? "✅" : "❌"} ${controlli - problemi}/${controlli} controlli superati.`);
  if (problemi) {
    console.error(`   ${problemi} problemi rilevati.`);
    process.exit(1);
  }
  console.log("   Il motore narrativo, il sistema di crediti e la memoria a lungo termine funzionano correttamente.\n");
}

avvia().catch((errore) => {
  console.error("\n✗ Errore durante il collaudo:", errore.message);
  process.exit(1);
});
