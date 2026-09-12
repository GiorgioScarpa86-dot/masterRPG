#!/usr/bin/env node
/**
 * verifica-html.js — Controllo statico del contratto fra HTML e JavaScript.
 *
 * Verifica che:
 *   1. ogni selettore $("#id") usato nel client esista in public/index.html;
 *   2. ogni id dichiarato in index.html sia effettivamente usato (segnalazione, non errore);
 *   3. le rotte API chiamate dal client esistano in server/api.js.
 *
 * Uso:  node strumenti/verifica-html.js
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function leggi(percorso) {
  return fs.readFile(path.join(RADICE, percorso), "utf8");
}

async function elencaJs(cartella) {
  const assoluta = path.join(RADICE, cartella);
  const voci = await fs.readdir(assoluta, { withFileTypes: true });
  const file = [];
  for (const voce of voci) {
    const relativo = path.join(cartella, voce.name);
    if (voce.isDirectory()) file.push(...(await elencaJs(relativo)));
    else if (voce.name.endsWith(".js")) file.push(relativo);
  }
  return file;
}

const html = await leggi("public/index.html");
const idHtml = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
// I modali sono i tag che hanno la classe "modale" e un id, in qualunque ordine
const modali = new Set(
  [...html.matchAll(/<[a-z]+\s[^>]*class="[^"]*\bmodale\b[^"]*"[^>]*>/gi)]
    .map((tag) => tag[0].match(/\bid="([^"]+)"/)?.[1])
    .filter(Boolean)
);

const problemi = [];
const avvisi = [];
const idUsati = new Set();

for (const file of await elencaJs("public/js")) {
  const codice = await leggi(file);

  for (const match of codice.matchAll(/\$\("#([A-Za-z0-9_-]+)"\)/g)) {
    idUsati.add(match[1]);
    if (!idHtml.has(match[1])) problemi.push(`${file}: selettore #${match[1]} inesistente in index.html`);
  }
  for (const match of codice.matchAll(/getElementById\("([A-Za-z0-9_-]+)"\)/g)) {
    idUsati.add(match[1]);
    if (!idHtml.has(match[1])) problemi.push(`${file}: getElementById("${match[1]}") inesistente in index.html`);
  }
  for (const match of codice.matchAll(/data-chiudi="([A-Za-z0-9_-]+)"/g)) {
    if (!modali.has(match[1])) problemi.push(`${file}: data-chiudi="${match[1]}" non corrisponde a un modale`);
  }
  for (const match of codice.matchAll(/apriModale\("([A-Za-z0-9_-]+)"\)/g)) {
    if (!modali.has(match[1])) problemi.push(`${file}: apriModale("${match[1]}") — modale inesistente`);
  }
  for (const match of codice.matchAll(/richiesta\(`?(\/api\/[^`"]*)/g)) {
    const rotta = match[1];
    const base = rotta.split("${")[0].replace(/\/$/, "");
    if (base && !(await leggi("server/api.js")).includes(base.replace(/^\//, "").split("/").filter(Boolean).slice(1).join("/"))) {
      avvisi.push(`${file}: rotta ${base} non trovata in server/api.js (verifica manuale)`);
    }
  }
}

for (const id of idHtml) {
  if (!idUsati.has(id) && !["main", "sfondo", "toast"].includes(id)) {
    avvisi.push(`index.html: #${id} non è usato dal JavaScript (potenziale residuo)`);
  }
}

// Verifica che i moduli importati dal client esistano davvero
for (const file of await elencaJs("public/js")) {
  const codice = await leggi(file);
  for (const match of codice.matchAll(/from "(\.\/[^"]+)"/g)) {
    const percorso = path.join(path.dirname(path.join(RADICE, file)), match[1]);
    try {
      await fs.access(percorso);
    } catch {
      problemi.push(`${file}: import "${match[1]}" non risolto`);
    }
  }
}

if (avvisi.length) {
  console.log("\nAvvisi:");
  for (const a of avvisi) console.log(`  · ${a}`);
}

if (problemi.length) {
  console.error("\nProblemi rilevati:");
  for (const p of problemi) console.error(`  ✗ ${p}`);
  process.exit(1);
}

console.log(`\n✓ Contratto HTML/JS verificato: ${idUsati.size} selettori controllati, nessun riferimento mancante.`);
