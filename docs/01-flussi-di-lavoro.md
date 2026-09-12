# 01 — Modellazione dei flussi di lavoro

**MasterRPG / Cronache Infinite** — gioco di ruolo narrativo single-player in stile *Playable Anime*.
Questo documento descrive la **struttura logica** dell'applicazione prima del codice: attori, stati,
flussi principali e regole di business.

---

## 1. Visione d'insieme

```
                        ┌───────────────────────────────────────────────┐
                        │              GIOCATORE (1 solo)               │
                        └───────────────┬───────────────────────────────┘
                                        │ sceglie / scrive / clicca
┌───────────────────────────────────────▼───────────────────────────────────────┐
│                          INTERFACCIA (Single Page App)                        │
│  Setup Saga  ·  Lettore Capitolo  ·  Scelte Rapide  ·  Azione Personalizzata   │
│  Scheda del Personaggio e Storia  ·  Portafoglio Token Storia  ·  Diario       │
└───────────────┬───────────────────────────────────────────────┬───────────────┘
                │ richieste REST relative                        │ lettura stato
┌───────────────▼───────────────────────────────────────────────▼───────────────┐
│                              API REST (Node.js)                               │
│  /capitolo   /ricarica   /memoria   /esporta   /partite                       │
└───┬───────────────┬───────────────────────┬───────────────────────┬───────────┘
    │               │                       │                       │
┌───▼─────────┐ ┌───▼──────────────┐ ┌──────▼─────────┐ ┌───────────▼─────────┐
│ PORTAFOGLIO │ │  NARRATORE       │ │ STATE ENGINE   │ │ ARCHIVIO            │
│ Token Storia│ │  (Game Master)   │ │ memoria lungo  │ │ persistenza JSON    │
│             │ │                  │ │ termine        │ │                     │
│ bonus 1000  │ │ provider LLM  ──┐│ │ inventario     │ │ dati/partite/*.json │
│ costo 10    │ │ motore locale ──┘│ │ relazioni NPC  │ │                     │
│ +500 gratis │ │                  │ │ sinossi        │ │                     │
└─────────────┘ └──────────────────┘ └────────────────┘ └─────────────────────┘
```

**Attori:** un solo giocatore umano. Il sistema è privo di autenticazione: la partita è identificata
da un `id` salvato nel `localStorage` del browser.

---

## 2. Macchina a stati dell'esperienza utente

```mermaid
stateDiagram-v2
    [*] --> Benvenuto
    Benvenuto --> ConfigurazioneSaga : "Nuova Saga"
    Benvenuto --> RipresaPartita : "Continua" (saga salvata)

    state ConfigurazioneSaga {
        [*] --> SceltaAmbientazione
        SceltaAmbientazione --> Personalizzazione : "Ambientazione personalizzata" (testo libero)
        SceltaAmbientazione --> CreazioneProtagonista
        Personalizzazione --> CreazioneProtagonista
        CreazioneProtagonista --> AnteprimaStato : conferma
    }

    ConfigurazioneSaga --> BonusBenvenuto : POST /api/partite
    BonusBenvenuto --> LetturaCapitolo : +1000 Token Storia

    state CicloDiGioco {
        LetturaCapitolo --> Scelta : capitolo generato
        Scelta --> ScelteRapide : clic su 3-4 opzioni
        Scelta --> AzionePersonalizzata : testo libero
        ScelteRapide --> VerificaSaldo
        AzionePersonalizzata --> VerificaSaldo
        VerificaSaldo --> Generazione : saldo ≥ 10
        VerificaSaldo --> RicaricaRapida : saldo < 10
        RicaricaRapida --> Generazione : +500 gratuiti, sempre disponibile
        Generazione --> AggiornaMemoria : -10 Token Storia
        AggiornaMemoria --> LetturaCapitolo : nuovo capitolo
    }

    CicloDiGioco --> Epilogo : fine saga
    CicloDiGioco --> [*] : "Esporta romanzo (.md)"
```

---

## 3. Flusso A — Creazione della saga (setup)

```mermaid
flowchart TD
    A([Avvio app]) --> B{Esiste una saga<br/>in localStorage?}
    B -- sì --> C[Offerta: Continua / Nuova Saga]
    B -- no --> D[Schermata di configurazione]
    C --> D
    D --> E[Scelta ambientazione:<br/>6 preset + Personalizzata]
    E --> F{Personalizzata?}
    F -- sì --> G[Textarea: descrivi il tuo mondo<br/>min. 20 caratteri]
    F -- no --> H[Caricamento banche lessicali del preset]
    G --> H
    H --> I[Protagonista: nome, archetipo, tratto distintivo]
    I --> J[Tono narrativo: Epico / Romantico / Cupo / Comico]
    J --> K[POST /api/partite]
    K --> L[State Engine: inizializza stato vuoto]
    L --> M[Portafoglio: accredito bonus benvenuto 1000 Token]
    M --> N[Generazione automatica del Capitolo 1<br/>Proemio della saga]
    N --> O([Ingresso nel ciclo di gioco])
```

**Regole di business**
- Nome protagonista obbligatorio (default suggerito in stile anime: *Rei*, *Kaito*, *Yuna*…).
- L'ambientazione personalizzata viene sintetizzata in un **contesto di mondo** riutilizzabile, non
  richiede alcuna configurazione tecnica da parte del giocatore.

---

## 4. Flusso B — Ciclo di un capitolo (cuore del gioco)

```mermaid
sequenceDiagram
    autonumber
    participant G as Giocatore
    participant UI as Interfaccia
    participant API as API REST
    participant PF as Portafoglio
    participant SE as State Engine
    participant GM as Game Master (LLM o Motore Locale)

    G->>UI: sceglie una delle 3-4 opzioni OR scrive un'Azione Personalizzata
    UI->>API: POST /api/partite/:id/capitolo { azione }
    API->>PF: verifica saldo (≥ 10 Token Storia?)
    alt saldo insufficiente
        PF-->>UI: 402 + suggerimento "Ricarica Rapida" (mai blocco definitivo)
        UI-->>G: mostra il pulsante "Ottieni 500 Crediti Gratuiti"
    end
    PF->>PF: addebita 10 Token Storia (movimento registrato)
    API->>SE: costruisci digest di memoria (protagonista, inventario, relazioni, sinossi)
    API->>GM: prompt = REGOLE + MONDO + MEMORIA + ULTIMA AZIONE
    GM->>GM: genera scenario, dialoghi NPC, colpo di scena (150-200 parole)
    GM-->>API: JSON { capitolo, opzioni[3-4], delta_stato }
    API->>SE: applica delta (inventario, relazioni, sinossi, vitali, obiettivi)
    API->>SE: appendi voce di sinossi del capitolo N
    API-->>UI: capitolo + opzioni + stato aggiornato + saldo + prompt iniettato
    UI->>G: effetto macchina da scrivere, scelte rapide, campo libero
```

**Regole di business**
- Costo fisso: **10 Token Storia per capitolo generato** (la generazione del Capitolo 1 è inclusa nel bonus).
- L'azione del giocatore è sempre valida: se la scelta rapida non è gradita, il campo libero accetta
  qualsiasi testo (min. 3 caratteri).
- Ogni capitolo termina con un **cliffhanger** e una domanda diretta al protagonista.
- Il fallimento del provider IA esterno **non** interrompe la partita: subentra il motore locale
  (nessuna perdita di Token, il capitolo viene comunque consegnato).

---

## 5. Flusso C — State Engine (memoria a lungo termine)

L'obiettivo è evitare allucinazioni e perdita di memoria della trama: **ad ogni prompt narrativo** lo
stato viene richiamato implicitamente.

```mermaid
flowchart LR
    subgraph MEM["Stato persistente della partita"]
        P["Protagonista<br/>nome · archetipo · tratto"]
        V["Vitali<br/>vita · energia · tensione"]
        I["Inventario<br/>oggetti · rarità · note"]
        R["Relazioni NPC<br/>ruolo · fiducia · note"]
        S["Sinossi<br/>1 riga per capitolo"]
        O["Obiettivi<br/>missioni aperte"]
        A["Arco narrativo<br/>prossimo beat"]
    end

    MEM --> D["Digest di memoria<br/>(testo compatto, ordinato per importanza)"]
    D --> PR["Prompt di sistema del Game Master<br/>+ REGOLE DI COERENZA"]
    PR --> GEN["Generazione del capitolo"]
    GEN --> D2["delta_stato proposto"]
    D2 --> MEM

    MEM -.->|"trasparenza"| UI["Pannello «Memoria iniettata»<br/>visibile al giocatore"]
```

**Componenti del pannello “Scheda del Personaggio e Storia”**

| Blocco | Contenuto tracciato | Aggiornamento |
|---|---|---|
| Protagonista | nome, archetipo, tratto, vitali (vita/energia/tensione) | ogni capitolo |
| Inventario | oggetti ottenuti, rarità, note d'uso | quando il narratore assegna un oggetto |
| Relazioni | NPC incontrati, ruolo (Amico, Rivale, Mentore, Nemico…), fiducia 0-100 | quando un NPC compare o cambia atteggiamento |
| Sinossi | una riga per capitolo, generata automaticamente | fine di ogni capitolo |
| Obiettivi | missioni aperte/chiuse | su eventi chiave della trama |

**Regole di coerenza imposte al Game Master**
1. Non contraddire la sinossi: quanto scritto è canonico.
2. Usare solo oggetti presenti nell'inventario, salvo esplicita perdita/acquisizione.
3. Rispettare il ruolo relazionale degli NPC (un Rivale non si comporta come un Mentore senza motivo
   narrato nel capitolo).
4. Mantenere il tono scelto e il registro da light novel.

---

## 6. Flusso D — Sistema crediti “Token Storia”

```mermaid
stateDiagram-v2
    [*] --> Benvenuto1000 : creazione partita
    Benvenuto1000 --> Attivo : saldo = 1000

    Attivo --> Attivo : -10 Token (capitolo generato)
    Attivo --> MissioneGiornaliera : clic "Ottieni 500 Crediti Gratuiti"
    MissioneGiornaliera --> Attivo : +500 Token, cooldown 24h

    Attivo --> SpotFittizio : saldo basso, missione già usata
    SpotFittizio --> Attivo : +500 Token, cooldown 60 s

    state "Ricarica d'Emergenza" as Emergency
    Attivo --> Emergency : saldo < 10 (costo capitolo)
    Emergency --> Attivo : +500 Token garantiti, <b>cooldown ignorato</b>

    note right of Emergency
        Regola anti-blocco: il gioco non può
        mai diventare ingiocabile. Nessun
        pagamento reale è previsto.
    end note
```

**Regole di business**
- Valuta **fittizia**, nessun pagamento reale, nessuna integrazione di pagamento nel codice.
- Bonus di benvenuto: **1000 Token Storia** (accredito automatico alla creazione della saga).
- Costo di generazione: **10 Token Storia** per capitolo.
- Ricariche gratuite: **+500 Token** per missione giornaliera o spot fittizio simulato.
- **Garanzia anti-blocco**: se `saldo < costo`, la ricarica è sempre disponibile (cooldown ignorato).
- Tutti i movimenti (bonus, spesa, ricarica) sono registrati in un **estratto conto** ispezionabile.

---

## 7. Flusso E — Generazione narrativa: due provider, un solo contratto

```mermaid
flowchart TD
    IN["Richiesta capitolo:<br/>azione + stato + configurazione"] --> BUILD["Costruzione prompt (prompt.js)"]
    BUILD --> MOD{"Modalità motore?"}

    MOD -- "OPENAI_API_KEY presente" --> LLM["provider_llm.js<br/>fetch su endpoint OpenAI-compatibile"]
    LLM --> OK{"Risposta valida<br/>e JSON conforme?"}
    OK -- sì --> NORM
    OK -- no --> LOCAL["Degradazione automatica"] --> LOCAL2["motore_locale.js"]

    MOD -- "assente" --> LOCAL2
    LOCAL2 --> NORM["schema.js<br/>normalizzazione + vincoli:<br/>150-200 parole, 3-4 opzioni, delta coerente"]
    NORM --> OUT["Capitolo consegnato al giocatore"]
    OUT --> AUDIT["log di provenienza:<br/>'llm:gpt-4o-mini' oppure 'locale'"]
```

**Il Motore Narrativo Locale** (fallback sempre disponibile, modalità offline) compone il capitolo con
una pipeline deterministica ma variabile:

```
Azione del giocatore
   └─> analisi intento (combattimento · dialogo · esplorazione · fuga · astuzia · cura · indagine)
        └─> scelta del luogo + atmosfera (banca lessicale dell'ambientazione)
             └─> selezione/creazione NPC coerente con le relazioni esistenti
                  └─> composizione dei blocchi:  Scenario → Azione → Dialogo NPC → Colpo di scena → Cliffhanger
                       └─> controllo del budget di parole (150-200) e dei vincoli di stile
                            └─> generazione delle 3-4 scelte rapide (prudente · audace · astuta · empatica)
                                 └─> calcolo dei delta di stato (inventario, relazione, vitali, obiettivi)
```

---

## 8. Flusso F — Persistenza e ripristino

```mermaid
flowchart LR
    C["Client"] -->|"localStorage: idSaga"| R["Ripristino"]
    C -->|"POST /capitolo"| S["Server"]
    S --> W["scrittura atomica<br/>dati/partite/{id}.json"]
    R --> G["GET /api/partite/:id"]
    G --> S
    S --> X["GET /api/partite/:id/esporta<br/>→ romanzo in Markdown"]
```

- Ogni mutazione di stato viene salvata su disco in modo atomico (file temporaneo + rename).
- L'intera saga è esportabile come **romanzo Markdown**: capitoli, scelte operate, stato finale.
- Nessun dato personale reale è richiesto: solo il nome del protagonista scelto dal giocatore.

---

## 9. Flusso G — Illustrazioni di scena (5 per capitolo)

```mermaid
flowchart TD
    CAP["Capitolo appena generato<br/>titolo · testo · azioneGiocatore · stato"] --> FK["frasiChiave(testo)<br/>frasi candidate + punteggio narrativo"]
    CAP --> TAV["tavolozza(momento, bancheDa, colori, tipo)<br/>cielo · sfondo · accenti · nebbia"]
    FK --> DES["descriviIllustrazioni()<br/>5 scene: panorama · ritratto · azione · svolta · cliffhanger"]
    TAV --> DES
    DES --> SEM["creaSeme(id, 'scena', capitolo, indice, ambito)<br/>→ tutti i dettagli casuali restano identici"]
    SEM --> SVG["generaScena() → SVG 1280x720"]
    SVG --> API["GET /api/partite/:id/illustrazioni/:cap/:idx<br/>image/svg+xml · cache immutabile"]
    API --> STR["Striscia sotto il capitolo"]
    API --> GAL["Galleria a schermo intero<br/>frecce ← → e scorrimento a dito"]
    API --> DIA["Pulsante «Illustrazioni» nel diario"]
    CAP -.->|opzionale| PR["promptImmagine()<br/>prompt per un modello esterno"]
```

- Cinque scene per capitolo, sempre dello stesso tipo e nello stesso ordine.
- Il **determinismo** garantisce che le immagini di una saga non cambino mai: sono un bene della
  partita, non un effetto temporaneo.
- Nessun servizio esterno e nessun costo: il motore SVG è parte del gioco.

---

## 10. Flusso H — Albero di fiducia a tre assi

```mermaid
flowchart TD
    AZ["Azione del giocatore"] --> INT["analizzaIntento()"]
    INT --> DA["DELTA_ASSI[intento]<br/>vincolo · tensione · rispetto"]
    DA --> AD["applicaDelta(stato, delta)"]
    AD --> CO["Coerenza di ruolo<br/>un Nemico non si addolcisce per una gentilezza"]
    CO --> LI["limita 0-100"]
    LI --> Q["quadrante(vincolo, tensione)<br/>Alleanza · Rivalità · Crocevia · Ostilità"]
    LI --> S["sfumatura(rispetto)<br/>ti ammira · ti stima · ti sottovaluta · ti disprezza · ti teme"]
    LI --> T["tappeDaAssi()<br/>primo incontro · legame · primo scontro · confidenza<br/>patto · frattura · riconciliazione"]
    LI --> ST["storico per capitolo (ultimi 12)"]
    Q --> UI["Piano cartesiano interattivo (public/js/albero.js)"]
    T --> UI
    ST --> UI
    LI --> DIG["digest di memoria → prompt del Game Master"]
```

- Ogni variazione è **incrementale**: il narratore descrive il cambiamento, non il valore assoluto.
- Il gioco *sa* che un personaggio può piacerti e starti sulle scorte insieme: è la differenza fra
  «Rivalità» e «Ostilità».
- L'albero non è solo una schermata: gli stessi numeri entrano nel digest che il Game Master legge
  prima di scrivere il capitolo successivo.

---

## 11. Requisiti non funzionali

| Requisito | Implementazione |
|---|---|
| Tutto in italiano | UI, messaggi d'errore, contenuti generati, documentazione |
| Nessun blocco indefinito | Degradazione del provider IA + ricarica d'emergenza + retry locale |
| Nessun pagamento reale | La valuta è puramente fittizia, non esiste codice di pagamento |
| Single-player | Nessuna autenticazione, nessun canale realtime, nessuna condivisione |
| Zero dipendenze | Solo moduli nativi Node; nessun build step per il frontend |
| Ispezionabilità della memoria | Endpoint `/memoria` + pannello “Memoria iniettata” nella UI |
| Illustrazioni senza costi né attese | Motore SVG interno: < 1 ms per scena, zero servizi esterni |
| Giocabile da telefono | Punti di rottura 1080/980/900/720/620/420 px, bersagli ≥ 44 px, nessuno scorrimento orizzontale |
| Playtest misurabile | Registro eventi locale in JSONL + modulo di parere + riepilogo da terminale |
| Nessun dato personale | Il registro non contiene IP, email né nomi di giocatori |
