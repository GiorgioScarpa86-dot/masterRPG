# ▶ Avvia il playtest — istruzioni in una pagina

Questa è la guida operativa per far giocare qualcuno **adesso**.
Tutto è già pronto: non serve installare nulla.

---

## 1. Comandi

```bash
cd masterRPG

npm run collaudo     # 1. verifica che sia tutto a posto (un minuto)
npm run playtest     # 2. avvia la sessione di prova
```

Il secondo comando fa da solo: azzera i dati di prova, prepara una saga pronta,
avvia il server e stampa **che cosa dire al giocatore** e l'indirizzo da aprire.

Non hai `npm`? Va bene lo stesso:

```bash
node strumenti/avvia-playtest.js
```

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
| I collaudi jsdom dicono che manca jsdom | `npm install --no-save jsdom` (serve **solo** per i collaudi, mai per giocare) |
| Il gioco sembra lento al primo capitolo | è la prima chiamata; dal secondo in poi ogni capitolo richiede pochi millisecondi |
| Vuoi ricominciare da zero | ferma tutto, cancella `dati/` e riavvia con `npm run playtest` |
