#!/usr/bin/env node
/**
 * prova-qr.js — Verifica il codificatore QR artigianale (server/utilita/qr.js).
 *
 *     npm run prova:qr
 *
 * Tre controlli, tutti senza dipendenze esterne:
 *
 *   1. IMPRONTE DI RIFERIMENTO.  Otto codici (dalla versione 1 alla 10) sono
 *      stati generati con una libreria di riferimento e congelati qui sotto:
 *      il test confronta la matrice prodotta da qr.js modulo per modulo.  È il
 *      controllo più severo: se un solo modulo è diverso, il test fallisce.
 *
 *   2. RILETTURA INDIPENDENTE.  Un piccolo lettore scritto qui dentro rilegge
 *      il codice come farebbe un telefono: individua le informazioni di
 *      formato, toglie la maschera, ripercorre il simbolo a zig-zag, ricompone
 *      i byte e ricostruisce il testo.  Se il testo riletto è identico a quello
 *      scritto, la disposizione dei moduli è corretta.
 *
 *   3. CORREZIONE D'ERRORE.  Calcola i sindromi di Reed-Solomon su ogni blocco:
 *      devono essere tutte nulle, altrimenti i dati non sarebbero riparabili
 *      se la foto del telefono venisse mossa.
 *
 * In coda: controlli di struttura (figure di posizionamento, sincronizzazione,
 * modulo sempre scuro, codice troppo lungo rifiutato) e una stampa di esempio.
 *
 * Il file finisce con un codice di uscita 0 solo se tutto è a posto.
 */

import { codificaQr, qrTesto, qrSvg } from "../server/utilita/qr.js";

// ─────────────────────────── Utilità di stampa ───────────────────────────
const linea = "─".repeat(72);
let controlli = 0;
let fallimenti = 0;

function verifica(descrizione, esito, dettaglio = "") {
  controlli++;
  if (!esito) fallimenti++;
  console.log(`  ${esito ? "✓" : "✗"} ${descrizione}${dettaglio ? `  ${dettaglio}` : ""}`);
  return esito;
}

// ─────────────────────────── 1. Impronte di riferimento ───────────────────────
/**
 * Ogni voce è un codice prodotto da una libreria QR di riferimento (modo byte,
 * livello di correzione M) con la maschera indicata: `impronta` è la matrice
 * letta riga per riga, quattro moduli per cifra esadecimale (1 = modulo scuro).
 */
const RIFERIMENTI = [
  {
    testo: "CIAO",
    versione: 1,
    maschera: 0,
    impronta: "fe13fc17106e8abb7445dba9aec12907faafe00000aa6892e7aba2eddfd17b1ae37280412bf8a3f04042baaabdd1a9aebdd3047bafef738"
  },
  {
    testo: "http://192.168.1.10:3000",
    versione: 2,
    maschera: 0,
    impronta: "fe39bfc15e906e824bb74a05dba91aec11ad07faaafe001a00aa3e0930a51876dfaeff049f26637b5ba7b3a68f9b6eebeeeaab0ffc007f47ff9eea7049b1ababef85d0be52ea2f3304299afea6f18"
  },
  {
    testo: "http://localhost:3000",
    versione: 2,
    maschera: 3,
    impronta: "fe9a3fc17b106e87ebb75395dba492ec116507faaafe014500b75825d055489aceb40906bdcef5deb84bcfc5ec504d22e1f93b8bff8050447fa1abf05ef10ba06f95d60b5eea0bfd043cd4fef03f8"
  },
  {
    testo: "http://192.168.178.123:3000/#/gioco",
    versione: 3,
    maschera: 5,
    impronta: "fe470bfc14cb506ebcacbb7577c5dba2f12ec12b7107faaaafe017b20082ca6e77ef98e58fa86a6192964501747b60a6d7cb5d1a7e98898be6651fc27427484c97fd83de4333044509a607fb8046bc63f9bf6b9040b113ba45bf9dd12dc86e83fcb5047e275fede6060"
  },
  {
    testo: "https://prova-playtest-tre-echi.trycloudflare.com",
    versione: 4,
    maschera: 1,
    impronta: "febe46bfc11045506eaf336bb7400085dba59522ec17099107faaaaafe00b33600a378a192c83eefd2dcd84469b70b993b843355120ee8c20d8d6a355c12c37840f8329f99317e96dcf2ebb0decdb2ab55719cb34f8b0182f56d9749eb37ea710f313af30a80fd8075be447fbec42bf04d1871aba4149f95d2a006ceea3cde67046815b8fea580dc8"
  },
  {
    testo: "àèìòù accenti àçé!",
    versione: 2,
    maschera: 7,
    impronta: "fe773fc120d06e8a8bb74835dba67aec17b907faaafe00980096abd0485e5e9cf4a1c5013bcd63ea8a6a83ee8cc1ac9b60a5e2ccf8807bc63f89eb505ad1bba6cf95d72452e8c043046304fea9eb8"
  },
  {
    testo: "x".repeat(120),
    versione: 7,
    maschera: 4,
    impronta: "fecf4b278bfc1030cc68906e94d2c9f4bb75f3331a35dbacccfa7faec14fac46a107faaaaaaaafe01a1d14fb008bc25ff297cb8ec5993ed033ce399ca5d4d091864fb40b3bafe7297524f86993ed009ddff9ca5d51312a64fb40aa99fe7297552782993ed03f9c3f9ca5d4f115a64fb400f88fff29fd647a6c53ec436a332bca2b5b13c314fb108f96aff28fd206d7313e7835e5393ca375a8fc8c4f9e0872784f28dd288d6313e7821c6213ca37469e58c4f9e02f2724f28dd089da313e7802c6c13ca374f1ea8c4f9e09a212ff28fd00532453e443faaf6bca6b504d0f14fb10baf55ff29fd5d2b1e53eac2e8cfa7ca0350480f94fab0feed49f280c8"
  },
  {
    testo: "x".repeat(200),
    versione: 10,
    maschera: 6,
    impronta: "feb738bbbbbf3fc17e1146b068906ea147981583cbb74b1ae75777a5dbafbe2bf9f292ec12545f12b07107faaaaaaaaaaafe00e568446b04009f918f3e7ca74b900893c77777f4b3e980ee0d60f7f728dd2bb06b264de83c19eeeee696e9a988be53ed02c94361f60d62c94b6146a222202daba75227ca7c204852f9553e5366eca08afc444465be028f0786b04bfc7b187287ca74ddcd7c2c67777f4aef3b66f8d60f7f389586a806b264e25bee0e6eee6958499fe3a53ed027fc08bfa0d63e8f1a1044622211d5afffc2bca7da8545d72713e5346fbf99aefc4443faf8c424186b061f1acd23c07ca6e5a2d4155d77775c65a85fb48d609dc41af9f4306b0c40a3f6c7ceeefc19074d8ede53e783fcdcc35e0d6468408bacaa22228d4363f42dca7d882287a54f3e53cee7f74e66c4440fac212181b6b061f2add2f437ca6e5d096a1df77775ca9bc74f58d609dff25baec706b0c403d2667eeeeff9004af8f1e53e443fb3433ae0d62a9056c3c4622211dbaf3f5ffca7cf85d51573a3e531a2e863153c4443bf042f1ecc6b054ffee2a5147ca6340"
  }
];

/** Trasforma la matrice in una stringa esadecimale, quattro moduli per cifra. */
function impronta(moduli) {
  let bit = "";
  for (const riga of moduli) for (const valore of riga) bit += valore ? "1" : "0";
  while (bit.length % 4 !== 0) bit += "0";
  let risultato = "";
  for (let i = 0; i < bit.length; i += 4) risultato += parseInt(bit.slice(i, i + 4), 2).toString(16);
  return risultato;
}

// ─────────────────────────── 2. Lettore QR in miniatura ───────────────────────────
/**
 * Moduli che non contengono dati: figure di posizionamento con i separatori,
 * sincronizzazione, informazione di formato, informazione di versione e figure
 * di allineamento.  Sono ricavati qui dalla geometria descritta dalla norma,
 * senza riusare il codice di qr.js.
 */
function mappaFunzione(lato, versione) {
  const funzione = Array.from({ length: lato }, () => new Array(lato).fill(false));
  const segna = (riga, colonna) => {
    if (riga >= 0 && colonna >= 0 && riga < lato && colonna < lato) funzione[riga][colonna] = true;
  };

  // Figure di posizionamento con il separatore (8×8 negli angoli)
  for (const [baseRiga, baseColonna] of [[0, 0], [0, lato - 8], [lato - 8, 0]]) {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) segna(baseRiga + r, baseColonna + c);
  }

  // Sincronizzazione: riga 6 e colonna 6
  for (let i = 0; i < lato; i++) {
    segna(6, i);
    segna(i, 6);
  }

  // Informazione di formato (due copie)
  for (let i = 0; i < 9; i++) {
    segna(8, i);
    segna(i, 8);
  }
  for (let i = 0; i < 8; i++) {
    segna(8, lato - 1 - i);
    segna(lato - 1 - i, 8);
  }

  // Informazione di versione (dalla settima in poi)
  if (versione >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        segna(i, lato - 11 + j);
        segna(lato - 11 + j, i);
      }
    }
  }

  // Figure di allineamento: gli stessi centri dichiarati dalla norma
  const CENTRI = [
    [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]
  ][versione - 1];
  for (const riga of CENTRI) {
    for (const colonna of CENTRI) {
      const suFigura = (riga <= 8 && colonna <= 8) || (riga <= 8 && colonna >= lato - 9) || (riga >= lato - 9 && colonna <= 8);
      if (suFigura) continue;
      for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) segna(riga + r, colonna + c);
    }
  }
  return funzione;
}

/** Le otto maschere della norma, riscritte in forma compatta. */
const MASCHERE = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
];

/** Legge le informazioni di formato da una delle due copie e ne controlla il BCH. */
function leggiFormato(moduli, lato) {
  const leggiPrimaCopia = () => {
    const bit = [];
    for (let i = 0; i <= 5; i++) bit.push(moduli[i][8]);
    bit.push(moduli[7][8], moduli[8][8], moduli[8][7]);
    for (let i = 9; i <= 14; i++) bit.push(moduli[8][14 - i]);
    return bit;
  };
  const bit = leggiPrimaCopia().reverse();   // dal più significativo
  let valore = 0;
  for (const b of bit) valore = (valore << 1) | b;
  // Il valore letto è mascherato: si toglie 101010000010010, poi si controlla
  // che i resti della divisione per il polinomio generatore siano nulli.
  const miei = valore ^ 0b101010000010010;
  let resto = miei;
  for (let i = 14; i >= 10; i--) if ((resto >>> i) & 1) resto ^= 0b10100110111 << (i - 10);
  return { valore, maschera: (miei >> 10) & 0b111, livello: (miei >> 13) & 0b11, bchValido: resto === 0 };
}

/** Estrae i moduli dei dati nell'ordine a zig-zag e li converte in codeword. */
function leggiCodeword(moduli, lato, versione, maschera) {
  const funzione = mappaFunzione(lato, versione);
  const bit = [];
  let verso = -1;
  for (let colonna = lato - 1; colonna > 0; colonna -= 2) {
    if (colonna === 6) colonna = 5;
    for (let passo = 0; passo < lato; passo++) {
      const riga = verso === -1 ? lato - 1 - passo : passo;
      for (const c of [colonna, colonna - 1]) {
        if (funzione[riga][c]) continue;
        const grezzo = moduli[riga][c];
        bit.push(MASCHERE[maschera](riga, c) ? grezzo ^ 1 : grezzo);
      }
    }
    verso = -verso;
  }
  const codeword = [];
  for (let i = 0; i + 8 <= bit.length; i += 8) {
    let valore = 0;
    for (let j = 0; j < 8; j++) valore = (valore << 1) | bit[i + j];
    codeword.push(valore);
  }
  return codeword;
}

/** Rilegge il testo da una sequenza di codeword di un simbolo a blocco unico. */
function testoDaiCodeword(codeword, versione) {
  const bit = [];
  for (const valore of codeword) for (let i = 7; i >= 0; i--) bit.push((valore >>> i) & 1);
  const prendi = (quanti) => {
    let valore = 0;
    for (let i = 0; i < quanti; i++) valore = (valore << 1) | bit.shift();
    return valore;
  };
  const modo = prendi(4);
  const lunghezza = prendi(versione < 10 ? 8 : 16);
  const byte = [];
  for (let i = 0; i < lunghezza; i++) byte.push(prendi(8));
  return { modo, lunghezza, testo: new TextDecoder().decode(Uint8Array.from(byte)) };
}

// ─────────────────────────── 3. Sindromi di Reed-Solomon ───────────────────────────
const TAB_EXP = new Uint8Array(512);
const TAB_LOG = new Uint8Array(256);
(() => {
  let valore = 1;
  for (let i = 0; i < 255; i++) {
    TAB_EXP[i] = valore;
    TAB_LOG[valore] = i;
    valore <<= 1;
    if (valore & 0x100) valore ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) TAB_EXP[i] = TAB_EXP[i - 255];
})();
const per = (a, b) => (a === 0 || b === 0 ? 0 : TAB_EXP[TAB_LOG[a] + TAB_LOG[b]]);

/** Sindromi di un blocco: se sono tutte nulle la correzione d'errore è coerente. */
function sindromi(blocco, quante) {
  const risultato = [];
  for (let i = 0; i < quante; i++) {
    let valore = 0;
    for (const codice of blocco) valore = per(valore, TAB_EXP[i]) ^ codice;
    risultato.push(valore);
  }
  return risultato;
}

/** Numero di codeword di dati e di correzione per i simboli a blocco unico (livello M). */
const BLOCCO_UNICO = { 1: [16, 10], 2: [28, 16], 3: [44, 26] };

// ─────────────────────────── Esecuzione ───────────────────────────
console.log(`\n╔${"═".repeat(70)}╗`);
console.log("║   MasterRPG · verifica del codificatore QR (qr.js)".padEnd(71) + "║");
console.log(`╚${"═".repeat(70)}╝\n`);

console.log(linea);
console.log("  1. Impronte di riferimento (confronto modulo per modulo)");
console.log(linea);
for (const caso of RIFERIMENTI) {
  const codice = codificaQr(caso.testo, { mascheraForzata: caso.maschera });
  const uguale = impronta(codice.moduli) === caso.impronta;
  const etichetta = caso.testo.length > 34 ? `${caso.testo.slice(0, 31)}… (${caso.testo.length} caratteri)` : caso.testo;
  verifica(
    `${etichetta}`,
    uguale && codice.versione === caso.versione,
    `versione ${codice.versione} · maschera ${caso.maschera} · ${codice.lato}×${codice.lato}`
  );
}

console.log(`\n${linea}`);
console.log("  2. Rilettura indipendente (come fa il telefono che inquadra)");
console.log(linea);
const RILETTURE = ["CIAO", "http://192.168.1.10:3000", "http://localhost:3000", "àèìòù accenti àçé!", "http://192.168.178.123:3000"];
for (const testo of RILETTURE) {
  const codice = codificaQr(testo);
  const formato = leggiFormato(codice.moduli, codice.lato);
  const codeword = leggiCodeword(codice.moduli, codice.lato, codice.versione, formato.maschera);
  const [dati, correzione] = BLOCCO_UNICO[codice.versione] || [null, null];
  let esito = formato.bchValido && formato.livello === 0b00 && formato.maschera === codice.maschera;
  let dettaglio = `versione ${codice.versione} · maschera ${formato.maschera} · ${codice.lato}×${codice.lato}`;
  if (dati) {
    const letto = testoDaiCodeword(codeword.slice(0, dati), codice.versione);
    const sindromiNulle = sindromi(codeword.slice(0, dati + correzione), correzione).every((s) => s === 0);
    esito = esito && letto.testo === testo && letto.modo === 0b0100 && sindromiNulle;
    dettaglio += ` · ${dati} codeword di dati · sindromi nulle: ${sindromiNulle ? "sì" : "no"}`;
  } else {
    // per le versioni a più blocchi si controlla solo la struttura del formato
    esito = esito && codeword.length > 0;
  }
  verifica(`«${testo}»`, esito, dettaglio);
}

console.log(`\n${linea}`);
console.log("  3. Struttura del simbolo e casi limite");
console.log(linea);

// Figure di posizionamento e modulo sempre scuro
const TESTO_ESEMPIO = "http://192.168.178.123:3000/#/gioco";
const esempio = codificaQr(TESTO_ESEMPIO);
const { moduli, lato } = esempio;
let figureOk = lato === esempio.versione * 4 + 17;
for (const [baseRiga, baseColonna] of [[0, 0], [0, lato - 7], [lato - 7, 0]]) {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const bordo = r === 0 || r === 6 || c === 0 || c === 6;
      const centro = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      if (moduli[baseRiga + r][baseColonna + c] !== (bordo || centro ? 1 : 0)) figureOk = false;
    }
  }
}
verifica("Figure di posizionamento e lato del simbolo", figureOk, `${lato} moduli di lato per la versione ${esempio.versione}`);

let sincronizzazioneOk = true;
for (let i = 8; i < lato - 8; i++) {
  const atteso = i % 2 === 0 ? 1 : 0;
  if (moduli[6][i] !== atteso || moduli[i][6] !== atteso) sincronizzazioneOk = false;
}
verifica("Figure di sincronizzazione", sincronizzazioneOk);

verifica("Modulo sempre scuro in basso a sinistra", moduli[lato - 8][8] === 1);

let soloBinari = true;
let copieFormato = 0;
for (const riga of moduli) for (const valore of riga) if (valore !== 0 && valore !== 1) soloBinari = false;
for (const caso of RIFERIMENTI) {
  const codice = codificaQr(caso.testo);
  const a = leggiFormato(codice.moduli, codice.lato);
  // seconda copia: riga 8 a destra e colonna 8 in basso
  const bit = [];
  for (let i = 0; i <= 7; i++) bit.push(codice.moduli[8][codice.lato - 1 - i]);
  for (let i = 8; i <= 14; i++) bit.push(codice.moduli[codice.lato - 15 + i][8]);
  let valore = 0;
  for (const b of bit.slice().reverse()) valore = (valore << 1) | b;
  let resto = valore ^ 0b101010000010010;
  for (let i = 14; i >= 10; i--) if ((resto >>> i) & 1) resto ^= 0b10100110111 << (i - 10);
  if (a.bchValido && resto === 0 && a.valore === valore) copieFormato++;
}
verifica("Moduli tutti binari (0 o 1)", soloBinari);
verifica("Le due copie dell'informazione di formato coincidono", copieFormato === RIFERIMENTI.length, `${copieFormato}/${RIFERIMENTI.length} codici`);

let troppoLungo = false;
try {
  codificaQr("x".repeat(300));
} catch (errore) {
  troppoLungo = /troppo lungo/i.test(errore.message);
}
verifica("Testo troppo lungo rifiutato con messaggio chiaro", troppoLungo);

let svgOk = true;
const svg = qrSvg(TESTO_ESEMPIO, { latoModulo: 4, margine: 2 });
const attesi = (lato + 4) * 4;
if (!svg.startsWith("<svg") || !svg.includes(`width="${attesi}"`) || !svg.includes('fill="#ffffff"')) svgOk = false;
verifica("Disegno SVG ben formato", svgOk, `${(svg.length / 1024).toFixed(1)} kB`);

const disegno = qrTesto(TESTO_ESEMPIO);
const righeAttese = Math.ceil((lato + 4) / 2);
verifica("Disegno per il terminale", disegno.length === righeAttese && disegno.every((r) => r.length === lato + 4), `${disegno.length} righe · ${disegno[0].length} colonne`);

// ─────────────────────────── Riepilogo ───────────────────────────
console.log(`\n${linea}`);
if (fallimenti) {
  console.log(`  ❌ ${fallimenti} controlli su ${controlli} NON superati.`);
  process.exit(1);
}
console.log(`  ✅ Tutti i ${controlli} controlli superati: il codificatore QR è verificato.`);
console.log(`\n  Esempio: QR dell'indirizzo di gioco in rete locale\n`);
for (const riga of qrTesto("http://192.168.1.10:3000", { margine: 1 })) console.log(`      ${riga}`);
console.log("  (questo è il codice che compare anche all'avvio del playtest)\n");
