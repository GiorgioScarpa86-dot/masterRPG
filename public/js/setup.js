/**
 * setup.js — Schermata di configurazione: scelta dell'ambientazione
 * (preset o testo libero), creazione del protagonista e del tono narrativo.
 */

import { $, crea, svuota, mostra, nascondi, toast, numeroIt } from "./ui.js";
import { api, ErroreApi } from "./api.js";

export function creaSetup({ onPartitaCreata, onContinuaSaga }) {
  let config = null;
  let ambientazioneScelta = null;
  let tonoScelto = "epico";

  function disegnaAmbientazioni() {
    const griglia = svuota($("#griglia-ambientazioni"));
    const elenco = [
      ...config.ambientazioni,
      { id: "personalizzata", nome: "Crea il tuo mondo", sottotitolo: "Scrivi due frasi e lascia fare al Game Master", emoji: "✨", personalizzata: true, colori: { primo: "#c084fc", secondo: "#34d399" } }
    ];

    for (const ambiente of elenco) {
      const bottone = crea("button", {
        type: "button",
        classe: "ambientazione",
        role: "radio",
        "aria-checked": String(ambientazioneScelta === ambiente.id),
        style: ambiente.colori ? `--acc:${ambiente.colori.primo}` : null,
        onclick: () => {
          ambientazioneScelta = ambiente.id;
          if (ambiente.colori) {
            document.documentElement.style.setProperty("--accento-1", ambiente.colori.primo);
            document.documentElement.style.setProperty("--accento-2", ambiente.colori.secondo);
          }
          disegnaAmbientazioni();
          ambiente.id === "personalizzata" ? mostra($("#blocco-personalizzata")) : nascondi($("#blocco-personalizzata"));
          if (ambiente.id === "personalizzata") $("#testo-ambientazione").focus();
          $("#errore-setup").classList.add("nascosto");
        }
      }, [
        crea("span", { classe: "emoji", testo: ambiente.emoji || "✦" }),
        crea("span", { classe: "nome", testo: ambiente.nome }),
        crea("span", { classe: "sotto", testo: ambiente.sottotitolo || ambiente.descrizione || "" })
      ]);
      griglia.appendChild(bottone);
    }
  }

  function disegnaToni() {
    const griglia = svuota($("#griglia-toni"));
    for (const tono of config.toni) {
      griglia.appendChild(crea("button", {
        type: "button",
        classe: "tono",
        role: "radio",
        "aria-checked": String(tonoScelto === tono.id),
        onclick: () => { tonoScelto = tono.id; disegnaToni(); }
      }, [
        crea("span", { classe: "nome", testo: tono.nome }),
        crea("span", { classe: "descr", testo: tono.descrizione })
      ]));
    }
  }

  function riempiCampi() {
    const selettoreArchetipi = $("#archetipo-protagonista");
    const selettoreTratti = $("#tratto-protagonista");
    for (const archetipo of config.archetipi) selettoreArchetipi.appendChild(crea("option", { value: archetipo, testo: archetipo }));
    for (const tratto of config.tratti) selettoreTratti.appendChild(crea("option", { value: tratto, testo: tratto }));

    const casuale = () => config.nomiSuggeriti[Math.floor(Math.random() * config.nomiSuggeriti.length)];
    $("#nome-protagonista").value = casuale();
    $("#nome-protagonista").placeholder = casuale();
    selettoreArchetipi.selectedIndex = Math.floor(Math.random() * config.archetipi.length);
    selettoreTratti.selectedIndex = Math.floor(Math.random() * config.tratti.length);

    $("#btn-nome-casuale").addEventListener("click", () => {
      const nome = casuale();
      $("#nome-protagonista").value = nome;
      aggiornaTitoloSaga();
    });

    $("#nome-protagonista").addEventListener("input", aggiornaTitoloSaga);

    const contatoreAmbientazione = () => {
      $("#conteggio-ambientazione").textContent = String($("#testo-ambientazione").value.trim().length);
    };
    $("#testo-ambientazione").addEventListener("input", () => {
      contatoreAmbientazione();
      aggiornaTitoloSaga();
    });
    contatoreAmbientazione();
  }

  let titoloModificatoAMano = false;

  function aggiornaTitoloSaga() {
    if (titoloModificatoAMano) return;
    const nome = $("#nome-protagonista").value.trim() || "Rei";
    let titolo = `Le Cronache di ${nome}`;
    if (ambientazioneScelta === "personalizzata") {
      const testo = $("#testo-ambientazione").value.trim();
      const primaFrase = testo.split(/[.!?\n]/)[0].trim();
      if (primaFrase.length > 6 && primaFrase.length <= 48) titolo = `${primaFrase} — Le Cronache di ${nome}`;
    }
    $("#titolo-saga-input").value = titolo;
  }

  function modalita() {
    if (!config) return "…";
    return config.motore === "llm"
      ? { classe: "llm", testo: "Game Master IA esterno" }
      : { classe: "locale", testo: "Motore narrativo locale" };
  }

  function mostraErrore(messaggio) {
    const errore = $("#errore-setup");
    errore.textContent = messaggio;
    errore.classList.remove("nascosto");
  }

  async function invia(evento) {
    evento.preventDefault();
    const errore = $("#errore-setup");
    errore.classList.add("nascosto");

    const nome = $("#nome-protagonista").value.trim();
    if (nome.length < 2) return mostraErrore("Scrivi il nome del protagonista (almeno 2 caratteri).");
    if (!ambientazioneScelta) return mostraErrore("Scegli un'ambientazione fra quelle proposte, oppure crea il tuo mondo.");

    const testoLibero = $("#testo-ambientazione").value.trim();
    if (ambientazioneScelta === "personalizzata" && testoLibero.length < 20) {
      return mostraErrore("Descrivi il tuo mondo con almeno 20 caratteri: bastano due frasi evocative.");
    }

    const bottone = $("#form-nuova-saga button[type=submit]");
    bottone.disabled = true;
    const testoOriginale = bottone.textContent;
    bottone.textContent = "Preparo la tua saga…";

    try {
      const esito = await api.creaPartita({
        titoloSaga: $("#titolo-saga-input").value.trim(),
        tono: tonoScelto,
        ambientazione: ambientazioneScelta === "personalizzata"
          ? { id: "personalizzata", testoUtente: testoLibero }
          : { id: ambientazioneScelta },
        protagonista: {
          nome,
          archetipo: $("#archetipo-protagonista").value,
          tratto: $("#tratto-protagonista").value
        }
      });
      toast(`Bonus di benvenuto accreditato: ${numeroIt(esito.bonus)} Token Storia. La saga comincia!`, "crediti", 6000);
      onPartitaCreata(esito.partita);
    } catch (e) {
      mostraErrore(e instanceof ErroreApi ? e.message : "Errore imprevisto durante la creazione della saga.");
      bottone.disabled = false;
      bottone.textContent = testoOriginale;
    }
  }

  async function aggiornaElencoSaghe() {
    const bottone = $("#btn-continua-saga");
    try {
      const { partite } = await api.elencoSaghe();
      if (!partite?.length) {
        nascondi(bottone);
        return null;
      }
      const ultima = partite[0];
      bottone.textContent = `Continua «${ultima.titoloSaga}» (${ultima.capitoli} capitoli)`;
      mostra(bottone);
      return partite;
    } catch {
      nascondi(bottone);
      return null;
    }
  }

  async function avvia(nuovaConfig) {
    config = nuovaConfig;
    ambientazioneScelta = config.ambientazioni[0]?.id || "personalizzata";
    const badge = $("#badge-motore");
    const m = modalita();
    badge.textContent = m.testo;
    badge.className = `badge ${m.classe}`;

    disegnaAmbientazioni();
    disegnaToni();
    riempiCampi();
    aggiornaTitoloSaga();

    $("#titolo-saga-input").addEventListener("input", () => { titoloModificatoAMano = true; });
    $("#form-nuova-saga").addEventListener("submit", invia);
    $("#btn-continua-saga").addEventListener("click", async () => {
      const partite = await aggiornaElencoSaghe();
      if (partite?.length) onContinuaSaga(partite[0].id);
    });

    await aggiornaElencoSaghe();
  }

  return {
    avvia,
    aggiornaElencoSaghe,
    impostaAmbientazioneColori(colori) {
      if (!colori) return;
      document.documentElement.style.setProperty("--accento-1", colori.primo);
      document.documentElement.style.setProperty("--accento-2", colori.secondo);
    }
  };
}

