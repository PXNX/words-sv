// Shared domain vocabulary: literal unions, branded ids and the exhaustiveness helper.
// Pure module (no $state), so it can be imported from tests, workers and server code alike.
import type { Language, VocabularyLevel } from '#lib/data/vocabulary.js';

export type LangCode = Language;
export type Level = VocabularyLevel;
export const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'] as const satisfies readonly Level[];

export const SKILLS = ['vocab', 'grammar', 'reading', 'listening', 'speaking', 'writing'] as const;
export type Skill = (typeof SKILLS)[number];

declare const brand: unique symbol;
/** A nominal type: `Brand<string, 'ItemId'>` is a string that only typed constructors produce. */
export type Brand<T, Name extends string> = T & { readonly [brand]: Name };

/** `language:item`, the same key the review ledger uses (e.g. `de:TISCH`). */
export type ItemId = Brand<string, 'ItemId'>;
export type SessionId = Brand<string, 'SessionId'>;

export function itemId(language: LangCode, item: string): ItemId {
  return `${language}:${item.trim().toLocaleUpperCase()}` as ItemId;
}

export function isItemId(value: unknown): value is ItemId {
  return typeof value === 'string' && /^[a-z]{2}:.+$/u.test(value);
}

export function sessionId(random: () => number = Math.random): SessionId {
  return `${Date.now().toString(36)}-${Math.floor(random() * 36 ** 6).toString(36).padStart(6, '0')}` as SessionId;
}

export function isLevel(value: unknown): value is Level {
  return typeof value === 'string' && (LEVELS as readonly string[]).includes(value);
}

export function isSkill(value: unknown): value is Skill {
  return typeof value === 'string' && (SKILLS as readonly string[]).includes(value);
}

/** Use as the `default` branch of an exhaustive `switch`; it fails to compile when a case is missing. */
export function assertNever(value: never, message = 'Unexpected value'): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}
