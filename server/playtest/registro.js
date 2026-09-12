/**
 * registro.js — Registro degli eventi di playtest.
 *
 * Serve a condurre un test giocato vero e a raccoglierne i dati. Il registro
 * NON è un sistema di tracciamento: non salva indirizzi IP, non usa cookie, non
 * invia nulla all'esterno. Scrive soltanto un file locale, una riga per evento,
 * nella cartella `dati/playtest/`.
 *
 * Eventi registrati:
 *   sessione-avviata · saga-creata · capitolo-generato · capitolo-rifiutato
 *   scena-aperta · ricarica · parere · sessione-chiusa
 *
 * Il file è in formato JSONL (una riga = un oggetto JSON), leggibile con
 * qualunque editor e analizzabile con lo strumento `strumenti/riepilogo-playtest.js`.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CARTELLA = process.env.PLAYTEST_CARTELLA || path.join(RADICE, "dati", "playtest");

/** Il registro è attivo salvo disattivazione esplicita (PLAYTEST=0). */
export function attivo() {
  return process.env.PLAYTEST !== "0";
}

function nomeFile(quando = new Date()) {
  return `eventi-${quando.toISOString().slice(0, 10)}.jsonl`;
}

/** Registra un evento. Non solleva mai errori: un playtest non si interrompe. */
export async function registra(tipo, dati = {}, quando = new Date()) {
  if (!attivo()) return null;
  const evento = {
    quando: quando.toISOString(),
    tipo: String(tipo || "evento").slice(0, 40),
    ...campiSicuri(dati)
  };
  try {
    await fs.mkdir(CARTELLA, { recursive: true });
    await fs.appendFile(path.join(CARTELLA, nomeFile(quando)), `${JSON.stringify(evento)}\n`, "utf8");
  } catch {
    // Il gioco non deve mai bloccarsi perché il registro non è scrivibile.
  }
  return evento;
}

/** Tiene solo campi semplici e di dimensione contenuta. */
function campiSicuri(dati) {
  const pulito = {};
  for (const [chiave, valore] of Object.entries(dati || {})) {
    if (/ip|indirizzo|email|password|token/i.test(chiave)) continue;
    if (typeof valore === "number" || typeof valore === "boolean") {
      pulito[chiave] = valore;
    } else if (typeof valore === "string") {
      pulito[chiave] = valore.slice(0, 400);
    } else if (Array.isArray(valore)) {
      pulito[chiave] = valore.slice(0, 20).map((v) => (typeof v === "number" ? v : String(v).slice(0, 120)));
    }
  }
  return pulito;
}

/** Elenca i file di registro disponibili, dal più recente. */
export async function fileDisponibili() {
  try {
    const voci = await fs.readdir(CARTELLA);
    return voci.filter((v) => v.endsWith(".jsonl")).sort().reverse();
  } catch {
    return [];
  }
}

/** Legge gli eventi (tutti, o solo quelli di una data `AAAA-MM-GG`). */
export async function leggiEventi(data = null) {
  const file = data ? [`eventi-${data}.jsonl`] : await fileDisponibili();
  const eventi = [];
  for (const nome of file) {
    try {
      const contenuto = await fs.readFile(path.join(CARTELLA, nome), "utf8");
      for (const riga of contenuto.split("\n")) {
        if (!riga.trim()) continue;
        try {
          eventi.push(JSON.parse(riga));
        } catch {
          // riga corrotta: si ignora
        }
      }
    } catch {
      // file assente
    }
  }
  return eventi.sort((a, b) => String(a.quando).localeCompare(String(b.quando)));
}

const media = (numeri) => (numeri.length ? numeri.reduce((a, b) => a + b, 0) / numeri.length : 0);

/** Riassunto leggibile: è quello che serve al facilitatore dopo la sessione. */
export async function riepilogo(data = null) {
  const eventi = await leggiEventi(data);
  const perTipo = (tipo) => eventi.filter((e) => e.tipo === tipo);

  const capitoli = perTipo("capitolo-generato");
  const pareri = perTipo("parere");
  const sessioni = perTipo("sessione-avviata");
  const saghe = new Set(perTipo("saga-creata").map((e) => e.saga).filter(Boolean));

  // Dove si fermano i giocatori: massimo capitolo raggiunto per saga
  const perSaga = new Map();
  for (const capitolo of capitoli) {
    const saga = capitolo.saga || "?";
    perSaga.set(saga, Math.max(perSaga.get(saga) || 0, Number(capitolo.numero) || 0));
  }

  const tempi = capitoli.map((c) => Number(c.millisecondi) || 0).filter((n) => n > 0 && n < 600000);
  const parole = capitoli.map((c) => Number(c.parole) || 0).filter(Boolean);
  const sceneggiature = perTipo("scena-aperta");

  const voti = pareri.map((p) => Number(p.voto) || 0).filter((v) => v >= 1 && v <= 5);

  return {
    data: data || "tutte le sessioni",
    totaleEventi: eventi.length,
    sessioni: sessioni.length,
    saghe: saghe.size,
    capitoli: capitoli.length,
    capitoliPerSaga: [...perSaga.entries()].map(([saga, massimo]) => ({ saga, massimoCapitolo: massimo })),
    tempiCapitolo: {
      mediaSecondi: Math.round(media(tempi) / 100) / 10,
      minimoSecondi: tempi.length ? Math.round(Math.min(...tempi) / 100) / 10 : 0,
      massimoSecondi: tempi.length ? Math.round(Math.max(...tempi) / 100) / 10 : 0
    },
    parolePerCapitolo: Math.round(media(parole)),
    sceneAperte: sceneggiature.length,
    scenePerCapitolo: capitoli.length ? Math.round((sceneggiature.length / capitoli.length) * 10) / 10 : 0,
    ricariche: perTipo("ricarica").length,
    errori: perTipo("capitolo-rifiutato").length,
    pareri: pareri.length,
    votoMedio: Math.round(media(voti) * 10) / 10,
    commenti: pareri
      .filter((p) => p.commento || p.confusione || p.piace)
      .map((p) => ({
        quando: p.quando,
        saga: p.saga,
        voto: p.voto,
        piace: p.piace,
        confusione: p.confusione,
        commento: p.commento
      }))
  };
}

export { CARTELLA as CARTELLA_PLAYTEST };
