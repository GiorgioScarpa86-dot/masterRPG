/**
 * illustrazioni.js — Gallerie delle illustrazioni di scena.
 *
 * Ogni capitolo riceve 5 illustrazioni generate dal server (SVG, nessun
 * servizio esterno): luogo, volto dell'NPC, la mossa del giocatore, colpo di
 * scena e cliffhanger. Vengono mostrate:
 *   · in una striscia orizzontale subito sotto il capitolo corrente;
 *   · in una galleria a schermo intero (con didascalie) toccando una scena;
 *   · nel diario, per rivedere i capitoli precedenti.
 *
 * Le immagini sono servite con URL deterministici e cache lunga: vengono
 * caricate una sola volta e poi restano nella cache del browser (utile
 * soprattutto su telefono, dove i dati costano).
 */

import { $, crea, svuota, apriModale, toast, numeroIt } from "./ui.js";

const ICONE = {
  panorama: "🏞",
  ritratto: "👤",
  azione: "⚔",
  svolta: "✨",
  cliffhanger: "⏳"
};

export function creaIllustrazioni({ api, onScenaAperta }) {
  let partita = null;
  let sceneCorrenti = [];
  let indiceGalleria = 0;
  let cache = new Map();   // numero capitolo → elenco scene

  /** Costruisce l'URL di una scena. */
  function url(capitolo, indice) {
    return `/api/partite/${encodeURIComponent(partita.id)}/illustrazioni/${capitolo}/${indice}`;
  }

  /** Carica i metadati delle scene (con cache in memoria). */
  async function sceneDi(numero) {
    if (cache.has(numero)) return cache.get(numero);
    const esito = await api.illustrazioni(numero);
    cache.set(numero, esito.scene);
    return esito.scene;
  }

  /** Striscia delle illustrazioni sotto il capitolo. */
  function disegnaStriscia(capitolo, scene) {
    const contenitore = svuota($("#striscia-illustrazioni"));
    if (!scene?.length) return;

    const testata = crea("div", { classe: "striscia-testata" }, [
      crea("h3", { classe: "titolo-sezione", testo: `Illustrazioni della scena (${scene.length})` }),
      crea("button", {
        type: "button",
        classe: "btn mini ghost",
        testo: "Galleria completa",
        onclick: () => apriGalleria(capitolo, scene, 0)
      })
    ]);
    contenitore.appendChild(testata);

    const striscia = crea("div", { classe: "striscia-scene" });
    scene.forEach((scena, indice) => {
      striscia.appendChild(crea("button", {
        type: "button",
        classe: "scena-card",
        title: `${scena.titolo} — ${scena.didascalia}`,
        onclick: () => apriGalleria(capitolo, scene, indice)
      }, [
        crea("div", { classe: "scena-cornice" }, [
          crea("img", {
            src: url(capitolo.numero, indice),
            alt: `${scena.titolo}: ${scena.didascalia}`,
            loading: indice === 0 ? "eager" : "lazy",
            decoding: "async"
          })
        ]),
        crea("div", { classe: "scena-etichetta" }, [
          crea("span", { classe: "scena-icona", testo: ICONE[scena.tipo] || "✦" }),
          crea("span", { classe: "scena-titolo", testo: scena.titolo })
        ])
      ]));
    });
    contenitore.appendChild(crea("p", {
      classe: "aiuto-blocco piccolo",
      testo: "Immagini generate dal motore integrato a partire dal testo del capitolo: nessun servizio esterno, nessun costo."
    }));
    contenitore.appendChild(striscia);
  }

  /** Galleria a schermo intero con navigazione da tastiera e swipe. */
  function apriGalleria(capitolo, scene, indice) {
    indiceGalleria = Math.max(0, Math.min(scene.length - 1, indice));
    try { onScenaAperta?.(capitolo, indiceGalleria); } catch { /* il registro non deve disturbare la lettura */ }
    $("#titolo-galleria").textContent = `Capitolo ${capitolo.numero} — ${capitolo.titolo}`;
    disegnaGalleria(capitolo, scene);
    apriModale("modale-galleria");
  }

  function disegnaGalleria(capitolo, scene) {
    const scena = scene[indiceGalleria];
    const contenitore = svuota($("#contenuto-galleria"));

    contenitore.appendChild(crea("div", { classe: "galleria-scena" }, [
      crea("img", {
        src: url(capitolo.numero, indiceGalleria),
        alt: `${scena.titolo}: ${scena.didascalia}`,
        class: "galleria-immagine"
      })
    ]));

    contenitore.appendChild(crea("div", { classe: "galleria-testo" }, [
      crea("h3", { testo: `${ICONE[scena.tipo] || "✦"} ${scena.titolo}` }),
      crea("p", { classe: "galleria-didascalia", testo: scena.didascalia }),
      crea("p", { classe: "aiuto-blocco piccolo", testo: `Scena ${indiceGalleria + 1} di ${scene.length} · tipo: ${scena.tipo}` })
    ]));

    const miniature = crea("div", { classe: "galleria-miniature" });
    scene.forEach((s, i) => {
      miniature.appendChild(crea("button", {
        type: "button",
        classe: `miniatura ${i === indiceGalleria ? "attiva" : ""}`,
        title: s.titolo,
        onclick: () => {
          indiceGalleria = i;
          disegnaGalleria(capitolo, scene);
        }
      }, [crea("img", { src: url(capitolo.numero, i), alt: s.titolo, loading: "lazy" })]));
    });
    contenitore.appendChild(miniature);

    const navigazione = crea("div", { classe: "galleria-navigazione" }, [
      crea("button", {
        type: "button",
        classe: "btn ghost",
        testo: "← Precedente",
        disabled: indiceGalleria === 0,
        onclick: () => { indiceGalleria--; disegnaGalleria(capitolo, scene); }
      }),
      crea("button", {
        type: "button",
        classe: "btn primary",
        testo: "Successiva →",
        disabled: indiceGalleria === scene.length - 1,
        onclick: () => { indiceGalleria++; disegnaGalleria(capitolo, scene); }
      })
    ]);
    contenitore.appendChild(navigazione);

    // Swipe sul telefono
    const areaImmagine = contenitore.querySelector(".galleria-scena");
    let partenzaX = null;
    areaImmagine.addEventListener("touchstart", (evento) => {
      partenzaX = evento.touches[0].clientX;
    }, { passive: true });
    areaImmagine.addEventListener("touchend", (evento) => {
      if (partenzaX === null) return;
      const delta = evento.changedTouches[0].clientX - partenzaX;
      partenzaX = null;
      if (Math.abs(delta) < 45) return;
      if (delta < 0 && indiceGalleria < scene.length - 1) indiceGalleria++;
      if (delta > 0 && indiceGalleria > 0) indiceGalleria--;
      disegnaGalleria(capitolo, scene);
    }, { passive: true });
  }

  /** Galleria di un capitolo precedente, aperta dal diario. */
  async function apriCapitolo(capitolo) {
    try {
      const scene = await sceneDi(capitolo.numero);
      apriGalleria(capitolo, scene, 0);
    } catch (errore) {
      toast(errore.message || "Illustrazioni non disponibili per questo capitolo.", "errore");
    }
  }

  function naviga(delta) {
    const modale = $("#modale-galleria");
    if (modale.classList.contains("nascosto")) return;
    const miniature = [...document.querySelectorAll(".galleria-miniature .miniatura")];
    const nuovo = indiceGalleria + delta;
    if (nuovo < 0 || nuovo >= miniature.length) return;
    miniature[nuovo]?.click();
  }

  function collega() {
    document.addEventListener("keydown", (evento) => {
      if ($("#modale-galleria").classList.contains("nascosto")) return;
      if (evento.key === "ArrowRight") naviga(1);
      if (evento.key === "ArrowLeft") naviga(-1);
    });
  }

  function aggiorna(nuovaPartita, { animare = false } = {}) {
    partita = nuovaPartita;
    cache = new Map();
    const corrente = nuovaPartita?.illustrazioniCorrenti;
    sceneCorrenti = corrente?.illustrazioni || [];
    const capitolo = nuovaPartita?.storia?.at(-1);

    if (capitolo && sceneCorrenti.length) {
      // Le scene del capitolo appena generato non sono ancora in cache
      cache.set(capitolo.numero, sceneCorrenti);
      disegnaStriscia(capitolo, sceneCorrenti);
      const contenitore = $("#striscia-illustrazioni");
      contenitore.classList.toggle("nascosto", false);
      if (animare) {
        contenitore.classList.remove("appena-generato");
        void contenitore.offsetWidth;
        contenitore.classList.add("appena-generato");
      }
    } else {
      $("#striscia-illustrazioni").classList.add("nascosto");
    }
  }

  /** Numero totale di illustrazioni disponibili nella saga. */
  function conteggio() {
    const capitoli = partita?.storia?.length || 0;
    return capitoli * (partita?.illustrazioniCorrenti?.illustrazioni?.length || 5);
  }

  return { collega, aggiorna, apriCapitolo, apriGalleria, conteggio, url, sceneDi };
}

export { ICONE as ICONE_SCENE, numeroIt };
