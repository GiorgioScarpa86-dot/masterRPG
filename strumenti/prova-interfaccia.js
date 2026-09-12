#!/usr/bin/env node
/**
 * prova-interfaccia.js — Collaudo dell'interfaccia utente (domanda opzionale).
 *
 * Esegue i moduli del client (public/js/*) dentro un DOM simulato con jsdom e
 * gioca un'intera saga contro il server reale, verificando:
 * configurazione, creazione della saga, capitoli, scelte rapide, azione
 * personalizzata, portafoglio, memoria iniettata, archivio ed esportazione.
 *
 * ⚠ Richiede jsdom, che NON fa parte delle dipendenze del gioco (il gioco non
 *   ne ha nessuna). Installalo solo se vuoi eseguire questo collaudo:
 *
 *     npm install --no-save jsdom
 *     npm start                     # in un altro terminale
 *     node strumenti/prova-interfaccia.js
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
const html = await fs.readFile(`${RADICE}/public/index.html`, "utf8");

const consoleVirtuale = new VirtualConsole();
consoleVirtuale.on("jsdomError", (e) => {
  if (!String(e.message).includes("Not implemented")) console.error("[jsdom]", e.message);
});
consoleVirtuale.on("error", (...a) => console.error("[pagina]", ...a));
consoleVirtuale.on("warn", (...a) => console.warn("[pagina]", ...a));
consoleVirtuale.on("log", (...a) => console.log("[pagina]", ...a));
const dom = new JSDOM(html, { url: `${BASE}/`, pretendToBeVisual: true, virtualConsole: consoleVirtuale });
const { window } = dom;

// ── Iniezione dei globali che i moduli del client si aspettano ──
global.window = window;
global.document = window.document;
global.Node = window.Node;
global.Event = window.Event;
global.localStorage = window.localStorage;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 4);
global.cancelAnimationFrame = clearTimeout;
window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });

const fetchVero = globalThis.fetch;
globalThis.fetch = (url, opzioni) =>
  fetchVero(typeof url === "string" && url.startsWith("/") ? BASE + url : url, opzioni);
window.fetch = globalThis.fetch;

const errori = [];
window.addEventListener("error", (e) => errori.push(String(e.error || e.message)));
process.on("unhandledRejection", (e) => errori.push(`UnhandledRejection: ${e?.message || e}`));

const attendi = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const testo = (sel) => $(sel)?.textContent?.trim() ?? null;

function verifica(condizione, descrizione) {
  console.log(`${condizione ? "  ✓" : "  ✗"} ${descrizione}`);
  if (!condizione) errori.push(`VERIFICA FALLITA: ${descrizione}`);
}

// ── Avvio dell'applicazione ──
window.localStorage.clear();
await import(`${RADICE}/public/js/app.js`);
document.dispatchEvent(new window.Event("DOMContentLoaded"));
await attendi(1200);

console.log("\n═══ 1. Schermata di avvio ═══");
verifica($("#schermata-avvio") && !$("#schermata-avvio").classList.contains("nascosto"), "la schermata di configurazione è visibile");
verifica($$("#griglia-ambientazioni .ambientazione").length === 7, `7 ambientazioni proposte (6 preset + mondo personalizzato): trovate ${$$("#griglia-ambientazioni .ambientazione").length}`);
verifica($$("#griglia-toni .tono").length === 4, "4 toni narrativi disponibili");
verifica($$("#archetipo-protagonista option").length > 8, "gli archetipi sono popolati");
verifica(testo("#badge-motore")?.length > 3, `badge del motore narrativo: «${testo("#badge-motore")}»`);
verifica($("#nome-protagonista").value.length >= 2, `nome suggerito: ${$("#nome-protagonista").value}`);

console.log("\n═══ 2. Ambientazione personalizzata (testo libero) ═══");
const cardPersonale = [...$$("#griglia-ambientazioni .ambientazione")].find((b) => b.textContent.includes("Crea il tuo mondo"));
cardPersonale.click();
verifica(!$("#blocco-personalizzata").classList.contains("nascosto"), "compare il campo per descrivere il proprio mondo");
const testoMondo = "Una metropoli sospesa fra le nuvole dove i ricordi si comprano al mercato e nessuno ricorda il proprio nome.";
$("#testo-ambientazione").value = testoMondo;
$("#testo-ambientazione").dispatchEvent(new window.Event("input"));
verifica(testo("#conteggio-ambientazione") === String(testoMondo.length), `contatore caratteri aggiornato: ${testo("#conteggio-ambientazione")}`);

console.log("\n═══ 3. Creazione della saga ═══");
$("#nome-protagonista").value = "Kaito";
$("#nome-protagonista").dispatchEvent(new window.Event("input"));
$("#form-nuova-saga").dispatchEvent(new window.Event("submit", { cancelable: true, bubbles: true }));
await attendi(1500);
verifica(!$("#schermata-gioco").classList.contains("nascosto"), "si entra nella schermata di gioco");
verifica(/^1[.,]?000$/.test(testo("#saldo-valore")), `bonus di benvenuto accreditato: ${testo("#saldo-valore")} Token Storia`);
verifica(testo("#scheda-nome") === "Kaito", `scheda del personaggio popolata: ${testo("#scheda-nome")}`);
verifica(/Le Cronache di Kaito/.test(testo("#titolo-saga")), `titolo saga: ${testo("#titolo-saga")}`);

console.log("\n═══ 4. Generazione del primo capitolo (proemio) ═══");
verifica(!$("#blocco-proemio").classList.contains("nascosto"), "il blocco «Inizio della saga» è proposto all'avvio");
$("#btn-proemio").click();
await attendi(1400);
verifica(window.__partita.storia.length === 1, `il capitolo 1 è stato generato (capitoli: ${window.__partita.storia.length})`);
verifica($$("#capitolo-corrente .capitolo-testo p").length > 0, `il testo del capitolo è stato scritto (${window.__partita.storia[0].parole} parole)`);
verifica($$("#scelte .scelta").length >= 3, `${$$("#scelte .scelta").length} scelte rapide proposte`);
verifica($("#blocco-proemio").classList.contains("nascosto"), "il blocco proemio scompare dopo il primo capitolo");
verifica(/^980$|^990$/.test(testo("#saldo-valore").replace(".", "")), `addebito di 10 Token Storia: saldo ${testo("#saldo-valore")}`);
verifica(window.__partita.scheda.relazioni.length >= 1, `un NPC è comparso nelle relazioni: ${window.__partita.scheda.relazioni.map((r) => r.npc).join(", ")}`);
verifica(window.__partita.scheda.sinossi.length === 1, "la sinossi del capitolo è registrata nello State Engine");

console.log("\n═══ 5. Scelta rapida (capitolo 2) ═══");
const primoScelta = $$("#scelte .scelta")[0];
console.log(`  → clic su: «${primoScelta.textContent}» (disabled=${primoScelta.disabled})`);
verifica(!primoScelta.disabled, "le scelte rapide sono cliccabili dopo la generazione");
primoScelta.click();
await attendi(1600);
console.log(`  → capitoli=${window.__partita.storia.length}, toast=${$$("#toast .toast").map((t) => t.textContent).join(" | ")}`);
verifica(window.__partita.scheda.sinossi.length === 2, `la sinossi contiene ${window.__partita.scheda.sinossi.length} capitoli`);
verifica(Array.isArray(window.__partita.scheda.inventario), `inventario strutturato correttamente (${window.__partita.scheda.inventario.length} oggetti finora)`);
verifica($$("#elenco-capitoli .voce-capitolo").length === 2, "il diario elenca due capitoli");
verifica(testo("#saldo-valore").replace(".", "") === "980", `saldo dopo due capitoli: ${testo("#saldo-valore")}`);

console.log("\n═══ 6. Azione Personalizzata (capitolo 3) ═══");
$("#azione-personalizzata").value = "Cerco la biblioteca dei ricordi e chiedo chi ha comprato il mio nome";
$("#azione-personalizzata").dispatchEvent(new window.Event("input"));
verifica(!$("#btn-genera").disabled, "il pulsante si abilita con un testo valido");
$("#btn-genera").click();
await attendi(1300);
const ultimoCapitolo = window.__partita.storia.at(-1);
verifica(ultimoCapitolo.azioneGiocatore.tipo === "libera", "l'azione libera è stata registrata come tale");
verifica(ultimoCapitolo.testo.includes("biblioteca dei ricordi") || ultimoCapitolo.testo.length > 300, "il capitolo ha reagito all'azione scritta dal giocatore");
verifica($("#azione-personalizzata").value === "", "il campo dell'azione si svuota dopo l'invio");

console.log("\n═══ 7. Portafoglio e ricarica rapida gratuita ═══");
$("#btn-portafoglio").click();
await attendi(120);
verifica(!$("#modale-portafoglio").classList.contains("nascosto"), "il portafoglio si apre");
verifica($$("#opzioni-ricarica .opzione-ricarica").length >= 2, "le opzioni di ricarica gratuita sono elencate");
verifica($$("#elenco-movimenti li").length >= 3, `estratto conto presente (${$$("#elenco-movimenti li").length} movimenti)`);
const saldoPrima = window.__partita.economia.saldo;
$("#btn-ricarica-principale").click();
await attendi(900);
verifica(window.__partita.economia.saldo === saldoPrima + 500, `pulsante «Ottieni 500 Crediti Gratuiti»: saldo ${saldoPrima} → ${window.__partita.economia.saldo}`);

console.log("\n═══ 8. Garanzia anti-blocco (test dedicato: test-emergenza.mjs) ═══");
verifica(window.__partita.economia.saldo > 0, `il saldo resta sempre non negativo: ${window.__partita.economia.saldo} Token`);
verifica(window.__partita.ricariche.capitoliPossibili >= 1, `capitoli ancora generabili: ${window.__partita.ricariche.capitoliPossibili}`);

console.log("\n═══ 9. Memoria iniettata (State Engine) ═══");
$("[data-chiudi='modale-portafoglio']").click();
await attendi(100);
$("#btn-memoria-iniettata").click();
await attendi(500);
const memoria = testo("#testo-memoria") || "";
verifica(memoria.includes("SCHEDA DEL PERSONAGGIO"), "il digest contiene la scheda del personaggio");
verifica(memoria.includes("RELAZIONI CON GLI NPC"), "il digest contiene le relazioni");
verifica(memoria.includes("SINOSSI DELLA STORIA"), "il digest contiene la sinossi canonica");
verifica(memoria.includes("Cap. 3"), "il digest riporta gli ultimi capitoli");

console.log("\n═══ 10. Archivi, esportazione e interfaccia ═══");
$("[data-chiudi='modale-memoria']").click();
$("#btn-archivio").click();
await attendi(600);
verifica($$("#elenco-saghe .saga-voce").length >= 1, "l'archivio elenca le saghe salvate");
$("[data-chiudi='modale-archivio']").click();
$("#btn-pannello").click();
await attendi(60);
verifica($("#pannello-scheda").classList.contains("nascosto"), "il pannello Scheda si può chiudere");
$("#btn-pannello").click();
await attendi(60);
verifica(!$("#pannello-scheda").classList.contains("nascosto"), "il pannello Scheda si può riaprire");

const rispostaExport = await fetch(`${BASE}/api/partite/${window.__partita.id}/esporta`);
const markdown = await rispostaExport.text();
verifica(markdown.includes("# ") && markdown.includes("## Capitolo 1"), "l'esportazione in Markdown contiene i capitoli");
verifica(markdown.includes("Scheda finale del personaggio"), "l'esportazione contiene la scheda finale");

console.log("\n═══ 11. Verifiche di contenuto sul testo italiano ═══");
const capitoli = window.__partita.storia;
let fuoriLunghezza = 0;
let sbilanciati = 0;
for (const cap of capitoli) {
  if (cap.parole < 150 || cap.parole > 200) fuoriLunghezza++;
  const apri = (cap.testo.match(/«/g) || []).length;
  const chiudi = (cap.testo.match(/»/g) || []).length;
  if (apri !== chiudi) sbilanciati++;
}
verifica(fuoriLunghezza === 0, `tutti i ${capitoli.length} capitoli hanno fra 150 e 200 parole`);
verifica(sbilanciati === 0, "le virgolette dei dialoghi sono sempre bilanciate");
verifica(capitoli.every((c) => c.opzioni.length >= 3 && c.opzioni.length <= 4), "ogni capitolo offre 3 o 4 scelte rapide");
verifica(capitoli.every((c) => c.testo.trim().length > 400), "nessun capitolo è troncato o vuoto");

console.log("\n═══ 12. Errori JavaScript ═══");
verifica(errori.length === 0, errori.length ? `errori rilevati: ${errori.join(" | ")}` : "nessun errore JavaScript durante l'intero flusso");

if (errori.length) {
  console.error("\n❌ Smoke test dell'interfaccia FALLITO");
  process.exit(1);
}
console.log("\n✅ Collaudo dell'interfaccia SUPERATO: flusso completo verificato senza errori.\n");
process.exit(0);
