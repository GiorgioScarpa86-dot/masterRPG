# 03 — Modello dati

Tutto lo stato di una partita vive in un unico documento JSON salvato in `dati/partite/{id}.json`.

## 1. Documento `Partita`

```jsonc
{
  "id": "saga_9f3c1a",
  "creataIl": "2026-09-12T09:30:00.000Z",
  "aggiornataIl": "2026-09-12T10:02:11.000Z",

  "configurazione": {
    "titoloSaga": "Le Cronache di Aetheria",
    "ambientazione": {
      "id": "fantasy",                 // fantasy | scifi | cyberpunk | accademia | postapoc | mistero | personalizzata
      "nome": "Fantasy Isekai",
      "personalizzata": false,
      "descrizione": "Un regno di magia, gilde e antiche profezie.",
      "testoUtente": "",               // popolato solo per l'ambientazione personalizzata
      "paroleChiave": ["magia", "gilda"]  // estratte dal testo libero, guidano il motore locale
    },
    "tono": "epico",                   // epico | romantico | cupo | comico
    "protagonista": {
      "nome": "Rei",
      "archetipo": "Spadaccino Errante",
      "tratto": "Impulsivo"
    }
  },

  "stato": {
    "capitolo": 3,                     // capitoli già generati
    "luogo": "Bosco di Aster",
    "momento": "Crepuscolo",
    "vitali": { "vita": 92, "energia": 74, "tensione": 38 },
    "inventario": [
      { "nome": "Frammento di Specchio", "descrizione": "Vibra quando il Marchio brucia.",
        "rarita": "raro", "capitolo": 2 }
    ],
    "relazioni": [
      { "npc": "Mira", "ruolo": "Alleata", "fiducia": 62,
        "nota": "Ti ha salvato nella foresta.", "ultimoIncontro": 3,
        "aspetto": "ragazza dai capelli color neve", "tic": "sorride prima di mentire" }
    ],
    "sinossi": [ { "capitolo": 1, "testo": "Ti sei risvegliato nel Bosco di Aster senza ricordi." } ],
    "obiettivi": [ { "testo": "Scoprire l'origine del Marchio", "stato": "aperto" } ],
    "luoghiVisitati": ["Bosco di Aster", "Rovine di Lumen"],
    "titoli": [ "Il Risveglio", "Il Marchio", "Il Sussurro della Lama di Vetro" ],
    "arco": { "nome": "Risveglio del Marchio", "beat": "confronto", "capitoloBeat": 2 },
    "ultimaScelta": "Ho chiamato Mira per nome chiedendole la verità",
    "contatori": { "combattimenti": 1, "dialoghi": 4, "scoperte": 2 }
  },

  "economia": {
    "valuta": "Token Storia",
    "saldo": 940,
    "costoCapitolo": 10,
    "bonusBenvenuto": 1000,
    "ricaricaQuantita": 500,
    "spesoTotale": 60,
    "guadagnatoTotale": 1000,
    "missioneGiornaliera": { "ultima": "2026-09-12T09:30:00.000Z", "usataOggi": true, "completateOggi": 1 },
    "spotFittizio":       { "ultima": null, "completati": 0 },
    "movimenti": [
      { "tipo": "bonus",    "importo": 1000, "causale": "Bonus di benvenuto", "data": "2026-09-12T09:30:00.000Z", "saldoDopo": 1000 },
      { "tipo": "spesa",    "importo": -10,  "causale": "Capitolo 1 generato", "data": "2026-09-12T09:31:02.000Z", "saldoDopo": 990 }
    ]
  },

  "storia": [
    {
      "numero": 1,
      "titolo": "Il Risveglio",
      "testo": "…capitolo completo, 150-200 parole…",
      "opzioni": [ { "id": "op1", "tipo": "prudente", "etichetta": "…" } ],
      "azioneGiocatore": { "tipo": "scelta", "testo": "…", "opzioneId": "op2", "tipoScelta": "audace" },
      "deltaStato": { "inventario": [], "relazioni": [], "vitali": { "vita": 0, "energia": -4, "tensione": 6 } },
      "provenienza": "locale",
      "parole": 176,
      "creatoIl": "2026-09-12T09:31:02.000Z"
    }
  ],

  "memoria": {
    "riassuntoCompresso": "Rei si è risvegliato senza ricordi nel Bosco di Aster…",
    "paroleTotali": 528,
    "capitoliRiassunti": 3
  }
}
```

## 2. Oggetti di supporto

### `AzioneGiocatore`
```jsonc
{ "tipo": "scelta" | "libera",
  "testo": "Ho chiamato Mira per nome",
  "opzioneId": "op3",              // solo per tipo "scelta"
  "tipoScelta": "empatica" }       // prudente | audace | astuta | empatica
```

### `Movimento` (estratto conto Token Storia)
```jsonc
{ "tipo": "bonus" | "spesa" | "ricarica",
  "importo": 500,                  // positivo in accredito, negativo in addebito
  "causale": "Missione giornaliera completata",
  "data": "2026-09-12T11:00:00.000Z",
  "saldoDopo": 1440 }
```

### `VoceRelazione`
```jsonc
{ "npc": "Kael", "ruolo": "Rivale", "fiducia": 20,
  "nota": "Ti accusa del furto del sigillo.",
  "aspetto": "uomo dai capelli di cenere", "tic": "serra la mascella prima di attaccare",
  "ultimoIncontro": 2 }
```

## 3. Invarianti garantite dal server

1. `saldo ≥ 0` sempre; nessun saldo negativo ammesso.
2. Un capitolo si genera **solo** se `saldo ≥ costoCapitolo`, oppure dopo una ricarica d'emergenza.
3. `stato.capitolo === storia.length` (nessun buco nella numerazione).
4. Ogni voce di `storia` ha un `titolo`, un `testo` non vuoto e da 3 a 4 `opzioni`.
5. `relazioni` è priva di duplicati: gli NPC sono identificati dal nome.
6. `inventario` è privo di duplicati: aggiungere un oggetto già posseduto incrementa la quantità.
7. `movimenti` è ordinato cronologicamente e contiene almeno il bonus di benvenuto.
8. Ogni partita salvata è autosufficiente: il file può essere copiato su un'altra macchina e ripreso.
