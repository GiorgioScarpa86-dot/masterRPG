/**
 * motore_locale.js — Motore Narrativo Locale (fallback offline del Game Master).
 *
 * Compone capitoli in italiano da 150 a 200 parole con struttura fissa:
 *   Scenario → Azione del giocatore → Dialogo NPC → Colpo di scena → Cliffhanger
 * e produce scelte rapide + delta di stato coerenti con lo State Engine.
 *
 * È deterministico rispetto al seme (id partita + numero capitolo + azione):
 * la stessa partita produca la stessa cronaca, ma partite diverse generano storie diverse.
 */

import {
  banca, tono, INTENTI, SVILUPPO_PER_INTENTO, COLPI_DI_SCENA, COLPI_DI_SCENA_LUOGO,
  DOMANDE_FINALI, TEMPLATE_SCELTE, SINTESI_INTENTO, MOMENTI, CONNETTIVI_TEMPO,
  vociPerRuolo, VOCI_PER_INTENTO
} from "./lessico.js";
import { DELTA_ASSI, quadrante } from "../stato/relazioni.js";

// ---------------------------------------------------------------------------
// Banche interne di supporto alla composizione
// ---------------------------------------------------------------------------
const RIFLESSIONI = [
  "Ti sorprendi a pensare a casa. Non a un posto preciso: a una sensazione.",
  "C'è una parte di te che vorrebbe solo chiudere gli occhi. L'altra parte, quella che ti ha portato fin qui, non è d'accordo.",
  "Ti accorgi di stringere i pugni e li apri, lentamente, uno per uno.",
  "Qualcuno, un giorno, racconterà questa scena dal suo punto di vista. Sarà completamente diversa.",
  "Non è coraggio: è abitudine alla paura. E funziona quasi allo stesso modo.",
  "Ti chiedi se sia stata la scelta giusta. Poi decidi che la domanda, adesso, costa troppo.",
  "Hai la sensazione netta di essere osservato, e non da qualcuno che ti vuole bene.",
  "Le mani ti tremano appena. Nessuno se ne accorgerà, se non lo dici.",
  "Pensi a tutte le volte in cui avresti potuto girare i tacchi. E a come è andata a finire.",
  "C'è una domanda che ti gira in testa da tre giorni, e comincia sempre con «perché io».",
  "Ti accorgi di aver smesso di avere fame. Non è un buon segno.",
  "Per un momento ti sembra di sentire una voce familiare. Poi capisci che è solo il vento.",
  "Ti ripeti che va tutto bene. Non ci credi, ma la frase aiuta a camminare."
];

const DETTAGLI = [
  "Un insetto attraversa la scena senza curarsi di te.",
  "Il vento porta, da lontano, il suono di qualcosa che si chiude.",
  "Sotto la tua scarpa, il terreno cede di un centimetro e ti ricorda dove sei.",
  "Poco più in là, un oggetto dimenticato racconta una storia più breve della tua.",
  "Per un istante il mondo sembra normale. È la bugia meglio riuscita della giornata.",
  "Una goccia cade da qualche parte, con regolarità sospetta.",
  "Il tuo respiro è l'unico suono che ti appartiene davvero.",
  "I tuoi vestiti sono sporchi di qualcosa che preferisci non identificare.",
  "Il terreno conserva un'impronta più grande della tua.",
  "Sulla tua pelle resta un odore dolce, fuori posto in un momento come questo.",
  "Qualcosa si muove nell'angolo del tuo sguardo, e svanisce appena lo guardi.",
  "In lontananza, una luce si accende e si spegne secondo uno schema preciso."
];

const APERTURE_PROEMIO = [
  "Ti risvegli con la sensazione di aver dimenticato qualcosa di enorme.",
  "Il primo respiro arriva come una boccata d'acqua fredda: il mondo ti entra dentro tutto insieme.",
  "Non ricordi il momento esatto in cui è cominciato tutto. Ricordi solo la sensazione di cadere."
];

const CHIUSURE_PROEMIO = [
  "Non sai dove sei. Non sai perché. Ma una cosa la sai con certezza: da qui non si torna indietro.",
  "Il tuo nome lo ricordi ancora. È l'unica cosa che ti appartiene davvero, e per ora ti basta.",
  "Il cielo sopra di te non è quello di casa. E qualcuno, da qualche parte, ti ha appena notato."
];

// ---------------------------------------------------------------------------
// Utilità: caso deterministico e testo
// ---------------------------------------------------------------------------
export function creaSeme(...parti) {
  let h = 2166136261 >>> 0;
  const testo = parti.join("|");
  for (let i = 0; i < testo.length; i++) {
    h ^= testo.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function creaRng(seme) {
  let s = seme >>> 0 || 1;
  return function rng() {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function scegli(rng, elenco) {
  if (!elenco || !elenco.length) return null;
  return elenco[Math.floor(rng() * elenco.length) % elenco.length];
}

/** Sceglie due elementi distinti quando possibile. */
function scegliDue(rng, elenco) {
  if (!elenco || elenco.length === 0) return [null, null];
  const primo = scegli(rng, elenco);
  if (elenco.length === 1) return [primo, primo];
  let secondo = scegli(rng, elenco);
  let guardia = 0;
  while (secondo === primo && guardia < 12) {
    secondo = scegli(rng, elenco);
    guardia++;
  }
  if (secondo === primo) {
    // fallback deterministico: l'elemento successivo nella lista
    const i = elenco.indexOf(primo);
    secondo = elenco[(i + 1) % elenco.length];
  }
  return [primo, secondo];
}

/**
 * Sceglie un elemento evitando quelli già usati nelle capitole precedenti.
 * Se tutti sono stati usati, riparte dall'elenco completo: meglio ripetersi che bloccarsi.
 */
function scegliNuovo(rng, elenco, usate = []) {
  if (!elenco || !elenco.length) return null;
  const puliti = elenco.filter((e) => !usate.includes(typeof e === "string" ? e : e.nome));
  if (!puliti.length) return scegli(rng, elenco);
  return scegli(rng, puliti);
}

function scegliPesato(rng, elenco, pesoFn) {
  const pesi = elenco.map(pesoFn);
  const totale = pesi.reduce((a, b) => a + b, 0);
  if (totale <= 0) return scegli(rng, elenco);
  let r = rng() * totale;
  for (let i = 0; i < elenco.length; i++) {
    r -= pesi[i];
    if (r <= 0) return elenco[i];
  }
  return elenco[elenco.length - 1];
}

function contaparole(testo) {
  return (testo.trim().match(/[\p{L}\p{N}']+/gu) || []).length;
}

function maiusc(s) {
  return String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
}

// ---------------------------------------------------------------------------
// Articoli e preposizioni articolate
// (necessari per generare testo italiano grammaticalmente corretto)
// ---------------------------------------------------------------------------
const ARTICOLI_NOTI = ["il ", "lo ", "la ", "l'", "i ", "gli ", "le "];

/** Parole la cui iniziale non basta a dedurre l'articolo. */
const ARTICOLI_OVERRIDE = {
  ponte: "il", cortile: "il", confine: "il", cuore: "il", konbini: "il",
  tetto: "il", mare: "il", monte: "il", pane: "il", potere: "il",
  torre: "la", nave: "la", chiave: "la", valle: "la", notte: "la",
  stazione: "la", sorgente: "la", soglia: "la", cattedrale: "la",
  rovine: "le", radure: "le", macerie: "le", ceneri: "le", colline: "le",
  analisi: "l'", enigma: "l'", istante: "l'", ombra: "l'", eco: "l'"
};

function articoloPer(nome) {
  const basso = String(nome).toLowerCase();
  if (basso.startsWith("l'")) return "l'";
  for (const a of ARTICOLI_NOTI) if (basso.startsWith(a)) return a.trim();

  const prima = String(nome).split(/[\s,]/)[0].toLowerCase();
  if (ARTICOLI_OVERRIDE[prima]) return ARTICOLI_OVERRIDE[prima];
  if (/^[aeiou]/.test(prima)) return "l'";
  if (prima.endsWith("a") || /(zione|sione|gione|tà|tù|trice|essa|anza|enza|igine|udine|ice)$/.test(prima)) return "la";
  if (prima.endsWith("e")) return "la";   // i femminili in -e sono la maggioranza nei luoghi
  if (prima.endsWith("i")) return "i";
  return "il";
}

const CONTRAZIONI = {
  a: { il: "al", la: "alla", "l'": "all'", i: "ai", le: "alle", lo: "allo", gli: "agli" },
  da: { il: "dal", la: "dalla", "l'": "dall'", i: "dai", le: "dalle", lo: "dallo", gli: "dagli" },
  di: { il: "del", la: "della", "l'": "dell'", i: "dei", le: "delle", lo: "dello", gli: "degli" },
  in: { il: "nel", la: "nella", "l'": "nell'", i: "nei", le: "nelle", lo: "nello", gli: "negli" },
  su: { il: "sul", la: "sulla", "l'": "sull'", i: "sui", le: "sulle", lo: "sullo", gli: "sugli" }
};

/** "Bosco di Aster" → "il Bosco di Aster" · "Aula 3-C" → "l'Aula 3-C" */
export function conArticolo(nome) {
  const art = articoloPer(nome);
  const basso = String(nome).toLowerCase();
  const haGiaArticolo = ARTICOLI_NOTI.some((a) => basso.startsWith(a));
  if (haGiaArticolo) return nome;
  return art === "l'" ? `l'${nome}` : `${art} ${nome}`;
}

/** "Bosco di Aster" + "in" → "nel Bosco di Aster" */
export function conPreposizione(nome, prep) {
  const art = articoloPer(nome);
  const basso = String(nome).toLowerCase();
  let nomePulito = nome;
  const match = ARTICOLI_NOTI.find((a) => basso.startsWith(a));
  if (match) nomePulito = String(nome).slice(match.length);

  const mappa = CONTRAZIONI[prep];
  if (mappa && mappa[art]) {
    const forma = mappa[art];
    return forma.endsWith("'") ? `${forma}${nomePulito}` : `${forma} ${nomePulito}`;
  }
  const articolata = art === "l'" ? `l'${nomePulito}` : `${art} ${nomePulito}`;
  return `${prep} ${articolata}`;
}

// ---------------------------------------------------------------------------
// Analisi dell'azione del giocatore
// ---------------------------------------------------------------------------
export function analizzaIntento(testo, tipoScelta = null) {
  const basso = (testo || "").toLowerCase();
  let migliore = null;
  let punteggioMigliore = 0;
  for (const intento of INTENTI) {
    let punti = 0;
    for (const p of intento.parole) {
      if (basso.includes(p)) punti += p.length >= 5 ? 2 : 1;
    }
    if (punti > punteggioMigliore) {
      punteggioMigliore = punti;
      migliore = intento.id;
    }
  }
  if (migliore) return migliore;

  const perTipo = { audace: "combattimento", prudente: "esplorazione", astuta: "astuzia", empatica: "dialogo" };
  if (tipoScelta && perTipo[tipoScelta]) return perTipo[tipoScelta];
  return "generico";
}

const DELTA_VITALI = {
  combattimento: { vita: -12, energia: -14, tensione: 16 },
  dialogo: { vita: 0, energia: -4, tensione: 6 },
  esplorazione: { vita: -3, energia: -9, tensione: 5 },
  fuga: { vita: -6, energia: -18, tensione: 14 },
  astuzia: { vita: -4, energia: -7, tensione: 10 },
  cura: { vita: 14, energia: 12, tensione: -12 },
  indagine: { vita: -2, energia: -6, tensione: 8 },
  generico: { vita: -2, energia: -5, tensione: 5 },
  proemio: { vita: 0, energia: 0, tensione: 4 }
};

const ORDINE_RUOLI = { Nemico: 0, Rivale: 1, Sospetto: 2, Mentore: 3, Alleato: 4, Alleata: 4, Amico: 5, "Interesse Amoroso": 6 };

// ---------------------------------------------------------------------------
// Composizione del capitolo
// ---------------------------------------------------------------------------

/**
 * Genera un capitolo completo.
 * @param {object} opzioni
 * @param {object} opzioni.partita   stato completo della partita
 * @param {object|null} opzioni.azione { tipo: "scelta"|"libera", testo, tipoScelta }
 * @param {number} opzioni.numero    numero del capitolo da generare (1 = proemio)
 */
export function generaCapitolo({ partita, azione = null, numero }) {
  const config = partita.configurazione;
  const stato = partita.stato;
  const amb = config.ambientazione;
  const banco = banca(amb.id, amb.paroleChiave || []);
  const tonoScelto = tono(config.tono);
  const nome = config.protagonista?.nome || "Viandante";
  const proemio = numero === 1;

  const rng = creaRng(creaSeme(partita.id, numero, azione?.testo || "proemio", String(stato.capitolo)));
  const intentoChiave = proemio ? "proemio" : analizzaIntento(azione?.testo, azione?.tipoScelta);
  const usate = stato.testiUsati || [];
  const nuovo = (elenco) => scegliNuovo(rng, elenco, usate);

  // --- Luogo ----------------------------------------------------------------
  const mobilita = ["esplorazione", "fuga", "indagine", "proemio"].includes(intentoChiave) ? 0.7 : 0.4;
  const cambiaLuogo = proemio || rng() < mobilita;
  const recenti = stato.ultimiLuoghi || [];
  const luogoObj = cambiaLuogo
    ? scegliPesato(rng, banco.luoghi, (l) => (recenti.includes(l.nome) ? 0.25 : (stato.luoghiVisitati || []).includes(l.nome) ? 1.5 : 4))
    : banco.luoghi.find((l) => l.nome === stato.luogo) || banco.luoghi[0];
  const luogoNome = luogoObj.nome;
  const atmosfera = nuovo(banco.atmosfere);
  const momento = scegli(rng, MOMENTI);

  // --- NPC della scena ------------------------------------------------------
  const npc = scegliNpc(rng, banco, stato, intentoChiave);
  const npcIsNuovo = !(stato.relazioni || []).some((r) => r.npc.toLowerCase() === npc.nome.toLowerCase());
  const repertorio = [
    ...npc.voce,
    ...vociPerRuolo(npc.ruolo),
    ...(VOCI_PER_INTENTO[intentoChiave] || [])
  ];
  const vociLibere = repertorio.filter((v) => !usate.includes(v));
  const [battuta1, battuta2] = scegliDue(rng, vociLibere.length >= 2 ? vociLibere : repertorio);

  // Variabili di composizione (alimentano la memoria anti-ripetizione)
  let colpoUsato = null;
  let minacciaUsata = null;
  let extraUsato1 = null;
  let extraUsato2 = null;
  let incisoUsato = null;
  let avversativoUsato = null;
  let chiusuraUsata = null;
  let domandaUsata = null;
  let connettivoUsato = null;

  const blocchi = [];

  if (proemio) {
    blocchi.push(maiusc(`${nuovo(APERTURE_PROEMIO)} Attorno a te, ${atmosfera}.`));
    blocchi.push(`Il tuo archetipo ti sta addosso come un vestito cucito su misura: ${config.protagonista?.archetipo || "viandante"}. E il tratto che ti definisce — ${(config.protagonista?.tratto || "testardo").toLowerCase()} — si fa sentire subito, prima ancora dei pensieri.`);
    blocchi.push(`${npc.nome} compare ${conPreposizione(luogoNome, "in")}: ${npc.aspetto}, e ${npc.tic}. «${battuta1}»`);
    if (npcIsNuovo) {
      incisoUsato = nuovo(tonoScelto.incisi);
      blocchi.push(`${maiusc(incisoUsato)}: ${nome} non è un nome che hai scelto adesso, è un nome che qualcuno, da qualche parte, stava aspettando.`);
    }
    chiusuraUsata = nuovo(CHIUSURE_PROEMIO);
    domandaUsata = nuovo(DOMANDE_FINALI);
    blocchi.push(`${chiusuraUsata} ${domandaUsata.replace(/\{nome\}/g, nome)}`);
  } else {
    // 1. Scenario
    connettivoUsato = nuovo(CONNETTIVI_TEMPO);
    blocchi.push(`${maiusc(connettivoUsato)} ${atmosfera}.`);
    blocchi.push(`Ti trovi ${conPreposizione(luogoNome, "in")}, ed è ${momento.toLowerCase()}: ${luogoObj.sensorio}.`);

    // 2. Azione del giocatore, richiamata esplicitamente (memoria di breve termine)
    const sviluppo = scegli(rng, SVILUPPO_PER_INTENTO[intentoChiave] || SVILUPPO_PER_INTENTO.generico);
    blocchi.push(`Avevi deciso: «${azione?.testo || "andare avanti"}». ${sviluppo}`);

    // 3. Dialogo NPC
    blocchi.push(`${npc.nome} ti raggiunge — ${npc.aspetto} — e ${npc.tic}. «${battuta1}»`);
    incisoUsato = nuovo(tonoScelto.incisi);
    blocchi.push(`${maiusc(incisoUsato)} mentre aggiunge, più piano: «${battuta2}»`);
    const relazione = (stato.relazioni || []).find((r) => r.npc.toLowerCase() === npc.nome.toLowerCase());
    if (relazione && ["Rivale", "Nemico"].includes(relazione.ruolo)) {
      blocchi.push(`Tra voi due la tensione non ha bisogno di spiegazioni: la conoscete entrambi troppo bene.`);
    }

    // 4. Colpo di scena
    const colpo = rng() < 0.5
      ? scegliNuovo(rng, COLPI_DI_SCENA, usate)
      : scegliNuovo(rng, COLPI_DI_SCENA_LUOGO, usate);
    colpoUsato = colpo;
    const riferimento = (stato.inventario || []).length ? scegli(rng, stato.inventario) : scegli(rng, banco.oggetti);
    const colpoRiempito = colpo
      .replace(/\{npc\}/g, npc.nome)
      .replace(/\{luogo\}/g, luogoNome)
      .replace(/\{oggettoArt\}/g, riferimento ? conArticolo(riferimento.nome) : "l'oggetto che porti addosso")
      .replace(/\{oggetto\}/g, riferimento?.nome || "l'oggetto che porti addosso");
    avversativoUsato = nuovo(tonoScelto.avversativi);
    blocchi.push(`${avversativoUsato} ${maiusc(colpoRiempito)}`);

    // 5. Approfondimento
    if (["combattimento", "fuga", "astuzia"].includes(intentoChiave) || rng() < 0.5) {
      const minaccia = scegliNuovo(rng, banco.minacce.map((m) => m.nome), usate) || scegli(rng, banco.minacce).nome;
      const minacciaDati = banco.minacce.find((m) => m.nome === minaccia) || banco.minacce[0];
      minacciaUsata = minacciaDati.nome;
      blocchi.push(`${maiusc(minacciaDati.descrizione)}, e il primo affondo arriva subito: ${minacciaDati.attacco}.`);
    }
    const extraPool = [...RIFLESSIONI, ...DETTAGLI];
    const extraLiberi = extraPool.filter((f) => !usate.includes(f));
    const [extra1, extra2] = scegliDue(rng, extraLiberi.length >= 2 ? extraLiberi : extraPool);
    extraUsato1 = extra1;
    extraUsato2 = extra2;
    blocchi.push(extra1);
    blocchi.push(extra2);

    // 6. Cliffhanger
    chiusuraUsata = nuovo(tonoScelto.chiusure);
    domandaUsata = nuovo(DOMANDE_FINALI);
    blocchi.push(`${chiusuraUsata} ${domandaUsata.replace(/\{nome\}/g, nome)}`);
  }

  let testo = aggiustaLunghezza(blocchi.join(" "), rng);

  // Testi consumati: lo State Engine li ricorderà per non ripetersi nei prossimi capitoli
  const testiConsumati = [
    atmosfera, battuta1, battuta2, colpoUsato, minacciaUsata, extraUsato1, extraUsato2,
    incisoUsato, avversativoUsato, chiusuraUsata, domandaUsata, connettivoUsato
  ].filter(Boolean);

  return {
    numero,
    titolo: titoloCapitolo(rng, banco, numero, intentoChiave),
    testo,
    opzioni: generaOpzioni(rng, banco, stato, npc, luogoObj),
    deltaStato: calcolaDelta({ rng, banco, stato, intento: intentoChiave, npc, npcIsNuovo, luogoObj, azione, numero }),
    provenienza: "motore-locale",
    parole: contaparole(testo),
    meta: {
      intento: intentoChiave,
      luogo: luogoNome,
      npc: npc.nome,
      seme: creaSeme(partita.id, numero, azione?.testo || "proemio"),
      testiConsumati
    }
  };
}

// ---------------------------------------------------------------------------
// Selezione degli NPC
// ---------------------------------------------------------------------------
function scegliNpc(rng, banco, stato, intento) {
  const relazioni = stato.relazioni || [];
  const npcBanca = banco.npc;

  const ricorrenti = relazioni.map((r) => {
    const trovato = npcBanca.find((n) => n.nome.toLowerCase() === r.npc.toLowerCase());
    if (trovato) return { ...trovato, ruolo: r.ruolo || trovato.ruolo };
    return {
      nome: r.npc,
      ruolo: r.ruolo,
      aspetto: r.aspetto || "una figura che conosci bene",
      tic: r.tic || "ti guarda come se sapesse qualcosa che non dice",
      voce: [r.nota || "Ci siamo già visti. Non fingere.", "Non dire che non te l'avevo detto."]
    };
  });

  if (ricorrenti.length && rng() < 0.68) {
    return scegliPesato(rng, ricorrenti, (n) => {
      const rel = relazioni.find((r) => r.npc.toLowerCase() === n.nome.toLowerCase());
      const distanza = Math.max(1, (stato.capitolo || 1) - (rel?.ultimoIncontro || 1));
      const pesoRuolo = ORDINE_RUOLI[n.ruolo] ?? 3;
      return Math.max(1, Math.min(6, distanza)) * (pesoRuolo >= 4 ? 3 : 2);
    });
  }

  const nuovi = npcBanca.filter((n) => !relazioni.some((r) => r.npc.toLowerCase() === n.nome.toLowerCase()));
  return scegli(rng, nuovi.length ? nuovi : npcBanca);
}

// ---------------------------------------------------------------------------
// Titolo del capitolo
// ---------------------------------------------------------------------------
function titoloCapitolo(rng, banco, numero, intento) {
  const coppie = banco.titoli;
  const base = coppie[(numero - 1) % coppie.length];
  const variante = coppie[Math.floor(rng() * coppie.length)];
  const collegaBene = /^(di|del|della|dei|delle|che|in|per|con|su|a|al|alla|e |tra|fra)\b/i.test(variante[1]);
  const seconda = rng() < 0.45 && collegaBene ? variante[1] : base[1];
  if (intento === "combattimento" && rng() < 0.4) return `${base[0]} — Duello ${seconda}`;
  return `${base[0]} ${seconda}`;
}

// ---------------------------------------------------------------------------
// Scelte rapide (3 o 4)
// ---------------------------------------------------------------------------
function generaOpzioni(rng, banco, stato, npc, luogoObj) {
  const inventario = stato.inventario || [];
  const oggetto = inventario.length ? scegli(rng, inventario) : scegli(rng, banco.oggetti);
  const arma = inventario.find((o) => /spad|lama|pistol|arma|tamburo|taser|coltell|bastone|arco|daga/i.test(o.nome));
  const contesto = {
    npc: npc.nome,
    luogo: luogoObj.nome,
    oggetto: oggetto?.nome || "ciò che porti addosso",
    arma: arma ? conArticolo(arma.nome) : "la tua arma improvvisata",
    potere: formaBrevePotere(scegli(rng, banco.poteri))
  };

  const tipi = rng() < 0.3 ? ["audace", "prudente", "empatica"] : ["audace", "prudente", "astuta", "empatica"];
  const k = Math.floor(rng() * tipi.length);
  const ordinati = [...tipi.slice(k), ...tipi.slice(0, k)];

  return ordinati.map((tipo, i) => {
    const etichetta = riempiTemplate(scegli(rng, TEMPLATE_SCELTE[tipo]), contesto);
    return {
      id: `op${i + 1}`,
      tipo,
      etichetta: etichetta.length > 96 ? `${etichetta.slice(0, 93).trimEnd()}…` : etichetta
    };
  });
}

/** Riduce una descrizione di potere a una forma breve, adatta a un'etichetta di scelta. */
function formaBrevePotere(potere) {
  const testo = String(potere || "").split(":")[0];
  const primoPezzo = testo.split(/ e (?=[a-z])/)[0];
  const breve = primoPezzo.trim().replace(/[.,;]$/, "");
  return breve.length > 58 ? `${breve.slice(0, 55).trimEnd()}…` : breve;
}

function riempiTemplate(template, contesto) {
  return template
    .replace(/\{npc\}/g, contesto.npc)
    .replace(/\{luogo\}/g, contesto.luogo)
    .replace(/\{oggetto\}/g, contesto.oggetto)
    .replace(/\{arma\}/g, contesto.arma)
    .replace(/\{potere\}/g, contesto.potere);
}

// ---------------------------------------------------------------------------
// Delta di stato proposto dal capitolo
// ---------------------------------------------------------------------------
function calcolaDelta({ rng, banco, stato, intento, npc, npcIsNuovo, luogoObj, azione, numero }) {
  const deltaStato = {
    inventario: [],
    oggettiPersi: [],
    relazioni: [],
    vitali: { ...(DELTA_VITALI[intento] || DELTA_VITALI.generico) },
    luogo: luogoObj.nome,
    obiettivo: null,
    sinossi: ""
  };

  // --- Oggetti --------------------------------------------------------------
  const posseduti = new Set((stato.inventario || []).map((o) => o.nome.toLowerCase()));
  const disponibili = (banco.oggetti || []).filter((o) => !posseduti.has(o.nome.toLowerCase()));
  const probScoperta = ["indagine", "esplorazione"].includes(intento) ? 0.7 : 0.35;
  if (disponibili.length && rng() < probScoperta) {
    const scelto = scegli(rng, disponibili);
    deltaStato.inventario.push({
      nome: scelto.nome, descrizione: scelto.descrizione, rarita: scelto.rarita, capitolo: numero
    });
    if (intento === "combattimento" && rng() < 0.25) {
      const perdibile = (stato.inventario || []).filter((o) => o.rarita === "comune");
      if (perdibile.length) deltaStato.oggettiPersi.push(scegli(rng, perdibile).nome);
    }
  }

  // --- Relazione con l'NPC: albero di fiducia a tre assi --------------------
  const esistente = (stato.relazioni || []).find((r) => r.npc.toLowerCase() === npc.nome.toLowerCase());
  const base = DELTA_ASSI[intento] || DELTA_ASSI.generico;

  // Piccola variazione casuale perché due azioni simili non diano sempre lo stesso esito
  const scarto = () => (rng() < 0.35 ? (rng() < 0.5 ? 3 : -3) : 0);
  const variazione = {
    vincolo: base.vincolo + scarto(),
    tensione: base.tensione + scarto(),
    rispetto: base.rispetto + scarto()
  };

  // Coerenza col ruolo noto: un Nemico non si addolcisce senza motivo narrativo
  if (esistente && ["Rivale", "Nemico", "Sospetto"].includes(esistente.ruolo)) {
    variazione.vincolo = Math.min(variazione.vincolo, 2);
    variazione.tensione = Math.max(variazione.tensione, 1);
  }
  if (esistente &&["Amico", "Alleato", "Alleata", "Interesse Amoroso"].includes(esistente.ruolo) && intento === "cura") {
    variazione.vincolo += 4;
  }

  deltaStato.relazioni.push({
    npc: npc.nome,
    ruolo: npc.ruolo,
    deltaVincolo: variazione.vincolo,
    deltaTensione: variazione.tensione,
    deltaRispetto: variazione.rispetto,
    aspetto: npc.aspetto,
    tic: npc.tic,
    nota: generaNotaRelazione(intento, azione),
    ultimoIncontro: numero
  });

  // --- Obiettivo ------------------------------------------------------------
  // La scheda deve sempre mostrare almeno una missione aperta
  const obiettiviAperti = (stato.obiettivi || []).filter((o) => o.stato === "aperto").length;
  if (obiettiviAperti === 0 || (numero === 1 && rng() < 0.85) || rng() < 0.3) {
    deltaStato.obiettivo = scegli(rng, [
      "Scoprire perché sei finito in questo mondo",
      "Trovare la verità dietro il Marchio",
      `Chiarire i conti con ${npc.nome}`,
      `Raggiungere ${luogoObj.nome} prima degli altri`,
      "Capire chi ti sta seguendo ormai da tre giorni",
      "Sopravvivere fino all'alba"
    ]);
  }

  // --- Sinossi --------------------------------------------------------------
  const luogoBreve = luogoObj.nome.split(",")[0].trim();
  deltaStato.sinossi = intento === "proemio"
    ? `Ti sei risvegliato ${conPreposizione(luogoBreve, "in")} senza ricordi, e ti ha trovato ${npc.nome}.`
    : `${SINTESI_INTENTO[intento] || SINTESI_INTENTO.generico} ${conPreposizione(luogoBreve, "in")}, accanto a ${npc.nome}.`;

  return deltaStato;
}

function generaNotaRelazione(intento, azione) {
  const azioneBreve = (azione?.testo || "").trim();
  const corte = azioneBreve.length > 70 ? `${azioneBreve.slice(0, 67).trimEnd()}…` : azioneBreve;
  const mappe = {
    combattimento: "Ha visto come combatti: non è un dettaglio che dimenticherà.",
    dialogo: "Gli hai parlato con sincerità, e qualcosa tra voi si è spostato.",
    esplorazione: "Avete esplorato insieme: la fiducia si costruisce camminando.",
    fuga: "Ti ha coperto la ritirata, forse controvoglia.",
    astuzia: "Sospetta di essere stato raggirato. E non sbaglia.",
    cura: "Gli hai offerto aiuto senza chiedere nulla in cambio.",
    indagine: "Avete messo insieme due indizi che non tornavano.",
    proemio: "Ti ha trovato quando non ricordavi nemmeno il tuo nome.",
    generico: "Vi siete incontrati di nuovo, e stavolta è andata diversamente."
  };
  return `${mappe[intento] || mappe.generico}${corte ? ` (${corte})` : ""}`;
}

// ---------------------------------------------------------------------------
// Modalità Personaggio — battuta in prima persona di un NPC (stile OOC)
// ---------------------------------------------------------------------------

// Reazioni del personaggio in base allo stato del rapporto (tono della voce)
const REAZIONI_NPC = {
  alleanza: [
    "Il suo sguardo si fa più morbido, e per un istante abbassa la guardia.",
    "Si lascia sfuggire un mezzo sorriso: con te può permetterselo.",
    "Annuisce lentamente, come chi ha già deciso di ascoltarti davvero."
  ],
  rivalita: [
    "Ti studia con un'intensità nuova: la sfida fra voi brucia ancora.",
    "Incrocia le braccia, ma non distoglie lo sguardo. Non lo farebbe mai.",
    "Un angolo della sua bocca si solleva: lo hai punto, e lo sa."
  ],
  ostilita: [
    "I suoi occhi si stringono: la diffidenza è un muro difficile da scalare.",
    "Resta immobile, ma ogni muscolo tradisce una cautela da animale ferito.",
    "Ride piano, senza allegria: non è ancora il momento di fidarsi."
  ],
  crocevia: [
    "Ti osserva come si osserva qualcosa di ancora indecifrabile.",
    "Inclina appena la testa, soppesando ogni tua parola.",
    "Per un attimo esita: non sa ancora da che parte stare con te."
  ]
};

// Battute caratteristiche per quadrante del rapporto
const BATTUTE_NPC = {
  alleanza: [
    "«Se c'è qualcuno che può capirlo, quello sei tu. Non dirlo in giro.»",
    "«Non ti voltare adesso: qualunque cosa accada, io resto qui.»",
    "«Mi fido di te. Ed è una parola che non regalo a nessuno.»"
  ],
  rivalita: [
    "«Non credere che sia finita: la prossima volta non ti cedo il passo.»",
    "«Sei l'unica persona che mi costringe a dare il meglio. Odiarlo non posso.»",
    "«Dimmi la verità, almeno tu. Anche se fa male.»"
  ],
  ostilita: [
    "«Dammi una sola ragione per crederti. Una. E sceglila bene.»",
    "«Le parole costano poco. Sono i fatti che ti tengo d'occhio.»",
    "«Non so cosa vuoi da me. Ma so cosa non ti darò facilmente.»"
  ],
  crocevia: [
    "«Non so ancora cosa pensare di te. E questo, di solito, è un buon segno.»",
    "«C'è qualcosa che non torna, in te. Continua a parlare, voglio capire cosa.»",
    "«Forse ci siamo incontrati per un motivo. Forse no. Dimmelo tu.»"
  ]
};

// Chiusure che tengono viva la conversazione (domande / provocazioni)
const CHIUSURE_DIALOGO = [
  "Fa' un passo verso di te, in attesa della risposta.",
  "Rimane in silenzio, ma il suo sguardo pretende una risposta.",
  "Si volta appena, lasciandoti l'ultima parola.",
  "Alza un sopracciglio: la palla, adesso, è tua."
];

const EMOZIONI_PER_QUADRANTE = {
  alleanza: ["calore", "fiducia", "intesa"],
  rivalita: ["sfida", "rispetto riluttante", "tensione viva"],
  ostilita: ["diffidenza", "cautela", "sospetto"],
  crocevia: ["curiosità", "incertezza", "interesse"]
};

/**
 * Genera la battuta in prima persona di un NPC (Modalità Personaggio).
 * Deterministica rispetto al seme, con reazione al messaggio del giocatore.
 * @param {object} opzioni
 * @param {object} opzioni.partita     stato completo della partita
 * @param {object} opzioni.relazione   voce di relazione dell'NPC
 * @param {string} opzioni.messaggio   ciò che il giocatore ha scritto
 */
export function generaBattuta({ partita, relazione, messaggio }) {
  const config = partita.configurazione;
  const nomeProtagonista = config.protagonista?.nome || "Viandante";
  const q = quadrante(relazione);

  const rng = creaRng(creaSeme(
    partita.id, "battuta", relazione.npc, String(messaggio),
    String((partita.dialoghi?.[relazione.npc]?.messaggi?.length || 0))
  ));

  const reazioni = REAZIONI_NPC[q.id] || REAZIONI_NPC.crocevia;
  const battute = BATTUTE_NPC[q.id] || BATTUTE_NPC.crocevia;

  const reazione = scegli(rng, reazioni);
  let battuta = scegliNuovo(rng, battute, partita.dialoghi?.[relazione.npc]?.testiUsati || []);

  // Se il giocatore evoca un ricordo condiviso, l'NPC lo richiama (memoria profonda)
  const fatti = relazione.memoria?.fatti || [];
  const promesse = relazione.memoria?.promesse || [];
  const ultimoRicordo = promesse.length ? promesse[promesse.length - 1] : fatti[fatti.length - 1];
  const ecoRicordo = ultimoRicordo && rng() < 0.5
    ? `Non ha dimenticato: ${promesse.length ? `«${ultimoRicordo}»` : `${ultimoRicordo.charAt(0).toLowerCase()}${ultimoRicordo.slice(1)}`.replace(/\.$/, "")}. `
    : "";

  // Riferimento al messaggio del giocatore: la battuta "risponde" davvero
  // (stile OOC: i personaggi reagiscono a ogni parola)
  const parole = String(messaggio).split(/\s+/).filter((p) => p.length >= 5);
  const parolaScelta = parole.length
    ? parole[Math.floor(rng() * parole.length)].replace(/[.,;!?«»]/g, "")
    : "";
  const eco = parolaScelta
    ? `«${parolaScelta}», ripete piano, come a voler pesare quella parola. `
    : "";

  const chiusura = scegli(rng, CHIUSURE_DIALOGO);
  const emozione = scegli(rng, EMOZIONI_PER_QUADRANTE[q.id] || EMOZIONI_PER_QUADRANTE.crocevia);

  // Variazione degli assi: le conversazioni spostano il rapporto con gradualità
  const caldo = /bene|amico|fiducia|grazie|insieme|prometto|ti credo/.test(String(messaggio).toLowerCase());
  const duro = /bugiard|tradito|odio|colpa|mai più|vattene/.test(String(messaggio).toLowerCase());
  const deltaVincolo = caldo ? 4 : duro ? -5 : q.id === "alleanza" ? 2 : 1;
  const deltaTensione = duro ? 5 : q.id === "ostilita" ? 1 : -1;
  const deltaRispetto = caldo ? 2 : q.id === "rivalita" ? 1 : 0;

  const testo = [
    reazione,
    ecoRicordo ? ecoRicordo.trim() : null,
    battuta,
    eco ? eco.trim() : null,
    chiusura
  ].filter(Boolean).join(" ");

  // Il ricordo che l'NPC conserva di questo scambio (memoria profonda)
  let fatto = null;
  let promessa = null;
  if (duro) fatto = `Ricorda le parole dure che ${nomeProtagonista} gli ha rivolto.`;
  else if (caldo) fatto = `Ricorda la sincerità che ${nomeProtagonista} gli ha mostrato parlando con lui.`;
  else if (parolaScelta && rng() < 0.6) fatto = `Ha parlato con ${nomeProtagonista} di «${parolaScelta}».`;

  // Una promessa esplicita del giocatore diventa un legame permanente
  if (/prometto|giuro|te lo giuro/.test(String(messaggio).toLowerCase())) {
    promessa = `Promessa: ${String(messaggio).slice(0, 90)}`;
  }

  const impressione = duro
    ? "Dopo queste parole, sta più attento a fidarsi."
    : caldo
      ? "Dopo queste parole, sente il protagonista più vicino."
      : "Ogni parola scambiata aggiunge un tassello all'idea che si sta facendo.";

  return {
    testo,
    emozione,
    deltaVincolo,
    deltaTensione,
    deltaRispetto,
    fatto,
    promessa,
    impressione,
    provenienza: "motore-locale",
    parole: contaparole(testo),
    meta: { quadrante: q.id, testiConsumati: [battuta] }
  };
}

// ---------------------------------------------------------------------------
// Budget di parole: 150-200
// ---------------------------------------------------------------------------
function aggiustaLunghezza(testo, rng) {
  const riserva = [
    ...RIFLESSIONI, ...DETTAGLI,
    "Il vento cambia direzione, e con esso cambia l'umore della scena.",
    "Da qualche parte, molto lontano, qualcuno pronuncia il tuo nome senza sapere perché.",
    "Ti sembra di sentire un passo alle spalle, ma quando ti volti non c'è nessuno.",
    "Il tempo, in momenti come questo, si comporta male: corre e si ferma senza avvisare."
  ];

  // Nessuna frase già presente nel testo può essere riutilizzata
  let disponibili = riserva.filter((f) => !testo.includes(f));
  if (disponibili.length < 2) disponibili = riserva.filter((f) => !testo.startsWith(f));

  let parole = contaparole(testo);
  let guardia = 0;
  while (parole < 158 && disponibili.length && guardia < 24) {
    const frase = scegli(rng, disponibili);
    disponibili.splice(disponibili.indexOf(frase), 1);
    testo += ` ${frase}`;
    parole = contaparole(testo);
    guardia++;
  }

  if (parole > 200) {
    // Si rimuovono solo frammenti narrativi: i dialoghi e i finali restano intatti
    const frasi = testo.split(/(?<=[.!?»])\s+/);
    let indice = Math.max(0, Math.floor(frasi.length / 2) - 1);
    let guardia2 = 0;
    while (contaparole(testo) > 198 && frasi.length > 6 && guardia2 < 10) {
      let rimosso = false;
      for (let salto = 0; salto < frasi.length; salto++) {
        const j = indice - salto;
        if (j < 1 || j >= frasi.length - 2) continue;
        if (frasi[j].includes("«") || frasi[j].includes("»")) continue;
        frasi.splice(j, 1);
        rimosso = true;
        indice = Math.max(1, j - 2);
        break;
      }
      if (!rimosso) break;
      testo = frasi.join(" ");
      guardia2++;
    }
  }

  return testo.replace(/\s{2,}/g, " ").trim();
}

export { contaparole as contaParole };
