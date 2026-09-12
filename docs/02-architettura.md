# 02 — Architettura tecnica

## 1. Stack

| Livello | Scelta | Motivazione |
|---|---|---|
| Runtime | Node.js ≥ 18 | `fetch` globale per il provider LLM, ESM nativo |
| Server | `node:http` puro | Zero dipendenze: nessun `npm install`, avvio istantaneo, nessun rischio di supply chain |
| Frontend | HTML + CSS + JavaScript ES Modules | Nessun build step, ricarica immediata, facile da ispezionare |
| Persistenza | File JSON con scrittura atomica | Nessun database da installare; i salvataggi sono leggibili e versionabili a mano |
| IA narrativa | Provider OpenAI-compatibile *oppure* Motore Locale | Funziona sempre, anche offline; costo zero per default |

## 2. Mappa dei moduli

```
server/index.js ─────────── server HTTP, routing statico, gestione errori, avvio
   └── server/api.js ────── rotte REST, validazione input, codici di stato
        ├── server/crediti/portafoglio.js ── Token Storia (bonus, spesa, ricariche, estratto conto)
        ├── server/stato/archivio.js ─────── CRUD partite su disco
        ├── server/stato/modello.js ──────── creazione/mutazione dello stato
        ├── server/stato/memoria.js ──────── digest di memoria + sinossi + relazioni
        └── server/motore/narratore.js ───── orchestrazione della generazione
             ├── server/motore/prompt.js ───────── prompt del Game Master (italiano)
             ├── server/motore/provider_llm.js ── chiamata all'LLM esterno
             ├── server/motore/motore_locale.js ─ generatore procedurale offline
             ├── server/motore/lessico.js ─────── banche lessicali per ambientazione
             └── server/motore/schema.js ──────── normalizzazione e vincoli di output
```

## 3. Contratto del capitolo generato

Qualunque sia il provider, il narratore produce e valida sempre la stessa struttura:

```json
{
  "numero": 3,
  "titolo": "Il Sussurro della Lama di Vetro",
  "testo": "…150-200 parole in italiano, stile light novel…",
  "opzioni": [
    { "id": "op1", "tipo": "prudente", "etichetta": "Tornare sui tuoi passi e studiare le rune" },
    { "id": "op2", "tipo": "audace",   "etichetta": "Sguainare la lama e sfidare lo sconosciuto" },
    { "id": "op3", "tipo": "astuta",   "etichetta": "Fingere di non averlo visto e tendere una trappola" },
    { "id": "op4", "tipo": "empatica", "etichetta": "Chiamarlo per nome e chiedergli la verità" }
  ],
  "deltaStato": {
    "inventario": [{ "nome": "Frammento di Specchio", "descrizione": "…", "rarita": "raro" }],
    "relazioni": [{ "npc": "Mira", "ruolo": "Alleata", "fiducia": 62, "nota": "…" }],
    "vitali": { "vita": -8, "energia": -12, "tensione": 14 },
    "oggettiPersi": [],
    "obiettivo": "Scoprire l'origine del Marchio",
    "sinossi": "Nel bosco di Aster hai incontrato Mira e il suo segreto è emerso."
  },
  "provenienza": "locale",        // oppure "llm:gpt-4o-mini"
  "note": "degradazione automatica dal provider esterno"
}
```

`schema.js` normalizza l'output: garantisce 150–200 parole (o ne segnala lo scostamento), 3–4 opzioni,
id univoci, valori numerici entro i limiti e delta coerenti con lo stato esistente.

## 4. Prompt del Game Master (estratto)

Il prompt di sistema è interamente in italiano e impone il formato JSON. La parte di **iniezione della
memoria** è generata da `memoria.js`:

```
=== SCHEDA DEL PERSONAGGIO ===
Protagonista: Rei — Spadaccino Errante (Impulsivo)
Vitali: Vita 92/100 · Energia 74/100 · Tensione 38/100
Inventario: Frammento di Specchio (raro), Razione secca x2, Spada di legno
=== RELAZIONI ===
Mira — Alleata · fiducia 62 · ti ha salvato nella foresta
Kael — Rivale · fiducia 20 · ti accusa del furto del sigillo
=== SINOSSI DELLA STORIA (canonica) ===
Cap. 1 — Ti sei risvegliato nel Bosco di Aster senza ricordi.
Cap. 2 — Mira ti ha rivelato l'esistenza del Marchio.
=== OBIETTIVI APERTI ===
Scoprire l'origine del Marchio
```

Regole impartite al modello: continuità canonica, coerenza dei ruoli relazionali, uso esclusivo degli
oggetti posseduti, cliffhanger finale, 150–200 parole, italiano corretto, registro anime/light novel.

## 5. Gestione degli errori (principio: mai bloccare il giocatore)

| Situazione | Comportamento |
|---|---|
| Saldo insufficiente | `402` con payload di ricarica; la UI apre la Ricarica d'Emergenza (+500 garantiti) |
| LLM non configurato | Motore locale, nessun errore visibile |
| Errore/timeout LLM | Fallback automatico sul motore locale + nota di provenienza nel capitolo |
| JSON LLM malformato | Tentativo di riparazione (`schema.js`), poi fallback locale |
| Azione personalizzata vuota | Validazione client+server, messaggio in italiano, nessuna spesa di Token |
| Salvataggio corrotto | Il file viene isolato e la partita marcata come non recuperabile, senza crash |

## 6. Sicurezza e privacy

- Nessuna credenziale richiesta all'utente: l'eventuale chiave LLM vive solo nelle variabili d'ambiente
  del server e non viene mai esposta al browser.
- Nessun dato personale: si conservano unicamente contenuti narrativi inventati.
- Le rotte sono validate (tipi, lunghezze, id) e gli id di partita sono generati dal server.
