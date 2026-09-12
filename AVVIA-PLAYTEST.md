# ▶ Avvia il playtest — istruzioni in una pagina

Questa è la guida operativa per far giocare qualcuno **adesso**.
Tutto è già pronto: non serve installare nulla.

---

## 0. Come aprire il gioco

### A. Dentro questa sessione di Arena (per una prova al volo)

Usa il pannello **«Anteprima dal vivo»** dell'interfaccia di Arena, quello collegato al processo
**MasterRPG — Cronache Infinite**: è il link ufficiale della piattaforma e punta già alla porta
giusta.

> Il vecchio indirizzo `https://3000-i334ygdrwl1xq32mnbl81.e2b.app` che ti avevo indicato **non è
> valido**: risponde «sandbox wasn't found». Era una mia deduzione dal nome interno della sandbox, non
> un indirizzo verificato. La sandbox non è raggiungibile pubblicamente dall'esterno, quindi usa il
> pannello di anteprima oppure la strada B.

### B. Sul tuo computer (consigliato per un playtest vero)

```bash
git clone https://github.com/GiorgioScarpa86-dot/masterRPG.git
cd masterRPG
npm run playtest          # prepara la sessione e avvia il server
```

Poi apri **http://localhost:3000** in Firefox. In console trovi anche l'indirizzo di rete locale
(`http://192.168.x.x:3000`) e il **codice QR** da inquadrare col telefono collegato alla stessa
Wi-Fi: si apre il gioco senza digitare nulla.

Serve solo **Node 18 o superiore**: zero dipendenze, nessun `npm install`.

> 🧑‍🏫 **Mai usato Node? Non sei un programmatore?** Segui la
> **[`GUIDA-PLAYTEST-FACILE.md`](GUIDA-PLAYTEST-FACILE.md)**: installazione di Node.js,
> download del progetto, avvio e gioco da telefono Android spiegati clic per clic.
> Se non hai `git`, la guida parte dal pulsante **Download ZIP** di GitHub.

### C. Link pubblico, per far giocare qualcuno che non è sulla tua rete

```bash
npm run playtest -- --pubblico
```

Il comando cerca `cloudflared` (gratuito, nessun account) o `ngrok` sul tuo computer e apre un
indirizzo `https://…` condivisibile con chiunque, anche dal telefono e in Firefox. Se non li trova,
stampa come installarli in dieci secondi. Il link vive finché la sessione resta aperta: chiudendo con
`Ctrl+C` il tunnel si chiude da solo.

### Browser

**Firefox va benissimo**, anzi è consigliato (dall'ultima versione; in generale 113 o superiore).
Funzionano anche Chrome, Edge e Safari 16.4+. Nessuno richiede installazioni, estensioni o account:
il gioco non carica nulla da Internet e non usa cookie. Dettagli in
[`docs/06-browser.md`](docs/06-browser.md).

---

## 1. Comandi

```bash
cd masterRPG

npm run collaudo     # 1. verifica che sia tutto a posto (avvia anche il server)
npm run playtest     # 2. avvia la sessione di prova
```

Il secondo comando fa da solo: azzera i dati di prova, prepara una saga pronta,
avvia il server e stampa **che cosa dire al giocatore** e l'indirizzo da aprire.

Non hai `npm`? Va bene lo stesso:

```bash
node strumenti/avvia-playtest.js
```

---

## 1b. Giocare dal telefono

1. Telefono e computer sulla **stessa rete Wi-Fi**.
2. All'avvio del playtest, nel terminale compare il **codice QR** dell'indirizzo di rete locale.
3. Apri la **fotocamera** del telefono, inquadra il codice, tocca il link: il gioco si apre in Chrome.
4. Per averlo a portata di tocco: menu di Chrome → **Aggiungi a schermata Home**.

Se il telefono non carica la pagina, la causa è quasi sempre il firewall di Windows (va concesso
l'accesso a Node.js sulle **reti private**) oppure un router che isola i dispositivi: in quel caso
la soluzione più rapida è collegare il computer all'**hotspot del telefono** e riavviare il playtest.
Tutti i dettagli, con le alternative, sono nella
**[`GUIDA-PLAYTEST-FACILE.md`](GUIDA-PLAYTEST-FACILE.md)** (capitolo 7).

### Varianti utili

| Comando | Quando usarlo |
|---|---|
| `npm run playtest` | sessione tipo: saga già pronta, registro azzerato |
| `npm run playtest -- --saga-vuota` | vuoi provare anche la creazione del personaggio |
| `npm run playtest -- --conserva` | più sessioni di fila sullo stesso registro |
| `npm run playtest -- --porta 8080` | la porta 3000 è occupata |
| `npm run playtest -- --produzione` | come un giocatore vero, senza strumenti di prova |

---

## 2. Che cosa dire a chi gioca (trenta secondi)

> «Questo è un gioco di ruolo narrativo: leggi il capitolo, scegli una delle
> mosse, oppure scrivi la tua azione con parole tue. Ogni capitolo è scritto al
> momento e le tue scelte cambiano la storia. In alto trovi le illustrazioni del
> capitolo: toccane una per vederla grande. Nel pannello a destra — o sotto il
> capitolo, dal telefono — ci sono la scheda, le relazioni e il diario. I Token
> Storia sono gratuiti: quando finiscono, il pulsante di ricarica ne dà altri 500
> senza spendere nulla.»

Poi **non aggiungere altro** e osserva. Se si blocca per più di un minuto, segna
la domanda che fa con le sue parole: è il dato più utile della sessione.

---

## 3. Che cosa guardare (e annotare)

| Momento | Cosa conta |
|---|---|
| Primo capitolo | Capisce da solo che deve scegliere? |
| Secondo e terzo | Il testo lo tiene agganciato? Ride, si spaventa, commenta? |
| Terzo capitolo | Compare da solo il modulo «Come sta andando?»: lascialo compilare |
| Qualsiasi momento | Apre le illustrazioni toccandole? Le ignora? |
| Dopo due capitoli | Apre «Relazioni» e guarda l'albero di fiducia? |
| Fine sessione | Ha capito che i crediti sono gratuiti? Rigiocherebbe? |

Annota tre cose per ogni problema: **minuto**, **che cosa stava facendo**,
**che cosa ha detto o fatto**.

---

## 4. Cosa succede in automatico

Il gioco registra la sessione in **locale**, senza dati personali
(`dati/playtest/eventi-AAAA-MM-GG.jsonl`): capitoli generati, tempi, quante
illustrazioni sono state aperte, ricariche usate, pareri raccolti.

Dal riepilogo del pulsante **📊 Riepilogo playtest** (nel pannello) o dal
terminale vedi subito i numeri:

```bash
npm run playtest:riepilogo
```

Il comando stampa anche **il capitolo massimo raggiunto da ogni sessione** e
alcuni suggerimenti automatici (per esempio: «le illustrazioni vengono aperte di
rado»). Il protocollo completo è in
[`docs/05-playtest.md`](docs/05-playtest.md).

---

## 5. Chiudere la sessione

Premi `Ctrl+C` nel terminale: il gioco si chiude e ricevi il **riepilogo della
sessione**. Potrai ripeterlo in qualunque momento con
`npm run playtest:riepilogo`.

Per giocare dal telefono: il comando di avvio stampa un indirizzo tipo
`http://192.168.1.x:3000` — apri quello, con telefono e computer sulla stessa
rete Wi-Fi. La partita è la stessa, i salvataggi sono sul computer.

---

## 6. Se qualcosa non funziona

| Sintomo | Rimedio |
|---|---|
| `Porta 3000 già in uso` | `npm run playtest -- --porta 8080` |
| Il telefono non apre la pagina | controlla che sia sulla stessa Wi-Fi; il firewall del computer deve permettere la porta |
| Pagina bianca su un browser vecchio | `npm run prova:compatibilita` dice quale versione minima serve e se il problema è il tipo MIME |
| Il link pubblico non si apre | il tunnel è stato chiuso, oppure `cloudflared`/`ngrok` non è installato: rilancia `npm run playtest -- --pubblico` |
| Un amico fuori rete vuole giocare | `npm run playtest -- --pubblico` sul tuo computer: ottieni un indirizzo `https://…` da mandargli |
| I collaudi jsdom dicono che manca jsdom | `npm install --no-save jsdom` (serve **solo** per i collaudi, mai per giocare); con `npm run collaudo` vengono saltati senza interrompere il resto |
| Il gioco sembra lento al primo capitolo | è la prima chiamata; dal secondo in poi ogni capitolo richiede pochi millisecondi |
| Vuoi ricominciare da zero | ferma tutto, cancella `dati/` e riavvia con `npm run playtest` |
