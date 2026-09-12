# MasterRPG — *Cronache Infinite*

> Un motore di gioco di ruolo narrativo **single-player** in stile *Playable Anime / Light Novel*.
> Interfaccia e contenuti **interamente in italiano**. Zero dipendenze esterne: gira con il solo Node.js.

L'utente sceglie un'ambientazione (o ne inventa una), crea il proprio protagonista e gioca una saga
a capitoli: l'**IA Game Master** scrive un capitolo per volta (150–200 parole), propone 3–4 scelte
rapide e accetta qualsiasi **Azione Personalizzata** scritta liberamente dal giocatore.

---

## 1. Avvio rapido

```bash
node server/index.js          # oppure: npm start
# → http://localhost:3000
```

Nessun `npm install` necessario: il progetto usa **solo moduli nativi Node** (`node:http`, `node:fs`, `fetch`).
È possibile forzare una porta diversa con la variabile d'ambiente `PORT`.

### Motore narrativo: due modalità, zero blocchi

| Modalità | Quando si attiva | Cosa fa |
|---|---|---|
| **`llm`** (IA esterna) | Se è definita `OPENAI_API_KEY` (o `LLM_API_KEY`) | Interroga un endpoint compatibile OpenAI e chiede un JSON narrativo strutturato. |
| **`locale`** (default, offline) | Sempre disponibile come fallback | Il **Motore Narrativo Locale** compone il capitolo in italiano con un generatore procedurale seedato: lessico per ambientazione, battute degli NPC, colpi di scena e delta di stato. |

```bash
# Esempio con un LLM compatibile OpenAI (opzionale)
export OPENAI_API_KEY="sk-..."
export LLM_BASE_URL="https://api.openai.com/v1"   # default
export LLM_MODEL="gpt-4o-mini"                    # default
node server/index.js
```

Se la chiamata al modello fallisce (rete, quota, JSON malformato) il sistema **non si blocca mai**:
degrada automaticamente sul motore locale e lo segnala nell'interfaccia.

---

## 2. Le quattro funzionalità richieste

1. **Interfaccia e motore di gioco (Single-Player Master)** — scelta dell'ambientazione dai preset o
   tramite testo libero; generazione di un capitolo per volta con scenario, dialoghi NPC e cliffhanger;
   3–4 scelte rapide + campo *Azione Personalizzata* (`public/index.html`, `server/motore/`).
2. **State Engine (memoria a lungo termine)** — pannello sempre accessibile **“Scheda del Personaggio e
   Storia”**: protagonista, inventario, relazioni con gli NPC, sinossi dei capitoli. Ad ogni nuovo prompt
   queste variabili vengono **iniettate implicitamente** nel contesto del Game Master
   (`server/stato/memoria.js` + `server/motore/prompt.js`), ed è possibile ispezionarle dal pulsante
   *“Memoria iniettata”*.
3. **Token Storia (crediti interni)** — bonus di benvenuto **1000**, costo **10 Token per capitolo**,
   pulsante **“Ottieni 500 Crediti Gratuiti”** che simula una missione giornaliera; una *Ricarica
   d'Emergenza* si sblocca sempre quando il saldo scende sotto il costo di un capitolo, così il gioco
   **non si blocca mai** (`server/crediti/portafoglio.js`).
4. **Localizzazione e stile** — tutta la UI e tutti i testi generati sono in italiano, con registro da
   light novel / anime: enfasi emotiva, dialoghi espressivi, colpi di scena a fine capitolo.

---

## 3. Struttura del progetto

```
masterRPG/
├── server/
│   ├── index.js                 # server HTTP zero-dipendenze: statici + API REST
│   ├── api.js                   # rotte REST
│   ├── motore/
│   │   ├── narratore.js         # orchestratore: provider, validazione, applicazione stato
│   │   ├── prompt.js            # costruzione del prompt del Game Master (iniezione memoria)
│   │   ├── provider_llm.js      # client OpenAI-compatibile (opzionale)
│   │   ├── motore_locale.js     # generatore narrativo procedurale italiano (fallback offline)
│   │   ├── lessico.js           # banche lessicali per ambientazione + stile anime
│   │   └── schema.js            # normalizzazione/validazione del capitolo
│   ├── stato/
│   │   ├── modello.js           # creazione e mutazione dello stato di partita
│   │   ├── memoria.js           # State Engine: sinossi, relazioni, inventario, digest
│   │   └── archivio.js          # persistenza su file JSON (dati/partite/*.json)
│   └── crediti/
│       └── portafoglio.js       # Token Storia: bonus, spesa, ricarica gratuita
├── public/                      # interfaccia (nessun build step)
│   ├── index.html
│   ├── css/style.css
│   └── js/{app,api,setup,capitolo,scheda,portafoglio}.js
├── strumenti/                   # collaudi automatici e verifica statica
│   ├── prova-motore.js          # 100+ capitoli: vincoli, crediti, memoria
│   ├── prova-interfaccia.js     # flusso di gioco completo (richiede jsdom)
│   ├── prova-anticrisi.js       # garanzia anti-blocco con saldo esaurito
│   └── verifica-html.js         # contratto fra HTML e JavaScript
└── docs/                        # modellazione dei flussi e architettura
    ├── 01-flussi-di-lavoro.md
    ├── 02-architettura.md
    └── 03-modello-dati.md
```

Documentazione dei flussi: **[`docs/01-flussi-di-lavoro.md`](docs/01-flussi-di-lavoro.md)**.

---

## 4. API REST

| Metodo | Rotta | Descrizione |
|---|---|---|
| `GET` | `/api/config` | Modalità motore attiva, costo per capitolo, regole crediti, catalogo ambientazioni. |
| `POST` | `/api/partite` | Crea una saga (ambientazione/preset o personalizzata, protagonista, tono). Accredita il bonus. |
| `GET` | `/api/partite` | Elenco delle saghe salvate. |
| `GET` | `/api/partite/:id` | Stato completo della partita. |
| `POST` | `/api/partite/:id/capitolo` | Genera il capitolo successivo (costo 10 Token Storia). |
| `POST` | `/api/partite/:id/ricarica` | Ricarica rapida gratuita: `{ modalita: "missione" \| "spot" \| "emergenza" }`. |
| `GET` | `/api/partite/:id/memoria` | Digest della memoria iniettata nel prompt (trasparenza dello State Engine). |
| `GET` | `/api/partite/:id/esporta` | Esporta la saga completa in Markdown. |
| `DELETE` | `/api/partite/:id` | Elimina una saga. |

---

## 5. Collaudi automatici

Il gioco non ha dipendenze, ma include una suite di verifica che ne dimostra il funzionamento.

```bash
npm start                    # in un terminale: avvia il gioco

npm run prova                # 100 capitoli di fila: lunghezza 150-200 parole,
                             # 3-4 scelte, dialoghi bilanciati, sinossi, crediti,
                             # ricarica d'emergenza, riavvio del gioco dopo il saldo zero
npm run verifica             # controllo statico del contratto fra HTML e JavaScript
```

Collaudi dell'interfaccia (richiedono la dipendenza opzionale `jsdom`, mai necessaria per giocare):

```bash
npm install --no-save jsdom
npm run prova:interfaccia    # gioca una saga intera pilotando l'interfaccia reale
npm run prova:anticrisi      # saldo a 5 Token: la Ricarica d'Emergenza sblocca il gioco
```

Esito dell'ultima esecuzione — saga di 150 capitoli generata in 2 secondi:

| Controllo | Esito |
|---|---|
| Capitoli conformi (150-200 parole, 3-4 scelte, virgolette bilanciate) | 1076/1076 verifiche superate |
| Statistiche del testo | 27 818 parole, 459 battute di dialogo, 5 NPC, 6 luoghi |
| Saldo esaurito al capitolo 101 | Ricarica d'Emergenza gratuita, la storia riprende subito |
| Memoria a lungo termine | 600 capitoli → 9 voci di sinossi, digest di 2,2 KB iniettato nel prompt |

---

## 6. Prossimi passi possibili

- Illustrazioni di scena generate a partire dal capitolo (apertura immagine + prompt visivo).
- Narrazione vocale dei capitoli (TTS) con voce per ogni NPC.
- Diario relazionale evoluto: albero di fiducia, eventi passati per NPC, “scheda nemico”.
- Multi-saga con universo condiviso (personaggi ricorrenti tra partite diverse).
