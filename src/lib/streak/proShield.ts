// WordCircle Pro's streak shield: with Pro active, one missed day per ISO week does not break the
// streak, before any freeze is used. The server applies the same rule (server/_lib/streak.ts).

/** The ISO week of a `YYYY-MM-DD` day, as `YYYY-Www` (weeks start on Monday). */
export function isoWeek(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7) + 3);
  const year = date.getUTCFullYear();
  const week = Math.ceil(((date.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Whether Pro (running until `proUntil`, epoch ms) covered the day `dateKey`. */
export function proCovers(proUntil: number | null | undefined, dateKey: string): boolean {
  return typeof proUntil === 'number' && proUntil >= Date.parse(`${dateKey}T00:00:00.000Z`);
}

/** Bridges a missed `yesterday` with the week's shield; null when the shield cannot be used. */
export function useProShield(yesterday: string, proUntil: number | null | undefined, shieldWeek: string | null | undefined): { lastQualifiedDay: string; proShieldWeek: string } | null {
  const week = isoWeek(yesterday);
  return proCovers(proUntil, yesterday) && shieldWeek !== week ? { lastQualifiedDay: yesterday, proShieldWeek: week } : null;
}
