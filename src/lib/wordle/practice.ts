const PRACTICE_KEY = 'wordcircle-wordle-practice-v1';

export function requestWordlePractice() {
  if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(PRACTICE_KEY, '1');
}

export function consumeWordlePracticeRequest(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  const value = sessionStorage.getItem(PRACTICE_KEY);
  sessionStorage.removeItem(PRACTICE_KEY);
  return value === '1';
}
