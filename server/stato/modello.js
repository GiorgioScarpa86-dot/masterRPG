/**
 * modello.js — Creazione e mutazione dello stato di una partita.
 * Struttura documentata in docs/03-modello-dati.md
 */

import { AMBIENTAZIONI } from "../motore/lessico.js";
import { portafoglioIniziale } from "../crediti/portafoglio.js";

export const COSTO_CAPITOLO = 10;
export const BONUS_BENVENUTO = 1000;

const STOPWORD = new Set([
  "il", "lo", "la", "i", "gli", "le", "un", "uno", "una", "di", "a", "da", "in", "con", "su", "per",
  "tra", "fra", "e", "ed", "o", "ma", "che", "chi", "cui", "non", "del", "della", "dei", "delle",
  "al", "alla", "ai", "alle", "dal", "dalla", "nel", "nella", "sul", "sulla", "è", "sono", "era",
  "dove", "come", "quando", "questo", "questa", "questi", "queste", "suo", "sua", "suoi", "sue",
  "mio", "mia", "ci", "si", "ti", "mi", "vi", "ne", "c", "l", "d", "più", "meno", "molto", "poco",
  "tutto", "tutti", "tutta", "tutte", "essere", "avere", "fare", "può", "possono", "anche", "ancora",
  "the", "of", "and", "nel", "nel", "loro", "noi", "voi", "lui", "lei", "stato", "dopo", "prima"
]);

/** Genera un identificativo di saga leggibile e univoco. */
export function idPartita() {
  const casuale = Math.random().toString(36).slice(2, 8);
  const tempo = Date.now().toString(36).slice(-4);
  return `saga_${tempo}${casuale}`;
}

/**
 * Analizza un'ambientazione scritta liberamente dall'utente:
 * estrae le parole chiave che guideranno il Motore Narrativo Locale.
 */
export function analizzaAmbientazioneLibera(testo = "") {
  const parole = String(testo)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .split(/\s+/)
    .filter((p) => p.length > 3 && !STOPWORD.has(p));

  const conteggio = new Map();
  for (const p of parole) conteggio.set(p, (conteggio.get(p) || 0) + 1);
  const paroleChiave = [...conteggio.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([p]) => p);

  // Suggerisce un preset affine, per riusare le banche lessicali più adatte
  const similarita = AMBIENTAZIONI
    .map((amb) => {
      const punteggio = amb.paroleChiave.filter((k) => paroleChiave.includes(k)).length;
      return { amb, punteggio };
    })
    .sort((a, b) => b.punteggio - a.punteggio)[0];

  const affine = similarita && similarita.punteggio > 0 ? similarita.amb.id : "personalizzata";
  const titolo = testo.trim().split(/[.!?\n]/)[0].trim();
  const nome = titolo.length > 3 && titolo.length <= 48 ? titolo : "Il Tuo Mondo";

  return { paroleChiave, affine, nome };
}

/** Normalizza l'ambientazione scelta (preset oppure testo libero). */
export function normalizzaAmbientazione(ingresso = {}) {
  const preset = AMBIENTAZIONI.find((a) => a.id === ingresso.id);
  const testoUtente = String(ingresso.testoUtente || "").trim();

  if (preset && !testoUtente) {
    return {
      id: preset.id,
      nome: preset.nome,
      sottotitolo: preset.sottotitolo,
      descrizione: preset.descrizione,
      personalizzata: false,
      testoUtente: "",
      paroleChiave: preset.paroleChiave
    };
  }

  const analisi = analizzaAmbientazioneLibera(testoUtente || ingresso.descrizione || "");
  const riferimento = AMBIENTAZIONI.find((a) => a.id === analisi.affine);
  return {
    id: riferimento ? riferimento.id : "personalizzata",
    nome: analisi.nome,
    sottotitolo: "Ambientazione creata da te",
    descrizione: testoUtente || ingresso.descrizione || "Un mondo definito dal giocatore.",
    personalizzata: true,
    testoUtente,
    paroleChiave: analisi.paroleChiave,
    bancheDa: riferimento ? riferimento.id : "personalizzata"
  };
}

/** Tabella dei toni narrativi disponibili (usata dalla UI e dalla validazione). */
export const TONI_DISPONIBILI = [
  { id: "epico", nome: "Epico", descrizione: "Destini intrecciati, duelli, musica che sale." },
  { id: "romantico", nome: "Romantico", descrizione: "Sguardi che durano un istante di troppo." },
  { id: "cupo", nome: "Cupo", descrizione: "Ombre lunghe e prezzi da pagare." },
  { id: "comico", nome: "Comico", descrizione: "Situazioni assurde e reazioni esagerate." }
];

/**
 * Crea il documento di partita completo.
 */
export function creaPartita({ ambientazione, tono, protagonista, titoloSaga } = {}, adesso = new Date()) {
  const amb = normalizzaAmbientazione(ambientazione);
  const tonoScelto = TONI_DISPONIBILI.some((t) => t.id === tono) ? tono : "epico";
  const prot = {
    nome: String(protagonista?.nome || "Rei").trim().slice(0, 24) || "Rei",
    archetipo: String(protagonista?.archetipo || "Spadaccino Errante").trim().slice(0, 40),
    tratto: String(protagonista?.tratto || "Impulsivo").trim().slice(0, 40)
  };

  const iso = adesso.toISOString();
  return {
    id: idPartita(),
    versione: 1,
    creataIl: iso,
    aggiornataIl: iso,
    configurazione: {
      titoloSaga: String(titoloSaga || `Le Cronache di ${prot.nome}`).slice(0, 80),
      ambientazione: amb,
      tono: tonoScelto,
      protagonista: prot
    },
    stato: {
      capitolo: 0,
      luogo: null,
      momento: null,
      vitali: { vita: 100, energia: 100, tensione: 10 },
      inventario: [],
      relazioni: [],
      sinossi: [],
      obiettivi: [],
      luoghiVisitati: [],
      ultimiLuoghi: [],
      titoli: [],
      arco: { nome: `Arco di ${prot.nome}`, beat: "apertura", capitoloBeat: 0 },
      ultimaScelta: null,
      contatori: { combattimenti: 0, dialoghi: 0, scoperte: 0 },
      testiUsati: []
    },
    economia: portafoglioIniziale(adesso),
    storia: [],
    memoria: {
      riassuntoCompresso: "",
      paroleTotali: 0,
      capitoliRiassunti: 0
    }
  };
}

/** Limita un numero tra due estremi. */
export function limita(valore, minimo, massimo, predefinito = minimo) {
  const n = Number.isFinite(Number(valore)) ? Number(valore) : predefinito;
  return Math.max(minimo, Math.min(massimo, n));
}

/**
 * Applica il delta proposto dal narratore allo stato della partita.
 * Le invarianti (vitali 0-100, niente duplicati) sono garantite qui.
 */
export function applicaDelta(stato, delta = {}) {
  const vitali = stato.vitali || { vita: 100, energia: 100, tensione: 0 };
  if (delta.vitali) {
    vitali.vita = limita(vitali.vita + Number(delta.vitali.vita || 0), 0, 100, vitali.vita);
    vitali.energia = limita(vitali.energia + Number(delta.vitali.energia || 0), 0, 100, vitali.energia);
    vitali.tensione = limita(vitali.tensione + Number(delta.vitali.tensione || 0), 0, 100, vitali.tensione);
  }
  // Rigenerazione minima: il protagonista non resta mai a terra per sempre
  if (vitali.energia < 12) vitali.energia = 22;
  stato.vitali = vitali;

  for (const oggetto of delta.inventario || []) {
    if (!oggetto?.nome) continue;
    const esistente = stato.inventario.find((o) => o.nome.toLowerCase() === oggetto.nome.toLowerCase());
    if (esistente) {
      esistente.quantita = (esistente.quantita || 1) + 1;
    } else {
      stato.inventario.push({
        nome: String(oggetto.nome).slice(0, 60),
        descrizione: String(oggetto.descrizione || "").slice(0, 200),
        rarita: ["comune", "non comune", "raro", "leggendario"].includes(oggetto.rarita) ? oggetto.rarita : "comune",
        quantita: 1,
        capitolo: oggetto.capitolo
      });
    }
    stato.contatori.scoperte = (stato.contatori.scoperte || 0) + 1;
  }

  for (const nomePerso of delta.oggettiPersi || []) {
    stato.inventario = stato.inventario.filter((o) => o.nome.toLowerCase() !== String(nomePerso).toLowerCase());
  }

  for (const relazione of delta.relazioni || []) {
    if (!relazione?.npc) continue;
    const nome = String(relazione.npc).slice(0, 40);
    const indice = stato.relazioni.findIndex((r) => r.npc.toLowerCase() === nome.toLowerCase());
    const voce = {
      npc: nome,
      ruolo: relazione.ruolo || "Conoscente",
      fiducia: limita(relazione.fiducia, 0, 100, 50),
      nota: String(relazione.nota || "").slice(0, 220),
      aspetto: String(relazione.aspetto || "").slice(0, 120),
      tic: String(relazione.tic || "").slice(0, 120),
      ultimoIncontro: relazione.ultimoIncontro ?? stato.capitolo + 1
    };
    if (indice >= 0) {
      stato.relazioni[indice] = { ...stato.relazioni[indice], ...voce };
    } else {
      stato.relazioni.push(voce);
    }
  }

  if (delta.obiettivo) {
    const testo = String(delta.obiettivo).slice(0, 160);
    const esistente = stato.obiettivi.find((o) => o.testo.toLowerCase() === testo.toLowerCase());
    if (!esistente) {
      // Si chiudono al massimo due obiettivi vecchi per non accumulare missioni infinite
      if (stato.obiettivi.filter((o) => o.stato === "aperto").length >= 3) {
        const daChiudere = stato.obiettivi.filter((o) => o.stato === "aperto").slice(0, 1);
        for (const o of daChiudere) o.stato = "chiuso";
      }
      stato.obiettivi.push({ testo, stato: "aperto" });
    }
    // Manutenzione: si conservano al massimo 8 obiettivi chiusi (i più recenti)
    const chiusi = stato.obiettivi.map((o, i) => ({ o, i })).filter(({ o }) => o.stato === "chiuso");
    if (chiusi.length > 8) {
      const daRimuovere = new Set(chiusi.slice(0, chiusi.length - 8).map(({ i }) => i));
      stato.obiettivi = stato.obiettivi.filter((_, i) => !daRimuovere.has(i));
    }
  }

  if (delta.luogo) {
    stato.luogo = delta.luogo;
    if (!stato.luoghiVisitati.includes(delta.luogo)) stato.luoghiVisitati.push(delta.luogo);
    stato.ultimiLuoghi = [delta.luogo, ...(stato.ultimiLuoghi || []).filter((l) => l !== delta.luogo)].slice(0, 3);
  }
  if (delta.momento) stato.momento = delta.momento;

  // La memoria testuale consumata evita ripetizioni nei capitoli successivi
  if (Array.isArray(delta.testiConsumati)) {
    stato.testiUsati = [...new Set([...(stato.testiUsati || []), ...delta.testiConsumati])].slice(-80);
  }

  return stato;
}

/** Aggiorna gli obiettivi marcandoli come chiusi (usato dal narratore su richiesta dell'IA). */
export function chiudiObiettivo(stato, testo) {
  const obiettivo = stato.obiettivi.find((o) => o.testo.toLowerCase() === String(testo).toLowerCase());
  if (obiettivo) obiettivo.stato = "chiuso";
  return stato;
}

/** Avanza l'arco narrativo (usato per assegnare un "beat" ai capitoli). */
export function avanzaArco(stato, beat) {
  const beats = ["apertura", "sviluppo", "complicazione", "confronto", "svolta", "climax", "epilogo"];
  const corrente = beats.indexOf(stato.arco?.beat || "apertura");
  const prossimo = beat && beats.includes(beat) ? beat : beats[Math.min(beats.length - 1, corrente + 1)];
  stato.arco = { ...(stato.arco || {}), beat: prossimo, capitoloBeat: stato.capitolo };
  return stato;
}
