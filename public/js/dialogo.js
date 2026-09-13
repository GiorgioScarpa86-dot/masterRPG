/**
 * dialogo.js — Modalità Personaggio: conversazione diretta con un NPC.
 *
 * Ispirata alla Character Mode di OOC: chat libera e gratuita in cui ogni
 * personaggio risponde in prima persona, ricorda la storia condivisa
 * (fatti, promesse, impressioni) e cambia umore con ciò che il giocatore
 * scrive. Gli assi dell'albero di fiducia si muovono anche conversando.
 */

import { $, crea, svuota, apriModale, chiudiModale, toast, iniziali } from "./ui.js";
import { api } from "./api.js";

const CLASSI_QUADRANTE = {
  alleanza: "ruolo-alleato",
  rivalita: "ruolo-rivale",
  ostilita: "ruolo-nemico",
  crocevia: ""
};

export function creaDialogo({ onPartitaAggiornata }) {
  let npcAttivo = null;
  let inAttesa = false;
  let collegato = false;
  let bollaAttesa = null;

  /** Apre la conversazione con un NPC e carica la cronologia. */
  async function apri(nomeNpc) {
    const partita = window.__partita;
    if (!partita) return;
    if (!partita.storia?.length) {
      toast("Scrivi prima il proemio: è lì che incontri i personaggi con cui parlare.", "info", 6500);
      return;
    }

    npcAttivo = nomeNpc;
    $("#titolo-chat").textContent = `Modalità Personaggio · ${nomeNpc}`;
    $("#chat-nome-npc").textContent = nomeNpc;
    svuota($("#chat-messaggi"));
    svuota($("#chat-profilo-npc"));
    svuota($("#chat-memoria"));
    $("#chat-testo").value = "";
    $("#conteggio-chat").textContent = "0";
    $("#btn-chat-invia").disabled = true;
    apriModale("modale-chat");
    aggiungiAttesa(`${nomeNpc} ti sta ascoltando…`);

    try {
      const dati = await api.storiaDialogo(partita.id, nomeNpc);
      rimuoviAttesa();
      disegnaProfilo(dati);
      disegnaMemoria(dati.memoria);
      for (const battuta of dati.battute) aggiungiBolla(battuta, nomeNpc);
      if (!dati.battute.length) {
        $("#chat-messaggi").appendChild(crea("p", {
          classe: "chat-vuoto",
          testo: `${nomeNpc} è davanti a te. Qualunque cosa tu dica, risponderà a modo suo.`
        }));
      }
      scorriInFondo();
      $("#chat-testo").focus();
    } catch (errore) {
      rimuoviAttesa();
      chiudiModale("modale-chat");
      toast(errore.message || "Impossibile aprire la conversazione.", "errore");
    }
  }

  /** Intestazione della chat: avatar, ruolo, assi del rapporto. */
  function disegnaProfilo(dati) {
    const contenitore = $("#chat-profilo-npc");
    svuota(contenitore);
    const rel = dati.relazione || {};
    const classeQ = CLASSI_QUADRANTE[rel.quadrante] || "";
    contenitore.appendChild(crea("div", { classe: "chat-profilo-riga" }, [
      crea("div", { classe: "avatar chat-avatar", testo: iniziali(dati.npc) }),
      crea("div", { classe: "chat-profilo-dati" }, [
        crea("span", { classe: "chat-npc", testo: dati.npc }),
        crea("span", { classe: `ruolo ${classeQ}`, testo: rel.ruolo || "Conoscente" })
      ]),
      crea("span", { classe: "chat-gratis", testo: "gratis · senza limiti" })
    ]));
    contenitore.appendChild(crea("div", { classe: "chat-assi" }, [
      asse("Vincolo", rel.vincolo, "#4ade80"),
      asse("Tensione", rel.tensione, "#fb7185"),
      asse("Rispetto", rel.rispetto, "#60a5fa")
    ]));
  }

  function asse(nome, valore, colore) {
    return crea("div", { classe: "chat-asse" }, [
      crea("span", { classe: "chat-asse-nome", testo: nome }),
      crea("div", { classe: "barra", html: `<i style="width:${Math.max(2, Number(valore) || 0)}%;background:${colore}"></i>` }),
      crea("span", { classe: "chat-asse-valore", testo: String(Math.round(Number(valore) || 0)) })
    ]);
  }

  /** "Cosa ricorda di te": fatti, promesse, impressione (memoria profonda). */
  function disegnaMemoria(memoria) {
    const contenitore = $("#chat-memoria");
    svuota(contenitore);
    if (!memoria || (!memoria.fatti?.length && !memoria.promesse?.length && !memoria.impressione)) {
      contenitore.appendChild(crea("p", {
        classe: "aiuto-blocco piccolo",
        testo: "Non vi conoscete ancora abbastanza: i ricordi compariranno parlando e vivendo la storia insieme."
      }));
      return;
    }
    if (memoria.impressione) {
      contenitore.appendChild(crea("p", { classe: "chat-ricordo impressione", testo: `Impressione di te: ${memoria.impressione}` }));
    }
    for (const fatto of memoria.fatti || []) {
      contenitore.appendChild(crea("p", { classe: "chat-ricordo", testo: `✦ ${fatto}` }));
    }
    for (const promessa of memoria.promesse || []) {
      contenitore.appendChild(crea("p", { classe: "chat-ricordo promessa", testo: `🤝 ${promessa}` }));
    }
  }

  /** Aggiunge una bolla alla conversazione. */
  function aggiungiBolla(battuta, nomeNpc) {
    const contenitore = $("#chat-messaggi");
    const vuoto = contenitore.querySelector(".chat-vuoto");
    vuoto?.remove();

    const tua = battuta.da === "tu";
    const bolla = crea("div", { classe: `chat-bolla ${tua ? "tua" : "npc"}` }, [
      !tua ? crea("span", { classe: "chat-avatar-mini", testo: iniziali(nomeNpc) }) : null,
      crea("div", { classe: "chat-bolla-corpo" }, [
        crea("p", { classe: "chat-testo", testo: battuta.testo }),
        battuta.emozione ? crea("span", { classe: "chat-emozione", testo: battuta.emozione }) : null
      ])
    ]);
    contenitore.appendChild(bolla);
    return bolla;
  }

  function aggiungiAttesa(testo) {
    const contenitore = $("#chat-messaggi");
    bollaAttesa = crea("div", { classe: "chat-bolla npc attesa" }, [
      crea("div", { classe: "chat-bolla-corpo" }, [crea("p", { classe: "chat-testo tenue", testo })])
    ]);
    contenitore.appendChild(bollaAttesa);
    scorriInFondo();
  }

  function rimuoviAttesa() {
    bollaAttesa?.remove();
    bollaAttesa = null;
  }

  function scorriInFondo() {
    const contenitore = $("#chat-messaggi");
    contenitore.scrollTop = contenitore.scrollHeight;
  }

  /** Invia il messaggio del giocatore e mostra la risposta dell'NPC. */
  async function invia() {
    const campo = $("#chat-testo");
    const testo = campo.value.trim();
    if (!npcAttivo || inAttesa || testo.length < 2) return;

    inAttesa = true;
    $("#btn-chat-invia").disabled = true;
    const partita = window.__partita;

    aggiungiBolla({ da: "tu", testo }, npcAttivo);
    campo.value = "";
    $("#conteggio-chat").textContent = "0";
    aggiungiAttesa(`${npcAttivo} sta pensando alla risposta…`);
    scorriInFondo();

    try {
      const esito = await api.inviaBattuta(partita.id, npcAttivo, testo);
      rimuoviAttesa();
      aggiungiBolla(esito.battuta, npcAttivo);
      // La chat riflette subito il rapporto aggiornato e i nuovi ricordi
      disegnaProfilo({ npc: npcAttivo, relazione: esito.relazione, battute: [] });
      disegnaMemoria(esito.memoria);
      scorriInFondo();
      if (esito.note?.length) toast(esito.note[0], "info", 6000);
      onPartitaAggiornata?.(esito.partita);
    } catch (errore) {
      rimuoviAttesa();
      toast(errore.message || "Il personaggio non risponde: riprova.", "errore");
    } finally {
      inAttesa = false;
      $("#btn-chat-invia").disabled = $("#chat-testo").value.trim().length < 2;
      campo.focus();
    }
  }

  function collega() {
    if (collegato) return;
    collegato = true;

    $("#chat-form").addEventListener("submit", (evento) => {
      evento.preventDefault();
      invia();
    });

    $("#chat-testo").addEventListener("input", (evento) => {
      const lunghezza = evento.target.value.trim().length;
      $("#conteggio-chat").textContent = String(evento.target.value.length);
      $("#btn-chat-invia").disabled = lunghezza < 2;
    });

    $("#chat-testo").addEventListener("keydown", (evento) => {
      if (evento.key === "Enter" && !evento.shiftKey) {
        evento.preventDefault();
        invia();
      }
    });
  }

  return { apri, collega };
}
