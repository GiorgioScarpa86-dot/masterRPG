# 06 — Browser, link di prova e compatibilità

Risposta breve: **Firefox va benissimo, è anzi uno dei browser migliori per questo
playtest**. Il gioco usa solo tecnologie web standard, non chiama nessun servizio
esterno e non ha una riga riservata a Chrome. Sotto ci sono i dettagli verificati
dal collaudo automatico.

---

## 1. Il link per la prova

### Se stai provando dentro questa sessione di Arena

```
https://3000-i334ygdrwl1xq32mnbl81.e2b.app
```

È l'indirizzo pubblico del server di gioco avviato in questa sessione: apri questo
indirizzo in Firefox (o in qualunque browser, anche dal telefono) e giochi
direttamente. Il server è già in ascolto e accetta richieste per quell'host,
verificato.

> Nota: quel link vive finché la sessione e il processo del server restano attivi.
> Se non si apre, usa il pannello **Anteprima dal vivo** dell'interfaccia di Arena
> (mostra la stessa porta 3000), oppure avvia il gioco sul tuo computer seguendo il
> punto 2.

### Se vuoi provarlo sul tuo computer

```bash
cd masterRPG
npm run playtest          # prepara la sessione e avvia il server
```

Poi apri **http://localhost:3000** in Firefox. In console trovi anche
l'indirizzo di rete locale (`http://192.168.x.x:3000`) da digitare sul telefono:
telefono e computer devono essere sulla stessa Wi-Fi.

---

## 2. Quale browser scegliere

| Browser | Da quale versione | Come va |
|---|---|---|
| **Firefox** | **113+** (idealmente l'ultima, 128 ESR o superiore) | **Consigliato.** Tutto funziona, incluse le sfumature `color-mix()` |
| Chrome / Edge / Brave / Opera | 111+ (o 92+ con qualche colore semplificato) | Supportato, nessuna differenza visibile |
| Safari su macOS e iOS | 16.4+ | Supportato; sotto il 16.4 i titoli perdono la sfumatura ma restano leggibili |
| Firefox < 113, Safari < 16.2, Chrome < 111 | — | Funziona con colori semplificati grazie alla rete di sicurezza nel CSS |
| Internet Explorer | — | Non supportato (non gestisce i moduli ES) |

**In una riga**: Firefox aggiornato, oppure qualunque browser aggiornato. Non
esiste un browser "più adatto" nel senso di necessario: il gioco è stato scritto
per non dipendere da nessuno.

### Perché Firefox è una buona scelta per questo playtest

1. **Nessuna risorsa esterna.** Il gioco non carica font, script, immagini o
   analytics da altri domini: le protezioni anti-tracciamento di Firefox
   (*Protezione antitracciamento rigorosa*, *Total Cookie Protection*) non hanno
   nulla da bloccare e non possono rompere la pagina.
2. **Nessun cookie, nessun accesso.** L'unica memoria usata è `localStorage`, nel
   tuo browser, per ricordare l'ultima saga e la scheda del pannello aperta.
3. **Il registro del playtest resta sul server**, non nel browser: nessun dato
   personale lascia la macchina.
4. **Le illustrazioni sono file SVG** serviti come `image/svg+xml` e con
   `Cache-Control` immutabile: Firefox le tiene in cache e la navigazione resta
   istantanea anche sulla rete del telefono.

### Piccole differenze estetiche su Firefox (già gestite)

| Dettaglio | Che cosa succede |
|---|---|
| Barre di scorrimento | Firefox ignora `::-webkit-scrollbar`; il progetto imposta anche `scrollbar-width` e `scrollbar-color`, quindi restano scure e sottili |
| Titoli con sfumatura | Usano sia `background-clip: text` sia `-webkit-background-clip`, più un ripiego `@supports` per le versioni vecchie: mai invisibili |
| Selezione del testo | Colore dell'accento, come su Chrome |
| Scorrimento della striscia illustrazioni | `scroll-snap` e `overscroll-behavior-x` sono supportati: l'aggancio è identico |

---

## 3. Come verificarlo da solo

```bash
npm run prova:compatibilita
```

Il collaudo controlla, senza aprire un browser:

- **52 controlli** su funzionalità CSS/JS, versioni minime per Firefox, Safari e
  Chrome, e presenza di una via di ripiego per ognuna;
- che il server consegni i **tipi MIME corretti** — dettaglio decisivo, perché
  Firefox **rifiuta i moduli ES** serviti con un tipo sbagliato e non parte;
- che le cinque illustrazioni di un capitolo arrivino come **SVG ben formati**,
  con namespace dichiarato e senza caratteri che romperebbero il parser XML di
  Firefox (il più severo fra i browser);
- che la pagina non carichi **nulla in HTTP** (contenuto misto: Firefox lo
  blocca) e che tutte le chiamate siano a **indirizzi relativi**;
- che non ci sia nessuna dipendenza da funzionalità di un solo browser
  (`:has()`, container query, `@layer`, `subgrid`, proprietà `-moz-`).

Esito attuale:

```
✅ Collaudo di compatibilità SUPERATO: 52 controlli.
   Il gioco funziona su ogni browser moderno: Firefox 90+, Chrome 92+, Safari 16.4+.
   Nessuna risorsa esterna, nessun contenuto misto: le protezioni anti-tracciamento
   di Firefox non interferiscono.
```

---

## 4. Domande tipiche prima del playtest

**Devo installare qualcosa nel browser?** No. Nessuna estensione, nessun plugin,
nessun account.

**Serve la connessione a Internet?** Solo per raggiungere la pagina del gioco. Il
resto — generazione dei capitoli, illustrazioni, crediti — avviene sul server, in
locale: nessuna chiave API, nessun servizio terzo.

**Posso giocare in navigazione privata?** Sì. `localStorage` funziona anche lì;
alla chiusura della finestra si perde solo il promemoria dell'ultima saga, che si
recupera dall'archivio.

**Il telefono va bene?** Sì, ed è la metà importante della prova: il layout è
verificato da `npm run prova:mobile` (39 controlli) e il gioco è pensato per una
sessione a una mano sola.

**Cosa faccio se la pagina resta bianca?** Quasi sempre è un browser troppo
vecchio per i moduli ES, oppure un tipo MIME sbagliato dietro un proxy: apri la
console di Firefox (`F12`) e leggi l'errore, poi esegui
`npm run prova:compatibilita` sul server per capire quale dei due casi è.
