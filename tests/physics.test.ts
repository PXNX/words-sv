import { describe, expect, it } from 'vitest';
import { atRest, step, type Body, type World } from '../src/lib/app/physics';

const body = (overrides: Partial<Body> = {}): Body => ({ x: 50, y: 50, vx: 0, vy: 0, r: 10, angle: 0, spin: 0, ...overrides });
const box: World = { width: 200, height: 200, gravity: 0, drag: 0, bounce: 1 };
const run = (bodies: Body[], world: World, seconds: number) => {
  for (let time = 0; time < seconds; time += 1 / 60) step(bodies, world, 1 / 60);
};

describe('physics step', () => {
  it('moves a body by its velocity', () => {
    const tile = body({ vx: 60 });
    step([tile], box, 1 / 60);
    expect(tile.x).toBeCloseTo(51);
    expect(tile.y).toBe(50);
  });

  it('keeps bodies inside the box and bounces them off the walls', () => {
    const tile = body({ x: 185, vx: 300 });
    run([tile], box, 0.2);
    expect(tile.x).toBeLessThanOrEqual(190);
    expect(tile.vx).toBeLessThan(0);
  });

  it('lets gravity pull a body to the floor where it comes to rest', () => {
    const tile = body({ y: 20 });
    const world: World = { ...box, gravity: 900, drag: 0.4, bounce: 0.4 };
    run([tile], world, 6);
    expect(tile.y).toBeCloseTo(190, 0);
    expect(atRest([tile])).toBe(true);
  });

  it('pushes overlapping bodies apart and exchanges their speed', () => {
    const left = body({ x: 80, vx: 100 });
    const right = body({ x: 110 });
    run([left, right], box, 0.3);
    expect(Math.hypot(right.x - left.x, right.y - left.y)).toBeGreaterThanOrEqual(19.9);
    expect(right.vx).toBeGreaterThan(50);
    expect(left.vx).toBeLessThan(50);
  });

  it('leaves a held body alone and bounces others off it', () => {
    const held = body({ x: 100, held: true });
    const moving = body({ x: 60, vx: 200 });
    run([held, moving], box, 0.3);
    expect(held.x).toBe(100);
    expect(moving.vx).toBeLessThan(0);
    expect(atRest([held])).toBe(false);
  });

  it('slows down with drag and ignores absurd time steps', () => {
    const tile = body({ vx: 100 });
    step([tile], { ...box, drag: 0.9 }, 5);
    expect(tile.vx).toBeLessThan(100);
    expect(tile.x).toBeLessThan(50 + 100 / 30 + 0.01);
    const still = body();
    step([still], box, 0);
    expect(still.x).toBe(50);
  });
});
