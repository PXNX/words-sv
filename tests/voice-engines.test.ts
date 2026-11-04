import { describe, expect, it } from 'vitest';
import { engineFor, speaksLanguage, voiceEngineIds, voiceEngines } from '../src/lib/voice/engines.js';
import { createPriorityQueue } from '../src/lib/audio/priorityQueue.js';

describe('voice engines', () => {
  it('falls back to Piper where Supertonic cannot speak the language', () => {
    expect(engineFor('supertonic', 'fr', { webgpu: false })).toBe('supertonic');
    expect(engineFor('supertonic', 'de')).toBe('natural');
    expect(engineFor('natural', 'uk')).toBe('natural');
    expect(speaksLanguage('supertonic', 'it')).toBe(false);
  });

  it('uses VoxCPM only where WebGPU is available', () => {
    expect(engineFor('voxcpm', 'de', { webgpu: true })).toBe('voxcpm');
    expect(engineFor('voxcpm', 'de', { webgpu: false })).toBe('natural');
  });

  it('marks only Edge as leaving the device', () => {
    expect(voiceEngineIds.filter((id) => !voiceEngines[id].onDevice)).toEqual(['edge']);
  });
});

describe('priority queue', () => {
  it('runs one task at a time, foreground before background', async () => {
    const queue = createPriorityQueue();
    const order: string[] = [];
    const task = (name: string) => async () => { order.push(name); };
    const first = queue.push(task('first'), 'background');
    const later = [queue.push(task('bg'), 'background'), queue.push(task('fg'), 'foreground')];
    await Promise.all([first, ...later]);
    expect(order).toEqual(['first', 'fg', 'bg']);
  });
});
