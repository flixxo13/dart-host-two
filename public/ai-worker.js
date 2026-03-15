import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";
const handler = new WebWorkerMLCEngineHandler();
onmessage = (msg) => { handler.onmessage(msg); };

import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

console.log("AI-Worker: Ich bin wach und bereit!");

const handler = new WebWorkerMLCEngineHandler();

onmessage = (msg) => {
  console.log("AI-Worker: Nachricht empfangen:", msg.data);
  handler.onmessage(msg);
};
