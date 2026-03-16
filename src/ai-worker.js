import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

const handler = new WebWorkerMLCEngineHandler();

onmessage = (msg) => {
  handler.onmessage(msg);
};
