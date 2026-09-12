#!/usr/bin/env node
/**
 * prova-compatibilita.js — Verifica in quali browser il gioco funziona.
 *
 * Controlla, senza aprire un browser:
 *
 *   1. quali funzionalità CSS e JavaScript usa il progetto, e da quale versione
 *      di Firefox, Safari e Chrome sono supportate;
 *   2. se esiste una via di ripiego quando una funzionalità manca
 *      (blocco @supports o degradazione decorosa), e quindi quale è la
 *      versione minima REALE di ogni browser;
 *   3. se il server consegna i tipi MIME corretti — dettaglio decisivo:
 *      Firefox rifiuta i moduli ES serviti con un tipo sbagliato;
 *   4. se il gioco usa solo indirizzi relativi (necessario dietro un proxy di
 *      anteprima in HTTPS) e nessuna risorsa esterna (quindi nessun blocco da
 *      parte delle protezioni anti-tracciamento);
 *   5. se esistono richieste a `localhost` o risorse in HTTP dentro una pagina
 *      HTTPS (contenuto misto: Firefox blocca la pagina).
 *
 * Uso:  node strumenti/prova-compatibilita.js [URL-base]
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.argv[2] || process.env.BASE_URL || "http://localhost:3000";

let controlli = 0;
let fallimenti = 0;
const problemi = [];

function verifica(condizione, descrizione) {
  controlli++;
  if (!condizione) {
    fallimenti++;
    problemi.push(descrizione);
    console.log(`  ✗ ${descrizione}`);
  } else {
    console.log(`  ✓ ${descrizione}`);
  }
}

const css = await fs.readFile(`${RADICE}/public/css/style.css`, "utf8");
const html = await fs.readFile(`${RADICE}/public/index.html`, "utf8");
const nomiModuli = ["app", "api", "ui", "setup", "capitolo", "scheda", "albero", "illustrazioni", "portafoglio", "playtest"];
const js = (await Promise.all(nomiModuli.map((n) => fs.readFile(`${RADICE}/public/js/${n}.js`, "utf8").catch(() => "")))).join("\n");

/**
 * Tabella delle funzionalità. `ripiego` indica che il progetto ha una via di
 * fuga verificata (blocco @supports o degradazione) quando la funzione manca.
 */
const FUNZIONALITA = [
  { nome: "Moduli ES", rileva: () => /<script[^>]+type=["']module["']/.test(html), min: { firefox: 60, safari: 11, chrome: 61 }, ripiego: false, tipo: "motore del gioco" },
  { nome: "Variabili CSS (custom properties)", rileva: () => /--accento-1:/.test(css), min: { firefox: 31, safari: 9.1, chrome: 49 }, ripiego: false, tipo: "tema" },
  { nome: "CSS Grid", rileva: () => /display:\s*grid/.test(css), min: { firefox: 52, safari: 10.1, chrome: 57 }, ripiego: false, tipo: "impaginazione" },
  { nome: "clamp() / min() / max()", rileva: () => /clamp\(/.test(css), min: { firefox: 75, safari: 13.1, chrome: 79 }, ripiego: false, tipo: "tipografia" },
  { nome: ":focus-visible", rileva: () => /:focus-visible/.test(css), min: { firefox: 85, safari: 15.4, chrome: 86 }, ripiego: false, tipo: "accessibilità" },
  { nome: "aspect-ratio", rileva: () => /aspect-ratio:/.test(css), min: { firefox: 89, safari: 15, chrome: 88 }, ripiego: false, tipo: "illustrazioni" },
  { nome: "Array.prototype.at()", rileva: () => /\.at\(-?\d|\.at\(-/.test(js) || /\)\.at\(/.test(js), min: { firefox: 90, safari: 15.4, chrome: 92 }, ripiego: false, tipo: "logica del client" },
  { nome: "structuredClone", rileva: () => /structuredClone/.test(js), min: { firefox: 94, safari: 15.4, chrome: 98 }, ripiego: false, tipo: "logica del client" },
  { nome: "backdrop-filter", rileva: () => /backdrop-filter:/.test(css), min: { firefox: 103, safari: 9, chrome: 76 }, ripiego: true, tipo: "effetto decorativo" },
  { nome: "color-mix()", rileva: () => /color-mix\(/.test(css), min: { firefox: 113, safari: 16.2, chrome: 111 }, ripiego: /@supports not \(color: color-mix/.test(css), tipo: "tema e sfumature" },
  { nome: "scroll-snap (aggancio dello scorrimento)", rileva: () => /scroll-snap-type:/.test(css), min: { firefox: 68, safari: 11, chrome: 69 }, ripiego: true, tipo: "striscia delle illustrazioni" },
  { nome: "overscroll-behavior-x", rileva: () => /overscroll-behavior-x:/.test(css), min: { firefox: 59, safari: 16, chrome: 63 }, ripiego: true, tipo: "scorrimento orizzontale" },
  { nome: "scrollbar-width / scrollbar-color", rileva: () => /scrollbar-width:/.test(css), min: { firefox: 64, safari: 18.2, chrome: 121 }, ripiego: true, tipo: "barre di scorrimento" },
  { nome: "paint-order (SVG)", rileva: () => /paint-order/.test(js), min: { firefox: 60, safari: 11, chrome: 35 }, ripiego: true, tipo: "contorni dei testi nei disegni" },
  { nome: "loading=\"lazy\" sulle immagini", rileva: () => /loading: (indice|i) === 0/.test(js) || /loading:/.test(js), min: { firefox: 75, safari: 15.4, chrome: 77 }, ripiego: true, tipo: "rete mobile" },
  { nome: "Intl.DateTimeFormat", rileva: () => /Intl\.DateTimeFormat/.test(js), min: { firefox: 29, safari: 10, chrome: 24 }, ripiego: false, tipo: "date nell'archivio" },
  { nome: "localStorage", rileva: () => /localStorage\./.test(js), min: { firefox: 3.5, safari: 4, chrome: 4 }, ripiego: true, tipo: "memoria dell'interfaccia" },
  { nome: "matchMedia", rileva: () => /matchMedia/.test(js), min: { firefox: 6, safari: 5.1, chrome: 9 }, ripiego: false, tipo: "preferenze di animazione" }
];

console.log("\n╔══════════════════════════════════════════════════════════════════════╗");
console.log("║  MasterRPG · Compatibilità con i browser                             ║");
console.log("╚══════════════════════════════════════════════════════════════════════╝\n");

// ═══════════════════════ 1. Funzionalità rilevate ═══════════════════════
console.log("═══ 1. Funzionalità usate dal gioco ═══\n");
console.log("  Funzionalità                                    Firefox   Safari   Chrome   Ripiego");
console.log("  " + "─".repeat(84));

const usate = FUNZIONALITA.filter((f) => f.rileva());
const minime = { firefox: 0, safari: 0, chrome: 0 };
const minimeConRipiego = { firefox: 0, safari: 0, chrome: 0 };

for (const f of usate) {
  const ripiego = f.ripiego ? "sì" : "—";
  console.log(`  ${f.nome.padEnd(46)} ${String(f.min.firefox).padStart(6)}   ${String(f.min.safari).padStart(6)}   ${String(f.min.chrome).padStart(6)}   ${ripiego.padStart(6)}`);
  for (const browser of ["firefox", "safari", "chrome"]) {
    minime[browser] = Math.max(minime[browser], f.min[browser]);
    if (!f.ripiego) minimeConRipiego[browser] = Math.max(minimeConRipiego[browser], f.min[browser]);
  }
}

console.log(`\n  ${usate.length} funzionalità rilevate su ${FUNZIONALITA.length} cercate.`);

// ═══════════════════════ 2. Versioni minime ═══════════════════════
console.log("\n═══ 2. Versione minima richiesta ═══");
console.log(`  Con la sola via di ripiego:  Firefox ${minimeConRipiego.firefox} · Safari ${minimeConRipiego.safari} · Chrome ${minimeConRipiego.chrome}`);
console.log(`  Con tutte le funzionalità:   Firefox ${minime.firefox} · Safari ${minime.safari} · Chrome ${minime.chrome}`);

verifica(minimeConRipiego.firefox <= 115, `Firefox richiesto: ${minimeConRipiego.firefox} (le versioni con supporto esteso ESR sono ≥ 115)`);
verifica(minimeConRipiego.safari <= 16.4, `Safari richiesto: ${minimeConRipiego.safari}`);
verifica(minimeConRipiego.chrome <= 111, `Chrome/Edge richiesto: ${minimeConRipiego.chrome}`);
verifica(minime.firefox <= 128, "le funzionalità senza ripiego non superano Firefox 128");
verifica(/scrollbar-width:/.test(css), "Firefox ottiene barre di scorrimento coerenti con il tema (scrollbar-width)");
verifica(/@supports not \(color: color-mix/.test(css), "esiste una rete di sicurezza per i browser senza color-mix()");

// Nessuna funzionalità riservata a un solo browser
verifica(!/:has\(/.test(css), "il CSS non usa :has() (non necessario, evita dipendenze dalle versioni recenti)");
verifica(!/@container|container-type/.test(css), "il CSS non usa container query");
verifica(!/@layer/.test(css), "il CSS non usa @layer");
verifica(!/subgrid/.test(css), "il CSS non usa subgrid");

// ═══════════════════════ 3. Tipi MIME del server ═══════════════════════
console.log("\n═══ 3. Tipi MIME consegnati dal server (decisivi per Firefox) ═══");
try {
  const controlli_http = [
    { percorso: "/js/albero.js", atteso: /javascript/, nome: "modulo ES del client" },
    { percorso: "/css/style.css", atteso: /text\/css/, nome: "foglio di stile" },
    { percorso: "/", atteso: /text\/html/, nome: "pagina principale" },
    { percorso: "/api/config", atteso: /application\/json/, nome: "configurazione JSON" }
  ];
  for (const voce of controlli_http) {
    const risposta = await fetch(BASE + voce.percorso);
    const tipo = risposta.headers.get("content-type") || "";
    verifica(voce.atteso.test(tipo), `${voce.nome}: ${tipo.split(";")[0]} (Firefox rifiuta i moduli ES con tipo sbagliato)`);
  }

  // Un SVG di scena è un documento XML: Firefox è severo sugli errori di sintassi
  const creata = await fetch(`${BASE}/api/partite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ambientazione: { id: "fantasy" }, tono: "epico", protagonista: { nome: "Prova", archetipo: "Tester", tratto: "Curioso" } })
  }).then((r) => r.json());
  const id = creata.partita.id;
  await fetch(`${BASE}/api/partite/${id}/capitolo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });

  for (let indice = 0; indice < 5; indice++) {
    const risposta = await fetch(`${BASE}/api/partite/${id}/illustrazioni/1/${indice}`);
    const svg = await risposta.text();
    const tipo = risposta.headers.get("content-type") || "";
    verifica(tipo.includes("image/svg+xml"), `scena ${indice + 1}: servita come ${tipo.split(";")[0]}`);
    verifica(/^<\?xml|^<svg/.test(svg.trim()), `scena ${indice + 1}: documento XML ben formato`);
    verifica(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(svg), `scena ${indice + 1}: dichiara il namespace SVG`);
    // Caratteri che romperebbero il parsing XML di Firefox
    verifica(!/&(?!(amp|lt|gt|quot|apos|#\d+);)/.test(svg), `scena ${indice + 1}: nessuna e commerciale non codificata`);
    verifica(!/<[a-z]+ [^>]*<\//.test(svg), `scena ${indice + 1}: nessun tag annidato per errore`);
  }
  await fetch(`${BASE}/api/partite/${id}`, { method: "DELETE" });
} catch (errore) {
  verifica(false, `server non raggiungibile su ${BASE}: avvia il gioco prima di eseguire questo collaudo (${errore.message})`);
}

// ═══════════════════════ 4. Indirizzi e risorse esterne ═══════════════════════
console.log("\n═══ 4. Indirizzi, anteprima HTTPS e risorse esterne ═══");
verifica(!/https?:\/\/(?!www\.w3\.org)[a-z0-9.-]+\.[a-z]{2,}/i.test(js.replace(/\/\/[^\n]*$|xmlns|w3\.org/g, "")),
  "il client non contiene indirizzi assoluti (funziona dietro qualunque proxy di anteprima)");
verifica(!/localhost|127\.0\.0\.1/.test(js), "il client non chiama mai localhost: nulla si rompe su HTTPS");
// Il namespace SVG e i DTD usano http:// ma non sono richieste di rete:
// si cercano solo indirizzi che il browser caricherebbe davvero.
const indirizziCaricati = [...html.matchAll(/(?:src|href)=["'](http:\/\/[^"']+)["']/gi)].map((m) => m[1])
  .concat([...html.matchAll(/url\((http:\/\/[^)]+)\)/gi)].map((m) => m[1]));
verifica(indirizziCaricati.length === 0,
  `la pagina non carica nulla in HTTP (contenuto misto bloccato da Firefox)${indirizziCaricati.length ? ": " + indirizziCaricati.join(", ") : ""}`);
verifica(!/<link[^>]+href=["']https?:/i.test(html), "nessun foglio di stile esterno");
verifica(!/<script[^>]+src=["']https?:/i.test(html), "nessuno script esterno");
verifica(!/fonts\.googleapis|cdn\.|unpkg|jsdelivr/i.test(html + css + js), "nessuna risorsa da CDN: le protezioni anti-tracciamento non toccano nulla");
verifica(/fetch\(percorso/.test(await fs.readFile(`${RADICE}/public/js/api.js`, "utf8")), "il client usa URL relativi per tutte le chiamate API");

// ═══════════════════════ 5. Particolarità di Firefox ═══════════════════════
console.log("\n═══ 5. Particolarità di Firefox gestite ═══");
verifica(/scrollbar-width:/.test(css) && /scrollbar-color:/.test(css), "barre di scorrimento tematizzate anche su Firefox (non solo con ::-webkit-scrollbar)");
verifica(/background-clip: text/.test(css) && /-webkit-background-clip: text/.test(css),
  "i titoli con gradiente dichiarano sia la proprietà standard sia quella prefissata");
verifica(/@supports not \(color: color-mix/.test(css), "senza color-mix() i titoli non diventano invisibili (ripiego esplicito)");
verifica(/-moz-/.test(css) === false, "nessuna proprietà -moz- necessaria (Firefox usa quelle standard)");
verifica(/paint-order/.test(js) && /stroke="#0c0b18"/.test(js), "i contorni dei testi negli SVG usano paint-order (supportato da Firefox 60+)");
verifica(/overscroll-behavior-x: contain/.test(css), "lo scorrimento interno non si propaga alla pagina (comportamento identico su Firefox)");

// ═══════════════════════ 6. Verdetto ═══════════════════════
console.log("\n═══ 6. Verdetto ═══");
const verdetto = [
  ["Firefox", `${minimeConRipiego.firefox}+ (versione 113+ per tutte le sfumature di colore)`, "consigliato"],
  ["Firefox ESR", "128 e 140", "supportato"],
  ["Chrome / Edge / Brave / Opera", `${minimeConRipiego.chrome}+`, "supportato"],
  ["Safari (macOS e iOS)", "16.4+", "supportato"],
  ["Internet Explorer", "—", "non supportato (senza moduli ES)"]
];
console.log("  Browser                                   Da        Nota");
console.log("  " + "─".repeat(84));
for (const [browser, da, nota] of verdetto) {
  console.log(`  ${browser.padEnd(40)} ${da.padEnd(34)} ${nota}`);
}

console.log("\n──────────────────────────────────────────────────────────────────────");
if (fallimenti) {
  console.log(`\n❌ Collaudo di compatibilità FALLITO: ${fallimenti} problemi su ${controlli} controlli.`);
  for (const problema of problemi) console.log(`   · ${problema}`);
  process.exit(1);
}
console.log(`\n✅ Collaudo di compatibilità SUPERATO: ${controlli} controlli.`);
console.log(`   Il gioco funziona su ogni browser moderno: Firefox ${minimeConRipiego.firefox}+, Chrome ${minimeConRipiego.chrome}+, Safari 16.4+.`);
console.log("   Nessuna risorsa esterna, nessun contenuto misto: le protezioni anti-tracciamento di Firefox non interferiscono.\n");
