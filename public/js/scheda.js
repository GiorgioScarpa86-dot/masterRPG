/**
 * scheda.js — Il pannello "Scheda del Personaggio e Storia".
 *
 * Tre schede interne:
 *   · Personaggio → protagonista, vitali, inventario, obiettivi;
 *   · Relazioni   → albero di fiducia a tre assi (Vincolo/Tensione/Rispetto),
 *                   elenco rapido e accesso alla scheda completa di ogni NPC;
 *   · Cronaca     → sinossi compressa e diario con le illustrazioni.
 *
 * Il pannello è pensato per funzionare identico su desktop (colonna laterale)
 * e su telefono (pannello a tutta larghezza, accessibile dal pulsante "Scheda").
 */

import { $, $$, crea, svuota, barra, iniziali, numeroIt } from "./ui.js";
import { disegnaAlbero, mostraSchedaNpc } from "./albero.js";

const CLASSI_RUOLO = {
  Alleata: "ruolo-alleato", Alleato: "ruolo-alleato", Amico: "ruolo-amico",
  Mentore: "ruolo-mentore", Rivale: "ruolo-rivale", Nemico: "ruolo-nemico",
  Sospetto: "ruolo-sospetto", Conoscente: "", "Interesse Amoroso": "ruolo-interesse-amoroso"
};

const RARITA_CLASSE = {
  comune: "rarita-comune",
  "non comune": "rarita-non-comune",
  raro: "rarita-raro",
  leggendario: "rarita-leggendario"
};

export function creaScheda({ onApriCapitolo, onApriIllustrazioni }) {
  let partita = null;
  let schedaAttiva = localStorage.getItem("masterrpg.scheda") || "personaggio";

  function disegna(nuovaPartita) {
    partita = nuovaPartita;
    if (!partita) return;
    const { scheda, configurazione } = partita;
    const protagonista = scheda.protagonista;

    // ── Protagonista ──
    $("#scheda-avatar").textContent = iniziali(protagonista.nome);
    $("#scheda-nome").textContent = protagonista.nome;
    $("#scheda-archetipo").textContent = protagonista.archetipo;
    $("#scheda-tratto").textContent = `«${protagonista.tratto}»`;
    $("#scheda-luogo").textContent = protagonista.luogo || "luogo da definire";
    $("#scheda-arco").textContent = `arco: ${protagonista.arco?.beat || "apertura"}`;

    const vitali = svuota($("#scheda-vitali"));
    vitali.appendChild(barra("vita", "Vita", protagonista.vitali.vita));
    vitali.appendChild(barra("energia", "Energia", protagonista.vitali.energia));
    vitali.appendChild(barra("tensione", "Tensione", protagonista.vitali.tensione));

    // ── Inventario ──
    const inventario = svuota($("#scheda-inventario"));
    $("#conteggio-inventario").textContent = scheda.inventario.length ? `${scheda.inventario.length} oggetti` : "";
    if (!scheda.inventario.length) {
      inventario.appendChild(crea("li", { testo: "Ancora nulla: il tuo viaggio è appena cominciato." }));
    } else {
      for (const oggetto of scheda.inventario) {
        inventario.appendChild(crea("li", {}, [
          crea("div", { classe: "oggetto-riga" }, [
            crea("span", { classe: "nome-oggetto", testo: `${oggetto.nome}${oggetto.quantita > 1 ? ` ×${oggetto.quantita}` : ""}` }),
            crea("span", { classe: `rarita ${RARITA_CLASSE[oggetto.rarita] || "rarita-comune"}`, testo: oggetto.rarita })
          ]),
          oggetto.descrizione ? crea("p", { classe: "descrizione", testo: oggetto.descrizione }) : null
        ]));
      }
    }

    // ── Obiettivi ──
    const obiettivi = svuota($("#scheda-obiettivi"));
    if (!scheda.obiettivi.length) {
      obiettivi.appendChild(crea("li", { testo: "Nessun obiettivo aperto: continua a giocare per scoprirne." }));
    } else {
      for (const obiettivo of scheda.obiettivi) {
        obiettivi.appendChild(crea("li", { classe: obiettivo.stato === "chiuso" ? "chiuso" : null, testo: obiettivo.testo }));
      }
    }

    disegnaRelazioni();

    // ── Sinossi ──
    const sinossi = svuota($("#scheda-sinossi"));
    if (!scheda.sinossi.length) {
      sinossi.appendChild(crea("li", { testo: "La storia non è ancora cominciata." }));
    } else {
      for (const voce of [...scheda.sinossi].reverse()) {
        const etichetta = voce.compresso ? `Capitoli ${voce.capitolo}-${voce.capitoloFine}` : `Capitolo ${voce.capitolo}`;
        sinossi.appendChild(crea("li", { classe: voce.compresso ? "riassunto" : null }, [
          crea("span", { classe: "cap-num", testo: etichetta }),
          document.createTextNode(voce.testo)
        ]));
      }
    }

    disegnaIntestazioneSaga();
    disegnaDiario();
    mostraScheda(schedaAttiva);
  }

  /** Albero di fiducia + elenco rapido dei legami. */
  function disegnaRelazioni() {
    const albero = partita.alberoFiducia || { nodi: [], conteggi: {} };
    const contenitore = svuota($("#albero-relazioni"));
    disegnaAlbero(contenitore, albero);

    // Rende ogni nodo toccabile: apre la scheda completa dell'NPC
    for (const nodo of contenitore.querySelectorAll(".nodo-albero")) {
      const dati = albero.nodi.find((n) => n.npc === nodo.dataset.npc);
      if (!dati) continue;
      const apri = () => mostraSchedaNpc(dati);
      nodo.addEventListener("click", apri);
      nodo.addEventListener("keydown", (evento) => {
        if (evento.key === "Enter" || evento.key === " ") {
          evento.preventDefault();
          apri();
        }
      });
    }

    const elenco = svuota($("#lista-relazioni-rapida"));
    if (!albero.nodi.length) {
      elenco.appendChild(crea("li", { classe: "nota", testo: "Nessun NPC incontrato finora." }));
      return;
    }

    for (const nodo of albero.nodi) {
      elenco.appendChild(crea("li", { classe: "relazione" }, [
        crea("button", {
          type: "button",
          classe: "relazione-bottone",
          onclick: () => mostraSchedaNpc(nodo)
        }, [
          crea("div", { classe: "riga-alta" }, [
            crea("span", { classe: "nome-npc", testo: nodo.npc }),
            crea("span", { classe: `ruolo ${CLASSI_RUOLO[nodo.ruolo] || ""}`, testo: nodo.ruolo })
          ]),
          crea("div", { classe: "assi-riga" }, [
            crea("span", { classe: "quadrante-tag", style: `color:${nodo.quadrante?.colore}`, testo: nodo.quadrante?.nome || "" }),
            crea("span", { classe: "tappe-contatore", testo: nodo.tappe?.length ? `${nodo.tappe.length} tappe` : "nessuna tappa" })
          ]),
          crea("div", { classe: "mini-assi" }, [
            crea("div", { classe: "mini-asse" }, [
              crea("span", { classe: "mini-etichetta", testo: "V" }),
              crea("div", { classe: "barra vita" }, [crea("i", { style: `width:${nodo.vincolo}%` })]),
              crea("span", { classe: "mini-valore", testo: String(nodo.vincolo) })
            ]),
            crea("div", { classe: "mini-asse" }, [
              crea("span", { classe: "mini-etichetta", testo: "T" }),
              crea("div", { classe: "barra tensione" }, [crea("i", { style: `width:${nodo.tensione}%` })]),
              crea("span", { classe: "mini-valore", testo: String(nodo.tensione) })
            ]),
            crea("div", { classe: "mini-asse" }, [
              crea("span", { classe: "mini-etichetta", testo: "R" }),
              crea("div", { classe: "barra energia" }, [crea("i", { style: `width:${nodo.rispetto}%` })]),
              crea("span", { classe: "mini-valore", testo: String(nodo.rispetto) })
            ])
          ]),
          nodo.nota ? crea("p", { classe: "nota", testo: nodo.nota }) : null
        ])
      ]));
    }
  }

  /** Cambia la scheda visibile nel pannello. */
  function mostraScheda(nome) {
    schedaAttiva = nome;
    localStorage.setItem("masterrpg.scheda", nome);
    for (const tab of $$(".scheda-tab")) {
      const attiva = tab.dataset.scheda === nome;
      tab.classList.toggle("attiva", attiva);
      tab.setAttribute("aria-selected", String(attiva));
    }
    for (const [id, vista] of [["personaggio", "#vista-personaggio"], ["relazioni", "#vista-relazioni"], ["cronaca", "#vista-cronaca"]]) {
      $(vista)?.classList.toggle("nascosto", id !== nome);
    }
  }

  function disegnaIntestazioneSaga() {
    const contenitore = svuota($("#intestazione-saga"));
    const { configurazione, storia } = partita;
    contenitore.appendChild(crea("h1", { classe: "titolo", testo: configurazione.titoloSaga }));
    contenitore.appendChild(crea("span", {
      classe: "tag-ambientazione",
      testo: configurazione.ambientazione.nome
    }));
    contenitore.appendChild(crea("span", {
      classe: "meta",
      testo: `${storia.length} capitoli · tono ${configurazione.tono} · ${numeroIt(partita.memoria?.paroleTotali || 0)} parole scritte`
    }));
  }

  function disegnaDiario() {
    const contenitore = svuota($("#elenco-capitoli"));
    const capitoli = [...partita.storia].reverse();
    $("#conteggio-capitoli").textContent = capitoli.length ? `${capitoli.length} capitoli` : "";

    if (!capitoli.length) {
      contenitore.appendChild(crea("p", { classe: "aiuto-blocco", testo: "Il diario si riempirà capitolo dopo capitolo." }));
      return;
    }

    for (const capitolo of capitoli) {
      // Ogni voce apre il capitolo nel modale di lettura; da lì si accede alle
      // illustrazioni salvate di quel capitolo.
      contenitore.appendChild(crea("article", { classe: "voce-capitolo" }, [
        crea("button", {
          type: "button",
          classe: "voce-capitolo-testo",
          onclick: () => onApriCapitolo(capitolo)
        }, [
          crea("div", { classe: "riga" }, [
            crea("span", { classe: "num", testo: `CAPITOLO ${capitolo.numero}` }),
            crea("span", { classe: "nome", testo: capitolo.titolo }),
            crea("span", { classe: "num", testo: `${capitolo.parole} parole` })
          ]),
          crea("span", { classe: "scelta", testo: capitolo.azioneGiocatore?.testo ? `La tua mossa: ${capitolo.azioneGiocatore.testo}` : "Apertura della saga" })
        ]),
        crea("button", {
          type: "button",
          classe: "btn mini ghost voce-capitolo-immagini",
          testo: "🖼 Illustrazioni",
          onclick: () => onApriIllustrazioni?.(capitolo)
        })
      ]));
    }
  }

  function collega() {
    for (const tab of $$(".scheda-tab")) {
      tab.addEventListener("click", () => mostraScheda(tab.dataset.scheda));
    }
  }

  /** Ridisegna il diario (il pannello resta sulla scheda scelta dal giocatore). */
  function mostraDiario() {
    if (partita?.storia?.length) disegnaDiario();
  }

  return {
    disegna, collega, mostraScheda, mostraDiario,
    intestazione: disegnaIntestazioneSaga,
    diario: disegnaDiario,
    relazioni: disegnaRelazioni
  };
}
