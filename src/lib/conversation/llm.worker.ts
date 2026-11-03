/// <reference lib="webworker" />
// Runs the on-device conversation model off the main thread, so the page stays responsive while
// the model downloads, loads onto the GPU and generates.
import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (message: MessageEvent) => handler.onmessage(message);
