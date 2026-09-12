/**
 * playtest.js — Strumenti per il test giocato reale.
 *
 *   · traccia gli eventi di gioco (in modo anonimo, solo in locale sul server);
 *   · offre un modulo di parere in quattro domande dopo qualche capitolo;
 *   · mostra al facilitatore il riepilogo della sessione.
 *
 * Nessun dato personale viene raccolto: niente nomi, niente email, niente IP.
 * Il registro vive in `dati/playtest/` accanto ai salvataggi.
 */

import { $, crea, svuota, apriModale, chiudiModale, toast } from "./ui.js";

const CHIAVE_SESSIONE = "masterrpg.sessionePlaytest";
const CHIAVE_PARERE = "masterrpg.parereLasciato";

export function creaPlaytest({ api }) {
  let partita = null;
  let inizioSessione = Date.now();
  let inizioCapitolo = Date.now();
  let ultimoNumero = 0;

  /** Identificativo anonimo della sessione (serve solo a raggruppare gli eventi). */
  function sessione() {
    let id = localStorage.getItem(CHIAVE_SESSIONE);
    if (!id) {
      id = `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      localStorage.setItem(CHIAVE_SESSIONE, id);
    }
    return id;
  }

  /** Invia un evento al registro. Un errore di rete non disturba il gioco. */
  function traccia(tipo, dati = {}) {
    try {
      api.eventoPlaytest({ tipo, sessione: sessione(), ...dati }).catch(() => {});
    } catch {
      // ignorato di proposito
    }
  }

  function avvia(nuovaPartita) {
    partita = nuovaPartita;
    inizioSessione = Date.now();
    inizioCapitolo = Date.now();
    ultimoNumero = nuovaPartita?.storia?.length || 0;
    traccia("sessione-avviata", {
      saga: nuovaPartita?.id,
      capitoli: ultimoNumero,
      larghezza: (typeof window !== "undefined" && window.innerWidth) || 0,
      tipoDispositivo: (typeof window !== "undefined" && window.innerWidth <= 900) ? "telefono" : "computer"
    });
  }

  /** Da chiamare dopo ogni capitolo generato. */
  function capitoloGenerato(partitaAggiornata) {
    partita = partitaAggiornata;
    const numero = partitaAggiornata?.storia?.length || 0;
    if (numero <= ultimoNumero) return;
    ultimoNumero = numero;
    traccia("capitolo-letto", {
      saga: partitaAggiornata.id,
      numero,
      millisecondiLettura: Date.now() - inizioCapitolo
    });
    inizioCapitolo = Date.now();

    // Dopo il terzo capitolo si propone il modulo di parere, una volta sola.
    if (numero >= 3 && !localStorage.getItem(CHIAVE_PARERE)) {
      setTimeout(() => apriParere("automatico"), 1800);
    }
  }

  function scenaAperta(capitolo, indice) {
    traccia("scena-aperta", { saga: partita?.id, numero: capitolo?.numero, indice });
  }

  // ─────────────────────────── Modulo di parere ───────────────────────────
  let voto = 0;

  function disegnaStelle() {
    const contenitore = svuota($("#parere-voto"));
    for (let i = 1; i <= 5; i++) {
      const stella = crea("button", {
        type: "button",
        classe: `stella ${i <= voto ? "attiva" : ""}`,
        "aria-label": `${i} su 5`,
        testo: "★",
        onclick: () => {
          voto = i;
          disegnaStelle();
        }
      });
      contenitore.appendChild(stella);
    }
    $("#parere-voto-etichetta").textContent = voto ? `${voto} su 5` : "Tocca le stelle";
  }

  function apriParere(origine = "manuale") {
    voto = 0;
    disegnaStelle();
    $("#parere-chiarezza").value = "";
    $("#parere-piace").value = "";
    $("#parere-confusione").value = "";
    $("#parere-commento").value = "";
    $("#parere-origine").textContent = origine === "automatico"
      ? "Hai giocato qualche capitolo: due minuti del tuo parere valgono oro."
      : "Raccontaci com'è andata: serve a migliorare il gioco.";
    apriModale("modale-parere");
  }

  async function inviaParere() {
    if (!voto) {
      toast("Dai un voto da 1 a 5 stelle prima di inviare.", "info");
      return;
    }
    const dati = {
      saga: partita?.id,
      voto,
      chiarezza: $("#parere-chiarezza").value,
      piace: $("#parere-piace").value.trim().slice(0, 300),
      confusione: $("#parere-confusione").value.trim().slice(0, 300),
      commento: $("#parere-commento").value.trim().slice(0, 400),
      capitoliGiocati: partita?.storia?.length || 0,
      durataSessioneMinuti: Math.round((Date.now() - inizioSessione) / 60000)
    };
    try {
      await api.eventoPlaytest({ tipo: "parere", sessione: sessione(), ...dati });
      localStorage.setItem(CHIAVE_PARERE, "1");
      chiudiModale("modale-parere");
      toast("Grazie! Il tuo parere è stato registrato per il playtest.", "ok", 6000);
    } catch (errore) {
      toast(errore.message || "Non è stato possibile inviare il parere.", "errore");
    }
  }

  /** Riepilogo per il facilitatore (visibile dal pannello). */
  async function apriRiepilogo() {
    const contenitore = svuota($("#contenuto-riepilogo"));
    contenitore.appendChild(crea("p", { classe: "aiuto-blocco", testo: "Raccolta dei dati della sessione…" }));
    apriModale("modale-riepilogo");
    try {
      const { riepilogo } = await api.riepilogoPlaytest();
      svuota(contenitore);
      const righe = [
        ["Sessioni", riepilogo.sessioni],
        ["Saghe create", riepilogo.saghe],
        ["Capitoli generati", riepilogo.capitoli],
        ["Tempo medio per capitolo", `${riepilogo.tempiCapitolo.mediaSecondi} s`],
        ["Parole per capitolo", riepilogo.parolePerCapitolo],
        ["Illustrazioni aperte", riepilogo.sceneAperte],
        ["Ricariche gratuite", riepilogo.ricariche],
        ["Pareri raccolti", riepilogo.pareri],
        ["Voto medio", riepilogo.votoMedio ? `${riepilogo.votoMedio} / 5` : "—"]
      ];
      const tabella = crea("dl", { classe: "npc-assi" });
      for (const [voce, valore] of righe) {
        tabella.appendChild(crea("dt", { testo: voce }));
        tabella.appendChild(crea("dd", { testo: String(valore ?? "—") }));
      }
      contenitore.appendChild(tabella);

      if (riepilogo.capitoliPerSaga.length) {
        contenitore.appendChild(crea("h4", { classe: "titolo-blocco", testo: "Dove si sono fermati i giocatori" }));
        const elenco = crea("ul", { classe: "lista-sinossi" });
        for (const voce of riepilogo.capitoliPerSaga) {
          elenco.appendChild(crea("li", { testo: `${voce.saga}: fino al capitolo ${voce.massimoCapitolo}` }));
        }
        contenitore.appendChild(elenco);
      }

      if (riepilogo.commenti.length) {
        contenitore.appendChild(crea("h4", { classe: "titolo-blocco", testo: "Pareri dei giocatori" }));
        for (const commento of riepilogo.commenti) {
          contenitore.appendChild(crea("div", { classe: "npc-nota" }, [
            crea("p", { testo: `${"★".repeat(Number(commento.voto) || 0)} — «${commento.commento || commento.piace || commento.confusione || ""}»` }),
            commento.confusione ? crea("p", { classe: "aiuto-blocco piccolo", testo: `Confusione: ${commento.confusione}` }) : null
          ]));
        }
      }

      contenitore.appendChild(crea("p", {
        classe: "aiuto-blocco piccolo",
        testo: "Dati conservati solo in locale, senza informazioni personali. File: dati/playtest/eventi-*.jsonl"
      }));
    } catch (errore) {
      svuota(contenitore).appendChild(crea("p", { classe: "errore", testo: errore.message }));
    }
  }

  function collega() {
    $("#btn-parere").addEventListener("click", () => apriParere("manuale"));
    $("#btn-invia-parere").addEventListener("click", inviaParere);
    $("#btn-riepilogo").addEventListener("click", apriRiepilogo);

    // La chiusura della finestra è l'ultimo evento utile di una sessione
    window.addEventListener("pagehide", () => {
      traccia("sessione-chiusa", {
        saga: partita?.id,
        capitoli: partita?.storia?.length || 0,
        durataMinuti: Math.round((Date.now() - inizioSessione) / 60000)
      });
    });
  }

  return { avvia, capitoloGenerato, scenaAperta, traccia, collega, apriParere, apriRiepilogo };
}
