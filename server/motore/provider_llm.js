/**
 * provider_llm.js — Client opzionale per un modello linguistico esterno.
 *
 * L'applicazione funziona perfettamente senza questo modulo (motore locale).
 * Se è definita una chiave API, il Game Master diventa un vero modello
 * compatibile con l'API OpenAI (OpenAI, Groq, Together, Ollama, LM Studio…).
 *
 * Variabili d'ambiente riconosciute:
 *   OPENAI_API_KEY  (oppure LLM_API_KEY)   — se assente, si usa il motore locale
 *   LLM_BASE_URL    (default: https://api.openai.com/v1)
 *   LLM_MODEL       (default: gpt-4o-mini)
 *   LLM_TIMEOUT_MS  (default: 45000)
 *
 * La chiave non lascia mai il server: il browser non la vede.
 */

const TIMEOUT_PREDEFINITO = 45_000;

export function configurazioneLLM(env = process.env) {
  const chiave = env.OPENAI_API_KEY || env.LLM_API_KEY || "";
  const baseUrl = (env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const modello = env.LLM_MODEL || "gpt-4o-mini";
  return {
    attiva: Boolean(chiave),
    nome: "llm",
    modello,
    baseUrl,
    chiave,
    timeoutMs: Number(env.LLM_TIMEOUT_MS) || TIMEOUT_PREDEFINITO
  };
}

export class ErroreProvider extends Error {
  constructor(messaggio, causa = null) {
    super(messaggio);
    this.name = "ErroreProvider";
    this.codice = "PROVIDER_LLM";
    this.causa = causa;
  }
}

/**
 * Invia il prompt al modello e restituisce il contenuto testuale.
 * Qualsiasi errore viene incapsulato: il chiamante deciderà se degradare
 * sul motore locale (comportamento predefinito del narratore).
 */
export async function generaConLLM({ sistema, utente, configurazione, timeoutMs }) {
  const config = configurazione || configurazioneLLM();
  if (!config.attiva) throw new ErroreProvider("Nessuna chiave API configurata.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || config.timeoutMs);

  try {
    const risposta = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.chiave}`
      },
      body: JSON.stringify({
        model: config.modello,
        temperature: 0.92,
        max_tokens: 1400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sistema },
          { role: "user", content: utente }
        ]
      }),
      signal: controller.signal
    });

    if (!risposta.ok) {
      const dettaglio = await risposta.text().catch(() => "");
      throw new ErroreProvider(
        `Il modello ha risposto con stato ${risposta.status}. ${dettaglio.slice(0, 300)}`
      );
    }

    const dati = await risposta.json();
    const contenuto = dati?.choices?.[0]?.message?.content;
    if (!contenuto || typeof contenuto !== "string") {
      throw new ErroreProvider("Risposta del modello priva di contenuto testuale.");
    }

    return {
      contenuto,
      modello: config.modello,
      provenienza: `llm:${config.modello}`,
      uso: dati?.usage || null
    };
  } catch (errore) {
    if (errore.name === "AbortError") {
      throw new ErroreProvider(`Il modello non ha risposto entro ${(timeoutMs || config.timeoutMs) / 1000} secondi.`);
    }
    if (errore instanceof ErroreProvider) throw errore;
    throw new ErroreProvider(`Impossibile contattare il modello: ${errore.message}`, errore);
  } finally {
    clearTimeout(timer);
  }
}
