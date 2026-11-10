/*
 * The language-model grader behind `grade()`.
 *
 * The rule-based scorer in `grading.ts` stays the deterministic fallback. When the
 * writing modes grade (always, once the model is downloaded), they send the text to the on-device
 * WebLLM model that the conversation mode already uses — nothing leaves the phone.
 * The model answers with JSON (score, issue codes, one short comment); this module
 * turns that into the same `GradeResult` shape the rule scorer produces.
 */
import { checkLocalModel, generateReply, loadLocalModel, localModel } from '#lib/conversation/localModel.svelte.js';
import { grade, type GradeMode, type GradeResult } from './grading.js';
import { buildGradeMessages, parseLlmGrade } from './llmPrompt.js';

export { LLM_ISSUES, buildGradeMessages, parseLlmGrade, type LlmGradePayload, type LlmIssue } from './llmPrompt.js';

/** Whether the on-device model is loaded and can grade right now. */
export async function llmGraderReady(): Promise<boolean> {
  await checkLocalModel();
  return localModel.status === 'ready';
}

/**
 * Loads the chosen on-device model if needed. Returns false when the device cannot
 * run it (no WebGPU) or loading failed, so the caller falls back to the rules.
 */
export async function ensureLlmGraderLoaded(): Promise<boolean> {
  await checkLocalModel();
  if (localModel.status === 'ready') return true;
  if (localModel.status === 'unsupported') return false;
  await loadLocalModel();
  // `loadLocalModel` mutates the status, which TypeScript cannot see across the await.
  const status: string = localModel.status;
  return status === 'ready';
}

/**
 * Grades with the on-device language model. Throws when the model is not loaded or
 * the reply cannot be parsed; callers catch and fall back to `grade()`.
 */
export async function gradeWithLlm(
  text: string,
  language: string,
  mode: GradeMode,
  topic: string
): Promise<GradeResult> {
  const rules = grade(text, language as Parameters<typeof grade>[1], mode);
  const raw = await generateReply(buildGradeMessages(text, mode, topic, language), () => {});
  return parseLlmGrade(raw, rules);
}
