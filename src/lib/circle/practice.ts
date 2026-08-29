const PRACTICE_KEY = 'wordcircle-circle-practice-v1';

export function requestCirclePractice(language: 'de' | 'en') {
  if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(PRACTICE_KEY, language);
}

export function consumeCirclePracticeRequest(): 'de' | 'en' | null {
  if (typeof sessionStorage === 'undefined') return null;
  const value = sessionStorage.getItem(PRACTICE_KEY);
  sessionStorage.removeItem(PRACTICE_KEY);
  return value === 'de' || value === 'en' ? value : null;
}
