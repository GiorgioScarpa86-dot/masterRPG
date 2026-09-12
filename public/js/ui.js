/**
 * ui.js — Micro-libreria di interfaccia: DOM, notifiche, modali,
 * effetto macchina da scrivere.
 */

export const $ = (selettore, radice = document) => radice.querySelector(selettore);
export const $$ = (selettore, radice = document) => [...radice.querySelectorAll(selettore)];

/** Crea un elemento con attributi e figli in una sola chiamata. */
export function crea(tag, attributi = {}, figli = []) {
  const el = document.createElement(tag);
  for (const [chiave, valore] of Object.entries(attributi)) {
    if (valore === null || valore === undefined || valore === false) continue;
    if (chiave === "classe" || chiave === "class") el.className = valore;
    else if (chiave === "testo") el.textContent = valore;
    else if (chiave === "html") el.innerHTML = valore;
    else if (chiave.startsWith("on") && typeof valore === "function") {
      el.addEventListener(chiave.slice(2).toLowerCase(), valore);
    } else if (chiave === "dataset") {
      Object.assign(el.dataset, valore);
    } else {
      el.setAttribute(chiave, valore);
    }
  }
  for (const figlio of [].concat(figli)) {
    if (figlio === null || figlio === undefined || figlio === false) continue;
    el.appendChild(typeof figlio === "string" ? document.createTextNode(figlio) : figlio);
  }
  return el;
}

export function svuota(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function mostra(el) { el?.classList.remove("nascosto"); }
export function nascondi(el) { el?.classList.add("nascosto"); }
export function alterna(el, visibile) { visibile ? mostra(el) : nascondi(el); }

// ─────────────────────────── Notifiche (toast) ───────────────────────────
const DURATA_PREDEFINITA = 4600;

export function toast(messaggio, tipo = "info", durata = DURATA_PREDEFINITA) {
  const contenitore = $("#toast");
  if (!contenitore) return;
  const elemento = crea("div", { classe: `toast ${tipo}`, testo: messaggio });
  contenitore.appendChild(elemento);
  const rimuovi = () => {
    elemento.style.transition = "opacity .25s ease, transform .25s ease";
    elemento.style.opacity = "0";
    elemento.style.transform = "translateX(18px)";
    setTimeout(() => elemento.remove(), 260);
  };
  const timer = setTimeout(rimuovi, durata);
  elemento.addEventListener("click", () => { clearTimeout(timer); rimuovi(); });
  return elemento;
}

// ─────────────────────────── Modali ───────────────────────────
let risolutoreConferma = null;
export function apriModale(id) {
  const modale = document.getElementById(id);
  if (!modale) return;
  modale.classList.remove("nascosto");
  document.body.style.overflow = "hidden";
  const primoBottone = modale.querySelector("button:not([disabled])");
  primoBottone?.focus({ preventScroll: true });
}

export function chiudiModale(id) {
  const modale = document.getElementById(id);
  if (!modale) return;
  modale.classList.add("nascosto");
  if (!$$(".modale:not(.nascosto)").length) document.body.style.overflow = "";
  // Se la finestra di conferma viene chiusa in altro modo, la risposta è "no"
  if (id === "modale-conferma" && risolutoreConferma) {
    risolutoreConferma(false);
    risolutoreConferma = null;
  }
}

export function chiudiTuttiIModali() {
  $$(".modale").forEach((m) => m.classList.add("nascosto"));
  document.body.style.overflow = "";
  if (risolutoreConferma) {
    risolutoreConferma(false);
    risolutoreConferma = null;
  }
}

/** Collega chiusura con clic sul fondo, crocetta e tasto Esc. */
export function inizializzaModali() {
  $$(".modale").forEach((modale) => {
    modale.addEventListener("mousedown", (evento) => {
      if (evento.target === modale) chiudiModale(modale.id);
    });
  });
  document.addEventListener("click", (evento) => {
    const bersaglio = evento.target.closest("[data-chiudi]");
    if (bersaglio) {
      evento.preventDefault();
      chiudiModale(bersaglio.dataset.chiudi);
    }
  });
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") chiudiTuttiIModali();
  });
}

/** Finestra di conferma in italiano. Restituisce una Promise<boolean>. */
export function conferma({ titolo = "Sei sicuro?", testo = "", etichettaConferma = "Conferma" } = {}) {
  $("#titolo-conferma").textContent = titolo;
  $("#testo-conferma").textContent = testo;
  $("#btn-conferma-si").textContent = etichettaConferma;
  apriModale("modale-conferma");
  return new Promise((risolvi) => {
    risolutoreConferma = risolvi;
  });
}

export function collegaConferma() {
  $("#btn-conferma-si")?.addEventListener("click", () => {
    chiudiModale("modale-conferma");
    risolutoreConferma?.(true);
    risolutoreConferma = null;
  });
  $$('[data-chiudi="modale-conferma"]').forEach((b) =>
    b.addEventListener("click", () => {
      risolutoreConferma?.(false);
      risolutoreConferma = null;
    })
  );
}

// ─────────────────────────── Effetto macchina da scrivere ───────────────────────────
const MOVIMENTO_RIDOTTO = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

/** Divide un paragrafo in segmenti, isolando i dialoghi «…» per evidenziarli. */
function segmenta(paragrafo) {
  const segmenti = [];
  const espressione = /«[^»]*»/g;
  let ultimo = 0;
  let trovato;
  while ((trovato = espressione.exec(paragrafo)) !== null) {
    if (trovato.index > ultimo) segmenti.push({ testo: paragrafo.slice(ultimo, trovato.index), classe: null });
    segmenti.push({ testo: trovato[0], classe: "battuta" });
    ultimo = trovato.index + trovato[0].length;
  }
  if (ultimo < paragrafo.length) segmenti.push({ testo: paragrafo.slice(ultimo), classe: null });
  return segmenti;
}

/**
 * Scrive il testo con effetto macchina da scrivere.
 * @returns {{promessa: Promise<void>, salta: () => void}}
 */
export function macchinaDaScrivere(contenitore, testo, { attivo = true, caratteriPerFrame = 3 } = {}) {
  svuota(contenitore);
  const paragrafi = String(testo || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const disegnaTutto = () => {
    svuota(contenitore);
    for (const paragrafo of paragrafi) {
      const p = crea("p");
      for (const segmento of segmenta(paragrafo)) {
        p.appendChild(segmento.classe ? crea("span", { classe: segmento.classe, testo: segmento.testo }) : document.createTextNode(segmento.testo));
      }
      contenitore.appendChild(p);
    }
  };

  if (!attivo || MOVIMENTO_RIDOTTO) {
    disegnaTutto();
    return { promessa: Promise.resolve(), salta: () => {} };
  }

  let saltato = false;
  const promessa = new Promise((risolvi) => {
    // Preparazione dei nodi vuoti da riempire progressivamente
    const piani = paragrafi.map((paragrafo) => {
      const p = crea("p");
      const nodi = segmenta(paragrafo).map((segmento) => {
        const span = segmento.classe ? crea("span", { classe: segmento.classe }) : document.createTextNode("");
        p.appendChild(span);
        return { nodo: span, testo: segmento.testo, posizione: 0 };
      });
      contenitore.appendChild(p);
      return nodi;
    });

    let paragrafiCompletati = 0;
    let nodi = piani[paragrafiCompletati] || [];

    const passo = () => {
      if (saltato) {
        disegnaTutto();
        risolvi();
        return;
      }
      let rimasti = caratteriPerFrame;
      while (rimasti > 0) {
        if (!nodi.length) {
          paragrafiCompletati++;
          if (paragrafiCompletati >= piani.length) {
            risolvi();
            return;
          }
          nodi = piani[paragrafiCompletati];
          continue;
        }
        const attuale = nodi[0];
        if (attuale.posizione >= attuale.testo.length) {
          nodi.shift();
          continue;
        }
        const quanti = Math.min(rimasti, attuale.testo.length - attuale.posizione);
        attuale.posizione += quanti;
        const pezzo = attuale.testo.slice(0, attuale.posizione);
        if (attuale.nodo.nodeType === Node.TEXT_NODE) attuale.nodo.textContent = pezzo;
        else attuale.nodo.textContent = pezzo;
        rimasti -= quanti;
      }
      requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  });

  return { promessa, salta: () => { saltato = true; } };
}

// ─────────────────────────── Formattazione ───────────────────────────
export function formattaData(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formattaDataBreve(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Formattazione numerica italiana (separatore delle migliaia = punto). */
export function numeroIt(valore) {
  const numero = Math.trunc(Number(valore) || 0);
  const segno = numero < 0 ? "-" : "";
  return segno + String(Math.abs(numero)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function iniziali(nome = "") {
  const pulito = String(nome).trim();
  if (!pulito) return "?";
  const parti = pulito.split(/\s+/);
  return (parti[0][0] + (parti[1]?.[0] || "")).toUpperCase();
}

/** Genera una barra di avanzamento con etichetta e valore. */
export function barra(classe, etichetta, valore) {
  const v = Math.max(0, Math.min(100, Number(valore) || 0));
  return crea("div", { classe: "vitale" }, [
    crea("span", { classe: "etichetta-vitale", testo: etichetta }),
    crea("div", { classe: `barra ${classe}` }, [crea("i", { style: `width:${v}%` })]),
    crea("span", { classe: "valore", testo: `${Math.round(v)}` })
  ]);
}

export function scorriA(el) {
  el?.scrollIntoView({ behavior: MOVIMENTO_RIDOTTO ? "auto" : "smooth", block: "center" });
}
