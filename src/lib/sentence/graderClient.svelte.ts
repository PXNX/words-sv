/*
 * Shared grading client for the two writing modes. Once the on-device language model is
 * downloaded, texts are graded by it (GraderGate offers the download and a switch to grade
 * without it). Until then – no WebGPU, not downloaded, still downloading, failed – and whenever
 * the learner picks "without AI", the deterministic rule scorer grades instead, and a failed model
 * run falls back to it too, so the learner always gets a grade without having to download anything.
 */
import { usesAi } from '#lib/conversation/aiChoice.svelte.js';
import { checkLocalModel, localModel } from '#lib/conversation/localModel.svelte.js';
import type { Language } from '#lib/data/vocabulary.js';
import { grade, type GradeMode, type GradeResult } from './grading.js';
import { ensureLlmGraderLoaded, gradeWithLlm } from './llmGrader.js';

export type GraderNotice = '' | 'failed';
/** unsupported: no WebGPU · missing: not downloaded yet · loading: downloading or loading into memory. */
export type GraderAvailability = 'checking' | 'unsupported' | 'missing' | 'loading' | 'ready';

export const grader = $state({
  /** A grade is being produced. */
  busy: false,
  /** Set when the model should have graded but did not, so the rules did. */
  notice: '' as GraderNotice
});

/** What the model can do here; grading itself never waits for it (see `runGrade`). */
export function graderAvailability(): GraderAvailability {
  if (localModel.status === 'unsupported') return 'unsupported';
  if (localModel.status === 'loading') return 'loading';
  if (localModel.status === 'checking' || (localModel.status === 'idle' && !localModel.device)) return 'checking';
  return localModel.status === 'ready' || localModel.cached ? 'ready' : 'missing';
}

/** Whether the next grade comes from the model (downloaded and not switched off). */
export function gradesWithAi(): boolean {
  return graderAvailability() === 'ready' && usesAi('writing');
}

export async function prepareGrader(): Promise<void> {
  await checkLocalModel();
}

export async function runGrade(text: string, language: Language, mode: GradeMode, topic: string): Promise<GradeResult> {
  grader.busy = true;
  grader.notice = '';
  try {
    if (!gradesWithAi()) return grade(text, language, mode);
    if (!(await ensureLlmGraderLoaded())) {
      grader.notice = 'failed';
      return grade(text, language, mode);
    }
    return await gradeWithLlm(text, language, mode, topic);
  } catch {
    grader.notice = 'failed';
    return grade(text, language, mode);
  } finally {
    grader.busy = false;
  }
}
