/*
 * Pure prompt and reply handling for the language-model grader. Kept separate from
 * the model plumbing in `llmGrader.ts` so it can be tested without WebGPU.
 */
import type { ChatMessage } from '#lib/conversation/conversation.js';
import type { GradeFactor, GradeFactorKey, GradeMode, GradeResult } from './grading.js';

/** Issue codes the model may report; each has a count-free message in the UI. */
export const LLM_ISSUES = [
  'tooShort',
  'tooLong',
  'punctuation',
  'capitalisation',
  'nouns',
  'commas',
  'variety',
  'structure',
  'spacing',
  'grammar'
] as const;

export type LlmIssue = (typeof LLM_ISSUES)[number];

const ISSUE_KEYS: Record<LlmIssue, GradeFactorKey> = {
  tooShort: 'llmTooShort',
  tooLong: 'llmTooLong',
  punctuation: 'llmPunctuation',
  capitalisation: 'llmCapitalisation',
  nouns: 'llmNouns',
  commas: 'llmCommas',
  variety: 'llmVariety',
  structure: 'llmStructure',
  spacing: 'llmSpacing',
  grammar: 'llmGrammar'
};

/** What the model should return. */
export type LlmGradePayload = {
  score?: unknown;
  issues?: unknown;
  comment?: unknown;
};

/** The messages sent to the model. */
export function buildGradeMessages(text: string, mode: GradeMode, topic: string, language: string): ChatMessage[] {
  const shape = mode === 'short'
    ? 'The learner wrote one or two sentences.'
    : 'The learner wrote a whole text; aim for about 60 words and, if it is long, more than one paragraph.';
  return [
    {
      role: 'system',
      content: [
        'You are a strict but encouraging German writing teacher.',
        `The learner's interface language is "${language}", but the text to grade is German.`,
        'Grade only the German text. Reply with JSON only, no prose and no markdown fences.',
        'Schema: {"score": <integer 0-100>, "issues": [<codes>], "comment": "<one short sentence in the interface language>"}.',
        `Allowed issue codes: ${LLM_ISSUES.join(', ')}.`,
        'Use an empty issues list when the text is fine. Never invent codes.'
      ].join(' ')
    },
    {
      role: 'user',
      content: `Mode: ${shape}\nTopic: ${topic}\n\nText to grade:\n${text}`
    }
  ];
}

/** Pulls the first JSON object out of a reply that may also contain prose or fences. */
function extractPayload(raw: string): LlmGradePayload | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(raw.slice(start, end + 1));
    return typeof parsed === 'object' && parsed !== null ? (parsed as LlmGradePayload) : null;
  } catch {
    return null;
  }
}

/**
 * Turns the model's JSON into a `GradeResult`, keeping the rule-based counts.
 * Returns `fallback` when the reply cannot be understood, so the caller never
 * has to show a broken grade.
 */
export function parseLlmGrade(raw: string, fallback: GradeResult): GradeResult {
  const payload = extractPayload(raw);
  if (!payload) return fallback;
  const score = typeof payload.score === 'number' ? payload.score : Number(payload.score);
  if (!Number.isFinite(score)) return fallback;

  const normalized = Math.min(1, Math.max(0, score / 100));
  const factors: GradeFactor[] = [];
  const reported = Array.isArray(payload.issues) ? payload.issues : [];
  for (const issue of reported) {
    if (typeof issue !== 'string') continue;
    const key = ISSUE_KEYS[issue as LlmIssue];
    if (!key) continue;
    if (!factors.some((factor) => factor.key === key)) factors.push({ key });
  }
  if (factors.length === 0 && normalized >= 0.75) factors.push({ key: 'llmNoIssues' });

  const comment = typeof payload.comment === 'string' ? payload.comment.trim().slice(0, 240) : '';
  return {
    score: normalized,
    factors,
    verdict: normalized >= 0.75 ? 'high' : normalized >= 0.5 ? 'ok' : 'low',
    words: fallback.words,
    sentences: fallback.sentences,
    paragraphs: fallback.paragraphs,
    source: 'llm',
    ...(comment ? { comment } : {})
  };
}
