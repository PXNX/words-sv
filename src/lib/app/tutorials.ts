// Which game tutorials the learner has seen, so each opens by itself only on the first visit.
// The keys are the ones the games already used for their guided first round.
export type TutorialGame = 'circle' | 'wordle' | 'hangman';

const KEYS: Record<TutorialGame, string> = {
  circle: 'wordcircle-tutorial-state-v1',
  wordle: 'wordcircle-wordle-tutorial-v1',
  hangman: 'wordcircle-hangman-tutorial-v1'
};

export function tutorialSeen(game: TutorialGame): boolean {
  try {
    return localStorage.getItem(KEYS[game]) === 'complete';
  } catch {
    return true;
  }
}

export function markTutorialSeen(game: TutorialGame) {
  try {
    localStorage.setItem(KEYS[game], 'complete');
  } catch {}
}

/** The guided practice rounds use example words in German and English only. */
export function hasPracticeRound(language: string): language is 'de' | 'en' {
  return language === 'de' || language === 'en';
}
