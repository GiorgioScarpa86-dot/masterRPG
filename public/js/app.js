/**
 * app.js — Regista dell'applicazione: collega configurazione, setup,
 * ciclo dei capitoli, scheda, portafoglio e archivio delle saghe.
 */

import { $, $$, crea, svuota, mostra, nascondi, toast, apriModale, chiudiModale, inizializzaModali, collegaConferma, conferma, formattaDataBreve, numeroIt } from "./ui.js";
import { api, ErroreApi } from "./api.js";
import { creaSetup } from "./setup.js";
import { creaCapitolo } from "./capitolo.js";
import { creaScheda } from "./scheda.js";
import { creaPortafoglio } from "./portafoglio.js";
import { creaIllustrazioni } from "./illustrazioni.js";
import { creaPlaytest } from "./playtest.js";

const CHIAVE_ULTIMA_SAGA = "masterrpg.ultimaSaga";

// ─────────────────────────── Stato globale dell'app ───────────────────────────
window.__partita = null;
window.__impostazioni = { senzaAnimazioni: false };

const stato = { config: null, partita: null, inAttesa: false };

// ─────────────────────────── Moduli ───────────────────────────
const scheda = creaScheda({
  onApriCapitolo: (capitolo) => {
    capitoloModale.disegnaModale(capitolo);
    apriModale("modale-capitolo");
  },
  onApriIllustrazioni: (capitolo) => illustrazioni.apriCapitolo(capitolo),
  onMostraMemoria: () => apriMemoria(),
  onApriPortafoglio: () => portafoglio.apri()
});

const playtest = creaPlaytest({ api });
const illustrazioni = creaIllustrazioni({ api, onScenaAperta: (capitolo, indice) => playtest.scenaAperta(capitolo, indice) });

const capitoloModale = creaCapitolo({ onInviaAzione: inviaAzione });

const portafoglio = creaPortafoglio({
  onRicarica: async (modalita) => {
    const esito = await api.ricarica(stato.partita.id, modalita);
    applicaPartita(esito.partita);
    return esito;
  }
});

const setup = creaSetup({
  onPartitaCreata: async (partita) => {
    localStorage.setItem(CHIAVE_ULTIMA_SAGA, partita.id);
    entraInGioco(partita);
    toast(`${partita.configurazione.titoloSaga}: la tua avventura comincia. Genera il primo capitolo quando vuoi.`, "ok", 6000);
  },
  onContinuaSaga: async (id) => {
    try {
      const { partita } = await api.leggiPartita(id);
      entraInGioco(partita);
    } catch (errore) {
      toast(errore.message, "errore");
    }
  }
});

// ─────────────────────────── Ambientazione → colori e sfondo ───────────────────────────
const PALETTE_LIBERA = { primo: "#c084fc", secondo: "#34d399" };

function applicaColoriAmbientazione(ambientazioneId) {
  const preset = stato.config?.ambientazioni?.find((a) => a.id === ambientazioneId);
  const colori = preset?.colori || PALETTE_LIBERA;
  document.documentElement.style.setProperty("--accento-1", colori.primo);
  document.documentElement.style.setProperty("--accento-2", colori.secondo);
}

// ─────────────────────────── Navigazione fra le schermate ───────────────────────────
function entraInGioco(partita) {
  nascondi($("#schermata-avvio"));
  mostra($("#schermata-gioco"));
  applicaColoriAmbientazione(partita.configurazione.ambientazione.id);
  applicaPartita(partita);
  playtest.avvia(partita);
  const capitoli = partita.storia;
  if (capitoli.length) {
    capitoloModale.disegna(capitoli[capitoli.length - 1], { animare: false });
    capitoloModale.attivaScelte(true);
    scheda.mostraDiario();
  } else {
    capitoloModale.disegna(null);
    capitoloModale.attivaScelte(false);
  }
  capitoloModale.aggiornaBottoneGenera();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function tornaAlSetup() {
  mostra($("#schermata-avvio"));
  nascondi($("#schermata-gioco"));
  $("#titolo-saga").textContent = "Nessuna saga attiva";
  stato.partita = null;
  window.__partita = null;
  setup.aggiornaElencoSaghe();
}

/** Aggiorna tutta l'interfaccia a partire dalla vista partita ricevuta dal server. */
function applicaPartita(partita) {
  stato.partita = partita;
  window.__partita = partita;
  $("#titolo-saga").textContent = partita.configurazione.titoloSaga;
  scheda.disegna(partita);
  portafoglio.aggiorna(partita);
  playtest.capitoloGenerato(partita);
  illustrazioni.aggiorna(partita);
  capitoloModale.aggiornaBottoneGenera();
  const ultimo = partita.storia.at(-1);
  if (ultimo && ultimo.numero === partita.storia.length) scheda.mostraDiario();
}

// ─────────────────────────── Ciclo di generazione ───────────────────────────
async function inviaAzione(azione) {
  if (!stato.partita || stato.inAttesa) return;
  if (!azione && stato.partita.storia.length) return; // serve un'azione per proseguire
  stato.inAttesa = true;
  capitoloModale.mostraAttesa(true);
  const avvisoRicarica = mostraAvvisatoreRicarica();

  try {
    const esito = await api.generaCapitolo(stato.partita.id, azione);
    applicaPartita(esito.partita);
    capitoloModale.svuotaAzioneLibera();
    capitoloModale.disegna(esito.capitolo, { animare: true });
    capitoloModale.attivaScelte(esito.capitolo.opzioni.length > 0);
    capitoloModale.aggiornaBottoneGenera();

    // Le nuove illustrazioni entrano con una lieve animazione
    illustrazioni.aggiorna(esito.partita, { animare: true });

    // Si torna all'inizio del capitolo se il giocatore si trovava più in basso
    const capitoloEl = $("#capitolo-corrente");
    if (capitoloEl && window.scrollY > capitoloEl.offsetTop + 120) {
      window.scrollTo({ top: Math.max(0, capitoloEl.offsetTop - 90), behavior: "smooth" });
    }

    if (esito.capitolo.note?.length) {
      toast(esito.capitolo.note[0], "info", 7000);
    }
    const ricariche = esito.partita.ricariche;
    if (ricariche.emergenza.necessaria) {
      toast("Token Storia quasi esauriti: hai a disposizione la Ricarica d'Emergenza gratuita (+500).", "crediti", 7000);
      $("#btn-portafoglio").classList.add("attenzione");
    }
  } catch (errore) {
    if (errore instanceof ErroreApi && errore.codice === "SALDO_INSUFFICIENTE") {
      toast(`${errore.message} Nessun problema: la ricarica gratuita è a un clic di distanza.`, "crediti", 6500);
      await apriRicaricaConRitorno();
    } else {
      toast(errore.message || "Non è stato possibile generare il capitolo.", "errore", 7000);
    }
  } finally {
    stato.inAttesa = false;
    avvisoRicarica?.remove();
    capitoloModale.mostraAttesa(false);
  }
}

/** Mostra un suggerimento temporaneo quando il saldo è insufficiente. */
function mostraAvvisatoreRicarica() {
  const saldo = stato.partita?.economia?.saldo ?? 0;
  const costo = stato.partita?.economia?.costoCapitolo ?? 10;
  if (saldo >= costo) return null;
  const avviso = crea("div", { classe: "nota-elaborazione", testo: "🪙 Token Storia insufficienti: ti propongo la ricarica gratuita…" });
  $("#area-attesa")?.appendChild(avviso);
  return avviso;
}

/** Apre il portafoglio e, se l'utente ricarica, prosegue automaticamente. */
async function apriRicaricaConRitorno() {
  portafoglio.apri();
  const ricariche = stato.partita?.ricariche;
  if (ricariche?.emergenza?.necessaria) {
    try {
      const esito = await api.ricarica(stato.partita.id, "emergenza");
      applicaPartita(esito.partita);
      portafoglio.ridisegna();
      toast(esito.messaggio, "crediti", 6000);
      chiudiModale("modale-portafoglio");
    } catch (errore) {
      toast(errore.message, "errore");
    }
  }
}

// ─────────────────────────── Memoria iniettata ───────────────────────────
async function apriMemoria() {
  if (!stato.partita) return;
  try {
    const esito = await api.memoria(stato.partita.id);
    $("#testo-memoria").textContent = esito.digest;
    apriModale("modale-memoria");
  } catch (errore) {
    toast(errore.message, "errore");
  }
}

// ─────────────────────────── Archivio delle saghe ───────────────────────────
async function apriArchivio() {
  const contenitore = svuota($("#elenco-saghe"));
  apriModale("modale-archivio");
  contenitore.appendChild(crea("p", { classe: "aiuto-blocco", testo: "Caricamento delle saghe salvate…" }));

  let partite = [];
  try {
    ({ partite } = await api.elencoSaghe());
  } catch (errore) {
    svuota(contenitore).appendChild(crea("p", { classe: "errore", testo: errore.message }));
    return;
  }

  svuota(contenitore);
  if (!partite.length) {
    contenitore.appendChild(crea("p", { classe: "aiuto-blocco", testo: "Non ci sono ancora saghe salvate: crea la tua prima avventura!" }));
    return;
  }

  for (const voce of partite) {
    const attiva = voce.id === stato.partita?.id;
    contenitore.appendChild(crea("div", { classe: `saga-voce ${attiva ? "attiva" : ""}` }, [
      crea("div", {}, [
        crea("div", { classe: "titolo", testo: voce.titoloSaga || "Saga senza titolo" }),
        crea("div", {
          classe: "meta",
          testo: `${voce.ambientazione || "—"} · ${voce.protagonista || "—"} · ${voce.capitoli} capitoli · ${numeroIt(voce.saldo)} Token · ${formattaDataBreve(voce.aggiornataIl)}`
        })
      ]),
      crea("div", { classe: "azioni" }, [
        crea("button", {
          type: "button",
          classe: "btn piccolo primary",
          testo: attiva ? "In corso" : "Riprendi",
          disabled: attiva,
          onclick: async () => {
            const { partita } = await api.leggiPartita(voce.id);
            localStorage.setItem(CHIAVE_ULTIMA_SAGA, partita.id);
            chiudiModale("modale-archivio");
            entraInGioco(partita);
            toast(`Saga ripresa: ${partita.configurazione.titoloSaga}.`, "ok");
          }
        }),
        crea("button", {
          type: "button",
          classe: "btn piccolo ghost",
          testo: "Elimina",
          onclick: async () => {
            const ok = await conferma({
              titolo: "Eliminare questa saga?",
              testo: `«${voce.titoloSaga}» (${voce.capitoli} capitoli) verrà rimossa definitivamente dal server.`,
              etichettaConferma: "Elimina definitivamente"
            });
            if (!ok) return;
            try {
              await api.elimina(voce.id);
              toast("Saga eliminata.", "ok");
              if (attiva) tornaAlSetup();
              apriArchivio();
            } catch (errore) {
              toast(errore.message, "errore");
            }
          }
        })
      ])
    ]));
  }
}

// ─────────────────────────── Pannello laterale ───────────────────────────
function impostaPannello(visibile) {
  $(".layout")?.classList.toggle("pannello-chiuso", !visibile);
  visibile ? mostra($("#pannello-scheda")) : nascondi($("#pannello-scheda"));
  $("#btn-pannello").setAttribute("aria-expanded", String(visibile));
  localStorage.setItem("masterrpg.pannello", visibile ? "aperto" : "chiuso");
}

// ─────────────────────────── Avvio ───────────────────────────
let avviato = false;

async function avvia() {
  if (avviato) return; // evita doppi collegamenti se l'evento viene emesso più volte
  avviato = true;
  inizializzaModali();
  collegaConferma();
  portafoglio.collega();
  scheda.collega();
  illustrazioni.collega();
  playtest.collega();

  // Scorciatoie da tastiera: ← → nella galleria, Esc chiude i modali
  $("#btn-galleria").addEventListener("click", () => {
    const capitolo = stato.partita?.storia?.at(-1);
    if (!capitolo) {
      toast("Genera il primo capitolo per vedere le illustrazioni.", "info");
      return;
    }
    illustrazioni.apriCapitolo(capitolo);
  });

  $("#btn-pannello").addEventListener("click", () => impostaPannello($("#pannello-scheda").classList.contains("nascosto")));
  $("#btn-chiudi-pannello").addEventListener("click", () => impostaPannello(false));
  $("#btn-archivio").addEventListener("click", apriArchivio);
  $("#btn-memoria-iniettata").addEventListener("click", apriMemoria);
  $("#btn-nuova-saga").addEventListener("click", () => {
    tornaAlSetup();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  $("#btn-esporta").addEventListener("click", () => {
    if (!stato.partita) return;
    window.location.href = api.urlEsporta(stato.partita.id);
    toast("Esportazione avviata: riceverai il romanzo in Markdown.", "ok");
  });

  impostaPannello(localStorage.getItem("masterrpg.pannello") !== "chiuso");

  try {
    stato.config = await api.config();
    capitoloModale.configura(stato.config);
    await setup.avvia(stato.config);

    // Ripristino automatico dell'ultima saga giocata (anche se il proemio
    // non è ancora stato scritto: la saga resta riprendibile).
    const ultima = localStorage.getItem(CHIAVE_ULTIMA_SAGA);
    if (ultima) {
      try {
        const { partita } = await api.leggiPartita(ultima);
        entraInGioco(partita);
        toast(
          partita.storia.length
            ? `Bentornato! Riprendi da «${partita.configurazione.titoloSaga}», capitolo ${partita.storia.length}.`
            : `La saga «${partita.configurazione.titoloSaga}» ti aspetta: scrivi il proemio quando vuoi.`,
          "info",
          6000
        );
      } catch {
        localStorage.removeItem(CHIAVE_ULTIMA_SAGA);
      }
    }
  } catch (errore) {
    toast(errore.message || "Impossibile contattare il server di gioco.", "errore", 9000);
  }
}

document.addEventListener("DOMContentLoaded", avvia);
