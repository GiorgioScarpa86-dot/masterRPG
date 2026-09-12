/**
 * capitolo.js — Il lettore di capitoli: testo con effetto macchina da scrivere,
 * scelte rapide (3-4) e campo di Azione Personalizzata.
 */

import { $, crea, svuota, nascondi, macchinaDaScrivere, toast } from "./ui.js";

const NOMI_TIPO = { audace: "Audace", prudente: "Prudente", astuta: "Astuta", empatica: "Empatica" };
const CONSIGLI_ATTESA = [
  "Il Game Master sta scrivendo il capitolo…",
  "Le fila della trama si intrecciano…",
  "Il destino prende appunti…",
  "Qualcuno, da qualche parte, sta per fare la sua mossa…"
];

export function creaCapitolo({ onInviaAzione }) {
  let bloccato = false;
  let tipoScelto = null;
  let animazione = null;
  let config = null;
  let collegato = false;

  /** Abilita o blocca le scelte rapide in base allo stato di gioco. */
  function sincronizzaScelte() {
    const inAttesaDiCapitolo = !$("#area-attesa").classList.contains("nascosto");
    const bloccate = bloccato || inAttesaDiCapitolo;
    $("#scelte").querySelectorAll("button").forEach((b) => { b.disabled = bloccate; });
  }

  function attivaScelte(attive) {
    svuota($("#scelte"));
    $("#blocco-scelte").classList.toggle("nascosto", !attive);
    $("#blocco-azione-libera").classList.toggle("nascosto", !attive);
    if (!attive) return;

    const capitolo = window.__partita?.storia?.at(-1);
    const opzioni = capitolo?.opzioni || [];
    const contenitore = $("#scelte");

    opzioni.forEach((opzione, indice) => {
      contenitore.appendChild(crea("button", {
        type: "button",
        classe: "scelta",
        disabled: bloccato,
        onclick: () => invia({
          testo: opzione.etichetta,
          opzioneId: opzione.id,
          tipoScelta: opzione.tipo
        }),
        onmouseenter: () => (tipoScelto = opzione.tipo)
      }, [
        crea("span", { classe: "scelta-tasto", testo: String(indice + 1) }),
        crea("span", { testo: opzione.etichetta }),
        crea("span", { classe: `scelta-tipo tipo-${opzione.tipo}`, testo: NOMI_TIPO[opzione.tipo] || "Scelta" })
      ]));
    });

    sincronizzaScelte();
  }

  /** Aggiorna lo stato del pulsante "Genera capitolo" e gestisce il capitolo d'apertura. */
  function aggiornaBottoneGenera() {
    const testo = $("#azione-personalizzata").value.trim();
    const saldo = window.__partita?.economia?.saldo ?? 0;
    const costo = config?.crediti?.costoCapitolo ?? 10;
    const primoCapitolo = !(window.__partita?.storia?.length);
    const bottone = $("#btn-genera");

    // Al primo capitolo non è obbligatorio scrivere un'azione: il proemio
    // viene generato anche a campo vuoto.
    bottone.disabled = bloccato || (!primoCapitolo && testo.length < 3);
    bottone.classList.toggle("primary", saldo >= costo);

    const etichetta = bottone.querySelector(".costo");
    if (etichetta) {
      etichetta.textContent = saldo >= costo ? `−${costo} Token Storia` : "Ricarica necessaria";
    }

    // Blocco "Inizio della saga": visibile solo finché non esiste un capitolo
    const bloccoProemio = $("#blocco-proemio");
    if (bloccoProemio) bloccoProemio.classList.toggle("nascosto", !primoCapitolo);

    // Il pulsante principale dell'area azione cambia etichetta al primo capitolo
    const primaParola = bottone.firstChild;
    if (primaParola && primaParola.nodeType === Node.TEXT_NODE) {
      primaParola.textContent = primoCapitolo ? "Genera il proemio " : "Genera capitolo ";
    }
    $("#btn-proemio").disabled = bloccato || saldo < costo;
  }

  async function invia(azione) {
    if (bloccato) return;
    bloccato = true;
    aggiornaBottoneGenera();
    sincronizzaScelte();
    try {
      await onInviaAzione(azione);
    } catch (errore) {
      console.error("Errore durante la generazione del capitolo:", errore);
      toast(errore?.message || "Non è stato possibile generare il capitolo.", "errore");
    } finally {
      bloccato = false;
      aggiornaBottoneGenera();
      sincronizzaScelte();
    }
  }

  function mostraAttesa(attivo) {
    const area = $("#area-attesa");
    area.classList.toggle("nascosto", !attivo);
    if (attivo) {
      $("#messaggio-attesa").textContent = CONSIGLI_ATTESA[Math.floor(Math.random() * CONSIGLI_ATTESA.length)];
    } else {
      aggiornaBottoneGenera();
    }
    sincronizzaScelte();
  }

  /** Disegna un capitolo (il più recente o uno scelto dal diario). */
  function disegna(capitolo, { animare = true, inModale = false } = {}) {
    const contenitore = inModale
      ? svuota($("#testo-capitolo-modale"))
      : svuota($("#capitolo-corrente"));

    if (!capitolo) {
      if (!inModale) {
        contenitore.appendChild(crea("h2", { classe: "capitolo-titolo", testo: "La tua saga è pronta" }));
        contenitore.appendChild(crea("div", { classe: "capitolo-testo" }, [
          crea("p", { testo: "Premi «Genera capitolo» per aprire il primo capitolo della storia — il proemio, scritto dal Game Master con il tuo protagonista e il primo personaggio secondario." })
        ]));
      }
      return;
    }

    if (inModale) {
      contenitore.appendChild(crea("p", { classe: "capitolo-numero", testo: `Capitolo ${capitolo.numero}` }));
      contenitore.appendChild(crea("h3", { classe: "capitolo-titolo", testo: capitolo.titolo }));
      const corpo = crea("div", { classe: "capitolo-testo" });
      contenitore.appendChild(corpo);
      macchinaDaScrivere(corpo, capitolo.testo, { attivo: false });
      if (capitolo.azioneGiocatore?.testo) {
        contenitore.appendChild(crea("p", {
          style: "margin-top:1rem;font-size:.82rem;color:var(--testo-tenue);background:rgba(255,255,255,.04);border-radius:10px;padding:.6rem .7rem",
          testo: `${capitolo.azioneGiocatore.tipo === "scelta" ? "Scelta" : "Azione personalizzata"} del giocatore: «${capitolo.azioneGiocatore.testo}»`
        }));
      }
      return;
    }

    contenitore.appendChild(crea("p", { classe: "capitolo-numero", testo: `Capitolo ${capitolo.numero}` }));
    contenitore.appendChild(crea("h2", { classe: "capitolo-titolo", testo: capitolo.titolo }));

    const corpo = crea("div", { classe: "capitolo-testo" });
    contenitore.appendChild(corpo);

    const piede = crea("div", { classe: "capitolo-piede" }, [
      crea("span", {
        classe: `motore-tag ${capitolo.motore || "locale"}`,
        testo: capitolo.motore === "llm" ? `Game Master IA · ${capitolo.provenienza}` : "Motore narrativo locale"
      }),
      crea("span", { testo: `${capitolo.parole} parole` }),
      crea("span", { testo: capitolo.azioneGiocatore?.testo ? `La tua mossa: ${capitolo.azioneGiocatore.testo}` : "Inizio della saga" })
    ]);
    contenitore.appendChild(piede);

    if (capitolo.note?.length) {
      contenitore.appendChild(crea("div", { classe: "nota-elaborazione", testo: `ℹ ${capitolo.note.join(" ")}` }));
    }

    animazione?.salta?.();
    animazione = macchinaDaScrivere(corpo, capitolo.testo, {
      attivo: animare && !window.__impostazioni?.senzaAnimazioni
    });

    contenitore.onclick = () => animazione?.salta?.();

    const suggerimento = crea("span", {
      style: "margin-left:auto;cursor:pointer;text-decoration:underline dotted",
      testo: "clic sul testo per mostrarlo tutto"
    });
    suggerimento.addEventListener("click", (evento) => {
      evento.stopPropagation();
      animazione?.salta?.();
    });
    animazione.promessa.then(() => suggerimento.remove());
    piede.appendChild(suggerimento);
  }

  function collega() {
    $("#azione-personalizzata").addEventListener("input", (evento) => {
      $("#conteggio-azione").textContent = String(evento.target.value.trim().length);
      aggiornaBottoneGenera();
    });

    $("#azione-personalizzata").addEventListener("keydown", (evento) => {
      if (evento.key === "Enter" && !evento.shiftKey) {
        evento.preventDefault();
        const testo = evento.target.value.trim();
        if (testo.length >= 3) invia({ testo });
        else toast("Scrivi almeno 3 caratteri per inviare la tua azione personalizzata.", "info");
      }
    });

    $("#btn-genera").addEventListener("click", () => {
      const testo = $("#azione-personalizzata").value.trim();
      const primoCapitolo = !(window.__partita?.storia?.length);
      if (primoCapitolo && testo.length < 3) return invia(null); // proemio senza azione
      if (testo.length >= 3) invia({ testo });
    });

    $("#btn-proemio").addEventListener("click", () => {
      const testo = $("#azione-personalizzata").value.trim();
      return invia(testo.length >= 3 ? { testo } : null);
    });

    // Scorciatoie da tastiera: 1-4 per le scelte rapide
    document.addEventListener("keydown", (evento) => {
      const inScrittura = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      if (inScrittura) return;
      const numero = Number(evento.key);
      if (!Number.isInteger(numero) || numero < 1 || numero > 4) return;
      const pulsanti = $$("#scelte .scelta");
      if (pulsanti[numero - 1] && !pulsanti[numero - 1].disabled) {
        evento.preventDefault();
        pulsanti[numero - 1].click();
      }
    });
  }

  function svuotaAzioneLibera() {
    $("#azione-personalizzata").value = "";
    $("#conteggio-azione").textContent = "0";
  }

  function configura(nuovaConfig) {
    config = nuovaConfig;
    if (!collegato) {
      collega();
      collegato = true;
    }
    aggiornaBottoneGenera();
  }

  return { configura, disegna, attivaScelte, mostraAttesa, aggiornaBottoneGenera, svuotaAzioneLibera, disegnaModale: (capitolo) => disegna(capitolo, { animare: false, inModale: true }) };
}

// piccolo helper locale, per non importare l'intero modulo ui
function $$(selettore) {
  return [...document.querySelectorAll(selettore)];
}
