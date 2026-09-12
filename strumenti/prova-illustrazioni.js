#!/usr/bin/env node
/**
 * prova-illustrazioni.js — Collaudo delle illustrazioni di scena e dell'albero
 * di fiducia evoluto.
 *
 * Verifica, senza dipendenze esterne:
 *   1. che ogni capitolo produca esattamente 5 illustrazioni, di 5 tipi diversi;
 *   2. che l'SVG sia ben formato (XML valido), completo di testi e senza valori
 *      degeneri (NaN, undefined, attributi duplicati);
 *   3. che le scene siano deterministiche (stessa partita → stessa immagine) e
 *      diverse da capitolo a capitolo;
 *   4. che funzionino per tutte le ambientazioni e in ogni momento della giornata;
 *   5. che l'albero di fiducia reagisca alle azioni: gli assi cambino, restino
 *      nei limiti 0-100, i quadranti siano coerenti e le tappe si sblocchino;
 *   6. che il digest di memoria riporti gli assi, e che le rotte REST rispondano.
 *
 * Uso:  node strumenti/prova-illustrazioni.js [numero-capitoli] [URL-base]
 */

import { generaCapitolo } from "../server/motore/motore_locale.js";
import { creaPartita, applicaDelta } from "../server/stato/modello.js";
import { generaScena, descriviIllustrazioni, SCENE_PER_CAPITOLO, TIPI, LARGHEZZA, ALTEZZA, promptImmagine } from "../server/illustrazioni/scene.js";
import { digest as compilaDigest } from "../server/stato/memoria.js";
import { albero as alberoRelazioni, applicaAssi, ASSI, quadrante, TAPPE } from "../server/stato/relazioni.js";
import { AMBIENTAZIONI } from "../server/motore/lessico.js";

const CAPITOLI = Number(process.argv[2]) || 8;
const BASE = process.argv[3] || "http://localhost:3000";

let controlli = 0;
let fallimenti = 0;
const problemi = [];

function verifica(condizione, descrizione) {
  controlli++;
  if (!condizione) {
    fallimenti++;
    problemi.push(descrizione);
    console.log(`  ✗ ${descrizione}`);
  }
}

const AZIONI = [
  null,
  "Parlo con calma e chiedo il suo nome",
  "La ringrazio e le offro il mio aiuto",
  "Sguaino la lama e attacco il nemico",
  "Fuggo nel bosco e mi nascondo",
  "Mi fermo a curare le ferite",
  "Indago sulle tracce misteriose",
  "Inganno il nemico con una mezza verità",
  "Ascolto in silenzio le sue ragioni",
  "Perquisisco la stanza in cerca di indizi",
  "Medico le sue ferite e le porgo dell'acqua",
  "Grido il mio nome come sfida"
];

/** Validazione XML minimale ma severa (senza dipendenze). */
function xmlValido(svg, dove) {
  const apertura = [...svg.matchAll(/<([a-zA-Z][\w:-]*)((?:"[^"]*"|[^>"])*?)(\/?)>/g)];
  const chiusura = [...svg.matchAll(/<\/([a-zA-Z][\w:-]*)>/g)];
  const pila = [];
  let indiceChiusura = 0;
  const eventi = [
    ...apertura.map((m) => ({ tipo: "apertura", nome: m[1], auto: m[3] === "/", pos: m.index, grezzo: m[0] })),
    ...chiusura.map((m) => ({ tipo: "chiusura", nome: m[1], pos: m.index, grezzo: m[0] }))
  ].sort((a, b) => a.pos - b.pos);

  for (const evento of eventi) {
    if (evento.tipo === "apertura") {
      // Attributi duplicati nello stesso tag
      const attributi = [...evento.grezzo.matchAll(/([a-zA-Z-]+)\s*=/g)].map((m) => m[1]);
      const duplicati = attributi.filter((a, i) => attributi.indexOf(a) !== i);
      verifica(duplicati.length === 0, `${dove}: attributi duplicati (${duplicati.join(", ")})`);
      if (!evento.auto) pila.push(evento.nome);
    } else {
      const atteso = pila.pop();
      verifica(atteso === evento.nome, `${dove}: chiusura inattesa </${evento.nome}> (atteso </${atteso}>)`);
      indiceChiusura++;
    }
  }
  verifica(pila.length === 0, `${dove}: tag rimasti aperti: ${pila.join(", ")}`);
  verifica(svg.startsWith("<svg"), `${dove}: il documento non inizia con <svg`);
  verifica(svg.trimEnd().endsWith("</svg>"), `${dove}: il documento non termina con </svg>`);
  verifica(!/NaN|undefined|null|Infinity/.test(svg), `${dove}: valori degeneri nell'SVG`);
  verifica(!/[<>]&[a-z]+;/.test(svg.replace(/&(amp|lt|gt|quot|apos|#\d+);/g, "")), `${dove}: entità non valide`);
}

function nuotaPartita(ambientazione) {
  return creaPartita({
    ambientazione,
    tono: "epico",
    protagonista: { nome: "Rei", archetipo: "Spadaccino Errante", tratto: "Impulsivo" }
  });
}

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║  MasterRPG · Collaudo delle illustrazioni di scena           ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

// ═══════════════════════ 1. Le cinque scene di ogni capitolo ═══════════════════════
console.log("═══ 1. Struttura delle illustrazioni ═══");
{
  const partita = nuotaPartita({ id: "fantasy" });
  const capitoli = [];
  for (let i = 0; i < CAPITOLI; i++) {
    partita.stato.capitolo = i;
    const capitolo = generaCapitolo({ partita, azione: AZIONI[i % AZIONI.length], numero: i + 1 });
    applicaDelta(partita.stato, capitolo.deltaStato, { capitolo: i + 1, testo: AZIONI[i % AZIONI.length] });
    partita.storia.push({ ...capitolo, numero: i + 1 });
    capitoli.push(partita.storia.at(-1));
  }

  let sceneTotali = 0;
  const impronte = new Set();
  for (const capitolo of capitoli) {
    const descrizioni = descriviIllustrazioni(partita, capitolo);
    verifica(descrizioni.length === SCENE_PER_CAPITOLO, `capitolo ${capitolo.numero}: ${descrizioni.length} scene invece di ${SCENE_PER_CAPITOLO}`);
    verifica(new Set(descrizioni.map((d) => d.tipo)).size === SCENE_PER_CAPITOLO, `capitolo ${capitolo.numero}: i tipi di scena non sono tutti diversi`);
    for (const descrizione of descrizioni) {
      verifica(TIPI.includes(descrizione.tipo), `capitolo ${capitolo.numero}: tipo di scena sconosciuto «${descrizione.tipo}»`);
      verifica(descrizione.titolo?.length > 1, `capitolo ${capitolo.numero}/${descrizione.indice}: titolo mancante`);
      verifica(descrizione.didascalia?.length > 3, `capitolo ${capitolo.numero}/${descrizione.indice}: didascalia mancante`);
      verifica(descrizione.url?.includes(`/illustrazioni/${capitolo.numero}/${descrizione.indice}`), `capitolo ${capitolo.numero}: URL della scena errato`);
    }

    for (let indice = 0; indice < SCENE_PER_CAPITOLO; indice++) {
      const scena = generaScena({ partita, capitolo, indice });
      sceneTotali++;
      const dove = `cap. ${capitolo.numero} scena ${indice + 1} (${scena.tipo})`;
      verifica(scena.svg.includes(`viewBox="0 0 ${LARGHEZZA} ${ALTEZZA}"`), `${dove}: dimensioni errate`);
      xmlValido(scena.svg, dove);
      verifica(scena.svg.length > 2500, `${dove}: SVG troppo povero (${scena.svg.length} caratteri)`);
      verifica(/aria-label="[^"]+"/.test(scena.svg), `${dove}: manca l'etichetta accessibile`);
      // I titoli sono disegnati nell'immagine: nessun titolo vuoto
      verifica(scena.titolo && scena.didascalia, `${dove}: metadati incompleti`);

      // Determinismo
      const ripetuta = generaScena({ partita, capitolo, indice });
      verifica(ripetuta.svg === scena.svg, `${dove}: la scena non è deterministica`);

      // Unicità: ogni scena della saga deve essere distinta
      verifica(!impronte.has(scena.svg), `${dove}: illustrazione duplicata in un'altra scena`);
      impronte.add(scena.svg);

      // Il prompt per un eventuale modello esterno
      const prompt = promptImmagine(partita, capitolo, indice);
      verifica(prompt.length > 40 && /anime/i.test(prompt), `${dove}: prompt per immagini esterno incompleto`);
    }
  }
  console.log(`  → ${controlli} controlli · ${sceneTotali} scene generate · ${impronte.size} immagini tutte diverse`);

  // ═══════════════════════ 2. Determinismo fra sessioni ═══════════════════════
  console.log("\n═══ 2. Determinismo (stessa saga = stesse immagini) ═══");
  const altra = nuotaPartita({ id: "fantasy" });
  altra.stato.capitolo = 0;
  const capitoloUno = generaCapitolo({ partita: altra, azione: null, numero: 1 });
  applicaDelta(altra.stato, capitoloUno.deltaStato, { capitolo: 1, testo: null });
  altra.storia.push({ ...capitoloUno, numero: 1 });
  const primaVersione = Array.from({ length: SCENE_PER_CAPITOLO }, (_, i) => generaScena({ partita: altra, capitolo: altra.storia[0], indice: i }).svg);
  const ricaricata = JSON.parse(JSON.stringify(altra));
  const dopoSalvataggio = Array.from({ length: SCENE_PER_CAPITOLO }, (_, i) => generaScena({ partita: ricaricata, capitolo: ricaricata.storia[0], indice: i }).svg);
  verifica(primaVersione.every((svg, i) => svg === dopoSalvataggio[i]), "le scene cambiano dopo il salvataggio/ricaricamento della partita");

  // ═══════════════════════ 3. Tutte le ambientazioni e i momenti ═══════════════════════
  console.log("\n═══ 3. Tutte le ambientazioni e i momenti della giornata ═══");
  const MOMENTI = ["alba", "mattino", "mezzogiorno", "pomeriggio", "crepuscolo", "notte", "notte fonda"];
  const AMBIENTI = [...AMBIENTAZIONI.map((a) => ({ id: a.id, nome: a.nome })),
    { id: "personalizzata", nome: "Mondo libero", descrizione: "Una metropoli sospesa fra le nuvole dove i ricordi si comprano al mercato." }];

  for (const ambiente of AMBIENTI) {
    const partita = nuotaPartita(ambiente);
    partita.stato.capitolo = 0;
    const capitolo = generaCapitolo({ partita, azione: null, numero: 1 });
    applicaDelta(partita.stato, capitolo.deltaStato, { capitolo: 1 });
    partita.storia.push({ ...capitolo, numero: 1 });

    for (const momento of MOMENTI) {
      partita.stato.momento = momento;
      const scena = generaScena({ partita, capitolo: partita.storia[0], indice: 0 });
      verifica(scena.svg.includes("<svg") && !/NaN|undefined/.test(scena.svg), `${ambiente.id}/${momento}: scena non valida`);
    }
  }
  console.log(`  → ${AMBIENTI.length} ambientazioni × ${MOMENTI.length} momenti verificati`);

  // ═══════════════════════ 4. Albero di fiducia evoluto ═══════════════════════
  console.log("\n═══ 4. Albero di fiducia a tre assi ═══");
  const albero = alberoRelazioni(partita);
  verifica(albero.nodi.length >= 1, "l'albero non contiene alcun nodo");
  verifica(Object.keys(ASSI).length === 3, "gli assi non sono tre");
  verifica(Object.keys(albero.quadranti).length === 4, "i quadranti non sono quattro");
  verifica(TAPPE.length >= 6, "le tappe del legame sono troppo poche");

  for (const nodo of albero.nodi) {
    for (const asse of ["vincolo", "tensione", "rispetto"]) {
      verifica(Number.isInteger(nodo[asse]) && nodo[asse] >= 0 && nodo[asse] <= 100, `${nodo.npc}: ${asse} fuori dai limiti (${nodo[asse]})`);
    }
    const atteso = quadrante(nodo).id;
    verifica(nodo.quadrante.id === atteso, `${nodo.npc}: quadrante incoerente (${nodo.quadrante.id} invece di ${atteso})`);
    verifica(nodo.coordinate.x >= 0 && nodo.coordinate.x <= 1 && nodo.coordinate.y >= 0 && nodo.coordinate.y <= 1, `${nodo.npc}: coordinate fuori dal piano`);
    verifica(nodo.tappe.length >= 1 && nodo.tappe[0].id === "primo-incontro", `${nodo.npc}: manca la tappa del primo incontro`);
    verifica(nodo.storico.length >= 1, `${nodo.npc}: storico delle variazioni vuoto`);
    verifica(nodo.descrizione.length > 20, `${nodo.npc}: descrizione del rapporto troppo corta`);
  }

  // Gli assi devono reagire in modo diverso alle diverse azioni.
  // ⚠ Il motore sceglie l'NPC in base al seme e all'azione: per un confronto
  //   onesto si guarda alla MEDIA degli assi di tutti i legami (il numero di
  //   capitoli giocati è identico nei due profili).
  const provaAssi = (azione, ripetizioni) => {
    const p = nuotaPartita({ id: "fantasy" });
    p.id = "prova-assi-deterministica";
    for (let i = 0; i < ripetizioni; i++) {
      p.stato.capitolo = i;
      const cap = generaCapitolo({ partita: p, azione: i === 0 ? null : { testo: azione }, numero: i + 1 });
      applicaDelta(p.stato, cap.deltaStato, { capitolo: i + 1, testo: azione });
      p.storia.push({ ...cap, numero: i + 1 });
    }
    const nodi = alberoRelazioni(p).nodi;
    const media = (chiave) => nodi.reduce((a, n) => a + n[chiave], 0) / Math.max(1, nodi.length);
    return { nodi, vincolo: media("vincolo"), tensione: media("tensione"), rispetto: media("rispetto") };
  };

  const profiloDialogo = provaAssi("Parlo con calma e chiedo il suo nome, ascoltando le sue ragioni", 6);
  const profiloAttacco = provaAssi("Sguaino la lama e attacco il nemico senza esitare", 6);
  console.log(`  → profilo dialogo: vincolo ${profiloDialogo.vincolo.toFixed(1)} · tensione ${profiloDialogo.tensione.toFixed(1)}`);
  console.log(`  → profilo attacco: vincolo ${profiloAttacco.vincolo.toFixed(1)} · tensione ${profiloAttacco.tensione.toFixed(1)}`);
  verifica(profiloDialogo.vincolo > profiloAttacco.vincolo, `il dialogo non aumenta il vincolo (${profiloDialogo.vincolo.toFixed(1)} vs ${profiloAttacco.vincolo.toFixed(1)})`);
  verifica(profiloAttacco.tensione > profiloDialogo.tensione, `l'attacco non aumenta la tensione (${profiloAttacco.tensione.toFixed(1)} vs ${profiloDialogo.tensione.toFixed(1)})`);
  verifica(profiloAttacco.rispetto >= profiloDialogo.rispetto, "un combattimento non lascia traccia nel rispetto");

  // Verifica diretta dell'aritmetica degli assi (indipendente dal motore)
  {
    const relazione = { npc: "Prova", ruolo: "Conoscente", vincolo: 50, tensione: 30, rispetto: 50, storico: [], tappe: [] };
    applicaAssi(relazione, { vincolo: 90, tensione: -90, rispetto: 90 }, 1);
    verifica(relazione.vincolo === 100 && relazione.tensione === 0 && relazione.rispetto === 100, "gli assi non vengono limitati a 0-100");
    verifica(relazione.fiducia === relazione.vincolo, "l'alias «fiducia» non segue il vincolo");
    verifica(quadrante(relazione).id === "alleanza", "vincolo alto e tensione bassa non danno Alleanza");
    applicaAssi(relazione, { vincolo: 0, tensione: 90, rispetto: 0 }, 2);
    verifica(quadrante(relazione).id === "rivalita", "vincolo alto e tensione alta non danno Rivalità");
    verifica(relazione.tappe.some((x) => x.id === "primo-incontro"), "la tappa del primo incontro non si registra");
    verifica(relazione.storico.length === 2, "lo storico non conserva una riga per capitolo");
  }

  // I quattro quadranti devono essere tutti raggiungibili
  const quadrantiToccati = new Set();
  const combinazioni = [
    { vincolo: 80, tensione: 20 }, { vincolo: 80, tensione: 80 },
    { vincolo: 20, tensione: 20 }, { vincolo: 20, tensione: 80 }
  ];
  for (const combinazione of combinazioni) {
    quadrantiToccati.add(quadrante(combinazione).id);
  }
  verifica(quadrantiToccati.size === 4, "non tutti i quadranti sono raggiungibili dagli assi");

  // ═══════════════════════ 5. Il digest di memoria li riporta ═══════════════════════
  console.log("\n═══ 5. Memoria a lungo termine ═══");
  const digest = compilaDigest(partita);
  verifica(digest.includes("ALBERO DI FIDUCIA"), "il digest non contiene la sezione dell'albero di fiducia");
  verifica(/Vincolo \d+ \/ Tensione \d+ \/ Rispetto \d+/.test(digest), "il digest non riporta i tre assi numerici");
  verifica(digest.length <= 7000, `il digest supera il tetto previsto (${digest.length} caratteri)`);
  for (const nodo of albero.nodi) {
    verifica(digest.includes(nodo.npc), `il digest non cita ${nodo.npc}`);
  }

  // ═══════════════════════ 6. Interfaccia REST reale ═══════════════════════
  console.log("\n═══ 6. Rotte REST (server richiesto su " + BASE + ") ═══");
  try {
    const salute = await fetch(`${BASE}/salute`).then((r) => r.json());
    verifica(salute.stato === "ok", "il server non risponde su /salute");

    const config = await fetch(`${BASE}/api/config`).then((r) => r.json());
    verifica(config.illustrazioni?.perCapitolo === SCENE_PER_CAPITOLO, "la configurazione non espone le illustrazioni");
    verifica(config.alberoFiducia?.assi && Object.keys(config.alberoFiducia.assi).length === 3, "la configurazione non espone gli assi dell'albero");

    const creata = await fetch(`${BASE}/api/partite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ambientazione: { id: "cyberpunk" }, tono: "cupo", protagonista: { nome: "Test", archetipo: "Netrunner", tratto: "Sarcastico" } })
    }).then((r) => r.json());
    const id = creata.partita.id;
    verifica(Boolean(id), "creazione della partita non riuscita");

    const generato = await fetch(`${BASE}/api/partite/${id}/capitolo`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}"
    }).then((r) => r.json());
    verifica(generato.partita?.illustrazioniCorrenti?.illustrazioni?.length === SCENE_PER_CAPITOLO, "il capitolo non porta con sé le illustrazioni");
    verifica(generato.partita?.alberoFiducia?.nodi?.length >= 1, "la vista partita non espone l'albero di fiducia");

    const risposta = await fetch(`${BASE}/api/partite/${id}/illustrazioni/1/2`);
    const svg = await risposta.text();
    verifica(risposta.status === 200, `la rotta della scena risponde ${risposta.status}`);
    verifica((risposta.headers.get("content-type") || "").includes("image/svg+xml"), "la scena non è servita come SVG");
    verifica((risposta.headers.get("cache-control") || "").includes("max-age"), "la scena non è memorizzabile in cache");
    xmlValido(svg, "scena via HTTP");

    const fuoriScala = await fetch(`${BASE}/api/partite/${id}/illustrazioni/1/99`);
    verifica(fuoriScala.status === 400, `un indice di scena non valido dovrebbe dare 400, non ${fuoriScala.status}`);

    const mancante = await fetch(`${BASE}/api/partite/${id}/illustrazioni/42/0`);
    verifica(mancante.status === 404, `un capitolo inesistente dovrebbe dare 404, non ${mancante.status}`);

    const elenco = await fetch(`${BASE}/api/partite/${id}/illustrazioni/1`).then((r) => r.json());
    verifica(elenco.scene?.length === SCENE_PER_CAPITOLO, "l'elenco delle scene del capitolo è incompleto");

    const alberoHttp = await fetch(`${BASE}/api/partite/${id}/albero`).then((r) => r.json());
    verifica(alberoHttp.albero?.nodi?.length >= 1, "la rotta dell'albero non restituisce i nodi");

    const prompt = await fetch(`${BASE}/api/partite/${id}/illustrazioni/1/0/prompt`).then((r) => r.json());
    verifica(prompt.prompt?.length > 40, "la rotta del prompt per immagini non risponde");

    // Pulizia della partita di prova
    await fetch(`${BASE}/api/partite/${id}`, { method: "DELETE" });
  } catch (errore) {
    verifica(false, `errore durante le chiamate REST: ${errore.message}`);
  }

  // ═══════════════════════ 7. Prestazioni ═══════════════════════
  console.log("\n═══ 7. Prestazioni ═══");
  const inizio = Date.now();
  const N = 60;
  for (let i = 0; i < N; i++) {
    generaScena({ partita, capitolo: partita.storia[i % partita.storia.length], indice: i % SCENE_PER_CAPITOLO });
  }
  const durata = Date.now() - inizio;
  console.log(`  → ${N} scene in ${durata} ms (${(durata / N).toFixed(1)} ms per scena)`);
  verifica(durata / N < 120, `la generazione di una scena è troppo lenta (${(durata / N).toFixed(1)} ms)`);
}

console.log("\n────────────────────────────────────────────────────────────────");
if (fallimenti) {
  console.log(`\n❌ Collaudo illustrazioni FALLITO: ${fallimenti} problemi su ${controlli} controlli.`);
  for (const problema of problemi.slice(0, 20)) console.log(`   · ${problema}`);
  process.exit(1);
}
console.log(`\n✅ Collaudo illustrazioni SUPERATO: ${controlli} controlli, nessun problema.`);
console.log("   Illustrazioni di scena e albero di fiducia funzionano in tutte le ambientazioni.\n");
