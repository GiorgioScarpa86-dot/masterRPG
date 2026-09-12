# 05 — Protocollo di playtest

Questo documento serve a condurre un test giocato **vero**, raccogliere dati
utilizzabili e decidere che cosa cambiare nel gioco. Tutto è già pronto: basta
seguire i passi.

---

## 1. Che cosa stiamo verificando

Quattro ipotesi, in ordine di importanza:

| # | Ipotesi | Come si misura |
|---|---|---|
| H1 | Il gioco **si capisce senza spiegazioni** | il giocatore genera il primo capitolo senza aiuto |
| H2 | **Un capitolo non è mai noioso né troppo lungo** | durata media per capitolo fra 60 e 180 secondi |
| H3 | Il **memoria della storia** regge: il giocatore nota che il gioco «ricorda» | il giocatore lo dice spontaneamente, o risponde «sì» alla domanda 4 |
| H4 | Il **sistema di crediti non blocca** e non confonde | nessuna interruzione; il giocatore non chiede «devo pagare?» |

Misura di successo della sessione: **il giocatore arriva almeno al capitolo 5
senza che nessuno tocchi la tastiera al posto suo** e alla fine dice che
rigiocherebbe.

---

## 2. Preparazione (5 minuti)

```bash
cd masterRPG

# 1. tutti i collaudi: deve finire con tutti i ✅
npm run collaudo

# 2. avvia la sessione guidata (azzera il registro, prepara una saga, stampa le istruzioni)
npm run playtest
```

Il comando `npm run playtest`:

1. azzera il registro eventi e i salvataggi di prova (usa `--conserva` per non
   farlo, `--saga-vuota` per testare anche la creazione, `--produzione` per
   nascondere la modalità playtest);
2. avvia il server su `http://localhost:3000`;
3. crea una saga già pronta da giocare;
4. stampa **che cosa dire a chi gioca** e l'indirizzo da aprire, incluso quello
   per il telefono sulla stessa rete Wi-Fi;
5. al `Ctrl+C` mostra il riepilogo della sessione.

### Materiale da tenere accanto

- un cronometro (o il riepilogo automatico, che misura già i tempi);
- un foglio con tre colonne: **minuto · che cosa stava facendo · segnale**
  (bloccato / annoiato / sorpreso / divertito);
- il modulo «📝 Lascia un parere» aperto dal giocatore dopo il terzo capitolo
  (compare da solo).

---

## 3. Conduzione della sessione (15-20 minuti)

### Prima di cominciare, leggi questo al giocatore

> «Questo è un gioco di ruolo narrativo: leggi il capitolo, scegli una delle
> mosse, oppure scrivi la tua azione con parole tue. Ogni capitolo è scritto al
> momento e le tue scelte cambiano la storia. In alto trovi le illustrazioni:
> toccane una per vederla grande. I Token Storia sono gratuiti e non si pagano:
> quando finiscono, il pulsante di ricarica ne dà altri 500.»

Poi **non dire altro**. Non indicare i pulsanti. Non anticipare le funzioni.

### Regole di osservazione

1. **Silenzio attivo**: intervieni solo se è fermo da più di 60 secondi.
2. **Registra il minuto esatto** di ogni momento di attrito.
3. Se chiede aiuto, segna la domanda **con le sue parole**: è il dato più
   prezioso del playtest.
4. Non difendere il gioco: se dice che qualcosa non si capisce, ha ragione lui.
5. Chiedigli di **provare una funzione a caso** fra: rinomina? no — prova
   «Illustrazioni», «Relazioni», «Diario», «Memoria iniettata».
6. Fallo giocare **da telefono** per almeno tre capitoli: metà del lavoro di
    questa versione è lì.

### Domande da fare durante, senza interrompere

- «Cosa pensi che succederà adesso?» (verifica il coinvolgimento)
- «Chi è questo personaggio per te?» (verifica l'albero di fiducia)
- «Cosa ti aspetti che faccia questo pulsante?» (verifica l'interfaccia)

---

## 4. Raccolta dei dati

### Automatica — registro locale

Il gioco registra in locale (nessun dato personale, nessun invio all'esterno) gli
eventi della sessione, in `dati/playtest/eventi-AAAA-MM-GG.jsonl`:

| Evento | Quando |
|---|---|
| `sessione-avviata` | all'ingresso in una saga (con larghezza dello schermo e tipo di dispositivo) |
| `saga-creata` | alla creazione della saga |
| `capitolo-generato` | per ogni capitolo: numero, parole, opzioni, tipo di azione, motore, tempo di generazione |
| `capitolo-rifiutato` | se la generazione fallisce, con il motivo |
| `capitolo-letto` | quando il capitolo successivo viene generato: misura il tempo di lettura |
| `scena-aperta` | ogni volta che si apre un'illustrazione |
| `ricarica` | per ogni ricarica gratuita usata |
| `parere` | dal modulo di parere (voto, chiarisce, piace, confusione, commento) |
| `sessione-chiusa` | alla chiusura della scheda, con la durata |

### Il riepilogo

```bash
npm run playtest:riepilogo              # tutte le sessioni
npm run playtest:riepilogo 2026-09-12   # una sola giornata
npm run playtest:riepilogo -- --eventi  # elenco grezzo, riga per riga
```

Il riepilogo mostra: sessioni, saghe, capitoli, tempo medio per capitolo,
parole per capitolo, illustrazioni aperte, ricariche, errori, voto medio, i
commenti integrali, **il capitolo massimo raggiunto da ogni sessione** (dove si
sono fermati) e alcuni **suggerimenti automatici** (per esempio: «le
illustrazioni vengono aperte di rado», «il tempo medio per capitolo è alto»).

### Manuale — scheda di osservazione

```
Giocatore: ______  Data: ______  Dispositivo: ______  Durata: ______

┌───────┬───────────────────────────────────┬──────────────────────────┐
│ Minuto│ Che cosa stava facendo            │ Segnale                  │
├───────┼───────────────────────────────────┼──────────────────────────┤
│       │                                   │                          │
│       │                                   │                          │
│       │                                   │                          │
└───────┴───────────────────────────────────┴──────────────────────────┘

Domande che ha posto: _________________________________________________
Capitolo in cui si è fermato: ______  Perché: ________________________
Ha aperto le illustrazioni?  □ mai   □ 1-2 volte   □ spesso
Ha capito che i crediti sono gratuiti?  □ sì   □ no   □ ha chiesto
Rigiocherebbe?  □ sì   □ forse   □ no
```

---

## 5. Interpretazione

| Sintomo osservato | Segnale | Che cosa fare |
|---|---|---|
| Non capisce che deve scegliere | H1 in difficoltà | evidenziare il blocco delle scelte, micro-testo «Scegli come proseguire» |
| Legge il capitolo in meno di 20 secondi | H2: testo troppo corto | portare i capitoli verso le 200 parole, aggiungere un paragrafo d'azione |
| Tempo medio sopra 3 minuti per capitolo | H2: attrito nella scelta | ridurre a 3 opzioni, accorciare le etichette |
| Non apre mai le illustrazioni | funzione invisibile | portare la striscia sopra le scelte, o animare l'entrata |
| Chiede «ma si paga?» | H4 in difficoltà | rinomina «Token Storia» → «Energia narrativa», o mostra «gratis» nel pulsante |
| Non collega gli NPC fra i capitoli | H3 in difficoltà | mostrare un avviso «Mira ricorda quello che hai fatto» all'ingresso in scena |
| Si ferma sempre allo stesso capitolo | punto di noia strutturale | leggere lì il testo: quasi sempre è una scena di collegamento senza posta in gioco |

---

## 6. Dopo la sessione

1. `npm run playtest:riepilogo 2026-09-12 > sessioni/2026-09-12.txt` per
   archiviare i numeri.
2. Compilare la scheda di osservazione a caldo, entro dieci minuti.
3. Trascrivere i commenti **senza correggerli**.
4. Aggiungere una voce in cima a `docs/06-risultati-playtest.md` con:
   data, durata, capitoli raggiunti, i tre problemi principali e la prima
   modifica da fare.
5. Se emergono bug: riprodurli, poi aggiungere il caso a
   `strumenti/prova-interfaccia.js` o `strumenti/prova-illustrazioni.js`, così
   non tornano.

### Numero di sessioni consigliato

| Scopo | Sessioni |
|---|---|
| Trovare i problemi gravi (interfaccia, blocchi) | 3 |
| Capire il ritmo e il gradimento | 6-8 |
| Confrontare due versioni | 2 × 6 |

Con 6 sessioni si vedono già i pattern: i problemi che si ripetono su tre
giocatori diversi sono problemi del gioco, non del giocatore.
