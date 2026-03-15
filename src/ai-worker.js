import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

/**
 * AI Worker für Dart Host Two.
 * Erledigt die KI-Berechnungen im Hintergrund, damit das UI flüssig bleibt.
 */
const handler = new WebWorkerMLCEngineHandler();

onmessage = (msg) => {
  handler.onmessage(msg);
};
