import { describe, expect, it } from 'vitest';
import { dateKeyFor, dueReminderTypes, minutesUntilNextLocalDate, previousDateKey } from '../src/lib/pwaReminders.ts';

/** @type {import('../src/lib/pwaReminders.ts').ReminderState} */
const base = {
	enabled: true,
	timeZone: 'Europe/Berlin',
	dateKey: '2026-10-19',
	qualified: true,
	lastQualifiedDay: '2026-10-19',
	locale: 'en'
};

describe('pwa streak reminders', () => {
	it('derives the local date key around midnight', () => {
		expect(dateKeyFor('Europe/Berlin', new Date('2026-10-19T21:59:00Z'))).toBe('2026-10-19');
		expect(dateKeyFor('Europe/Berlin', new Date('2026-10-19T22:01:00Z'))).toBe('2026-10-20');
		expect(previousDateKey('2026-10-20')).toBe('2026-10-19');
	});

	it('reminds about a new day shortly after local midnight', () => {
		const result = dueReminderTypes(base, new Date('2026-10-19T23:30:00Z'));
		expect(result).toMatchObject({ dateKey: '2026-10-20', types: ['new_day'] });
	});

	it('reminds before midnight when the streak is at risk', () => {
		const state = { ...base, dateKey: '2026-10-20', qualified: false };
		const result = dueReminderTypes(state, new Date('2026-10-20T21:30:00Z'));
		expect(result).toMatchObject({ dateKey: '2026-10-20', types: ['deadline'] });
		expect(result.minutesRemaining).toBeGreaterThan(0);
		expect(result.minutesRemaining).toBeLessThanOrEqual(31);
	});

	it('stays quiet during the day and after qualifying', () => {
		const midday = new Date('2026-10-20T10:00:00Z');
		expect(dueReminderTypes({ ...base, dateKey: '2026-10-20', qualified: false }, midday).types).toEqual([]);
		expect(dueReminderTypes({ ...base, dateKey: '2026-10-20', qualified: true, lastQualifiedDay: '2026-10-20' }, midday).types).toEqual([]);
	});

	it('never fires while reminders are disabled', () => {
		expect(dueReminderTypes({ ...base, enabled: false }, new Date('2026-10-20T21:30:00Z')).types).toEqual([]);
	});

	it('counts minutes until the next local midnight', () => {
		const minutes = minutesUntilNextLocalDate('Europe/Berlin', new Date('2026-10-20T21:30:00Z'));
		expect(minutes).toBeGreaterThanOrEqual(29);
		expect(minutes).toBeLessThanOrEqual(31);
	});
});
