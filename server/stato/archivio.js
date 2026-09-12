/**
 * archivio.js — Persistenza delle saghe su file JSON.
 *
 * Ogni partita vive in `dati/partite/{id}.json` ed è autosufficiente:
 * può essere copiata su un'altra macchina e ripresa senza modifiche.
 * Le scritture sono atomiche (file temporaneo + rename) per non corrompere
 * mai un salvataggio in caso di interruzione.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const QUI = path.dirname(fileURLToPath(import.meta.url));
export const CARTELLA_DATI = path.resolve(QUI, "../../dati/partite");

const ID_VALIDO = /^[a-zA-Z0-9_-]{3,64}$/;

async function assicuraCartella() {
  await fs.mkdir(CARTELLA_DATI, { recursive: true });
}

function percorso(id) {
  if (!ID_VALIDO.test(id)) {
    const errore = new Error("Identificativo di partita non valido.");
    errore.codice = "ID_NON_VALIDO";
    errore.stato = 400;
    throw errore;
  }
  return path.join(CARTELLA_DATI, `${id}.json`);
}

export async function salva(partita) {
  await assicuraCartella();
  partita.aggiornataIl = new Date().toISOString();
  const destinazione = percorso(partita.id);
  const temporaneo = `${destinazione}.tmp`;
  const contenuto = JSON.stringify(partita, null, 2);
  await fs.writeFile(temporaneo, contenuto, "utf8");
  await fs.rename(temporaneo, destinazione);
  return partita;
}

export async function leggi(id) {
  const file = percorso(id);
  let contenuto;
  try {
    contenuto = await fs.readFile(file, "utf8");
  } catch (errore) {
    if (errore.code === "ENOENT") {
      const manca = new Error("Saga non trovata: potrebbe essere stata eliminata.");
      manca.codice = "NON_TROVATA";
      manca.stato = 404;
      throw manca;
    }
    throw errore;
  }

  try {
    return JSON.parse(contenuto);
  } catch {
    // Salvataggio corrotto: il file viene isolato e l'errore è esplicito,
    // senza far cadere il server.
    const nomeGuasto = `${file}.corrotto-${Date.now()}`;
    await fs.rename(file, nomeGuasto).catch(() => {});
    const errore = new Error("Il salvataggio di questa saga è danneggiato ed è stato isolato. Crea una nuova saga per continuare.");
    errore.codice = "SALVATAGGIO_CORROTTO";
    errore.stato = 500;
    throw errore;
  }
}

export async function esiste(id) {
  try {
    await fs.access(percorso(id));
    return true;
  } catch {
    return false;
  }
}

export async function elenca() {
  await assicuraCartella();
  const file = await fs.readdir(CARTELLA_DATI).catch(() => []);
  const partite = [];
  for (const nome of file.filter((f) => f.endsWith(".json"))) {
    try {
      const contenuto = await fs.readFile(path.join(CARTELLA_DATI, nome), "utf8");
      const p = JSON.parse(contenuto);
      partite.push({
        id: p.id,
        titoloSaga: p.configurazione?.titoloSaga,
        ambientazione: p.configurazione?.ambientazione?.nome,
        protagonista: p.configurazione?.protagonista?.nome,
        capitoli: p.stato?.capitolo || 0,
        saldo: p.economia?.saldo ?? 0,
        creataIl: p.creataIl,
        aggiornataIl: p.aggiornataIl
      });
    } catch {
      // File illeggibile: lo si ignora nell'elenco, senza interrompere l'operazione.
    }
  }
  return partite.sort((a, b) => new Date(b.aggiornataIl || 0) - new Date(a.aggiornataIl || 0));
}

export async function elimina(id) {
  const file = percorso(id);
  try {
    await fs.unlink(file);
    return true;
  } catch (errore) {
    if (errore.code === "ENOENT") return false;
    throw errore;
  }
}
