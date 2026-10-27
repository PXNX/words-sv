import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['tests/cron-endpoint.test.mjs', 'tests/pwa-reminders.test.mjs', 'tests/reading-words.test.mjs', 'tests/reading-prose.test.mjs', 'tests/today-plan.test.ts', 'tests/review-ledger.test.ts', 'tests/milestones.test.ts', 'tests/client-streak.test.ts', 'tests/word-bank.test.ts', 'tests/achievements.test.ts']
	}
});
