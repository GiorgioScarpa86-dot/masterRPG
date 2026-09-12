/**
 * prompt.js — Costruzione del prompt del Game Master (interamente in italiano).
 *
 * Qui avviene l'iniezione implicita della memoria: ogni richiesta narrativa
 * porta con sé la scheda del personaggio, l'inventario, le relazioni, la
 * sinossi canonica e gli obiettivi aperti (State Engine).
 */

import { digest } from "../stato/memoria.js";

export const VERSIONE_PROMPT = "1.0";

/** Regole di stile e di formato impartite al Game Master. */
export function promptSistema(config) {
  const { protagonista, tono, ambientazione } = config;
  return [
    "Sei il Game Master di una storia di ruolo interattiva in stile light novel / anime giapponese.",
    "Scrivi ESCLUSIVAMENTE in italiano corretto e fluido, con registro narrativo coinvolgente.",
    "",
    "REGISTRO E STILE",
    "- Narrazione in seconda persona singolare (il giocatore è il protagonista).",
    "- Enfasi sulle emozioni interiori, dialoghi espressivi tra virgolette caporali «…».",
    "- Ogni capitolo deve contenere almeno una battuta di un personaggio secondario (NPC).",
    "- Chiudi SEMPRE con un colpo di scena o un cliffhanger e con una domanda diretta al protagonista.",
    `- Tono richiesto: ${tono}.`,
    `- Ambientazione: ${ambientazione.nome} — ${ambientazione.descrizione}`,
    ambientazione.personalizzata && ambientazione.testoUtente
      ? `- Premessa del mondo scritta dal giocatore (vincolante): ${ambientazione.testoUtente}`
      : "",
    "",
    "REGOLE DI COERENZA (obbligatorie, servono a non perdere la memoria della trama)",
    "1. La SINOSSI fornita è canonica: non contraddirla e non riscrivere eventi già accaduti.",
    "2. Usa soltanto gli oggetti presenti nell'INVENTARIO; puoi aggiungerne al massimo uno nuovo per capitolo, motivandolo nella narrazione.",
    "3. Rispetta il ruolo relazionale degli NPC (un Rivale non diventa alleato senza un motivo narrato in questo capitolo).",
    "4. Non inventare personaggi già incontrati con nomi diversi: riprendi quelli elencati nelle RELAZIONI.",
    `5. Il protagonista si chiama ${protagonista.nome} (${protagonista.archetipo}, ${protagonista.tratto}).`,
    "6. Se i vitali sono bassi (vita o energia sotto 30) la narrazione deve mostrarne le conseguenze fisiche.",
    "",
    "VINCOLI DI FORMATO",
    `- Il testo del capitolo deve avere fra 150 e 200 parole (obiettivo: 175).`,
    "- Proponi da 3 a 4 opzioni di scelta rapida, brevi (massimo 12 parole ciascuna), tutte diverse fra loro.",
    "- Un'opzione per ciascuno di questi tipi, dove possibile: audace, prudente, astuta, empatica.",
    "- Rispondi SOLO con un oggetto JSON valido, senza testo fuori dal JSON, senza commenti, senza markdown.",
    "",
    "SCHEMA JSON DI RISPOSTA",
    "{",
    '  "titolo": "titolo evocativo del capitolo, massimo 8 parole",',
    '  "testo": "il capitolo completo, 150-200 parole, paragrafi separati da \\n\\n",',
    '  "opzioni": [',
    '    { "tipo": "audace", "etichetta": "azione breve" },',
    '    { "tipo": "prudente", "etichetta": "azione breve" },',
    '    { "tipo": "astuta", "etichetta": "azione breve" },',
    '    { "tipo": "empatica", "etichetta": "azione breve" }',
    '  ],',
    '  "deltaStato": {',
    '    "inventario": [{ "nome": "oggetto nuovo", "descrizione": "a cosa serve", "rarita": "comune|non comune|raro|leggendario" }],',
    '    "oggettiPersi": ["nome di un oggetto perduto"],',
    '    "relazioni": [{ "npc": "Nome", "ruolo": "Alleata|Amico|Mentore|Rivale|Nemico|Sospetto|Interesse Amoroso", "fiducia": 0, "nota": "cosa è cambiato fra voi" }],',
    '    "vitali": { "vita": 0, "energia": 0, "tensione": 0 },',
    '    "luogo": "dove si svolge il prossimo capitolo",',
    '    "obiettivo": "nuovo obiettivo aperto, oppure null",',
    '    "sinossi": "una frase che riassume questo capitolo per la memoria futura"',
    "  }",
    "}",
    "",
    'I valori di "vitali" sono variazioni (positive o negative) comprese fra -30 e +30, non valori assoluti.'
  ].filter(Boolean).join("\n");
}

/**
 * Prompt utente: memoria iniettata + capitoli recenti + azione del giocatore.
 */
export function promptUtente({ partita, azione, numero, memoriaDigest }) {
  const { configurazione: config, stato, storia } = partita;
  const testo = partita.configurazione?.ambientazione?.testoUtente;

  const sezioni = [];
  sezioni.push(`AMBIENTAZIONE: ${config.ambientazione.nome}`);
  if (testo) sezioni.push(`PREMESSA DEL MONDO (scritta dal giocatore): ${testo}`);
  sezioni.push("");
  sezioni.push(memoriaDigest || digest(partita));
  sezioni.push("");

  // Capitoli recenti per intero: il modello vede la voce dei personaggi
  const recenti = (storia || []).slice(-2);
  if (recenti.length) {
    sezioni.push("=== ULTIMI CAPITOLI (testo integrale, mantieni la voce dei personaggi) ===");
    for (const cap of recenti) {
      sezioni.push(`[Capitolo ${cap.numero} — ${cap.titolo}]`);
      sezioni.push(cap.testo);
      sezioni.push("");
    }
  }

  sezioni.push(`=== RICHIESTA ===`);
  sezioni.push(`Scrivi il CAPITOLO ${numero} della saga.`);
  if (azione?.tipo === "scelta") {
    sezioni.push(`Il giocatore ha scelto questa azione rapida: «${azione.testo}».`);
  } else if (azione?.testo) {
    sezioni.push(`Il giocatore ha scritto questa azione personalizzata: «${azione.testo}».`);
  } else {
    sezioni.push("È il capitolo d'apertura: presenta il risveglio del protagonista nel nuovo mondo e il primo NPC.");
  }
  sezioni.push("Fa' proseguire la storia da quel punto esatto, senza riassumere il passato e senza ripetere frasi già usate.");
  sezioni.push("Rispondi esclusivamente con il JSON richiesto.");

  return sezioni.join("\n");
}

/** Coppia pronta per il provider. */
export function costruisciPrompt({ partita, azione, numero }) {
  const memoriaDigest = digest(partita);
  return {
    sistema: promptSistema(partita.configurazione),
    utente: promptUtente({ partita, azione, numero, memoriaDigest }),
    memoriaDigest
  };
}
