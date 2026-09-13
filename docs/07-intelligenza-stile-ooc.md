# 07 — Intelligenza generativa in stile OOC

> Obiettivo: rendere l'IA di MasterRPG il più possibile simile a quella di
> **OOC: The Playable Anime** (Wrtn, `com.newai.ooc` su Google Play),
> conservando i punti di forza del progetto: zero dipendenze, zero blocchi,
> tutto in italiano, nessun pagamento reale.

## 1. Che cosa fa l'IA di OOC

Dalla scheda ufficiale e dalle guide pubbliche dell'app, i pilastri
dell'esperienza generativa di OOC sono:

| # | Pilastro di OOC | Descrizione |
|---|---|---|
| 1 | **Playable anime** | Scrivi ciò che il personaggio dice o fa e l'IA scrive la risposta del mondo in tempo reale, scena per scena. |
| 2 | **Story Mode** | Titoli strutturati con premessa e cast, giocati scena per scena (l'esperienza principale). |
| 3 | **Character Mode** | Chat libera con i singoli personaggi, in stile Character.AI; gratuita con il modello base. |
| 4 | **Deep Memory** | «Companion che ricordano davvero la vostra storia comune e crescono con te»: i personaggi ricordano le conversazioni passate. |
| 5 | **Adattamento** | I personaggi «si adattano al tuo stile e reagiscono a ogni tua parola». |
| 6 | **Personaggi con un'anima** | Voci uniche e coerenti; le reazioni evolvono con l'approfondirsi del rapporto. |
| 7 | **Creazione aperta** | Creazione di personaggi e mondi senza codice, accessibile a tutti. |
| 8 | **Crediti** | Bonus di iscrizione + check-in giornaliero; la Character Mode con modello base è gratuita. |

Le recensioni pubbliche segnalano il punto debole di OOC: **nelle sessioni
lunghe l'IA dimentica eventi e dettagli** — esattamente il problema che lo
State Engine di MasterRPG è nato per risolvere.

## 2. Come MasterRPG realizza ciascun pilastro

| Pilastro OOC | Implementazione in MasterRPG | Dove |
|---|---|---|
| Playable anime | Il prompt v2.0 impone di **reagire a ogni parola** dell'azione (ripresa di un dettaglio specifico), conseguenze immediate, mai scrivere le battute del protagonista. | `motore/prompt.js` |
| Story Mode | Il ciclo dei capitoli esistente (150–200 parole, scelte rapide + azione personalizzata). | `motore/narratore.js` |
| Character Mode | **Modalità Personaggio**: chat libera con ogni NPC incontrato, in prima persona, **gratuita e senza limiti**. | `motore/narratore.js → generaDialogoNarrativo`, rotta `POST /api/partite/:id/dialogo` |
| Deep Memory | **Memoria profonda per NPC**: `fatti`, `promesse`, `impressione` che evolvono; alimentata dai capitoli (nuovi campi del delta) e dalle conversazioni. Iniettata nel digest del Game Master e nel prompt del personaggio. | `stato/memoria.js → registraMemoriaNpc` |
| Adattamento | **Profilo del giocatore**: stile preferito (audace/prudente/astuta/empatica), rapporto scelte/azioni libere, lunghezza media, intenti ricorrenti — iniettato nei prompt perché l'IA vi si adatti. | `stato/memoria.js → aggiornaProfiloGiocatore / descriviProfilo` |
| Ricordi pertinenti | **Richiamo della memoria**: data l'azione corrente, sinossi, obiettivi e ricordi degli NPC vengono classificati per pertinenza e iniettati come «RICORDI RILEVANTI PER QUESTA SCENA». | `stato/memoria.js → richiamaMemoria` |
| Personaggi con un'anima | Aspetto, tic, nota, impressione e quadrant dell'albero di fiducia guidano tono e voce sia nei capitoli sia in chat; il motore locale ha battute distinte per quadrante. | `motore/prompt.js`, `motore/motore_locale.js → generaBattuta` |
| Creazione aperta | Già presente: ambientazione personalizzata vincolante per l'IA. | `stato/modello.js` |
| Crediti | I capitoli costano 10 Token Storia; la **chat con gli NPC è gratuita** (come la Character Mode con modello base) e il gioco non si blocca mai. | `crediti/portafoglio.js`, `api.js` |

## 3. Flusso della Modalità Personaggio

```
giocatore ── POST /api/partite/:id/dialogo { npc, testo } ──► api.js
                                                                  │
                       valida messaggio e NPC (già incontrato?) ◄─┘
                                                                  │
              costruisciPromptDialogo (identità, assi, ricordi)  │
                                                                  │
            LLM esterno se configurato ── fallback motore locale │
                                                                  │
                     normalizzaBattuta (schema.js)                │
                                                                  │
   applicaAssi (gli assi si muovono anche conversando)            │
   registraMemoriaNpc (fatti / promesse / impressione)            │
   aggiungiScambio (cronologia, max 40 messaggi per NPC)          │
                                                                  │
                          risposta: battuta + relazione + memoria └──► chat UI
```

La conversazione **non consuma Token Storia** e non avanza il numero del
capitolo: è un approfondimento del rapporto, non della trama.

## 4. Prompt v2.0 — le regole OOC impartite al Game Master

1. *Reagisci a ogni parola*: riprendi un dettaglio specifico dell'azione e
   mostrane l'esito, senza riassumerla.
2. *Mai parlare al posto del protagonista*: battute e decisioni del
   protagonista appartengono al giocatore.
3. *Memoria profonda*: i ricordi degli NPC (fatti/promesse) vanno richiamati
   con naturalezza, mai come elenco.
4. *Richiami pertinenti*: la sezione «RICORDI RILEVANTI» va usata quando i
   dettagli del passato contano per la scena corrente.
5. *Adattamento*: la sezione «PROFILO DEL GIOCATORE» calibra ritmo e sfide.
6. *Voci uniche*: aspetto, tic e impressione di ogni NPC vincolano la voce.

## 5. Robustezza (dove MasterRPG supera OOC)

- **Nessun blocco**: se l'LLM esterno fallisce, il motore locale consegna
  comunque sia il capitolo sia la battuta (deterministica, seedata).
- **Nessuna dimenticanza strutturale**: la memoria non dipende solo dalla
  finestra di contesto del modello — sinossi compressa, ricordi per NPC,
  profilo e richiami sono calcolati dallo State Engine a ogni turno.
- **Schema sempre valido**: `schema.js` normalizza anche le risposte
  degradate (JSON riparato, testo semplice ricostruito come battuta).

## 6. Verifica

Il collaudo dedicato `strumenti/prova-dialogo.js` (eseguito da
`npm run collaudo`) verifica 27 proprietà: gratuità della chat, validazioni,
memoria profonda, movimenti dell'albero di fiducia, profilo del giocatore,
ricordi nel digest e cronologia persistente.
