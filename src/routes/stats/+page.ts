import { redirect } from '@sveltejs/kit';

// The stats page moved to /progress; keep old links and bookmarks working.
export function load() {
  redirect(308, '/progress');
}
