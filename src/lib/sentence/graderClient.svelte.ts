/*
 * Shared grading client for the two writing modes. It keeps the AI-grading toggle
 * and the in-flight state, and decides between the on-device language model and
 * the deterministic rule scorer. Every failure falls back to the rules, so the
 * learner always gets a grade.
 */
import { localModel } from '#lib/conversation/localModel.svelte.js';
import type { Language } from '#lib/data/vocabulary.js';
import { grade, type GradeMode, type GradeResult } from './grading.js';
import { ensureLlmGraderLoaded, gradeWithLlm } from './llmGrader.js';

export type GraderNotice = '' | 'unavailable' | 'failed';

export const grader = $state({
  /** The learner opted into the language-model grade. */
  enabled: false,
  /** A grade is being produced (model download included). */
  busy: false,
  /** Why the last AI grade fell back to the rules, if it did. */
  notice: '' as GraderNotice
});

export async function runGrade(
  text: string,
  language: Language,
  mode: GradeMode,
  topic: string
): Promise<GradeResult> {
  if (!grader.enabled) return grade(text, language, mode);
  grader.busy = true;
  grader.notice = '';
  try {
    const ready = await ensureLlmGraderLoaded();
    if (!ready) {
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

/** The model download's progress, 0–1, while it loads. */
export function modelLoading(): boolean {
  return localModel.status === 'loading';
}

export function modelProgress(): number {
  return Math.max(0, Math.min(1, localModel.progress));
}
