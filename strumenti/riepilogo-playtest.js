#!/usr/bin/env node
/**
 * riepilogo-playtest.js — Riepilogo del test giocato, dal terminale.
 *
 * Legge il registro locale (`dati/playtest/eventi-*.jsonl`) e mostra i numeri
 * che servono davvero dopo una sessione di prova: quante persone hanno giocato,
 * fin dove sono arrivate, quanto ci hanno messo per capitolo, quante
 * illustrazioni hanno aperto, che voto hanno dato e che cosa li ha confusi.
 *
 * Uso:
 *   node strumenti/riepilogo-playtest.js              # tutte le sessioni
 *   node strumenti/riepilogo-playtest.js 2026-09-12   # una sola giornata
 *   node strumenti/riepilogo-playtest.js --eventi     # elenco grezzo degli eventi
 */

import { riepilogo, leggiEventi, fileDisponibili, CARTELLA_PLAYTEST } from "../server/playtest/registro.js";

const argomenti = process.argv.slice(2);
const mostraEventi = argomenti.includes("--eventi");
const data = argomenti.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) || null;

const linea = "─".repeat(66);

async function principale() {
  if (mostraEventi) {
    const eventi = await leggiEventi(data);
    console.log(`\n${eventi.length} eventi registrati${data ? ` il ${data}` : ""}:\n`);
    for (const evento of eventi) {
      const { quando, tipo, ...resto } = evento;
      console.log(`${quando.slice(11, 19)}  ${tipo.padEnd(20)} ${JSON.stringify(resto)}`);
    }
    console.log();
    return;
  }

  const dati = await riepilogo(data);
  const file = await fileDisponibili();

  console.log(`\n╔${linea}╗`);
  console.log("║  MasterRPG · Riepilogo del playtest".padEnd(67) + "║");
  console.log(`╚${linea}╝`);

  if (!dati.totaleEventi) {
    console.log("\n  Nessun evento registrato.");
    console.log(`  Cartella del registro: ${CARTELLA_PLAYTEST}`);
    console.log("  Avvia il gioco con  npm run playtest  (oppure  node server/index.js )");
    console.log("  e gioca almeno un capitolo: gli eventi verranno registrati qui.\n");
    return;
  }

  console.log(`\n  Registro:     ${file.length} file · ${dati.totaleEventi} eventi`);
  console.log(`  Sessioni:     ${dati.sessioni}`);
  console.log(`  Saghe create: ${dati.saghe}`);
  console.log(`  Capitoli:     ${dati.capitoli}`);

  console.log(`\n${linea}`);
  console.log("  Andamento della partita");
  console.log(linea);
  console.log(`  Tempo medio per capitolo: ${dati.tempiCapitolo.mediaSecondi} s  (min ${dati.tempiCapitolo.minimoSecondi} s · max ${dati.tempiCapitolo.massimoSecondi} s)`);
  console.log(`  Parole per capitolo:      ${dati.parolePerCapitolo}`);
  console.log(`  Illustrazioni aperte:     ${dati.sceneAperte}  (${dati.scenePerCapitolo} per capitolo)`);
  console.log(`  Ricariche gratuite:       ${dati.ricariche}`);
  console.log(`  Errori di generazione:    ${dati.errori}`);

  if (dati.capitoliPerSaga.length) {
    console.log(`\n${linea}`);
    console.log("  Fin dove sono arrivate le sessioni");
    console.log(linea);
    for (const voce of dati.capitoliPerSaga.sort((a, b) => b.massimoCapitolo - a.massimoCapitolo)) {
      const barra = "█".repeat(Math.min(30, voce.massimoCapitolo));
      console.log(`  ${voce.saga.padEnd(22)} cap. ${String(voce.massimoCapitolo).padStart(3)}  ${barra}`);
    }
  }

  console.log(`\n${linea}`);
  console.log("  Pareri dei giocatori");
  console.log(linea);
  if (!dati.pareri) {
    console.log("  Nessun parere raccolto. Si propone da solo dopo il terzo capitolo,");
    console.log("  oppure si apre dal pulsante «📝 Lascia un parere» nel pannello.");
  } else {
    console.log(`  Pareri: ${dati.pareri} · voto medio: ${dati.votoMedio} / 5\n`);
    for (const commento of dati.commenti) {
      console.log(`  ★${commento.voto}  ${commento.quando.slice(0, 16).replace("T", " ")}`);
      if (commento.piace) console.log(`      piace:      ${commento.piace}`);
      if (commento.confusione) console.log(`      confusione: ${commento.confusione}`);
      if (commento.commento) console.log(`      commento:   ${commento.commento}`);
      console.log("");
    }
  }

  console.log(`${linea}`);
  console.log("  Suggerimenti automatici");
  console.log(linea);
  const note = [];
  if (dati.capitoli >= 6 && dati.scenePerCapitolo < 0.4) {
    note.push("Le illustrazioni vengono aperte di rado: valuta se metterle più in evidenza.");
  }
  if (dati.capitoli >= 6 && dati.tempiCapitolo.mediaSecondi > 180) {
    note.push("Il tempo medio per capitolo è alto: il testo o la scelta potrebbero richiedere meno attrito.");
  }
  if (dati.errori > 0) {
    note.push(`Ci sono stati ${dati.errori} errori di generazione: controlla il registro eventi.`);
  }
  if (dati.sessioni > dati.saghe) {
    note.push("Alcune sessioni non hanno creato una saga: la schermata iniziale potrebbe confondere.");
  }
  if (dati.ricariche === 0 && dati.capitoli >= 100) {
    note.push("Nessuna ricarica usata su un numero alto di capitoli: il sistema di crediti è probabilmente troppo generoso.");
  }
  if (!note.length) note.push("Nessun segnale critico: il gioco regge il ritmo di una sessione reale.");
  for (const nota of note) console.log(`  · ${nota}`);
  console.log("");
}

principale().catch((errore) => {
  console.error("Errore nella lettura del registro:", errore.message);
  process.exit(1);
});
