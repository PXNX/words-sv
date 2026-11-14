import { describe, expect, it } from 'vitest';
import { castEngineVoices, engineFootprint, engineFor, ownsClipKey, retiredVoiceEngines, speaksLanguage, storedVoiceEngine, voiceEngineIds, voiceEngines, type EngineVoice } from '../src/lib/voice/engines.js';
import { createPriorityQueue } from '../src/lib/audio/priorityQueue.js';

describe('voice engines', () => {
  it('falls back to Piper where Supertonic cannot speak the language', () => {
    expect(engineFor('supertonic', 'fr', { webgpu: false })).toBe('supertonic');
    expect(engineFor('supertonic', 'de')).toBe('natural');
    expect(engineFor('natural', 'uk')).toBe('natural');
    expect(speaksLanguage('supertonic', 'it')).toBe(false);
  });

  it('speaks with the browser where it has voices, and with Piper where it has none', () => {
    expect(engineFor('standard', 'de', { webgpu: false, browserVoices: true })).toBe('standard');
    expect(engineFor('standard', 'de', { webgpu: false, browserVoices: false })).toBe('natural');
    // Without an answer yet (or outside a device) the browser keeps the engine, as it always did.
    expect(engineFor('standard', 'de', { webgpu: false })).toBe('standard');
  });

  it('moves a stored VoxCPM setting to Piper and keeps current ones', () => {
    expect(storedVoiceEngine('voxcpm')).toBe('natural');
    expect(storedVoiceEngine('supertonic')).toBe('supertonic');
    expect(storedVoiceEngine('edge')).toBe('edge');
    expect(storedVoiceEngine(null)).toBe('standard');
    expect(storedVoiceEngine('nonsense')).toBe('standard');
    expect(storedVoiceEngine('toString')).toBe('standard');
    for (const [retired, replacement] of Object.entries(retiredVoiceEngines)) {
      expect(voiceEngineIds).not.toContain(retired);
      expect(voiceEngineIds).toContain(replacement);
    }
  });

  it('keys rendered audio by the engine for models and Edge, by the Piper pack otherwise', () => {
    expect(ownsClipKey('supertonic')).toBe(true);
    expect(ownsClipKey('edge')).toBe(true);
    expect(ownsClipKey('natural')).toBe(false);
    expect(ownsClipKey('recorded')).toBe(false);
  });

  it('speaks every app language with Supertonic 3, on WebAssembly too', () => {
    for (const language of ['de', 'en', 'fr', 'it', 'es', 'pt', 'uk'] as const) expect(engineFor('supertonic3', language, { webgpu: false })).toBe('supertonic3');
    expect(voiceEngines.supertonic3.voices?.filter((voice) => voice.gender === 'female')).toHaveLength(5);
    expect(voiceEngines.supertonic3.voices?.filter((voice) => voice.gender === 'male')).toHaveLength(5);
    expect(engineFootprint('supertonic3', { webgpu: false })).toEqual(voiceEngines.supertonic3.wasm);
  });

  it('speaks English with Kokoro and Kitten and hands other languages to Piper', () => {
    for (const engine of ['kokoro', 'kitten'] as const) {
      expect(engineFor(engine, 'en', { webgpu: false })).toBe(engine);
      expect(engineFor(engine, 'de', { webgpu: true })).toBe('natural');
    }
  });

  it('gives Kokoro and Kitten enough voices of each gender for a full cast', () => {
    for (const engine of ['kokoro', 'kitten'] as const) {
      const voices = voiceEngines[engine].voices ?? [];
      expect(voices.filter((voice) => voice.gender === 'female').length, engine).toBeGreaterThanOrEqual(4);
      expect(voices.filter((voice) => voice.gender === 'male').length, engine).toBeGreaterThanOrEqual(4);
      for (const voice of voices) expect(['en-us', 'en-gb']).toContain(voice.accent);
    }
    const kokoro = voiceEngines.kokoro.voices ?? [];
    expect(kokoro).toHaveLength(28);
    expect(kokoro.find((voice) => voice.id === 'bm_george')).toEqual({ id: 'bm_george', name: 'George', gender: 'male', accent: 'en-gb' });
    expect(kokoro[0]?.id).toBe('af_heart');
  });

  it('marks only Edge as leaving the device', () => {
    expect(voiceEngineIds.filter((id) => !voiceEngines[id].onDevice)).toEqual(['edge']);
  });
});

describe('voice engine registry', () => {
  it('keys every engine by its own id and gives it a name', () => {
    for (const id of voiceEngineIds) {
      expect(voiceEngines[id].id).toBe(id);
      expect(voiceEngines[id].name).not.toBe('');
    }
  });

  it('ends every fallback chain at an engine that runs everywhere', () => {
    for (const id of voiceEngineIds) {
      for (const language of ['de', 'en', 'fr', 'it', 'es', 'pt', 'uk'] as const) {
        const engine = engineFor(id, language, { webgpu: false, browserVoices: false });
        expect(voiceEngines[engine].webgpu).toBeFalsy();
        expect(speaksLanguage(engine, language)).toBe(true);
        expect(engine).not.toBe('standard');
      }
    }
  });

  it('describes every downloaded model completely', () => {
    for (const engine of Object.values(voiceEngines).filter((candidate) => candidate.runtime === 'model')) {
      expect(engine.megabytes, engine.id).toBeGreaterThan(0);
      expect(engine.memoryMB, engine.id).toBeGreaterThan(0);
      expect(engine.tier, engine.id).toBeDefined();
      expect(engine.model, engine.id).toMatch(/^[\w-]+\/[\w.-]+$/);
      expect(engine.licence, engine.id).toBeTruthy();
      const tier = engine.megabytes! < 100 ? 'small' : engine.megabytes! < 500 ? 'medium' : 'large';
      expect(engine.tier, engine.id).toBe(tier);
    }
  });

  it('gives voices unique ids within an engine', () => {
    for (const engine of Object.values(voiceEngines)) {
      const ids = (engine.voices ?? []).map((voice) => voice.id);
      expect(new Set(ids).size, engine.id).toBe(ids.length);
    }
  });

  it('reports the WebAssembly footprint where an engine has one and there is no WebGPU', () => {
    for (const id of voiceEngineIds) {
      const { wasm, megabytes } = voiceEngines[id];
      if (wasm) expect(engineFootprint(id, { webgpu: false })).toEqual(wasm);
      if (megabytes) expect(engineFootprint(id, { webgpu: true })?.megabytes).toBe(megabytes);
    }
    expect(engineFootprint('standard', { webgpu: true })).toBeNull();
  });
});

describe('casting model voices', () => {
  const voices: EngineVoice[] = [
    { id: 'f1', name: 'F1', gender: 'female' }, { id: 'f2', name: 'F2', gender: 'female' },
    { id: 'm1', name: 'M1', gender: 'male' }
  ];

  it('gives each speaker the next unused voice of their gender, best first', () => {
    const casting = castEngineVoices([{ id: 'narrator', gender: 'female' }, { id: 'tom', gender: 'male' }, { id: 'mia', gender: 'female' }], voices);
    expect([...casting]).toEqual([['narrator', 'f1'], ['tom', 'm1'], ['mia', 'f2']]);
  });

  it('shares voices only once the pool runs out', () => {
    const casting = castEngineVoices([{ id: 'a', gender: 'male' }, { id: 'b', gender: 'male' }], voices);
    expect([...casting.values()]).toEqual(['m1', 'm1']);
  });

  it('borrows from the other gender when the model has none of a speaker\'s', () => {
    const female = voices.filter((voice) => voice.gender === 'female');
    expect(castEngineVoices([{ id: 'paul', gender: 'male' }], female).get('paul')).toBe('f1');
    expect(castEngineVoices([{ id: 'paul', gender: 'male' }], []).size).toBe(0);
  });

  it('casts Supertonic\'s ten voices without sharing for ten speakers', () => {
    const speakers = Array.from({ length: 10 }, (_, index) => ({ id: index, gender: index % 2 ? 'male' as const : 'female' as const }));
    expect(new Set(castEngineVoices(speakers, voiceEngines.supertonic.voices ?? []).values()).size).toBe(10);
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
