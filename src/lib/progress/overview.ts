/*
 * The learning half of /progress: level ladder (coverage and mastery per CEFR level), readiness
 * per skill at the learner's level, known words and the error profile. Pure; the page passes in
 * the scheduler states and events it read.
 *
 * Vocabulary coverage of a level stands in for the other skills' coverage until texts, listening
 * clips and grammar items carry their own level tags: a learner cannot read a B1 text whose words
 * they have never met. Accuracy per skill always comes from that skill's own answers.
 */
import { LEVELS, SKILLS, type Level, type Skill } from '#lib/domain/types.js';
import type { SchedulerState } from '#lib/review/scheduler.js';
import { featureErrorProfile, type LearningEvent } from './events.js';
import { levelCoverage, levelReadiness, readiness, retainedAccuracy, rubricAverage, type LevelCoverage, type ReadinessRange } from './skillState.js';

export interface ProgressOverview {
  ladder: Array<LevelCoverage & { level: Level }>;
  skills: Record<Skill, ReadinessRange & { attempts: number }>;
  knownWords: number;
  /** Readiness for the learner's level, every skill weighted the same. */
  readiness: ReadinessRange;
  errors: ReturnType<typeof featureErrorProfile>;
}

export function buildOverview(input: {
  levels: Partial<Record<Level, { states: Iterable<SchedulerState | undefined>; total: number }>>;
  events: readonly LearningEvent[];
  level: Level;
  now: number;
}): ProgressOverview {
  const ladder = LEVELS.flatMap((level) => {
    const data = input.levels[level];
    return data && data.total > 0 ? [{ level, ...levelCoverage(data.states, data.total, input.now) }] : [];
  });
  const coverageAt = (level: Level) => ladder.find((rung) => rung.level === level)?.coverage ?? 0;
  const skillAt = (level: Level) => Object.fromEntries(SKILLS.map((skill) => {
    const { accuracy, attempts } = retainedAccuracy(input.events, input.now, { skill });
    return [skill, { ...readiness(skill, { coverage: coverageAt(level), accuracy, attempts, rubric: rubricAverage(input.events, skill) }), attempts }];
  })) as ProgressOverview['skills'];
  const skills = skillAt(input.level);
  return {
    ladder,
    skills,
    knownWords: ladder.reduce((sum, rung) => sum + rung.known, 0),
    readiness: levelReadiness(skills),
    errors: featureErrorProfile(input.events, input.now - 30 * 24 * 60 * 60 * 1000).slice(0, 5)
  };
}
