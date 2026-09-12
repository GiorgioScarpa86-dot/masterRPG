# 04 — Illustrazioni di scena e albero di fiducia

Questo documento descrive le due funzionalità narrative aggiunte al gioco:
le **illustrazioni di scena** (4-5 per capitolo, generate dal contenuto della
storia) e l'**albero di fiducia evoluto** (relazioni a tre assi con quadranti,
tappe e storico).

---

## Parte prima — Illustrazioni di scena

### 1. Perché un motore interno e non un servizio di immagini

| Criterio | Servizio esterno di immagini | Motore SVG interno |
|---|---|---|
| Costo per capitolo | 0,02-0,08 $ per immagine | **zero** |
| Tempo di attesa | 5-20 secondi per immagine | **< 1 millisecondo** |
| Coerenza con la storia | variabile, richiede prompt lunghi | **deriva dal testo del capitolo** |
| Determinismo | no (stessa richiesta, immagine diversa) | **sì**: stessa partita, stessa immagine |
| Funziona offline | no | **sì** |
| Dipendenze | SDK + rete | **nessuna** |
| Rischio di contenuti inattesi | sì (filtri, rifiuti, deformazioni) | **no**: geometria controllata |

Il motore produce **immagini vettoriali (SVG) 1280×720** con figure in
controluce, cieli sfumati, silhouette di ambientazione e cornici tipografiche:
una direzione artistica da *key visual* anime, applicata in modo sistematico.

![Anteprima delle ambientazioni](immagini/ambientazioni.png)

### 2. Le cinque scene di ogni capitolo

| # | Tipo | Che cosa mostra | Da dove nasce |
|---|---|---|---|
| 1 | `panorama` | Il luogo del capitolo, all'ora del giorno corrente | `stato.luogo`, `stato.momento`, ambientazione |
| 2 | `ritratto` | Primo piano dell'NPC in scena, con pettinatura stabile nel tempo | ultimo NPC del `deltaStato`, nome come seme |
| 3 | `azione` | La mossa del giocatore, in posa dinamica | `azioneGiocatore.testo` |
| 4 | `svolta` | Il colpo di scena, con la frase rivelatrice nella didascalia | frase con il punteggio narrativo più alto |
| 5 | `cliffhanger` | Il protagonista minuscolo davanti a una presenza enorme | ultima domanda o ultima frase del capitolo |

La quinta scena chiude il capitolo con una domanda: è l'aggancio che riporta
il giocatore al capitolo successivo.

### 3. Come nasce l'immagine

```
capitolo ──► frasiChiave()  ──► 5 descrizioni (tipo, titolo, didascalia)
                                      │
partita  ──► tavolozza()  ───────────┤   (cielo per momento, sfondo per
             · CIELI   (7 momenti)    │    ambientazione, 2 accenti, nebbia,
             · SFONDI  (7 ambienti)   │    bagliore, umidità)
                                      ▼
                          generaScena() ──► SVG 1280×720 ──► PNG (opzionale)
                                 │
                          creaSeme(partita.id, "scena", capitolo, indice, ambito)
                                 └─► tutti i dettagli casuali restano identici
                                     fra una visita e l'altra
```

Il **seme** è la chiave del determinismo: derivando da `id partita + numero
capitolo + indice scena + ambientazione`, le immagini di una saga non cambiano
mai, anche dopo mesi e dopo un riavvio del server. È lo stesso principio già
usato dal motore narrativo (`creaSeme` in `motore_locale.js`).

### 4. Anatomia di una scena

Dall'indietro in avanti:

1. **Cielo** — gradiente a più fermate con colore dell'astro e stelle per i
   momenti notturni; l'ora del giorno viene dedotta dal capitolo o dallo stato.
2. **Raggi** — fasci di luce obliqui con opacità bassa (intensità secondo l'ora).
3. **Fondo in tre strati** — montagne, tetti o alberi; i dettagli cambiano per
   ambientazione (guglie fantasy, cupole sci-fi, insegne al neon cyberpunk,
   campanili per l'accademia, rovine per il post-apocalittico).
4. **Interni** — quando il luogo è al chiuso (biblioteca, taverna, astronave,
   laboratorio): finestra con luce, arredi in controluce, quadri, pavimento a
   listoni, lampada con cono di luce, candele.
5. **Personaggi** — silhouette in controluce con contorno luminoso (*rim
   light*), tre pose (busto, azione, distante) e sei pettinature; la pettinatura
   di un NPC resta la stessa per tutta la saga.
6. **Atmosfera** — particelle (pioggia, neve, polvere, cenere), velocità, onde.
7. **Vignettatura e cornice** — annerimento dei bordi, titolo, didascalia,
   nome della saga, numero di capitolo e contatore `scena n/5`.

### 5. Interfaccia e accessibilità

- **Striscia sotto il capitolo**: cinque miniature scorrevoli con aggancio
  (`scroll-snap`), caricamento differito (`loading="lazy"`) e spazio riservato
  (`aspect-ratio: 16/9`) per non far saltare la pagina.
- **Galleria a schermo intero**: immagine grande, didascalia, miniature
  cliccabili, navigazione con frecce della tastiera e scorrimento a dito
  (*swipe*) sul telefono.
- **Diario**: ogni capitolo ha il pulsante «Illustrazioni» per rivedere le
  scene anche a distanza di tempo.
- Ogni immagine ha un `alt` descrittivo: un lettore di schermo annuncia
  «Mira — Alleata · primo piano».

### 6. Come si estende

| Per aggiungere… | Dove si interviene |
|---|---|
| Un'ora del giorno | `CIELI` in `server/illustrazioni/palette.js` |
| Un'ambientazione | `SFONDI` in `palette.js` + voce in `lessico.js` |
| Un tipo di scena | `TIPI` e `descriviIllustrazioni()` in `scene.js` |
| Una pettinatura | `pettinature` dentro `figura()` |
| Un dettaglio di sfondo | `stratoFondo()` o `interno()` |
| Immagini da un modello esterno | `promptImmagine()` è già pronto: restituisce un prompt in inglese per ogni scena, esposto su `/api/partite/:id/illustrazioni/:cap/:idx/prompt` |

---

## Parte seconda — Albero di fiducia evoluto

### 1. Da un numero a tre assi

Nella prima versione ogni NPC aveva un solo valore, `fiducia` (0-100). Un
numero solo non sa distinguere situazioni narrativamente opposte: un rivale
ammirato e un nemico disprezzato potevano avere lo stesso punteggio.

L'albero attuale descrive ogni legame con **tre assi indipendenti**:

| Asse | Domanda a cui risponde | Estremi |
|---|---|---|
| **Vincolo** | Quanto vi lega? | 0 = estranei · 100 = legame profondo |
| **Tensione** | Quanto è conflittuale? | 0 = armonia · 100 = conflitto aperto |
| **Rispetto** | Quanto l'altro ti considera capace? | 0 = disprezzo · 100 = ammirazione |

`fiducia` resta come alias di `vincolo`, così i salvataggi precedenti e il resto
del codice continuano a funzionare.

### 2. I quattro quadranti

Vincolo e Tensione formano un piano; il Rispetto modula la sfumatura del tono.

```
        VINCOLO alto
             │
   CROCEVIA  │  ALLEANZA          ← Alleanza: legame forte, pochi attriti
 (ancora da  │  (legame forte)       Rivalità: legame forte e scontri frequenti
  decidere)  │                       Crocevia: conoscenza appena iniziata
─────────────┼─────────────  TENSIONE alta
  OSTILITÀ   │  RIVALITÀ
 (conflitto) │  (scontri)
             │
        VINCOLO basso
```

Il **Rispetto** produce la sfumatura: «Ti ammira», «Ti stima», «Ti
sottovaluta», «Ti disprezza», «Ti teme», «Neutrale».

### 3. Le tappe del legame

Eventi decisivi, registrati una sola volta con il capitolo in cui accadono:

| Icona | Tappa | Si sblocca quando |
|---|---|---|
| ✦ | Primo incontro | all'apparizione dell'NPC |
| 🔗 | Legame | vincolo ≥ 52 per la prima volta |
| ⚔ | Primo scontro | tensione ≥ 62 per la prima volta |
| 🤫 | Confidenza | vincolo ≥ 72 e tensione ≤ 45 |
| 🎖 | Rispetto guadagnato | rispetto ≥ 76 |
| 🤝 | Patto | vincolo ≥ 64, tensione ≤ 38, rispetto ≥ 62 |
| 💥 | Frattura | vincolo ≤ 22 e tensione ≥ 70 |
| 🕊 | Riconciliazione | dopo una frattura, vincolo ≥ 45 e tensione ≤ 45 |

### 4. Come si muovono gli assi

Gli assi si muovono per **variazioni** (`deltaVincolo`, `deltaTensione`,
`deltaRispetto`), non per valori assoluti: il narratore descrive il *cambiamento*,
il motore lo applica e garantisce i limiti 0-100.

| Azione del giocatore | Vincolo | Tensione | Rispetto |
|---|---|---|---|
| Cura / aiuto | +13 | −11 | +6 |
| Dialogo | +9 | −4 | +5 |
| Indagine | +6 | +3 | +8 |
| Esplorazione | +3 | +2 | +3 |
| Proemio | +11 | +2 | +1 |
| Combattimento | −3 | +18 | +11 |
| Astuzia / inganno | −6 | +9 | −2 |
| Fuga | −4 | +7 | −5 |

Sono presenti due correttivi di coerenza: un NPC con ruolo «Nemico» o «Rivale»
non si addolcisce per una singola gentilezza, e un alleato curato guadagna
vincolo extra. Il risultato è verificato nel collaudo confrontando il profilo
«sempre dialogo» (vincolo medio 68, tensione 29) con il profilo «sempre
attacco» (vincolo 43,5, tensione 74,5).

![L'albero di fiducia nel pannello](immagini/albero-fiducia.png)

### 5. Esposizione e visualizzazione

- **Pannello «Relazioni»**: piano cartesiano disegnato in SVG con i quattro
  quadranti colorati, il punto di partenza («tu»), una traiettoria verso ogni
  NPC e una freccia che mostra **come si è mosso il rapporto nell'ultimo
  capitolo**. Sotto: elenco rapido con tre barre per gli assi.
- **Scheda dell'NPC** (tocco su un nodo): grafico a tre punte (Vincolo,
  Tensione, Rispetto), ruolo, quadrante, descrizione narrativa del rapporto,
  elenco delle tappe con il capitolo e storico delle variazioni capitolo per
  capitolo.
- **Memoria del Game Master**: il digest iniettato in ogni prompt contiene ora
  la sezione «ALBERO DI FIDUCIA — RELAZIONI CON GLI NPC» con i tre valori di
  ogni personaggio, la nota più recente e le ultime due tappe. È così che il
  narratore *sa* che il Capitano Bram ti rispetta ma ti detesta.
- **Esportazione in Markdown**: la scheda finale del romanzo riporta assi,
  tappe e note di ogni legame.

### 6. File coinvolti

| File | Ruolo |
|---|---|
| `server/stato/relazioni.js` | assi, quadranti, tappe, variazione degli assi, albero completo |
| `server/stato/modello.js` | applica le variazioni con limiti e coerenza di ruolo |
| `server/motore/motore_locale.js` | sceglie le variazioni in base all'intenzione dell'azione |
| `server/motore/prompt.js` | istruisce il Game Master sull'uso dei tre assi |
| `server/stato/memoria.js` | porta l'albero nel digest di memoria |
| `public/js/albero.js` | disegno SVG, scheda NPC, grafico a tre punte |
| `public/js/scheda.js` | pannello a schede, elenco rapido dei legami |
| `strumenti/prova-illustrazioni.js` | collaudo automatico di illustrazioni e assi |
