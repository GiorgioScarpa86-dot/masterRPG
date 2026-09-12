/**
 * scheda.js — Il pannello "Scheda del Personaggio e Storia":
 * protagonista e vitali, inventario, relazioni con gli NPC, obiettivi,
 * sinossi dei capitoli e diario della saga.
 */

import { $, crea, svuota, mostra, nascondi, barra, iniziali, numeroIt } from "./ui.js";

const CLASSI_RUOLO = {
  Alleata: "ruolo-alleata", Alleato: "ruolo-alleato", Amico: "ruolo-amico",
  Mentore: "ruolo-mentore", Rivale: "ruolo-rivale", Nemico: "ruolo-nemico",
  Sospetto: "ruolo-sospetto", Conoscente: "", "Interesse Amoroso": "ruolo-interesse-amoroso"
};

const RARITA_CLASSE = {
  comune: "rarita-comune",
  "non comune": "rarita-non-comune",
  raro: "rarita-raro",
  leggendario: "rarita-leggendario"
};

export function creaScheda({ onApriCapitolo }) {
  let partita = null;

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

    // ── Relazioni ──
    const relazioni = svuota($("#scheda-relazioni"));
    if (!scheda.relazioni.length) {
      relazioni.appendChild(crea("li", { classe: "relazione" }, [
        crea("p", { classe: "nota", testo: "Nessun NPC incontrato finora." })
      ]));
    } else {
      for (const relazione of scheda.relazioni) {
        relazioni.appendChild(crea("li", { classe: "relazione" }, [
          crea("div", { classe: "riga-alta" }, [
            crea("span", { classe: "nome-npc", testo: relazione.npc }),
            crea("span", { classe: `ruolo ${CLASSI_RUOLO[relazione.ruolo] || ""}`, testo: relazione.ruolo })
          ]),
          crea("div", { classe: "fiducia-barra" }, [
            crea("div", { classe: "barra energia" }, [crea("i", { style: `width:${relazione.fiducia}%` })]),
            crea("span", { testo: `${relazione.fiducia}/100` })
          ]),
          relazione.nota ? crea("p", { classe: "nota", testo: relazione.nota }) : null
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
    nascondi($("#sezione-diario"));

    for (const capitolo of capitoli) {
      contenitore.appendChild(crea("button", {
        type: "button",
        classe: "voce-capitolo",
        onclick: () => onApriCapitolo(capitolo)
      }, [
        crea("div", { classe: "riga" }, [
          crea("span", { classe: "num", testo: `CAPITOLO ${capitolo.numero}` }),
          crea("span", { classe: "nome", testo: capitolo.titolo }),
          crea("span", { classe: "num", testo: `${capitolo.parole} parole` })
        ]),
        crea("span", { classe: "scelta", testo: capitolo.azioneGiocatore?.testo ? `La tua mossa: ${capitolo.azioneGiocatore.testo}` : "Apertura della saga" })
      ]));
    }
  }

  function mostraDiario() {
    if (partita?.storia?.length) mostra($("#sezione-diario"));
  }

  return { disegna, mostraDiario, intestazione: disegnaIntestazioneSaga, diario: disegnaDiario };
}
