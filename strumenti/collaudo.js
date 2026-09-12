#!/usr/bin/env node
/**
 * collaudo.js — Esegue tutta la suite di verifiche in sequenza.
 *
 * Un solo comando per essere certi che il gioco sia pronto:
 *
 *     npm run collaudo
 *
 * Comportamento:
 *   · avvia da sé il server su una porta libera se non è già attivo;
 *   · esegue verifica statica, layout da telefono, codice QR, illustrazioni, motore;
 *   · esegue i due collaudi con jsdom se la libreria è disponibile, altrimenti
 *     li salta con un avviso (jsdom serve solo ai collaudi, mai per giocare);
 *   · alla fine stampa un riepilogo e restituisce 0 solo se tutto è passato.
 *
 * Opzioni:
 *   --senza-server   non avviare il server (usa quello già attivo)
 *   --veloce         motore su 40 capitoli invece di 150
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argomenti = process.argv.slice(2);
const SENZA_SERVER = argomenti.includes("--senza-server");
const VELOCE = argomenti.includes("--veloce");
const CAPITOLI = VELOCE ? 40 : 150;
const PORTA = Number(process.env.PORTA || 3000);
const BASE = `http://localhost:${PORTA}`;

const linea = "═".repeat(70);
const esiti = [];

/** jsdom, se presente: percorso esplicito, installazione locale o /tmp/harness. */
async function trovaJsdom() {
  try {
    await import("jsdom");
    return null; // già risolvibile senza variabili
  } catch {
    // si prova il percorso indicato dall'ambiente o un'installazione di comodo
  }
  const candidati = [process.env.JSDOM_PATH, "/tmp/harness/node_modules/jsdom/lib/api.js"].filter(Boolean);
  for (const candidato of candidati) {
    try {
      await import(candidato);
      return candidato;
    } catch {
      // si prova il prossimo
    }
  }
  return undefined;
}

/** Esegue un comando e restituisce { codice, durata }. */
function esegui(comando, argomenti, ambiente = {}) {
  return new Promise((risolvi) => {
    const inizio = Date.now();
    const figlio = spawn(comando, argomenti, {
      cwd: RADICE,
      stdio: "inherit",
      env: { ...process.env, ...ambiente }
    });
    figlio.on("exit", (codice) => risolvi({ codice: codice ?? 1, durata: Date.now() - inizio }));
  });
}

async function passo(nome, comando, argomenti, ambiente) {
  console.log(`\n\n${linea}\n  ▶ ${nome}\n${linea}`);
  const { codice, durata } = await esegui(comando, argomenti, ambiente);
  esiti.push({ nome, codice, durata });
  return codice === 0;
}

/** Verifica se il server risponde; se non risponde, lo avvia. */
async function serverAttivo() {
  try {
    const risposta = await fetch(`${BASE}/salute`, { signal: AbortSignal.timeout(1500) });
    return risposta.ok;
  } catch {
    return false;
  }
}

async function avviaServer() {
  const figlio = spawn(process.execPath, [path.join(RADICE, "server", "index.js")], {
    cwd: RADICE,
    env: { ...process.env, PORT: String(PORTA) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  figlio.stdout.on("data", () => {});
  figlio.stderr.on("data", (d) => process.stderr.write(d));
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    if (await serverAttivo()) return figlio;
  }
  figlio.kill("SIGTERM");
  return null;
}

console.log(`\n╔${linea}╗`);
console.log("║   MasterRPG · Cronologia Infinita — collaudo completo".padEnd(71) + "║");
console.log(`╚${linea}╝`);

// ── Server ──
let server = null;
const giaAttivo = await serverAttivo();
if (giaAttivo) {
  console.log(`\n  Server già attivo su ${BASE}: lo userò per le verifiche REST.`);
} else if (!SENZA_SERVER) {
  console.log(`\n  Server non attivo: lo avvio io su ${BASE}…`);
  server = await avviaServer();
  if (!server) {
    console.log("  ✗ Impossibile avviare il server: le verifiche REST verranno saltate.");
  } else {
    console.log("  Server avviato.");
  }
} else {
  console.log("\n  ⚠ Server non attivo e --senza-server indicato: le verifiche REST falliranno.");
}

const jsdom = await trovaJsdom();
const percorsoJsdom = jsdom || undefined;

// ── Passi ──
await passo("Contratto fra HTML e JavaScript", process.execPath, ["strumenti/verifica-html.js"]);
await passo("Compatibilità con i browser", process.execPath, ["strumenti/prova-compatibilita.js", BASE]);
await passo("Layout da telefono (statico)", process.execPath, ["strumenti/prova-mobile.js"]);
await passo("Codice QR per il telefono", process.execPath, ["strumenti/prova-qr.js"]);
await passo("Illustrazioni di scena e albero di fiducia", process.execPath, ["strumenti/prova-illustrazioni.js", String(VELOCE ? 6 : 12)]);
await passo(`Motore narrativo (${CAPITOLI} capitoli)`, process.execPath, ["strumenti/prova-motore.js", String(CAPITOLI)]);
await passo("Garanzia anti-blocco dei crediti", process.execPath, ["strumenti/prova-anticrisi.js"], percorsoJsdom ? { JSDOM_PATH: percorsoJsdom } : {});
await passo("Interfaccia completa pilotata (jsdom)", process.execPath, ["strumenti/prova-interfaccia.js"], percorsoJsdom ? { JSDOM_PATH: percorsoJsdom } : {});

// ── Riepilogo ──
if (server) {
  server.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 400));
}

console.log(`\n\n${linea}\n  RIEPILOGO\n${linea}`);
for (const esito of esiti) {
  const segno = esito.codice === 0 ? "✅" : "❌";
  console.log(`  ${segno} ${esito.nome.padEnd(46)} ${(esito.durata / 1000).toFixed(1)} s`);
}

const falliti = esiti.filter((e) => e.codice !== 0);
console.log(`\n  jsdom: ${percorsoJsdom ? `trovato (${percorsoJsdom})` : "NON disponibile — i due collaudi jsdom sono stati saltati o falliti"}`);
if (!percorsoJsdom) {
  console.log("         per abilitarli:  npm install --no-save jsdom");
}

if (falliti.length) {
  console.log(`\n❌ ${falliti.length} collaudi su ${esiti.length} NON superati:`);
  for (const fallito of falliti) console.log(`   · ${fallito.nome}`);
  process.exit(1);
}
console.log(`\n✅ Tutti i ${esiti.length} collaudi superati: il gioco è pronto per il playtest.`);
console.log("   Avvia la sessione con:  npm run playtest\n");
