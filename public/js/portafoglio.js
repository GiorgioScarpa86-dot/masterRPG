/**
 * portafoglio.js — Modulo Token Storia: saldo nella barra superiore,
 * portafoglio con ricariche gratuite (missione giornaliera, spot fittizio,
 * ricarica d'emergenza anti-blocco), countdown ed estratto conto.
 */

import { $, crea, svuota, numeroIt, formattaData, toast, apriModale, chiudiModale } from "./ui.js";

export function creaPortafoglio({ onRicarica }) {
  let partita = null;
  let timer = null;

  function aggiorna(nuovaPartita) {
    partita = nuovaPartita;
    const saldo = partita?.economia?.saldo ?? 0;
    const costo = partita?.economia?.costoCapitolo ?? 10;
    $("#saldo-valore").textContent = numeroIt(saldo);

    const chip = $("#btn-portafoglio");
    chip.classList.toggle("attenzione", saldo < costo);
    chip.title = saldo >= costo
      ? `Token Storia: ${numeroIt(saldo)} — puoi generare ${Math.floor(saldo / costo)} capitoli`
      : `Token Storia insufficienti (${numeroIt(saldo)}): apri il portafoglio per la ricarica gratuita`;

    if (!$("#modale-portafoglio").classList.contains("nascosto")) disegnaModale();
  }

  function disegnaModale() {
    const economia = partita?.economia;
    const ricariche = partita?.ricariche;
    if (!economia || !ricariche) return;

    $("#portafoglio-saldo").textContent = numeroIt(economia.saldo);
    $("#portafoglio-capitoli").textContent = `Ogni capitolo costa ${economia.costoCapitolo} ${economia.valuta} · con questo saldo puoi scrivere ${ricariche.capitoliPossibili} capitoli`;

    const opzioni = svuota($("#opzioni-ricarica"));
    const voci = [
      {
        chiave: "missione",
        icona: "🗺",
        titolo: ricariche.missioneGiornaliera.etichetta,
        descrizione: `${ricariche.missioneGiornaliera.descrizione} · ${ricariche.missioneGiornaliera.restantiOggi}/${ricariche.missioneGiornaliera.totaleOggi} disponibili oggi`,
        disponibile: ricariche.missioneGiornaliera.disponibile,
        attesa: ricariche.missioneGiornaliera.attendiSecondi
      },
      {
        chiave: "spot",
        icona: "📺",
        titolo: ricariche.spotFittizio.etichetta,
        descrizione: ricariche.spotFittizio.descrizione,
        disponibile: ricariche.spotFittizio.disponibile,
        attesa: ricariche.spotFittizio.attendiSecondi
      },
      {
        chiave: "emergenza",
        icona: "🛟",
        titolo: ricariche.emergenza.etichetta,
        descrizione: ricariche.emergenza.descrizione,
        disponibile: ricariche.emergenza.disponibile,
        attesa: 0,
        emergenza: true
      }
    ];

    for (const voce of voci) {
      if (voce.chiave === "emergenza" && !voce.disponibile) continue;
      opzioni.appendChild(crea("div", { classe: `opzione-ricarica ${voce.emergenza ? "emergenza" : ""} ${voce.disponibile ? "" : "bloccata"}` }, [
        crea("span", { classe: "icona", testo: voce.icona }),
        crea("div", {}, [
          crea("div", { classe: "titolo", testo: `${voce.titolo} · +${numeroIt(economia.ricaricaQuantita)} Token Storia` }),
          crea("div", { classe: "descr", testo: voce.descrizione })
        ]),
        crea("button", {
          type: "button",
          classe: `btn ${voce.disponibile ? "primary" : "ghost"} piccolo`,
          disabled: !voce.disponibile,
          testo: voce.disponibile ? "Ottieni" : voce.attesa > 0 ? `Attendi ${voce.attesa}s` : "Non ora",
          onclick: () => chiamaRicarica(voce.chiave)
        })
      ]));
    }

    const movimenti = svuota($("#elenco-movimenti"));
    for (const movimento of economia.movimenti) {
      movimenti.appendChild(crea("li", {}, [
        crea("div", {}, [
          crea("span", { classe: `importo ${movimento.importo >= 0 ? "positivo" : "negativo"}`, testo: `${movimento.importo >= 0 ? "+" : ""}${numeroIt(movimento.importo)}` }),
          crea("span", { classe: "causale", testo: ` ${movimento.causale}` })
        ]),
        crea("time", { testo: formattaData(movimento.data) })
      ]));
    }
    if (!economia.movimenti.length) {
      movimenti.appendChild(crea("li", { testo: "Nessun movimento registrato." }));
    }
  }

  async function chiamaRicarica(modalita) {
    try {
      const esito = await onRicarica(modalita);
      if (esito) {
        toast(esito.messaggio, "crediti", 5000);
        aggiorna(esito.partita);
        disegnaModale();
      }
    } catch (errore) {
      toast(errore.message || "Ricarica non riuscita.", "errore");
      if (errore.dettagli?.attendiSecondi) avviaCountdown();
    }
  }

  function avviaCountdown() {
    clearInterval(timer);
    timer = setInterval(() => {
      if (!partita) return;
      const ricariche = partita.ricariche;
      const inAttesa = ricariche.missioneGiornaliera.attendiSecondi > 0 || ricariche.spotFittizio.attendiSecondi > 0;
      if (!inAttesa) {
        clearInterval(timer);
        return;
      }
      // Il countdown locale evita di martellare il server: si aggiorna ogni secondo
      ricariche.missioneGiornaliera.attendiSecondi = Math.max(0, ricariche.missioneGiornaliera.attendiSecondi - 1);
      ricariche.spotFittizio.attendiSecondi = Math.max(0, ricariche.spotFittizio.attendiSecondi - 1);
      if (ricariche.missioneGiornaliera.attendiSecondi === 0) ricariche.missioneGiornaliera.disponibile = ricariche.missioneGiornaliera.restantiOggi > 0;
      if (ricariche.spotFittizio.attendiSecondi === 0) ricariche.spotFittizio.disponibile = true;
      if (!$("#modale-portafoglio").classList.contains("nascosto")) disegnaModale();
    }, 1000);
  }

  function apri() {
    disegnaModale();
    apriModale("modale-portafoglio");
    avviaCountdown();
  }

  function collega() {
    $("#btn-portafoglio").addEventListener("click", apri);
    $("#btn-ricarica-rapida").addEventListener("click", apri);
    $("#btn-ricarica-principale").addEventListener("click", () => {
      const ricariche = partita?.ricariche;
      if (!ricariche) return;
      if (ricariche.emergenza.necessaria) return chiamaRicarica("emergenza");
      if (ricariche.missioneGiornaliera.disponibile) return chiamaRicarica("missione");
      return chiamaRicarica("spot");
    });
  }

  return { collega, aggiorna, apri, ridisegna: disegnaModale, avviaCountdown };
}
