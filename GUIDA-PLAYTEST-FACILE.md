# 🎮 Guida facile — far partire il gioco sul tuo computer (e giocare dal telefono)

Questa guida è scritta per chi **non è un programmatore** e **non ha mai usato Node**.
Non serve sapere cosa sia un terminale, un server o una riga di comando: si fa tutto
copiando e incollando, un passo alla volta.

**Tempo necessario:** circa 10 minuti la prima volta, 10 secondi tutte le volte successive.
**Cosa serve:** un computer (Windows o Mac), una connessione a Internet per scaricare i file,
e — per giocare dal telefono — la stessa rete Wi-Fi.

> ✅ Il gioco **non ha dipendenze**: una volta scaricato, funziona anche senza Internet.
> Non si paga nulla, non si crea nessun account, non serve nessuna chiave.

---

## Indice

1. [Cosa scarichiamo, in due parole](#1-cosa-scarichiamo-in-due-parole)
2. [Passo 1 — Installare Node.js](#2-passo-1--installare-nodejs)
3. [Passo 2 — Scaricare il gioco da GitHub](#3-passo-2--scaricare-il-gioco-da-github)
4. [Passo 3 — Avviare il gioco](#4-passo-3--avviare-il-gioco)
5. [Passo 4 — Giocare (trenta secondi di istruzioni)](#5-passo-4--giocare-trenta-secondi-di-istruzioni)
6. [Passo 5 — Chiudere il gioco](#6-passo-5--chiudere-il-gioco)
7. [📱 Giocare da un telefono Android](#7--giocare-da-un-telefono-android)
8. [Se qualcosa non funziona](#8-se-qualcosa-non-funziona)
9. [Comandi utili (facoltativi)](#9-comandi-utili-facoltativi)
10. [Per chi ci capisce di informatica](#10-per-chi-ci-capisce-di-informatica)

---

## 1. Cosa scarichiamo, in due parole

Il gioco è un progetto pronto all'uso. Per farlo girare servono **due cose**:

| Cosa | A che serve | Dove si prende |
|---|---|---|
| **Node.js** | È il programma che esegue il gioco sul tuo computer (una specie di lettore, come un lettore video ma per questo gioco) | [nodejs.org](https://nodejs.org) — gratis, 2 minuti |
| **Il gioco** (*MasterRPG — Cronache Infinite*) | I file del gioco | [github.com/GiorgioScarpa86-dot/masterRPG](https://github.com/GiorgioScarpa86-dot/masterRPG) |

Nient'altro. **Non** serve installare il gioco (niente `npm install`), **non** servono programmi
aggiuntivi e **non** serve essere collegati a Internet per giocare.

---

## 2. Passo 1 — Installare Node.js

### 2.1 Scaricalo

1. Apri il browser e vai su **<https://nodejs.org>**.
2. Vedi due pulsanti verdi: scegli quello che dice **LTS** (è la versione stabile, quella consigliata).
   Va benissimo una versione 22, 24 o successiva.
3. Il download parte da solo: otterrai un file tipo `node-v22.x.x-x64.msi` (Windows) oppure
   `node-v22.x.x.pkg` (Mac).

### 2.2 Installalo

**Se usi Windows**

1. Fai doppio clic sul file scaricato (lo trovi nella cartella *Download*).
2. Nella finestra che si apre: **Avanti** → spunta l'accettazione della licenza → **Avanti** →
   **Avanti** → **Installa**.
3. Se compare la richiesta di permessi di Windows («Vuoi consentire a questa app di modificare il
   dispositivo?») rispondi **Sì**.
4. Alla fine premi **Fine**.

> ⚠️ Nella schermata con la voce *«Tools for Native Modules»*: **lascia la casella vuota**.
> Non serve per questo gioco.

**Se usi Mac**

1. Fai doppio clic sul file `.pkg` scaricato.
2. **Continua** → **Continua** → **Accetto** → **Installa**. Ti verrà chiesta la password del Mac:
   è la stessa che usi per sbloccare il computer.
3. Alla fine premi **Chiudi**.

### 2.3 Apri il terminale

Il «terminale» è la finestra nera (o bianca) dove si scrivono i comandi. Si apre così:

| Sistema | Come aprirlo |
|---|---|
| **Windows** | Premi il tasto **Windows** (o clicca sull'icona Start), digita `prompt dei comandi` e premi **Invio**. In alternativa: digita `cmd` e premi **Invio**. |
| **Mac** | Premi **⌘ + Spazio**, digita `terminale` e premi **Invio**. |

### 2.4 Controlla che Node ci sia

Nella finestra del terminale scrivi questo (tutto minuscolo) e premi **Invio**:

```
node -v
```

Deve comparire qualcosa come:

```
v22.14.0
```

La cifra può essere diversa: l'importante è che ci sia e che il primo numero sia **18 o più grande**
(18, 20, 22, 24… vanno tutte bene).

> ❌ Se invece compare «*node non è riconosciuto*» / «*command not found*»: chiudi la finestra del
> terminale, aprine una nuova e riprova. Se ancora non va, rifai il passo 2.2 e, alla fine,
> **riavvia il computer**.

Per lo stesso motivo scrivi anche:

```
npm -v
```

e premi **Invio**: deve comparire un numero tipo `10.9.2`. (`npm` arriva insieme a Node.)

---

## 3. Passo 2 — Scaricare il gioco da GitHub

Ci sono due strade: **senza git** (consigliata, solo clic) e **con git** (se lo hai già).

### 3.1 Strada A — senza git (consigliata)

1. Apri **<https://github.com/GiorgioScarpa86-dot/masterRPG>**.
2. Clicca il pulsante verde **`<> Code`** (in alto a destra, sopra l'elenco dei file).
3. Nel menu che si apre clicca **Download ZIP**.
4. Vai nella cartella *Download*: trovi un file **`masterRPG-main.zip`**.
5. **Scompattalo:**
   - **Windows:** clic destro sul file → **Estrai tutto…** → **Estrai**. Otterrai una cartella
     `masterRPG-main`.
   - **Mac:** fai doppio clic sul file. Otterrai una cartella `masterRPG-main`.
6. **Sposta la cartella sul Desktop**, per trovarla facilmente. (Puoi spostarla dove preferisci:
   basta che ti ricordi dove l'hai messa.)

> 📌 Il link diretto per il file compresso è
> <https://github.com/GiorgioScarpa86-dot/masterRPG/archive/refs/heads/main.zip>
> — salvalo tra i preferiti: serve per ri-scaricare la versione più aggiornata.

### 3.2 Strada B — con git (solo se lo usi già)

Nel terminale:

```
git clone https://github.com/GiorgioScarpa86-dot/masterRPG.git
```

Si crea una cartella `masterRPG` (senza `-main`) nella tua cartella utente.

---

## 4. Passo 3 — Avviare il gioco

### 4.1 Entra nella cartella del gioco

Nel terminale bisogna «entrare» nella cartella che hai scompattato. Il comando è `cd` seguito dal
percorso della cartella.

**Windows** — se hai messo la cartella sul Desktop, scrivi:

```
cd %USERPROFILE%\Desktop\masterRPG-main
```

e premi **Invio**.

**Mac** — se hai messo la cartella sul Desktop, scrivi:

```
cd ~/Desktop/masterRPG-main
```

e premi **Invio**.

> 💡 **Trucco salvavita se la cartella è altrove:** scrivi `cd` (**senza** premere Invio), poi
> **trascina la cartella** dal Desktop o da Esplora file/Finder dentro la finestra del terminale:
> il percorso si scrive da solo. A quel punto premi **Invio**.

Per capire se sei nel posto giusto, scrivi `dir` (Windows) oppure `ls` (Mac) e premi **Invio**:
devi vedere dei nomi tipo `package.json`, `README.md`, `server`, `public`, `strumenti`.
Se non li vedi, il comando `cd` è sbagliato: rifallo.

### 4.2 Avvia il playtest

Adesso il comando che avvia tutto:

```
npm run playtest
```

e premi **Invio**. La prima volta ci mette 5–10 secondi.

Succederanno queste cose:

1. Compare il titolo del gioco e la scritta `Node …: versione adeguata`.
2. Si legge `Saga già preparata: «…»`: il gioco è pronto con una storia di prova.
3. **Windows** potrebbe chiedere: *«Consenti a Node.js di comunicare su reti private…»* →
   spunta **Reti private** e clicca **Consenti l'accesso**. (Serve solo per giocare dal telefono:
   se rispondi *Annulla*, sul computer funziona comunque.)
4. Compaiono gli indirizzi da aprire e un **codice QR** (serve per il telefono, vedi il capitolo 7).
5. In fondo appare la scritta `Il server è in ascolto. Buon playtest.` → **il gioco è acceso.**

> 🟢 **Importante:** quella finestra del terminale deve **restare aperta** mentre giochi.
> Se la chiudi, il gioco si spegne.

### 4.3 Apri il gioco nel browser

Apri il browser (Firefox va benissimo; anche Chrome, Edge, Brave o Safari) e vai a questo
indirizzo:

```
http://localhost:3000
```

In alternativa puoi cliccare l'indirizzo `http://localhost:3000` che il terminale ha stampato
(con `Ctrl + clic` su Windows, `⌘ + clic` su Mac).

Oh, e se hai sbagliato qualcosa nella digitazione del comando: niente panico.
Compare un messaggio d'errore in italiano, il gioco non si rompe, si riprova.

---

## 5. Passo 4 — Giocare (trenta secondi di istruzioni)

1. **Scegli l'ambientazione** (ce ne sono sette: cyberpunk, fantasy, horror, avventura…)
   oppure scrivi la tua, se preferisci inventarti un mondo.
2. **Crea il protagonista**: nome, archetipo e un tratto caratteriale.
3. **Leggi il capitolo**: 150–200 parole scritte al momento, con le battute dei personaggi.
4. **Scegli**: sotto il capitolo trovi 3–4 mosse pronte (un clic e si va avanti) **oppure**
   scrivi quello che vuoi fare tu, con parole tue, nel riquadro *«Azione personalizzata»*.
5. **Guarda le scene**: in alto ci sono **cinque illustrazioni** del capitolo; cliccane una per
   vederla grande.
6. **Controlla il pannello a destra** (sul telefono è sotto il capitolo): c'è la **scheda del
   personaggio** con l'inventario, l'**albero delle relazioni** con gli altri personaggi e il
   **diario dei capitoli**, così la storia non si perde mai per strada.
7. **Token Storia**: ogni capitolo costa 10 token, ne ricevi 1000 in regalo all'inizio e il
   pulsante **«Ricarica rapida»** te ne dà altri 500 **gratis e illimitate volte**. Il gioco non
   chiede mai soldi e non si blocca mai.

---

## 6. Passo 5 — Chiudere il gioco

Torna nella finestra del terminale e premi **`Ctrl + C`** (su Mac: `Ctrl + C`, non ⌘).
Il gioco si spegne e il terminale stampa il riepilogo della sessione.

Per riaccenderlo la volta dopo: apri il terminale, rifai il comando `cd` del passo 4.1 e poi
`npm run playtest`. **Non serve reinstallare nulla.**

---

## 7. 📱 Giocare da un telefono Android

Il gioco è già pensato per il telefono: i capitoli si leggono bene in verticale, i pulsanti sono
grandi e l'albero delle relazioni diventa una scheda a tutta larghezza.

### 7.1 Il modo facile: inquadri un codice QR (30 secondi)

1. Assicurati che il **telefono sia collegato alla stessa rete Wi-Fi del computer** (non ai dati
   mobili: proprio la stessa Wi-Fi).
2. Lascia acceso il gioco sul computer (`npm run playtest`): nel terminale, sotto la voce
   **INDIRIZZI**, trovi una riga tipo
   `Dal telefono:      http://192.168.1.34:3000   (stessa rete Wi-Fi)`
   e subito dopo il **codice QR**.
3. Sul telefono apri l'app **Fotocamera**, inquadra il codice e tocca il link che compare
   (su molti telefoni funziona anche **Google Lens** o il pulsante *Codici QR* dentro Chrome).
4. Si apre Chrome con il gioco già caricato: **non devi digitare nessun indirizzo**.

### 7.2 Mettere il gioco sulla schermata Home (comodissimo)

Dal telefono, con il gioco aperto in Chrome:

1. Tocca i **tre puntini** in alto a destra.
2. Scegli **Aggiungi a schermata Home** (o *Installa app*, se compare).
3. Sulla schermata Home compaiono l'icona e il nome del gioco: d'ora in poi si apre da lì con un
   tocco. *(Se il computer è spento o il gioco non è avviato, la pagina non carica: è normale,
   il gioco gira sul tuo computer.)*

### 7.3 Se il codice QR non si legge

- **Compare ma non parte niente:** apri Chrome e **digita a mano** l'indirizzo `http://192.168.…:3000`
  che vedi nel terminale (l'importante è `http://`, non `https://`).
- **La pagina non carica (gira a vuoto):** controlla nell'ordine
  1. il gioco è ancora acceso sul computer? (il terminale deve dire *«Il server è in ascolto»*);
  2. il telefono è davvero sulla **stessa** Wi-Fi? (i dati mobili non vanno bene: disattivali un attimo);
  3. Windows ha chiesto il permesso di rete e hai risposto *Annulla*? Fai così:
     **Sicurezza di Windows** → **Firewall e protezione rete** → **Consenti un'app attraverso il
     firewall** → spunta **Privato** accanto a **Node.js JavaScript Runtime** → **OK**;
  4. il router «isola» i dispositivi fra loro (succede in alcune case e in molti hotel): la soluzione
     più rapida è **usare l'hotspot del telefono** — accendi l'hotspot sul telefono, collega il
     computer a quella rete, riavvia `npm run playtest` e usa il nuovo indirizzo `http://…:3000`
     che compare nel terminale.
- **Il codice QR è storto o illeggibile:** non è un errore, il codice si legge anche con caratteri
  di dimensioni diverse. Se il terminale è troppo piccolo, allarga la finestra o riduci lo zoom
  (`Ctrl` + rotellina del mouse): il codice resta identico.

### 7.4 Giocare da un'altra rete (dati mobili, o un amico a casa sua)

Se siete **fuori casa** o non potete stare sulla stessa Wi-Fi, si apre un **link pubblico** con un
comando solo. Sul computer (terminal, nella cartella del gioco):

```
npm run playtest -- --pubblico
```

Il gioco cerca sul tuo computer uno degli strumenti gratuiti `cloudflared` o `ngrok` e stampa un
indirizzo tipo `https://qualcosa.trycloudflare.com`: quello si apre da qualunque telefono, anche in
dati mobili, e si può mandare a chi vuoi.

Se non trova quegli strumenti, il terminale stampa le istruzioni per installarli (2 minuti):

| Sistema | Comando |
|---|---|
| Windows | `winget install --id Cloudflare.cloudflared` |
| Mac (con Homebrew) | `brew install cloudflared` |

Poi ripeti `npm run playtest -- --pubblico`. Il link resta attivo **finché la finestra del terminale
è aperta**: chiudendo con `Ctrl + C` il link sparisce da solo.

> 🔒 Il link pubblico è aperto a chi lo conosce: usalo per far provare il gioco a qualcuno di
> fiducia e chiudilo quando avete finito.

---

## 8. Se qualcosa non funziona

| Messaggio / problema | Cosa vuol dire | Cosa fare |
|---|---|---|
| `node non è riconosciuto…` / `command not found: node` | Node non è installato, oppure hai aperto il terminale prima di installarlo | Chiudi e riapri il terminale. Se non basta, rifai il [passo 2](#2-passo-1--installare-nodejs) e riavvia il computer. |
| `npm: command not found` | Come sopra: `npm` arriva con Node | Reinstalla Node dal [passo 2](#2-passo-1--installare-nodejs). |
| `ENOENT … package.json` oppure `Could not read package.json` | Il terminale è nella cartella sbagliata | Rifai il [passo 4.1](#41-entra-nella-cartella-del-gioco) e controlla con `dir`/`ls` di vedere `package.json`. |
| `EADDRINUSE … 3000` | Un altro programma sta già usando la porta 3000 (magari il gioco è già acceso in un'altra finestra) | Usa un'altra porta: `npm run playtest -- --porta 3100`, poi apri `http://localhost:3100`. |
| Il browser dice «Impossibile raggiungere il sito» | Il gioco non è in funzione (finestra chiusa, oppure avvio non riuscito) | Guarda la finestra del terminale: deve esserci scritto *«Il server è in ascolto»*. In caso contrario rilancia `npm run playtest`. |
| Il telefono non carica la pagina | Firewall, Wi-Fi diversa o router che isola i dispositivi | Vedi il [capitolo 7.3](#73-se-il-codice-qr-non-si-legge). |
| Il computer si addormenta e il telefono si scollega | Il computer mette in pausa il gioco | Nelle impostazioni risparmio energetico del computer, evita la sospensione mentre giochi. |
| «I Token Storia sono finiti» | Hai consumato i 10 token di un capitolo senza saldo | Premi **Ricarica rapida**: 500 token gratis, quante volte vuoi. Il gioco **non** si blocca mai. |
| Una pagina bianca, o testo strano | Quasi sempre è la cache del browser | Ricarica con `Ctrl + F5` (Mac: `⌘ + Maiusc + R`). |
| Vuoi essere sicuro che sia tutto a posto | — | Nella cartella del gioco, lancia `npm run collaudo`: esegue tutte le verifiche automatiche e stampa un riepilogo di ✅ e ❌. |

---

## 9. Comandi utili (facoltativi)

Da scrivere nel terminale, dentro la cartella del gioco:

| Comando | Cosa fa |
|---|---|
| `npm run playtest` | Avvia una sessione di prova già pronta (saga, istruzioni, QR per il telefono). |
| `npm run playtest -- --porta 3100` | Come sopra, ma su un'altra porta (se la 3000 è occupata). |
| `npm run playtest -- --saga-vuota` | Parte dalla creazione della saga, per provare anche quella schermata. |
| `npm run playtest -- --pubblico` | Apre un link condivisibile per giocare da un'altra rete. |
| `npm run playtest:riepilogo` | Mostra il riepilogo degli eventi della sessione di prova. |
| `npm run collaudo` | Tutte le verifiche automatiche: dice se il gioco è pronto. |
| `npm run prova:qr` | Verifica il codice QR usato per il telefono. |
| `npm start` | Avvia il gioco «liscio», senza preparativi (per uso quotidiano). |

Se un comando `npm` ti dà fastidio, funziona lo stesso tutto in versione esplicita, per esempio:

```
node strumenti/avvia-playtest.js
```

---

## 10. Per chi ci capisce di informatica

- **Requisito:** Node.js **≥ 18** (testato con Node 22). Nessuna dipendenza npm, nessun
  `npm install`: solo moduli nativi (`node:http`, `node:fs`, `fetch`, `node:crypto`).
- **Struttura:** `server/` (API e motore narrativo), `public/` (interfaccia, CSS e JavaScript lato
  client in moduli ES), `strumenti/` (avvio playtest, collaudo, test), `docs/` (documentazione),
  `dati/` (partite salvate ed eventi di playtest, creati al primo avvio).
- **Avvio diretto:** `node server/index.js` (porta da `PORT`, default 3000, in ascolto su `0.0.0.0`
  per consentire l'accesso dalla LAN).
- **Motore:** `locale` (procedurale, offline) per default; se è definita `OPENAI_API_KEY` (o
  `LLM_API_KEY`) usa un endpoint compatibile OpenAI, con fallback automatico sul motore locale.
- **Tunnel:** `npm run playtest -- --pubblico` cerca `cloudflared` e poi `ngrok` nel `PATH` e ne
  estrae l'URL pubblico (`*.trycloudflare.com`), chiudendolo all'uscita.
- **QR:** `server/utilita/qr.js` è un codificatore QR scritto a mano (modo byte, livello M,
  versioni 1–10), verificato modulo per modulo contro una libreria di riferimento e riletto con un
  lettore reale — vedi `strumenti/prova-qr.js` e `npm run prova:qr`.
- **Verifiche:** `npm run collaudo` (8 suite: contratto HTML/JS, compatibilità browser, layout
  mobile, QR, illustrazioni, motore su 150 capitoli, anti-blocco crediti, interfaccia pilotata).

Buon playtest! 🎲
