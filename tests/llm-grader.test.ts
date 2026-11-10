import { describe, expect, it } from 'vitest';
import { grade } from '../src/lib/sentence/grading.js';
import { LLM_ISSUES, buildGradeMessages, parseLlmGrade } from '../src/lib/sentence/llmPrompt.js';

const fallback = grade('Heute Morgen bin ich früh aufgestanden und habe Kaffee getrunken.', 'de', 'short');

describe('LLM grader prompt', () => {
  it('lists every issue code in the system message', () => {
    const [system, user] = buildGradeMessages('Ein Text.', 'short', 'Mein Tag', 'de');
    expect(system?.role).toBe('system');
    for (const issue of LLM_ISSUES) expect(system?.content).toContain(issue);
    expect(system?.content).toContain('JSON');
    expect(user?.role).toBe('user');
    expect(user?.content).toContain('Mein Tag');
    expect(user?.content).toContain('Ein Text.');
  });

  it('describes the full-text mode differently from the short one', () => {
    const short = buildGradeMessages('x', 'short', 't', 'de')[1]?.content ?? '';
    const full = buildGradeMessages('x', 'full', 't', 'de')[1]?.content ?? '';
    expect(short).not.toBe(full);
    expect(short).toContain('one or two sentences');
    expect(full).toContain('whole text');
  });
});

describe('LLM grader reply parsing', () => {
  it('turns a clean JSON reply into a graded result', () => {
    const raw = 'Sure: {"score": 82, "issues": ["commas", "grammar"], "comment": "Gut gemacht."}';
    const result = parseLlmGrade(raw, fallback);
    expect(result.source).toBe('llm');
    expect(result.score).toBeCloseTo(0.82);
    expect(result.verdict).toBe('high');
    expect(result.comment).toBe('Gut gemacht.');
    expect(result.factors.map((factor) => factor.key)).toEqual(['llmCommas', 'llmGrammar']);
    // Counts still come from the rule scorer.
    expect(result.words).toBe(fallback.words);
  });

  it('accepts a numeric string score and ignores unknown issue codes', () => {
    const result = parseLlmGrade('{"score":"45","issues":["nonsense","nouns"]}', fallback);
    expect(result.score).toBeCloseTo(0.45);
    expect(result.verdict).toBe('low');
    expect(result.factors.map((factor) => factor.key)).toEqual(['llmNouns']);
  });

  it('adds the no-issues factor for a high score with an empty list', () => {
    const result = parseLlmGrade('{"score": 95, "issues": []}', fallback);
    expect(result.factors.map((factor) => factor.key)).toEqual(['llmNoIssues']);
    expect(result.verdict).toBe('high');
  });

  it('falls back when the reply is not usable', () => {
    expect(parseLlmGrade('I cannot help with that.', fallback)).toBe(fallback);
    expect(parseLlmGrade('{"issues": []}', fallback)).toBe(fallback);
    expect(parseLlmGrade('{"score": "nope"}', fallback)).toBe(fallback);
  });

  it('clamps scores outside 0–100', () => {
    expect(parseLlmGrade('{"score": 150}', fallback).score).toBe(1);
    expect(parseLlmGrade('{"score": -20}', fallback).score).toBe(0);
  });
});
