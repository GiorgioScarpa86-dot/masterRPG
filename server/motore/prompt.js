/**
 * prompt.js — Costruzione dei prompt del Game Master (interamente in italiano).
 *
 * Stile dell'IA modellato su OOC: The Playable Anime (Wrtn):
 *   · "anime giocabile": scene vive che reagiscono in tempo reale a ciò che
 *     il giocatore scrive — l'IA risponde a OGNI PAROLA dell'azione;
 *   · memoria profonda: sinossi canonica, ricordi degli NPC (fatti, promesse,
 *     impressioni) e richiamo dei ricordi pertinenti alla scena corrente;
 *   · adattamento al giocatore: il profilo di stile viene osservato e usato
 *     per calibrare ritmo e sfide;
 *   · personaggi con un'anima: ogni NPC ha voce, aspetto e tic coerenti.
 *
 * Qui avviene l'iniezione implicita della memoria: ogni richiesta narrativa
 * porta con sé la scheda del personaggio, l'inventario, le relazioni con i
 * ricordi di ciascun NPC, la sinossi canonica e gli obiettivi aperti.
 */

import { digest, descriviProfilo, richiamaMemoria } from "../stato/memoria.js";

export const VERSIONE_PROMPT = "2.0-ooc";

/** Regole di stile e di formato impartite al Game Master. */
export function promptSistema(config) {
  const { protagonista, tono, ambientazione } = config;
  return [
    "Sei il Game Master di un ANIME GIOCATILE: una storia di ruolo interattiva in stile light novel / anime giapponese che si scrive in tempo reale attorno alle decisioni del giocatore, come nelle migliori app di playable anime.",
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
    "REAGISCI A OGNI PAROLA (come nei playable anime)",
    "- Leggi l'azione del giocatore come se fosse appena accaduta davanti ai tuoi occhi.",
    "- Riprendi almeno un DETTAGLIO SPECIFICO scritto dal giocatore (un oggetto citato, un nome, un'intenzione) e fallo contare nelle conseguenze.",
    "- Non riassumere l'azione: mostrane l'esito. Il mondo risponde subito e in modo visibile.",
    "- NON scrivere mai le battute, i pensieri decisivi o le scelte del protagonista: le parole del protagonista appartengono solo al giocatore.",
    "",
    "PERSONAGGI CON UN'ANIMA",
    "- Ogni NPC ha una voce unica e coerente: usa aspetto, tic, nota e impressione forniti nella scheda delle relazioni.",
    "- La narrazione deve riflettere gli assi correnti: un NPC con tensione alta è brusco e sospettoso, uno con vincolo alto ti copre le spalle.",
    "- Se un NPC RICORDA qualcosa (fatti, promesse), può richiamarlo con naturalezza — mai come elenco, sempre come memoria vissuta.",
    "",
    "ALBERO DI FIDUCIA (tre assi indipendenti per ogni NPC)",
    "- VINCOLO (0-100): quanto vi lega — affetto, debito, storia condivisa.",
    "- TENSIONE (0-100): quanto è conflittuale — sospetto, risentimento, rivalità.",
    "- RISPETTO (0-100): quanto l'altro ti considera capace e degno di stima.",
    "- Nel deltaStato indica le VARIAZIONI dei tre assi (deltaVincolo, deltaTensione, deltaRispetto), non i valori assoluti.",
    "- Vincolo alto + tensione alta = rivalità intensa; vincolo basso + tensione alta = conflitto aperto.",
    "",
    "REGOLE DI COERENZA (obbligatorie, servono a non perdere la memoria della trama)",
    "1. La SINOSSI fornita è canonica: non contraddirla e non riscrivere eventi già accaduti.",
    "2. Usa soltanto gli oggetti presenti nell'INVENTARIO; puoi aggiungerne al massimo uno nuovo per capitolo, motivandolo nella narrazione.",
    "3. Rispetta il ruolo relazionale degli NPC (un Rivale non diventa alleato senza un motivo narrato in questo capitolo).",
    "4. Non inventare personaggi già incontrati con nomi diversi: riprendi quelli elencati nelle RELAZIONI.",
    `5. Il protagonista si chiama ${protagonista.nome} (${protagonista.archetipo}, ${protagonista.tratto}).`,
    "6. Se i vitali sono bassi (vita o energia sotto 30) la narrazione deve mostrarne le conseguenze fisiche.",
    "7. Se è presente la sezione RICORDI RILEVANTI, usala: i dettagli del passato devono riaffiorare proprio quando contano.",
    "8. Se è presente il PROFILO DEL GIOCATORE, adatta ritmo e sfide al suo stile preferito.",
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
    '    "relazioni": [{ "npc": "Nome", "ruolo": "Alleata|Amico|Mentore|Rivale|Nemico|Sospetto|Interesse Amoroso",',
    '                     "deltaVincolo": 0, "deltaTensione": 0, "deltaRispetto": 0,',
    '                     "tappa": "legame|primo-scontro|confidenza|rispetto-guadagnato|patto|frattura|riconciliazione (solo se accade davvero in questo capitolo)",',
    '                     "nota": "cosa è cambiato fra voi",',
    '                     "fatto": "un ricordo concreto che l\'NPC conserverà di questo capitolo (oppure null)",',
    '                     "promessa": "una promessa o un segreto nato fra voi in questo capitolo (oppure null)",',
    '                     "impressione": "come è cambiata l\'idea che l\'NPC ha del protagonista (oppure null)" }],',
    '    "vitali": { "vita": 0, "energia": 0, "tensione": 0 },',
    '    "luogo": "dove si svolge il prossimo capitolo",',
    '    "obiettivo": "nuovo obiettivo aperto, oppure null",',
    '    "sinossi": "una frase che riassume questo capitolo per la memoria futura"',
    "  }",
    "}",
    "",
    'I valori di "vitali" sono variazioni (positive o negative) comprese fra -30 e +30, non valori assoluti.',
    'I campi "fatto", "promessa" e "impressione" alimentano la memoria profonda degli NPC: scrivila solo quando accade davvero qualcosa che l\'NPC ricorderà.'
  ].filter(Boolean).join("\n");
}

/**
 * Prompt utente: memoria iniettata + ricordi pertinenti + capitoli recenti + azione.
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

  // Richiamo della memoria: i ricordi pertinenti all'azione riaffiorano qui
  if (azione?.testo) {
    const ricordi = richiamaMemoria(partita, azione.testo, 6);
    if (ricordi.length) {
      sezioni.push("=== RICORDI RILEVANTI PER QUESTA SCENA (usali con naturalezza) ===");
      for (const ricordo of ricordi) sezioni.push(`  - [${ricordo.fonte}] ${ricordo.testo}`);
      sezioni.push("");
    }
  }

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
    sezioni.push("Reagisci a ciò che ha scritto parola per parola: mostra le conseguenze immediate della sua scelta.");
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

// ---------------------------------------------------------------------------
// Modalità Personaggio — conversazioni dirette con gli NPC (stile OOC)
// ---------------------------------------------------------------------------

/**
 * Prompt di sistema per la conversazione con un NPC: il modello NON è più il
 * Game Master ma diventa il personaggio in prima persona (Character Mode).
 */
export function promptSistemaDialogo(config, relazione) {
  const { protagonista, ambientazione } = config;
  const mem = relazione.memoria || {};
  return [
    `Stai interpretando ${relazione.npc} in una storia di ruolo interattiva in stile light novel / anime, ambientata in: ${ambientazione.nome}.`,
    "MODALITÀ PERSONAGGIO: rispondi ESCLUSIVAMENTE in prima persona come questo personaggio, in italiano corretto e fluido.",
    "",
    "IDENTITÀ DEL PERSONAGGIO",
    `- Ruolo nella storia: ${relazione.ruolo}.`,
    relazione.aspetto ? `- Aspetto: ${relazione.aspetto}.` : "",
    relazione.tic ? `- Tic / gesto caratteristico: ${relazione.tic}.` : "",
    relazione.nota ? `- Nota sul rapporto: ${relazione.nota}.` : "",
    mem.impressione ? `- Impressione attuale del protagonista: ${mem.impressione}.` : "",
    mem.fatti?.length ? `- Cose che ricorda di ${protagonista.nome}: ${mem.fatti.join("; ")}.` : "",
    mem.promesse?.length ? `- Promesse fra voi: ${mem.promesse.join("; ")}.` : "",
    "",
    "STATO DEL RAPPORTO (sii coerente, fallo sentire nel tono)",
    `- VINCOLO ${relazione.vincolo ?? 50}/100 (quanto vi lega), TENSIONE ${relazione.tensione ?? 30}/100 (quanto è conflittuale), RISPETTO ${relazione.rispetto ?? 50}/100 (quanto ti stima).`,
    relazione.tensione >= 55
      ? "- Il rapporto è teso: il personaggio è sulla difensiva, punge, mette alla prova."
      : "",
    (relazione.vincolo ?? 50) >= 60
      ? "- C'è un legame forte: il personaggio si concede, ricorda momenti condivisi, protegge."
      : "",
    "",
    "REGOLE DELLA CONVERSAZIONE",
    `1. Non uscire MAI dal personaggio: niente commenti da narratore, niente assistenza fuori scena.`,
    `2. Reagisci alle parole ESATTE di ${protagonista.nome}: riprendi almeno un dettaglio di ciò che ha scritto.`,
    `3. Non scrivere mai le battute o le azioni di ${protagonista.nome}: rispondi e lascia a lui/lei la prossima mossa.`,
    "4. Puoi richiamare i ricordi elencati sopra, ma solo con naturalezza, come fa chi c'era davvero.",
    "5. Ogni scambio può cambiare qualcosa fra voi: se le parole lo giustificano, indica piccole variazioni degli assi.",
    "6. Se nasce un fatto memorabile, una promessa o cambia l'impressione che hai del protagonista, dillo nei campi dedicati.",
    "",
    "VINCOLI DI FORMATO",
    "- La risposta deve avere fra 30 e 90 parole: una o due battute fra «…» e brevi gesti o espressioni descritti in terza persona.",
    "- Chiudi con qualcosa che tiene viva la conversazione: una domanda, una provocazione, un gesto.",
    "- Rispondi SOLO con un oggetto JSON valido, senza testo fuori dal JSON, senza commenti, senza markdown.",
    "",
    "SCHEMA JSON DI RISPOSTA",
    "{",
    '  "testo": "la risposta del personaggio (30-90 parole)",',
    '  "emozione": "l\'emozione dominante in questo momento (una o due parole)",',
    '  "deltaVincolo": 0, "deltaTensione": 0, "deltaRispetto": 0,',
    '  "fatto": "un ricordo nuovo che conservi di questo scambio, oppure null",',
    '  "promessa": "una promessa o un segreto nato in questo scambio, oppure null",',
    '  "impressione": "come cambia la tua idea del protagonista, oppure null"',
    "}",
    "",
    "Le variazioni degli assi sono piccole (fra -12 e +12): le conversazioni spostano i rapporti con gradualità."
  ].filter(Boolean).join("\n");
}

/** Prompt utente della conversazione: contesto breve + ultimi scambi + battuta. */
export function promptUtenteDialogo({ partita, relazione, messaggio, storiaDialogo = [] }) {
  const { configurazione: config, stato } = partita;
  const sezioni = [];

  sezioni.push(`Il protagonista si chiama ${config.protagonista.nome} (${config.protagonista.archetipo}).`);
  sezioni.push(`Vi trovate a: ${stato.luogo || "un luogo della storia"} · Tono della saga: ${config.tono}.`);

  const profilo = descriviProfilo(stato.profiloGiocatore);
  if (profilo.length) {
    sezioni.push("Stile del giocatore (adatta il ritmo della conversazione):");
    for (const riga of profilo) sezioni.push(`  - ${riga}`);
  }

  const recenti = storiaDialogo.slice(-6);
  if (recenti.length) {
    sezioni.push("=== ULTIMI SCAMBI DI QUESTA CONVERSAZIONE ===");
    for (const scambio of recenti) {
      sezioni.push(scambio.da === "tu"
        ? `${config.protagonista.nome}: «${scambio.testo}»`
        : `${relazione.npc}: «${scambio.testo}»`);
    }
  }

  sezioni.push("");
  sezioni.push(`${config.protagonista.nome} ti dice: «${messaggio}»`);
  sezioni.push("Rispondi come il personaggio, esclusivamente con il JSON richiesto.");
  return sezioni.join("\n");
}

/** Coppia pronta per il provider (Modalità Personaggio). */
export function costruisciPromptDialogo({ partita, relazione, messaggio }) {
  const conversazione = partita.dialoghi?.[relazione.npc];
  return {
    sistema: promptSistemaDialogo(partita.configurazione, relazione),
    utente: promptUtenteDialogo({
      partita,
      relazione,
      messaggio,
      storiaDialogo: conversazione?.messaggi || []
    })
  };
}
