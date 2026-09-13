/**
 * albero.js — Albero di fiducia evoluto (visualizzazione e scheda NPC).
 *
 * L'albero è un piano cartesiano:
 *   · asse orizzontale → TENSIONE (da "armonia" a "conflitto")
 *   · asse verticale   → VINCOLO (da "estranei" a "legame profondo")
 * I quattro quadranti risultanti sono Alleanza, Rivalità, Crocevia, Ostilità.
 * Il RISPETTO, terzo asse, si legge nel grafico a tre punte della scheda NPC.
 *
 * Il disegno è un SVG che scala su qualsiasi schermo: lo stesso codice funziona
 * su desktop e su telefono, senza dipendenze.
 */

import { $, crea, svuota, apriModale, chiudiModale, numeroIt } from "./ui.js";

const LATO = 340;              // lato logico del piano dell'albero
const MARGINE = 34;
const AREA = LATO - MARGINE * 2;

const COLORI_QUADRANTE = {
  alleanza: "#4ade80",
  rivalita: "#fbbf24",
  ostilita: "#fb7185",
  crocevia: "#a78bfa"
};

/** Iniziali per il nodo (max 2 lettere). */
function iniziali(nome = "") {
  const parti = String(nome).trim().split(/\s+/).filter(Boolean);
  if (!parti.length) return "?";
  return (parti[0][0] + (parti[1]?.[0] || "")).toUpperCase();
}

/** Posizione nel piano: x = tensione, y = vincolo. */
function punto(nodo, chiaveX = "tensione", chiaveY = "vincolo") {
  const tensione = Number(nodo[chiaveX] ?? 30);
  const vincolo = Number(nodo[chiaveY] ?? 50);
  return {
    x: MARGINE + (Math.max(0, Math.min(100, tensione)) / 100) * AREA,
    y: MARGINE + ((100 - Math.max(0, Math.min(100, vincolo))) / 100) * AREA
  };
}

const esc = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Costruisce l'SVG completo dell'albero. */
export function disegnaAlbero(contenitore, albero) {
  svuota(contenitore);
  const nodi = albero?.nodi || [];

  if (!nodi.length) {
    contenitore.appendChild(crea("p", {
      classe: "aiuto-blocco",
      testo: "Non hai ancora incontrato nessuno. L'albero comparirà al primo capitolo."
    }));
    return;
  }

  // Posizioni dei nodi. Se due nodi finiscono quasi nello stesso punto, il
  // secondo viene spostato lungo la diagonale: le posizioni restano leggibili
  // senza falsare il significato degli assi (lo scarto è minimo).
  const posizioni = [];
  for (const [i, nodo] of nodi.entries()) {
    const p = punto(nodo);
    let x = p.x;
    let y = p.y;
    for (let tentativo = 0; tentativo < 6; tentativo++) {
      const vicino = posizioni.find((altra) => Math.hypot(altra.x - x, altra.y - y) < 46);
      if (!vicino) break;
      const angolo = (i * 2.4 + tentativo) % (Math.PI * 2);
      x = Math.max(MARGINE + 14, Math.min(MARGINE + AREA - 14, x + Math.cos(angolo) * 20));
      y = Math.max(MARGINE + 24, Math.min(MARGINE + AREA - 14, y + Math.sin(angolo) * 20));
    }
    posizioni.push({ nodo, x, y });
  }

  const parti = [];

  // Quadranti
  const meta = AREA / 2;
  parti.push(`<rect x="${MARGINE}" y="${MARGINE}" width="${meta}" height="${meta}" fill="${COLORI_QUADRANTE.alleanza}" opacity="0.07"/>`);
  parti.push(`<rect x="${MARGINE + meta}" y="${MARGINE}" width="${meta}" height="${meta}" fill="${COLORI_QUADRANTE.rivalita}" opacity="0.09"/>`);
  parti.push(`<rect x="${MARGINE}" y="${MARGINE + meta}" width="${meta}" height="${meta}" fill="${COLORI_QUADRANTE.crocevia}" opacity="0.06"/>`);
  parti.push(`<rect x="${MARGINE + meta}" y="${MARGINE + meta}" width="${meta}" height="${meta}" fill="${COLORI_QUADRANTE.ostilita}" opacity="0.09"/>`);

  // Etichette dei quadranti
  const etichette = [
    ["Alleanza", COLORI_QUADRANTE.alleanza, MARGINE + 10, MARGINE + 18, "start"],
    ["Rivalità", COLORI_QUADRANTE.rivalita, MARGINE + AREA - 10, MARGINE + 18, "end"],
    ["Crocevia", COLORI_QUADRANTE.crocevia, MARGINE + 12, MARGINE + AREA - 66, "start"],
    ["Ostilità", COLORI_QUADRANTE.ostilita, MARGINE + AREA - 10, MARGINE + AREA - 12, "end"]
  ];
  for (const [testo, colore, x, y, ancora] of etichette) {
    parti.push(`<text x="${x}" y="${y}" text-anchor="${ancora}" font-size="12" font-family="Helvetica, Arial, sans-serif" fill="${colore}" opacity="0.85">${testo}</text>`);
  }

  // Griglia e assi
  parti.push(`<rect x="${MARGINE}" y="${MARGINE}" width="${AREA}" height="${AREA}" fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="1"/>`);
  parti.push(`<line x1="${MARGINE + meta}" y1="${MARGINE}" x2="${MARGINE + meta}" y2="${MARGINE + AREA}" stroke="#ffffff" stroke-opacity="0.12" stroke-dasharray="4 5"/>`);
  parti.push(`<line x1="${MARGINE}" y1="${MARGINE + meta}" x2="${MARGINE + AREA}" y2="${MARGINE + meta}" stroke="#ffffff" stroke-opacity="0.12" stroke-dasharray="4 5"/>`);
  parti.push(`<text x="${MARGINE + AREA / 2}" y="${LATO - 6}" text-anchor="middle" font-size="11" font-family="Helvetica, Arial, sans-serif" fill="#8e8ab0">TENSIONE →</text>`);
  parti.push(`<text x="10" y="${MARGINE + AREA / 2}" text-anchor="middle" font-size="11" font-family="Helvetica, Arial, sans-serif" fill="#8e8ab0" transform="rotate(-90 10 ${MARGINE + AREA / 2})">VINCOLO →</text>`);

  // Punto di partenza (il protagonista) nell'angolo: tutti i legami nascono da lì
  const origine = { x: MARGINE + 8, y: MARGINE + AREA - 8 };
  parti.push(`<circle cx="${origine.x}" cy="${origine.y}" r="7" fill="#ffffff" opacity="0.92"/>`);
  parti.push(`<circle cx="${origine.x}" cy="${origine.y}" r="13" fill="none" stroke="#ffffff" stroke-opacity="0.35"/>`);
  parti.push(`<text x="${origine.x + 10}" y="${origine.y - 12}" font-size="11" font-family="Helvetica, Arial, sans-serif" fill="#ffffff" opacity="0.85" stroke="#0c0b18" stroke-width="3" paint-order="stroke">tu</text>`);

  // Traiettorie e nodi
  let indice = 0;
  for (const { nodo, x, y } of posizioni) {
    const colore = COLORI_QUADRANTE[nodo.quadrante?.id] || "#a78bfa";
    const raggio = 17;

    // Legame dal protagonista
    const cx = (origine.x + x) / 2 + (y - origine.y) * 0.12;
    const cy = (origine.y + y) / 2 - (x - origine.x) * 0.12;
    parti.push(`<path d="M ${origine.x} ${origine.y} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}" fill="none" stroke="${colore}" stroke-width="${(1 + nodo.vincolo / 55).toFixed(2)}" stroke-opacity="0.4" stroke-dasharray="${nodo.tensione > 55 ? "6 5" : "none"}"/>`);

    // Movimento rispetto al capitolo precedente
    if (nodo.posizionePrecedente) {
      const prima = punto(nodo.posizionePrecedente);
      parti.push(`<path d="M ${prima.x.toFixed(1)} ${prima.y.toFixed(1)} L ${x.toFixed(1)} ${y.toFixed(1)}" stroke="${colore}" stroke-width="2" stroke-opacity="0.55" marker-end="url(#freccia)" fill="none"/>`);
      parti.push(`<circle cx="${prima.x.toFixed(1)}" cy="${prima.y.toFixed(1)}" r="3.5" fill="none" stroke="${colore}" stroke-opacity="0.5" stroke-width="1.5"/>`);
    }

    // Nodo
    parti.push(`<g class="nodo-albero" data-npc="${esc(nodo.npc)}" tabindex="0" role="button" aria-label="${esc(nodo.npc)}, ${esc(nodo.quadrante?.nome || "")}">`);
    parti.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${raggio + 8}" fill="transparent"/>`);
    parti.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${raggio}" fill="#0d0b1c" stroke="${colore}" stroke-width="3"/>`);
    parti.push(`<text x="${x.toFixed(1)}" y="${(y + 5).toFixed(1)}" text-anchor="middle" font-size="14" font-weight="bold" font-family="Helvetica, Arial, sans-serif" fill="${colore}">${esc(iniziali(nodo.npc))}</text>`);
    const contorno = 'stroke="#0c0b18" stroke-width="3.5" paint-order="stroke" stroke-linejoin="round"';
    // Nome: la prima parola, o le iniziali se il nome è lungo
    const nomeBreve = String(nodo.npc).split(" ")[0].slice(0, 12);
    parti.push(`<text x="${x.toFixed(1)}" y="${(y - raggio - 8).toFixed(1)}" text-anchor="middle" font-size="12.5" font-family="Helvetica, Arial, sans-serif" fill="#ffffff" ${contorno}>${esc(nomeBreve)}</text>`);
    parti.push(`<text x="${x.toFixed(1)}" y="${(y + raggio + 15).toFixed(1)}" text-anchor="middle" font-size="10.5" font-family="Helvetica, Arial, sans-serif" fill="${colore}" ${contorno}>${esc(nodo.ruolo)}</text>`);
    parti.push("</g>");
    indice++;
    void indice;
  }

  const svg = `<svg viewBox="0 0 ${LATO} ${LATO}" class="albero-svg" role="img" aria-label="Albero di fiducia: ${nodi.length} relazioni">
    <defs>
      <marker id="freccia" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#ffffff" fill-opacity="0.6"/>
      </marker>
    </defs>
    ${parti.join("\n")}
  </svg>`;

  contenitore.insertAdjacentHTML("beforeend", svg);

  // Legenda + statistiche
  const legenda = crea("div", { classe: "albero-legenda" });
  for (const [id, nome] of [["alleanza", "Alleanza"], ["rivalita", "Rivalità"], ["crocevia", "Crocevia"], ["ostilita", "Ostilità"]]) {
    legenda.appendChild(crea("span", { classe: "voce-legenda" }, [
      crea("i", { style: `background:${COLORI_QUADRANTE[id]}` }),
      `${nome} · ${albero.conteggi?.[id] ?? 0}`
    ]));
  }
  contenitore.appendChild(legenda);

  if (albero.legamePiuForte || albero.conflittoMaggiore) {
    const note = [];
    if (albero.legamePiuForte) note.push(`Legame più forte: ${albero.legamePiuForte}`);
    if (albero.conflittoMaggiore && albero.conflittoMaggiore !== albero.legamePiuForte) note.push(`Conflitto maggiore: ${albero.conflittoMaggiore}`);
    contenitore.appendChild(crea("p", { classe: "albero-note", testo: note.join(" · ") }));
  }

  contenitore.appendChild(crea("p", {
    classe: "aiuto-blocco piccolo",
    testo: "Tocca un nome per la scheda completa: assi, tappe e storico."
  }));
}

/** Grafico a tre punte (Vincolo, Tensione, Rispetto) per la scheda NPC. */
function radar(nodo) {
  const centro = 82;
  const raggio = 62;
  const assi = [
    { nome: "Vincolo", valore: nodo.vincolo, colore: "#4ade80", angolo: -90 },
    { nome: "Rispetto", valore: nodo.rispetto, colore: "#60a5fa", angolo: 30 },
    { nome: "Tensione", valore: nodo.tensione, colore: "#fb7185", angolo: 150 }
  ];

  const vertice = (angolo, valore) => {
    const rad = (angolo * Math.PI) / 180;
    const r = (Math.max(0, Math.min(100, valore)) / 100) * raggio;
    return [centro + Math.cos(rad) * r, centro + Math.sin(rad) * r];
  };
  const esterno = (angolo) => {
    const rad = (angolo * Math.PI) / 180;
    return [centro + Math.cos(rad) * raggio, centro + Math.sin(rad) * raggio];
  };

  const parti = [];
  // Rete di riferimento
  for (const scala of [0.33, 0.66, 1]) {
    const punti = assi.map((a) => vertice(a.angolo, scala * 100).map((n) => n.toFixed(1)).join(",")).join(" ");
    parti.push(`<polygon points="${punti}" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1"/>`);
  }
  // Assi
  for (const a of assi) {
    const [x, y] = esterno(a.angolo);
    parti.push(`<line x1="${centro}" y1="${centro}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${a.colore}" stroke-opacity="0.4" stroke-width="1.5"/>`);
    const [lx, ly] = vertice(a.angolo, 128);
    parti.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="11" font-family="Helvetica, Arial, sans-serif" fill="${a.colore}">${a.nome} ${Math.round(a.valore)}</text>`);
  }
  // Poligono dei valori
  const puntiValori = assi.map((a) => vertice(a.angolo, a.valore).map((n) => n.toFixed(1)).join(",")).join(" ");
  parti.push(`<polygon points="${puntiValori}" fill="${nodo.quadrante?.colore || "#a78bfa"}" fill-opacity="0.32" stroke="${nodo.quadrante?.colore || "#a78bfa"}" stroke-width="2"/>`);
  for (const a of assi) {
    const [x, y] = vertice(a.angolo, a.valore);
    parti.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${a.colore}"/>`);
  }

  return `<svg viewBox="0 0 164 164" class="radar-svg" role="img" aria-label="Assi del rapporto">${parti.join("")}</svg>`;
}

/** Scheda completa di un NPC, mostrata in un modale. */
export function mostraSchedaNpc(nodo, { onParla = null } = {}) {
  const contenitore = svuota($("#contenuto-npc"));
  $("#titolo-npc").textContent = nodo.npc;

  contenitore.appendChild(crea("div", { classe: "npc-testa" }, [
    crea("div", { classe: "npc-radar", html: radar(nodo) }),
    crea("div", { classe: "npc-dati" }, [
      crea("p", { classe: "npc-ruolo" }, [
        crea("span", { classe: `ruolo ${nodo.quadrante?.id === "alleanza" ? "ruolo-alleato" : nodo.quadrante?.id === "ostilita" ? "ruolo-nemico" : nodo.quadrante?.id === "rivalita" ? "ruolo-rivale" : ""}`, testo: nodo.ruolo }),
        crea("span", { classe: "npc-quadrante", style: `color:${nodo.quadrante?.colore}`, testo: nodo.quadrante?.nome || "" })
      ]),
      crea("p", { classe: "npc-descrizione", testo: nodo.descrizione || "" }),
      crea("dl", { classe: "npc-assi" }, [
        crea("dt", { testo: "Vincolo" }), crea("dd", { testo: `${nodo.vincolo}/100` }),
        crea("dt", { testo: "Tensione" }), crea("dd", { testo: `${nodo.tensione}/100` }),
        crea("dt", { testo: "Rispetto" }), crea("dd", { testo: `${nodo.rispetto}/100` }),
        crea("dt", { testo: "Ultimo incontro" }), crea("dd", { testo: nodo.ultimoIncontro ? `capitolo ${nodo.ultimoIncontro}` : "—" })
      ])
    ])
  ]));

  if (nodo.nota) {
    contenitore.appendChild(crea("p", { classe: "npc-nota", testo: nodo.nota }));
  }

  // Tappe del legame
  contenitore.appendChild(crea("h4", { classe: "titolo-blocco", testo: `Tappe del legame (${(nodo.tappe || []).length})` }));
  if (!(nodo.tappe || []).length) {
    contenitore.appendChild(crea("p", { classe: "aiuto-blocco", testo: "Nessuna tappa ancora: la conoscenza è appena cominciata." }));
  } else {
    const elenco = crea("ol", { classe: "npc-tappe" });
    for (const tappa of nodo.tappe) {
      elenco.appendChild(crea("li", {}, [
        crea("span", { classe: "tappa-icona", testo: tappa.icona || "✦" }),
        crea("div", {}, [
          crea("strong", { testo: tappa.nome }),
          crea("small", { testo: ` · capitolo ${tappa.capitolo}` }),
          crea("p", { classe: "tappa-descrizione", testo: tappa.descrizione || "" })
        ])
      ]));
    }
    contenitore.appendChild(elenco);
  }

  // Storico capitolo per capitolo
  contenitore.appendChild(crea("h4", { classe: "titolo-blocco", testo: "Come è cambiato il rapporto" }));
  if (!(nodo.storico || []).length) {
    contenitore.appendChild(crea("p", { classe: "aiuto-blocco", testo: "Nessuna variazione registrata." }));
  } else {
    const tabella = crea("div", { classe: "npc-storico" });
    for (const voce of nodo.storico) {
      // La prima riga è il punto di partenza del rapporto, non una variazione
      const barra = (valore, colore) => crea("span", { classe: "storico-barra" }, [
        crea("i", {
          style: `width:${Math.min(100, Math.abs(valore) * 4)}%;background:${valore > 0 ? colore : valore < 0 ? "var(--negativo)" : "rgba(255,255,255,.28)"};margin-left:${valore < 0 ? "auto" : "0"}`
        })
      ]);
      tabella.appendChild(crea("div", { classe: `storico-riga ${voce.iniziale ? "iniziale" : ""}` }, [
        crea("span", { classe: "storico-cap", testo: voce.iniziale ? `cap. ${voce.capitolo} · inizio` : `cap. ${voce.capitolo}` }),
        crea("div", { classe: "storico-assi" }, [
          crea("span", { classe: "storico-etichetta", testo: "V" }), barra(voce.vincolo, "#4ade80"),
          crea("span", { classe: "storico-etichetta", testo: "T" }), barra(voce.tensione, "#fb7185"),
          crea("span", { classe: "storico-etichetta", testo: "R" }), barra(voce.rispetto, "#60a5fa")
        ])
      ]));
    }
    if (nodo.storico.length > 1) {
      contenitore.appendChild(crea("p", {
        classe: "aiuto-blocco piccolo",
        testo: "Ogni riga è una variazione del capitolo: barra piena = cambiamento marcato."
      }));
    }
    contenitore.appendChild(tabella);
  }

  // Modalità Personaggio (stile OOC): conversa direttamente con questo NPC
  if (onParla) {
    const azioni = crea("div", { classe: "npc-azioni" });
    azioni.appendChild(crea("button", {
      type: "button",
      classe: "btn primary largo",
      testo: `💬 Parla con ${nodo.npc}`,
      title: "Modalità Personaggio: chat libera e gratuita con questo personaggio",
      onclick: () => {
        chiudiModale("modale-npc");
        onParla(nodo.npc);
      }
    }));
    azioni.appendChild(crea("p", {
      classe: "aiuto-blocco piccolo",
      testo: "Modalità Personaggio: risponde in prima persona, ricorda la vostra storia ed è gratis."
    }));
    contenitore.appendChild(azioni);
  }

  apriModale("modale-npc");
}

export { COLORI_QUADRANTE };

/** Riassunto testuale usato nel pannello laterale (via breve). */
export function riassuntoAlbero(albero) {
  const nodi = albero?.nodi || [];
  if (!nodi.length) return "Nessun NPC incontrato.";
  const perQuadrante = Object.entries(albero.conteggi || {}).filter(([, n]) => n > 0)
    .map(([id, n]) => `${albero.quadranti?.[id]?.nome || id} ${n}`);
  return `${numeroIt(nodi.length)} relazioni · ${perQuadrante.join(" · ")}`;
}
