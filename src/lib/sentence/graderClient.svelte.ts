/*
 * Shared grading client for the two writing modes. Every text is graded by the on-device language
 * model; GraderGate asks the learner to download it once before the first grade. Only a device
 * that cannot run the model at all (no WebGPU) gets the deterministic rule scorer instead, and a
 * failed model run falls back to it too, so the learner always gets a grade.
 */
import { checkLocalModel, localModel } from '#lib/conversation/localModel.svelte.js';
import type { Language } from '#lib/data/vocabulary.js';
import { grade, type GradeMode, type GradeResult } from './grading.js';
import { ensureLlmGraderLoaded, gradeWithLlm } from './llmGrader.js';

export type GraderNotice = '' | 'unavailable' | 'failed';
/** unsupported: no WebGPU · missing: not downloaded yet · loading: downloading or loading into memory. */
export type GraderAvailability = 'checking' | 'unsupported' | 'missing' | 'loading' | 'ready';

export const grader = $state({
  /** A grade is being produced. */
  busy: false,
  /** Why the last grade came from the rules, if it did. */
  notice: '' as GraderNotice
});

/** Whether grading can start: the model is downloaded (or loaded), or the device cannot run it. */
export function graderAvailability(): GraderAvailability {
  if (localModel.status === 'unsupported') return 'unsupported';
  if (localModel.status === 'loading') return 'loading';
  if (localModel.status === 'checking' || (localModel.status === 'idle' && !localModel.device)) return 'checking';
  return localModel.status === 'ready' || localModel.cached ? 'ready' : 'missing';
}

export function canGrade(): boolean {
  const availability = graderAvailability();
  return availability === 'ready' || availability === 'unsupported';
}

export async function prepareGrader(): Promise<void> {
  await checkLocalModel();
}

export async function runGrade(text: string, language: Language, mode: GradeMode, topic: string): Promise<GradeResult> {
  grader.busy = true;
  grader.notice = '';
  try {
    if (localModel.status === 'unsupported' || !(await ensureLlmGraderLoaded())) {
      grader.notice = 'unavailable';
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
