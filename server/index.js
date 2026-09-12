/**
 * index.js — Server HTTP dell'applicazione MasterRPG / Cronache Infinite.
 *
 * Zero dipendenze: usa esclusivamente moduli nativi di Node.
 *  - serve i file statici di public/
 *  - delega le rotte /api/* a server/api.js
 *  - ascolta su 0.0.0.0 (compatibile con ambienti di anteprima e container)
 */

import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gestisciApi } from "./api.js";
import { CARTELLA_DATI } from "./stato/archivio.js";
import { modalitaMotore } from "./motore/narratore.js";

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE_PUBBLICA = path.resolve(QUI, "../public");
const PORTA = Number(process.env.PORT) || 3000;
const INDIRIZZO = process.env.HOST || "0.0.0.0";

const TIPI = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

/** Impedisce di uscire dalla cartella public/ (path traversal). */
function percorsoSicuro(percorsoUrl) {
  const decodificato = decodeURIComponent(percorsoUrl.split("?")[0]);
  const relativo = decodificato.replace(/^\/+/, "");
  const assoluto = path.resolve(RADICE_PUBBLICA, relativo || "index.html");
  if (!assoluto.startsWith(RADICE_PUBBLICA)) return null;
  return assoluto;
}

async function serviStatico(req, res, url) {
  let file = percorsoSicuro(url.pathname);
  if (!file) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Accesso non consentito.");
    return;
  }

  // SPA: le rotte senza estensione ricadono su index.html
  const conEstensione = path.extname(file);
  if (!conEstensione) {
    const indice = path.join(RADICE_PUBBLICA, "index.html");
    if (url.pathname !== "/") {
      // Rotte applicative (es. /gioco) → index.html
      file = indice;
    } else {
      file = indice;
    }
  }

  try {
    const contenuto = await fs.readFile(file);
    const tipo = TIPI[path.extname(file).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": tipo,
      "Cache-Control": tipo.startsWith("text/html") ? "no-cache" : "public, max-age=60",
      "X-Content-Type-Options": "nosniff"
    });
    res.end(contenuto);
  } catch {
    try {
      const indice = await fs.readFile(path.join(RADICE_PUBBLICA, "index.html"));
      res.writeHead(200, { "Content-Type": TIPI[".html"], "Cache-Control": "no-cache" });
      res.end(indice);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Risorsa non trovata.");
    }
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const avvio = Date.now();

  try {
    // Le chiamate API non devono mai essere servite dalla cache del browser
    if (url.pathname.startsWith("/api/")) {
      const gestita = await gestisciApi(req, res, url);
      if (!gestita) {
        res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ errore: "ROTTA_NON_TROVATA", messaggio: "Rotta API inesistente." }));
      }
    } else if (url.pathname === "/salute") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ stato: "ok", motore: modalitaMotore(), cartellaDati: CARTELLA_DATI }));
    } else {
      await serviStatico(req, res, url);
    }
  } catch (errore) {
    console.error("[server] errore non gestito:", errore);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    }
    res.end(JSON.stringify({ errore: "ERRORE_INTERNO", messaggio: "Errore interno del server." }));
  }

  if (process.env.LOG_RICHIESTE !== "0" && !url.pathname.startsWith("/css") && !url.pathname.startsWith("/js")) {
    const ms = Date.now() - avvio;
    console.log(`${req.method} ${url.pathname} → ${res.statusCode} (${ms} ms)`);
  }
});

server.listen(PORTA, INDIRIZZO, () => {
  const motore = modalitaMotore();
  console.log("");
  console.log("  ╔══════════════════════════════════════════════════════════╗");
  console.log("  ║   MasterRPG · Cronache Infinite                          ║");
  console.log("  ║   Gioco di ruolo narrativo single-player in italiano     ║");
  console.log("  ╚══════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`  Interfaccia:   http://localhost:${PORTA}`);
  console.log(`  Game Master:   ${motore === "llm" ? "modello linguistico esterno (LLM)" : "Motore Narrativo Locale (offline)"}`);
  console.log(`  Salvataggi:    ${CARTELLA_DATI}`);
  console.log(`  Token Storia:  bonus di benvenuto 1000 · costo 10 per capitolo · ricariche gratuite illimitate`);
  if (motore === "locale") {
    console.log("");
    console.log("  (Imposta OPENAI_API_KEY per usare un modello esterno compatibile OpenAI.");
    console.log("   Senza chiave il gioco funziona comunque, con il motore narrativo integrato.)");
  }
  console.log("");
});

const chiudi = (segnale) => {
  console.log(`\n[server] ricevuto ${segnale}: chiusura in corso…`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on("SIGINT", () => chiudi("SIGINT"));
process.on("SIGTERM", () => chiudi("SIGTERM"));
