/**
 * qr.js — Codificatore QR in miniatura, senza dipendenze.
 *
 * Serve a mostrare nel terminale un codice QR dell'indirizzo del gioco, così
 * chi prova può inquadrarlo col telefono invece di digitare un indirizzo IP.
 *
 * Supporta il modo "byte" (UTF-8) e le versioni da 1 a 10 con correzione
 * d'errore di livello M: copre qualunque indirizzo `http://…` ragionevole
 * (fino a 213 caratteri) e resta leggibile anche con una foto storta.
 *
 * Il disegno usa i caratteri a mezzo blocco (▀ ▄ █ e spazio): due moduli per
 * riga di testo, quindi il codice resta compatto e quadrato.
 *
 * L'implementazione è verificata dallo strumento `prova-qr.js`, che confronta
 * modulo per modulo la matrice prodotta qui con quella di una libreria di
 * riferimento: se i due disegni coincidono, il codice è corretto.
 */

// ─────────────────────────── Tabelle della norma ISO/IEC 18004 ──────────────

/** Codeword totali per versione (indice 0 = versione 1). */
const CODEWORD_TOTALI = [26, 44, 70, 100, 134, 172, 196, 242, 292, 346];

/**
 * Blocchi di correzione d'errore per versione, livello M:
 * [codeword di dati per blocco del gruppo 1, numero di blocchi del gruppo 1,
 *  codeword di dati per blocco del gruppo 2 (0 se assente), numero di blocchi
 *  del gruppo 2, codeword di correzione per blocco]
 */
const BLOCCHI_M = [
  [16, 1, 0, 0, 10],
  [28, 1, 0, 0, 16],
  [44, 1, 0, 0, 26],
  [32, 2, 0, 0, 18],
  [43, 2, 0, 0, 24],
  [27, 4, 0, 0, 16],
  [31, 4, 0, 0, 18],
  [38, 2, 39, 2, 22],
  [36, 3, 37, 2, 22],
  [43, 4, 44, 1, 26]
];

/** Centri delle figure di allineamento per versione (indice 0 = versione 1). */
const ALLINEAMENTO = [
  [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]
];

/** Livello di correzione d'errore M = 00 (nella codifica dei 15 bit di formato). */
const LIVELLO_M = 0b00;

// ─────────────────────────── Aritmetica di Galois (GF 256) ───────────────────────────
const TABELLA_EXP = new Uint8Array(512);
const TABELLA_LOG = new Uint8Array(256);
(() => {
  let valore = 1;
  for (let i = 0; i < 255; i++) {
    TABELLA_EXP[i] = valore;
    TABELLA_LOG[valore] = i;
    valore <<= 1;
    if (valore & 0x100) valore ^= 0x11d;   // polinomio primitivo x^8+x^4+x^3+x^2+1
  }
  for (let i = 255; i < 512; i++) TABELLA_EXP[i] = TABELLA_EXP[i - 255];
})();

const moltiplica = (a, b) => (a === 0 || b === 0 ? 0 : TABELLA_EXP[TABELLA_LOG[a] + TABELLA_LOG[b]]);

/** Polinomio generatore di Reed-Solomon di grado `grado`. */
function generatore(grado) {
  let polinomio = [1];
  for (let i = 0; i < grado; i++) {
    const nuovo = new Array(polinomio.length + 1).fill(0);
    for (let j = 0; j < polinomio.length; j++) {
      nuovo[j] ^= polinomio[j];
      nuovo[j + 1] ^= moltiplica(polinomio[j], TABELLA_EXP[i]);
    }
    polinomio = nuovo;
  }
  return polinomio;
}

/** Calcola le codeword di correzione per un blocco di dati. */
function correzione(dati, quante) {
  const generatorePolinomio = generatore(quante);
  const resto = new Uint8Array(dati.length + quante);
  resto.set(dati);
  for (let i = 0; i < dati.length; i++) {
    const fattore = resto[i];
    if (!fattore) continue;
    for (let j = 1; j < generatorePolinomio.length; j++) {
      resto[i + j] ^= moltiplica(generatorePolinomio[j], fattore);
    }
  }
  return resto.slice(dati.length);
}

// ─────────────────────────── Bits, formato e versione ───────────────────────────
function creaBit() {
  const bit = [];
  return {
    bit,
    aggiungi(valore, quanti) {
      for (let i = quanti - 1; i >= 0; i--) bit.push((valore >>> i) & 1);
    },
    lunghezza() { return bit.length; }
  };
}

/** BCH(15,5) dei 15 bit di formato, poi maschera 0x5412. */
function formato(maschera) {
  const dati = (LIVELLO_M << 3) | maschera;
  let resto = dati << 10;
  for (let i = 14; i >= 10; i--) {
    if ((resto >>> i) & 1) resto ^= 0b10100110111 << (i - 10);
  }
  return (((dati << 10) | resto) ^ 0b101010000010010) & 0x7fff;
}

/** BCH(18,6) dei bit di versione (solo dalla versione 7 in poi). */
function informazioneVersione(versione) {
  let resto = versione << 12;
  for (let i = 17; i >= 12; i--) {
    if ((resto >>> i) & 1) resto ^= 0x1f25 << (i - 12);   // x^12+x^11+x^10+x^9+x^8+x^5+x^2+1
  }
  return ((versione << 12) | resto) & 0x3ffff;
}

// ─────────────────────────── Costruzione della matrice ───────────────────────────
/** Sceglie la versione più piccola che contiene i dati (livello M). */
function scegliVersione(numeroByte) {
  for (let versione = 1; versione <= 10; versione++) {
    const capacita = BLOCCHI_M[versione - 1];
    const datiTotali = capacita[0] * capacita[1] + capacita[2] * capacita[3];
    const bitNecessari = 4 + (versione < 10 ? 8 : 16) + numeroByte * 8;
    if (bitNecessari <= datiTotali * 8) return versione;
  }
  throw new Error(`Testo troppo lungo per il codice QR (${numeroByte} byte, massimo 213).`);
}

/** Costruisce la sequenza di codeword: dati + correzione, intercalati. */
function codeword(byte, versione) {
  const [dati1, blocchi1, dati2, blocchi2, ecPerBlocco] = BLOCCHI_M[versione - 1];
  const datiTotali = dati1 * blocchi1 + dati2 * blocchi2;

  const flusso = creaBit();
  flusso.aggiungi(0b0100, 4);                              // modo byte
  flusso.aggiungi(byte.length, versione < 10 ? 8 : 16);    // numero di caratteri
  for (const valore of byte) flusso.aggiungi(valore, 8);

  // Terminatore, allineamento al byte, riempimento 0xEC / 0x11
  const capacitaBit = datiTotali * 8;
  for (let i = 0; i < 4 && flusso.lunghezza() < capacitaBit; i++) flusso.bit.push(0);
  while (flusso.lunghezza() % 8 !== 0) flusso.bit.push(0);
  const riempimento = [0xec, 0x11];
  for (let i = 0; flusso.lunghezza() < capacitaBit; i++) flusso.aggiungi(riempimento[i % 2], 8);

  // Codeword di dati
  const dati = [];
  for (let i = 0; i < flusso.bit.length; i += 8) {
    let valore = 0;
    for (let j = 0; j < 8; j++) valore = (valore << 1) | flusso.bit[i + j];
    dati.push(valore);
  }

  // Divisione in blocchi, correzione, intercalatura
  const blocchi = [];
  let posizione = 0;
  for (let i = 0; i < blocchi1; i++) {
    const datiBlocco = dati.slice(posizione, posizione + dati1);
    posizione += dati1;
    blocchi.push({ dati: datiBlocco, ec: correzione(datiBlocco, ecPerBlocco) });
  }
  for (let i = 0; i < blocchi2; i++) {
    const datiBlocco = dati.slice(posizione, posizione + dati2);
    posizione += dati2;
    blocchi.push({ dati: datiBlocco, ec: correzione(datiBlocco, ecPerBlocco) });
  }

  const risultato = [];
  const massimoDati = Math.max(dati1, dati2 || 0);
  for (let i = 0; i < massimoDati; i++) {
    for (const blocco of blocchi) if (i < blocco.dati.length) risultato.push(blocco.dati[i]);
  }
  for (let i = 0; i < ecPerBlocco; i++) {
    for (const blocco of blocchi) risultato.push(blocco.ec[i]);
  }
  return risultato;
}

/** Crea la matrice dei moduli per una versione, con le figure fisse. */
function matriceBase(versione) {
  const lato = versione * 4 + 17;
  const moduli = Array.from({ length: lato }, () => new Array(lato).fill(null));
  const riservato = Array.from({ length: lato }, () => new Array(lato).fill(false));

  const segna = (riga, colonna, valore) => {
    if (riga < 0 || colonna < 0 || riga >= lato || colonna >= lato) return;
    moduli[riga][colonna] = valore;
    riservato[riga][colonna] = true;
  };

  // Figure di posizionamento (7×7) negli angoli
  for (const [baseRiga, baseColonna] of [[0, 0], [0, lato - 7], [lato - 7, 0]]) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const dentro = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const bordo = r === 0 || r === 6 || c === 0 || c === 6;
        const centro = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        segna(baseRiga + r, baseColonna + c, dentro && (bordo || centro) ? 1 : 0);
      }
    }
  }

  // Figure di sincronizzazione
  for (let i = 8; i < lato - 8; i++) {
    const valore = i % 2 === 0 ? 1 : 0;
    segna(6, i, valore);
    segna(i, 6, valore);
  }

  // Figure di allineamento
  const centri = ALLINEAMENTO[versione - 1];
  for (const riga of centri) {
    for (const colonna of centri) {
      // Non si sovrappongono alle figure di posizionamento
      if ((riga === 6 && colonna === 6) || (riga === 6 && colonna === lato - 7) || (riga === lato - 7 && colonna === 6)) continue;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const bordo = Math.abs(r) === 2 || Math.abs(c) === 2;
          const centro = r === 0 && c === 0;
          segna(riga + r, colonna + c, bordo || centro ? 1 : 0);
        }
      }
    }
  }

  // Zone riservate per l'informazione di formato, poi il modulo sempre scuro
  for (let i = 0; i < 9; i++) {
    if (i !== 6) { segna(8, i, 0); segna(i, 8, 0); }
  }
  for (let i = 0; i < 8; i++) {
    segna(8, lato - 1 - i, 0);
    segna(lato - 1 - i, 8, 0);
  }
  segna(lato - 8, 8, 1);
  if (versione >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        segna(lato - 11 + j, i, 0);
        segna(i, lato - 11 + j, 0);
      }
    }
  }

  return { lato, moduli, riservato, segna };
}

/** Posiziona i dati nella matrice con la lettura a zig-zag prevista dalla norma. */
function posizionaDati(base, codewords) {
  const { lato, moduli, riservato } = base;
  let indice = 0;
  let verso = -1;   // si sale
  for (let colonna = lato - 1; colonna > 0; colonna -= 2) {
    if (colonna === 6) colonna = 5;   // la colonna di sincronizzazione si salta
    for (let passo = 0; passo < lato; passo++) {
      const riga = verso === -1 ? lato - 1 - passo : passo;
      for (const c of [colonna, colonna - 1]) {
        if (riservato[riga][c]) continue;
        const valore = indice < codewords.length * 8
          ? (codewords[indice >> 3] >>> (7 - (indice & 7))) & 1
          : 0;
        moduli[riga][c] = valore;
        indice++;
      }
    }
    verso = -verso;
  }
}

/** Applica una maschera a un modulo. */
function maschera(indice, riga, colonna) {
  switch (indice) {
    case 0: return (riga + colonna) % 2 === 0;
    case 1: return riga % 2 === 0;
    case 2: return colonna % 3 === 0;
    case 3: return (riga + colonna) % 3 === 0;
    case 4: return (Math.floor(riga / 2) + Math.floor(colonna / 3)) % 2 === 0;
    case 5: return ((riga * colonna) % 2) + ((riga * colonna) % 3) === 0;
    case 6: return (((riga * colonna) % 2) + ((riga * colonna) % 3)) % 2 === 0;
    default: return (((riga + colonna) % 2) + ((riga * colonna) % 3)) % 2 === 0;
  }
}

/** Punteggio di penalità della maschera (quattro regole della norma). */
function penalita(moduli, lato) {
  let punti = 0;

  // Regola 1: cinque o più moduli uguali in fila
  const sequenze = (leggi) => {
    for (let a = 0; a < lato; a++) {
      let precedente = -1;
      let lunghezza = 0;
      for (let b = 0; b < lato; b++) {
        const valore = leggi(a, b);
        if (valore === precedente) {
          lunghezza++;
        } else {
          if (lunghezza >= 5) punti += 3 + (lunghezza - 5);
          precedente = valore;
          lunghezza = 1;
        }
      }
      if (lunghezza >= 5) punti += 3 + (lunghezza - 5);
    }
  };
  sequenze((a, b) => moduli[a][b]);
  sequenze((a, b) => moduli[b][a]);

  // Regola 2: blocchi 2×2 dello stesso colore
  for (let r = 0; r < lato - 1; r++) {
    for (let c = 0; c < lato - 1; c++) {
      const v = moduli[r][c];
      if (v === moduli[r][c + 1] && v === moduli[r + 1][c] && v === moduli[r + 1][c + 1]) punti += 3;
    }
  }

  // Regola 3: figure 1:1:3:1:1 che somigliano alle figure di posizionamento
  const cerca = (leggi) => {
    for (let a = 0; a < lato; a++) {
      for (let b = 0; b <= lato - 11; b++) {
        const pezzo = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => leggi(a, b + i)).join("");
        if (pezzo === "10111010000" || pezzo === "00001011101") punti += 40;
      }
    }
  };
  cerca((a, b) => moduli[a][b]);
  cerca((a, b) => moduli[b][a]);

  // Regola 4: sbilanciamento fra moduli scuri e chiari
  let scuri = 0;
  for (let r = 0; r < lato; r++) for (let c = 0; c < lato; c++) scuri += moduli[r][c];
  const percentuale = (scuri * 100) / (lato * lato);
  punti += Math.floor(Math.abs(percentuale - 50) / 5) * 10;

  return punti;
}

/** Scrive i 15 bit di formato e gli eventuali 18 bit di versione. */
function scriviFormato(base, mascheraScelta) {
  const { lato, segna } = base;
  const bitFormato = formato(mascheraScelta);
  const leggi = (i) => (bitFormato >>> i) & 1;

  // Prima copia: colonna 8 dall'alto, poi riga 8 da sinistra
  for (let i = 0; i <= 5; i++) segna(i, 8, leggi(i));
  segna(7, 8, leggi(6));
  segna(8, 8, leggi(7));
  segna(8, 7, leggi(8));
  for (let i = 9; i <= 14; i++) segna(8, 14 - i, leggi(i));

  // Seconda copia: riga 8 a destra e colonna 8 in basso
  for (let i = 0; i <= 7; i++) segna(8, lato - 1 - i, leggi(i));
  for (let i = 8; i <= 14; i++) segna(lato - 15 + i, 8, leggi(i));

  // Informazione di versione (dalla 7 in poi)
  if (base.versione >= 7) {
    const bitVersione = informazioneVersione(base.versione);
    for (let i = 0; i < 18; i++) {
      const valore = (bitVersione >>> i) & 1;
      const riga = Math.floor(i / 3);
      const colonna = i % 3;
      segna(riga, lato - 11 + colonna, valore);
      segna(lato - 11 + colonna, riga, valore);
    }
  }
}

/**
 * Codifica un testo in una matrice QR.
 * Restituisce `{ lato, moduli, versione, maschera }`.
 */
export function codificaQr(testo, { mascheraForzata = null, versioneForzata = null } = {}) {
  const byte = [...new TextEncoder().encode(String(testo))];
  const versione = versioneForzata || scegliVersione(byte.length);
  const parole = codeword(byte, versione);

  let migliore = null;
  const maschereDaProvare = mascheraForzata === null ? [0, 1, 2, 3, 4, 5, 6, 7] : [mascheraForzata];
  for (const indiceMaschera of maschereDaProvare) {
    const base = matriceBase(versione);
    base.versione = versione;
    posizionaDati(base, parole);

    // Maschera applicata ai soli moduli dei dati
    for (let r = 0; r < base.lato; r++) {
      for (let c = 0; c < base.lato; c++) {
        if (!base.riservato[r][c] && maschera(indiceMaschera, r, c)) base.moduli[r][c] ^= 1;
      }
    }
    scriviFormato(base, indiceMaschera);

    const punti = penalita(base.moduli, base.lato);
    if (!migliore || punti < migliore.punti) {
      migliore = { punti, moduli: base.moduli, maschera: indiceMaschera };
    }
  }

  return { lato: versione * 4 + 17, moduli: migliore.moduli, versione, maschera: migliore.maschera };
}

/**
 * Disegna il codice QR per il terminale con i caratteri a mezzo blocco:
 * ogni riga di testo contiene due righe di moduli.
 */
export function qrTesto(testo, { margine = 2 } = {}) {
  const { moduli, lato } = codificaQr(testo);
  const righe = [];

  for (let riga = -margine; riga < lato + margine; riga += 2) {
    let linea = "";
    for (let colonna = -margine; colonna < lato + margine; colonna++) {
      const sopra = riga >= 0 && riga < lato && colonna >= 0 && colonna < lato ? moduli[riga][colonna] : 0;
      const sotto = riga + 1 >= 0 && riga + 1 < lato && colonna >= 0 && colonna < lato ? moduli[riga + 1][colonna] : 0;
      // ▀ alto, ▄ basso, █ entrambi, spazio nessuno. Il QR ha i moduli scuri
      // dove il valore è 1: sul terminale scuro i blocchi pieni sono i moduli 1.
      if (sopra && sotto) linea += "█";
      else if (sopra) linea += "▀";
      else if (sotto) linea += "▄";
      else linea += " ";
    }
    righe.push(linea);
  }
  return righe;
}

/** Il codice QR come disegno SVG (utile per le pagine e i documenti). */
export function qrSvg(testo, { margine = 2, latoModulo = 4 } = {}) {
  const { moduli, lato } = codificaQr(testo);
  const dimensione = (lato + margine * 2) * latoModulo;
  const quadrati = [];
  for (let r = 0; r < lato; r++) {
    for (let c = 0; c < lato; c++) {
      if (moduli[r][c]) {
        quadrati.push(`<rect x="${(c + margine) * latoModulo}" y="${(r + margine) * latoModulo}" width="${latoModulo}" height="${latoModulo}"/>`);
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensione}" height="${dimensione}" viewBox="0 0 ${dimensione} ${dimensione}" role="img" aria-label="Codice QR per ${testo}"><rect width="${dimensione}" height="${dimensione}" fill="#ffffff"/><g fill="#000000">${quadrati.join("")}</g></svg>`;
}
