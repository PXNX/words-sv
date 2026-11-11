import { describe, expect, it } from 'vitest';
import { germanStories } from '../src/lib/story/germanStories.js';

describe('german stories', () => {
  it('gives every story a real title instead of a placeholder like "Extra A2 1"', () => {
    const placeholders = germanStories.filter((story) => /^Extra /.test(story.title.de)).map((story) => story.id);
    expect(placeholders).toEqual([]);
  });

  it('keeps the correct answer (the first option) apart from the wrong ones', () => {
    const clashes = germanStories.flatMap((story) =>
      story.beats.flatMap((beat, index) => {
        if (beat.kind !== 'question' && beat.kind !== 'reply') return [];
        const [correct, ...wrong] = beat.options.map((option) => option.de.trim());
        return wrong.includes(correct ?? '') ? [`${story.id} #${index}: ${correct}`] : [];
      })
    );
    expect(clashes).toEqual([]);
  });

  it('only lets the story’s cast speak and be replied to', () => {
    const strangers = germanStories.flatMap((story) =>
      story.beats.flatMap((beat, index) => {
        const who = beat.kind === 'line' ? beat.speaker : beat.kind === 'reply' ? beat.to : null;
        return who && !story.cast.includes(who) ? [`${story.id} #${index}: ${who}`] : [];
      })
    );
    expect(strangers).toEqual([]);
  });
});
