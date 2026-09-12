#!/usr/bin/env node
/**
 * avvia-playtest.js — Avvio guidato di una sessione di playtest.
 *
 * Fa tutto quello che serve per far giocare qualcuno in pochi secondi:
 *
 *   1. controlla la versione di Node;
 *   2. libera il registro degli eventi (o lo conserva, con --conserva);
 *   3. avvia il server sulla porta scelta (3000 per impostazione predefinita);
 *   4. prepara una saga di prova, così chi gioca non deve configurare nulla
 *      (con --saga-vuota si parte invece dalla schermata di creazione);
 *   5. stampa le istruzioni da leggere ad alta voce e l'indirizzo da aprire,
 *      anche in rete locale per far giocare dal telefono;
 *   6. alla chiusura (Ctrl+C) mostra il riepilogo della sessione.
 *
 * Uso:
 *   node strumenti/avvia-playtest.js
 *   node strumenti/avvia-playtest.js --porta 8080
 *   node strumenti/avvia-playtest.js --conserva          # non azzera gli eventi
 *   node strumenti/avvia-playtest.js --saga-vuota        # prova anche la creazione
 *   node strumenti/avvia-playtest.js --produzione        # come un giocatore vero
 *   node strumenti/avvia-playtest.js --pubblico          # apre un link condivisibile
 *                                                        # (cloudflared o ngrok)
 */

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argomenti = process.argv.slice(2);
const valore = (nome, predefinito) => {
  const i = argomenti.indexOf(nome);
  return i >= 0 && argomenti[i + 1] ? argomenti[i + 1] : predefinito;
};
const PORTA = Number(valore("--porta", process.env.PORTA || 3000));
const CONSERVA = argomenti.includes("--conserva");
const SAGA_VUOTA = argomenti.includes("--saga-vuota");
const PRODUZIONE = argomenti.includes("--produzione");
const PUBBLICO = argomenti.includes("--pubblico") || argomenti.includes("--tunnel");

const linea = "─".repeat(68);
const passi = [];

function passo(testo) {
  passi.push(testo);
  console.log(`  ${passi.length}. ${testo}`);
}

console.log(`\n╔${linea}╗`);
console.log("║   MasterRPG · Cronache Infinite — preparazione del playtest            ║");
console.log(`╚${linea}╝\n`);

// ── 1. Verifica di Node ──
const maggiore = Number(process.versions.node.split(".")[0]);
passo(`Node ${process.versions.node}: ${maggiore >= 18 ? "versione adeguata" : "⚠ serve Node 18 o superiore"}`);
if (maggiore < 18) {
  console.error("\n  Aggiorna Node prima di continuare (https://nodejs.org).\n");
  process.exit(1);
}

// ── 2. Pulizia del registro e dei vecchi salvataggi di prova ──
const cartellaPlaytest = path.join(RADICE, "dati", "playtest");
const cartellaPartite = path.join(RADICE, "dati", "partite");
if (!CONSERVA) {
  await fs.rm(cartellaPlaytest, { recursive: true, force: true });
  await fs.rm(cartellaPartite, { recursive: true, force: true });
  passo("Registro degli eventi azzerato (usa --conserva per non cancellarlo)");
} else {
  passo("Registro degli eventi conservato");
}
await fs.mkdir(cartellaPartite, { recursive: true });

// ── 3. Avvio del server ──
passo(`Avvio del server sulla porta ${PORTA}…`);
// Il server legge la porta da PORT (e accetta anche PORTA)
const ambiente = { ...process.env, PORT: String(PORTA), PORTA: String(PORTA) };
if (PRODUZIONE) delete ambiente.OPENAI_API_KEY;

const server = spawn(process.execPath, [path.join(RADICE, "server", "index.js")], {
  cwd: RADICE,
  env: ambiente,
  stdio: ["ignore", "pipe", "pipe"]
});

let avviato = false;
const attendiAvvio = new Promise((risolvi, rifiuta) => {
  const tempo = setTimeout(() => rifiuta(new Error("Il server non ha risposto entro 15 secondi.")), 15000);
  server.stdout.on("data", (dati) => {
    process.stdout.write(dati);
    if (!avviato && String(dati).includes("Interfaccia:")) {
      avviato = true;
      clearTimeout(tempo);
      risolvi();
    }
  });
  server.stderr.on("data", (dati) => process.stderr.write(dati));
  server.on("exit", (codice) => {
    if (!avviato) rifiuta(new Error(`Il server è terminato con codice ${codice}.`));
  });
});

/**
 * Apre un tunnel pubblico verso la partita, per far giocare qualcuno che non è
 * sulla stessa rete. Cerca uno strumento già installato sul computer:
 *
 *   · cloudflared  →  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
 *                     (gratuito, nessun account:  cloudflared tunnel --url http://localhost:PORTA)
 *   · ngrok        →  richiede un account gratuito e il comando `ngrok config add-authtoken`
 *
 * Se non trova nulla, spiega come installarli. Non prova a scaricare niente da
 * solo: installare software è una decisione di chi ospita il test.
 */
function strumentoDisponibile(comando) {
  return new Promise((risolvi) => {
    const figlio = spawn(comando, ["--version"], { stdio: "ignore" });
    figlio.on("error", () => risolvi(false));
    figlio.on("exit", () => risolvi(true));
  });
}

async function apriTunnel() {
  const cloudflared = await strumentoDisponibile("cloudflared");
  const ngrok = cloudflared ? false : await strumentoDisponibile("ngrok");

  if (!cloudflared && !ngrok) {
    console.log(`\n${linea}`);
    console.log("  LINK PUBBLICO — serve uno strumento di tunnel");
    console.log(linea);
    console.log("  Sul tuo computer non ho trovato né cloudflared né ngrok.");
    console.log("  Scegli uno dei due (una volta sola, pochi secondi):\n");
    console.log("  · cloudflared  (consigliato: gratuito e senza account)");
    console.log("      macOS:    brew install cloudflared");
    console.log("      Windows:  winget install --id Cloudflare.cloudflared");
    console.log("      Linux:    https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/");
    console.log("      poi:      cloudflared tunnel --url http://localhost:" + PORTA);
    console.log("");
    console.log("  · ngrok  (richiede un account gratuito)");
    console.log("      npm install -g ngrok   →   ngrok config add-authtoken <token>   →   ngrok http " + PORTA);
    console.log("");
    console.log("  In entrambi i casi ottieni un indirizzo https pubblico da mandare a chi");
    console.log("  deve giocare: apri quello in Firefox, anche dal telefono, da qualunque rete.");
    return null;
  }

  const comando = cloudflared ? "cloudflared" : "ngrok";
  const argomentiTunnel = cloudflared
    ? ["tunnel", "--url", `http://localhost:${PORTA}`, "--no-autoupdate"]
    : ["http", String(PORTA), "--log=stdout"];

  console.log(`\n  Apro il tunnel pubblico con ${comando}…`);
  const tunnel = spawn(comando, argomentiTunnel, { stdio: ["ignore", "pipe", "pipe"] });

  return await new Promise((risolvi) => {
    let trovato = null;
    let uscita = "";
    const esamina = (dati) => {
      uscita += String(dati);
      const indirizzo = uscita.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/) || uscita.match(/url=https:\/\/[^\s]+/);
      if (indirizzo && !trovato) {
        trovato = indirizzo[0].replace("url=", "");
        console.log(`\n${linea}`);
        console.log("  LINK PUBBLICO PER IL PLAYTEST");
        console.log(linea);
        console.log(`  ${trovato}`);
        console.log("");
        console.log("  Aprilo in Firefox (o su qualsiasi dispositivo, anche dal telefono).");
        console.log("  Vale solo finché questa sessione resta aperta: chiudendo con Ctrl+C");
        console.log("  il tunnel si chiude da solo.");
        console.log(linea);
        risolvi(tunnel);
      }
    };
    tunnel.stdout.on("data", esamina);
    tunnel.stderr.on("data", esamina);
    tunnel.on("error", () => risolvi(null));
    tunnel.on("exit", (codice) => {
      if (!trovato) {
        console.log(`\n  ⚠ ${comando} si è chiuso (codice ${codice}) senza fornire un indirizzo.`);
        console.log("    Con ngrok serve prima:  ngrok config add-authtoken <il-tuo-token>");
        risolvi(null);
      }
    });
    setTimeout(() => { if (!trovato) { console.log("\n  ⚠ Il tunnel non ha risposto entro 20 secondi: continuo senza link pubblico."); risolvi(null); } }, 20000);
  });
}

/** Prepara una saga di prova pronta da giocare. */
async function preparaSaga() {
  const ambientazioni = ["fantasy", "scifi", "cyberpunk"];
  const ambientazione = ambientazioni[Math.floor(Math.random() * ambientazioni.length)];
  const risposta = await fetch(`http://127.0.0.1:${PORTA}/api/partite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ambientazione: { id: ambientazione },
      tono: "epico",
      protagonista: { nome: "Rei", archetipo: "Spadaccino Errante", tratto: "Impulsivo" }
    })
  });
  const dati = await risposta.json();
  return { id: dati.partita.id, titolo: dati.partita.configurazione.titoloSaga, ambientazione };
}

try {
  await attendiAvvio;
  passo(`Server attivo: http://localhost:${PORTA}`);

  if (!SAGA_VUOTA) {
    const saga = await preparaSaga();
    passo(`Saga già preparata: «${saga.titolo}» (${saga.ambientazione})`);
  } else {
    passo("La sessione comincerà dalla creazione della saga (prova completa)");
  }
} catch (errore) {
  console.error(`\n  ✗ ${errore.message}\n`);
  server.kill("SIGTERM");
  process.exit(1);
}

// ── 4. Indirizzi utili ──
const indirizzi = [];
for (const schede of Object.values(os.networkInterfaces())) {
  for (const scheda of schede || []) {
    if (scheda.family === "IPv4" && !scheda.internal) {
      indirizzi.push(`http://${scheda.address}:${PORTA}`);
    }
  }
}

console.log(`\n${linea}`);
console.log("  COSA DIRE A CHI GIOCA (bastano trenta secondi)");
console.log(linea);
console.log("  «Questo è un gioco di ruolo narrativo: leggi il capitolo, scegli una delle");
console.log("   tre o quattro mosse, oppure scrivi la tua azione con parole tue.");
console.log("   Ogni capitolo è scritto al momento e le tue scelte cambiano la storia.");
console.log("   In alto trovi le illustrazioni del capitolo: toccane una per vederla grande.");
console.log("   Nel pannello a destra (o sotto il capitolo, sul telefono) ci sono la scheda,");
console.log("   le relazioni e il diario. I Token Storia sono gratuiti: quando finiscono,");
console.log("   il pulsante «Ricarica rapida» ne dà altri 500 senza spendere nulla.»");

console.log(`\n${linea}`);
console.log("  INDIRIZZI");
console.log(linea);
console.log(`  Sul computer:      http://localhost:${PORTA}`);
if (indirizzi.length) {
  for (const indirizzo of indirizzi) {
    console.log(`  Dal telefono:      ${indirizzo}   (stessa rete Wi-Fi)`);
  }
} else {
  console.log("  Dal telefono:      collega il computer a una rete Wi-Fi per giocare da mobile");
}

let tunnel = null;
if (PUBBLICO) {
  tunnel = await apriTunnel();
}

console.log(`\n${linea}`);
console.log("  DURANTE LA SESSIONE");
console.log(linea);
console.log("  · Non spiegare i pulsanti: osserva dove si ferma da solo.");
console.log("  · Prendi nota del minuto in cui si blocca o ride o si annoia.");
console.log("  · Al terzo capitolo comparirà da solo il modulo «Come sta andando?».");
console.log("  · Dal pulsante «📊 Riepilogo playtest» vedi subito i numeri del test.");
console.log("  · Un capitolo richiede fra 150 e 200 parole: la sessione giusta sta fra");
console.log("    5 e 8 capitoli, cioè fra 10 e 20 minuti.");
if (PUBBLICO) console.log("  · Il link pubblico è aperto: chiunque lo abbia può giocare, in sola lettura dei propri dati.");
console.log("  · Non serve nessun browser particolare: Firefox va benissimo.");

console.log(`\n${linea}`);
console.log("  ALLA FINE DELLA SESSIONE");
console.log(linea);
console.log("  Premi Ctrl+C: riceverai il riepilogo. Potrai ripeterlo in qualunque");
console.log("  momento con:  npm run playtest:riepilogo");
console.log(`\n  Il server è in ascolto. Buon playtest.\n`);

// ── 5. Chiusura pulita e riepilogo ──
let inChiusura = false;
async function chiudi() {
  if (inChiusura) return;
  inChiusura = true;
  console.log("\n\n  Sessione terminata. Preparo il riepilogo…\n");
  if (tunnel) tunnel.kill("SIGTERM");
  server.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 400));
  const riepilogo = spawn(process.execPath, [path.join(RADICE, "strumenti", "riepilogo-playtest.js")], {
    cwd: RADICE,
    stdio: "inherit"
  });
  riepilogo.on("exit", () => process.exit(0));
}

process.on("SIGINT", chiudi);
process.on("SIGTERM", chiudi);
server.on("exit", (codice) => {
  if (!inChiusura) {
    console.log(`\n  Il server si è chiuso (codice ${codice}).\n`);
    process.exit(codice || 0);
  }
});
