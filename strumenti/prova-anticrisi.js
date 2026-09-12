#!/usr/bin/env node
/**
 * prova-anticrisi.js — Verifica della garanzia anti-blocco.
 *
 * Porta un salvataggio a 5 Token Storia (meno del costo di un capitolo) e
 * controlla che l'interfaccia proponga la Ricarica d'Emergenza gratuita e che
 * la storia possa riprendere subito dopo. Richiede jsdom (vedi
 * strumenti/prova-interfaccia.js) e il server attivo.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL || "http://localhost:3000";

/**
 * jsdom è una dipendenza opzionale, necessaria solo a questo collaudo:
 *   npm install --no-save jsdom
 * In alternativa si può indicare un'installazione esistente con JSDOM_PATH.
 */
async function caricaJsdom() {
  for (const percorso of [process.env.JSDOM_PATH, "jsdom"].filter(Boolean)) {
    try {
      return await import(percorso);
    } catch {
      // si prova il percorso successivo
    }
  }
  console.error("\n✗ jsdom non è installato. Esegui:  npm install --no-save jsdom");
  console.error("  (oppure indica JSDOM_PATH=/percorso/jsdom/lib/api.js)\n");
  process.exit(2);
}

const { JSDOM, VirtualConsole } = await caricaJsdom();
let errori = [];
const verifica = (c, d) => { console.log(`${c ? "  ✓" : "  ✗"} ${d}`); if (!c) errori.push(d); };

// 1. Creazione di una saga "povera"
const risposta = await fetch(`${BASE}/api/partite`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ambientazione: { id: "fantasy" }, tono: "epico", protagonista: { nome: "Rei", archetipo: "Spadaccino Errante", tratto: "Impulsivo" } })
});
const { partita } = await risposta.json();
const file = `${RADICE}/dati/partite/${partita.id}.json`;
const dati = JSON.parse(await fs.readFile(file, "utf8"));

// Si generano capitoli finché il saldo non scende sotto il costo di un capitolo
dati.economia.saldo = 5;
await fs.writeFile(file, JSON.stringify(dati, null, 2), "utf8");
console.log(`\nSaga ${partita.id} impostata a 5 Token Storia (costo capitolo: 10).`);

// 2. Avvio dell'interfaccia
const html = await fs.readFile(`${RADICE}/public/index.html`, "utf8");
const consoleVirtuale = new VirtualConsole();
consoleVirtuale.on("error", (...a) => console.error("[pagina]", ...a));
const dom = new JSDOM(html, { url: `${BASE}/`, pretendToBeVisual: true, virtualConsole: consoleVirtuale });
const { window } = dom;
global.window = window; global.document = window.document; global.Node = window.Node;
global.Event = window.Event; global.localStorage = window.localStorage;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 4);
global.cancelAnimationFrame = clearTimeout;
window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
const fetchVero = globalThis.fetch;
globalThis.fetch = (u, o) => fetchVero(typeof u === "string" && u.startsWith("/") ? BASE + u : u, o);
window.fetch = globalThis.fetch;

window.localStorage.setItem("masterrpg.ultimaSaga", partita.id);
await import(`${RADICE}/public/js/app.js`);
document.dispatchEvent(new window.Event("DOMContentLoaded"));
await new Promise((r) => setTimeout(r, 1500));

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const testo = (s) => $(s)?.textContent?.trim();

console.log("\n═══ Verifica della ricarica d'emergenza ═══");
verifica(!$("#schermata-gioco").classList.contains("nascosto"), "la saga con saldo esaurito si apre normalmente");
verifica(testo("#saldo-valore") === "5", `il portafoglio mostra il saldo reale: ${testo("#saldo-valore")} Token Storia`);

$("#btn-portafoglio").click();
await new Promise((r) => setTimeout(r, 250));
const emergenza = [...$$("#opzioni-ricarica .opzione-ricarica")].find((d) => d.textContent.includes("Emergenza"));
verifica(Boolean(emergenza), "la Ricarica d'Emergenza è proposta al giocatore");
verifica(emergenza && !emergenza.querySelector("button").disabled, "la ricarica è effettivamente disponibile (nessun blocco)");
emergenza.querySelector("button").click();
await new Promise((r) => setTimeout(r, 900));
verifica(window.__partita.economia.saldo === 505, `accredito di 500 Token Storia: saldo ${window.__partita.economia.saldo}`);

console.log("\n═══ Il gioco riprende senza interruzioni ═══");
$("[data-chiudi='modale-portafoglio']").click();
await new Promise((r) => setTimeout(r, 120));
$("#btn-proemio").click();
await new Promise((r) => setTimeout(r, 1500));
verifica(window.__partita.storia.length === 1, `capitolo generato dopo la ricarica (capitoli: ${window.__partita.storia.length})`);
verifica(window.__partita.economia.saldo === 495, `addebito corretto dopo la ricarica: ${window.__partita.economia.saldo} Token`);
verifica($$("#scelte .scelta").length >= 3, "le scelte rapide sono di nuovo disponibili");

console.log("\n═══ Nessun pagamento reale, mai ═══");
const config = await (await fetch(`${BASE}/api/config`)).json();
verifica(config.crediti.pagamentiReali === false, "la configurazione dichiara l'assenza di pagamenti reali");
verifica(config.crediti.bonusBenvenuto === 1000, "bonus di benvenuto di 1000 Token Storia");

if (errori.length) { console.error(`\n❌ Test emergenza FALLITO (${errori.length} problemi)`); process.exit(1); }
console.log("\n✅ Test emergenza SUPERATO: nessun blocco possibile, ricariche sempre gratuite.\n");
process.exit(0);
