// A very small 2D physics step for the app's playful bits: letter tiles that can be flicked around
// the home screen and that rain down after a finished round. Circles in a box with gravity, air
// drag, bouncing walls and elastic collisions. Pure and deterministic, so it is tested without a DOM.

export type Body = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Collision radius in the world's units (pixels in the components). */
  r: number;
  /** Spin in degrees and degrees per second; only for looks. */
  angle: number;
  spin: number;
  /** Held by a finger: the step leaves it where it is and other bodies bounce off it. */
  held?: boolean;
};

export type World = {
  width: number;
  height: number;
  /** Downward acceleration in units per second². 0 makes the tiles float. */
  gravity: number;
  /** Share of the speed lost per second to air drag, 0..1. */
  drag: number;
  /** How much speed a bounce keeps, 0..1. */
  bounce: number;
};

const MAX_STEP = 1 / 30;

/** Advances every body by `dt` seconds (clamped, so a background tab does not explode the scene). */
export function step(bodies: Body[], world: World, dt: number): void {
  const delta = Math.min(Math.max(dt, 0), MAX_STEP);
  if (delta === 0) return;
  const keep = Math.pow(1 - Math.min(Math.max(world.drag, 0), 1), delta);
  for (const body of bodies) {
    if (body.held) continue;
    body.vy += world.gravity * delta;
    body.vx *= keep;
    body.vy *= keep;
    body.spin *= keep;
    body.x += body.vx * delta;
    body.y += body.vy * delta;
    body.angle += body.spin * delta;
  }
  for (let first = 0; first < bodies.length; first += 1) {
    for (let second = first + 1; second < bodies.length; second += 1) collide(bodies[first]!, bodies[second]!, world.bounce);
  }
  for (const body of bodies) if (!body.held) contain(body, world);
}

function contain(body: Body, world: World): void {
  const maxX = Math.max(body.r, world.width - body.r);
  const maxY = Math.max(body.r, world.height - body.r);
  if (body.x < body.r) { body.x = body.r; body.vx = Math.abs(body.vx) * world.bounce; }
  else if (body.x > maxX) { body.x = maxX; body.vx = -Math.abs(body.vx) * world.bounce; }
  if (body.y < body.r) { body.y = body.r; body.vy = Math.abs(body.vy) * world.bounce; }
  else if (body.y > maxY) {
    body.y = maxY;
    body.vy = -Math.abs(body.vy) * world.bounce;
    // Resting on the floor: stop the jitter of a bounce that gravity keeps feeding, and roll to a halt.
    if (Math.abs(body.vy) < 18) body.vy = 0;
    body.vx *= 0.96;
    body.spin *= 0.9;
  }
}

function collide(a: Body, b: Body, bounce: number): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const reach = a.r + b.r;
  const distanceSquared = dx * dx + dy * dy;
  if (distanceSquared >= reach * reach) return;
  const distance = Math.sqrt(distanceSquared) || 0.001;
  const nx = dx / distance;
  const ny = dy / distance;
  const overlap = reach - distance;
  // A held body does not give way; otherwise both move apart by half the overlap.
  const shareA = a.held ? 0 : b.held ? 1 : 0.5;
  a.x -= nx * overlap * shareA;
  a.y -= ny * overlap * shareA;
  b.x += nx * overlap * (1 - shareA);
  b.y += ny * overlap * (1 - shareA);
  const approach = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (approach >= 0) return;
  const impulse = -(1 + bounce) * approach;
  if (a.held) { b.vx += impulse * nx; b.vy += impulse * ny; }
  else if (b.held) { a.vx -= impulse * nx; a.vy -= impulse * ny; }
  else {
    a.vx -= (impulse / 2) * nx; a.vy -= (impulse / 2) * ny;
    b.vx += (impulse / 2) * nx; b.vy += (impulse / 2) * ny;
  }
  // A glancing hit sets the tiles spinning a little.
  const glance = (b.vx - a.vx) * -ny + (b.vy - a.vy) * nx;
  if (!a.held) a.spin -= glance * 0.4;
  if (!b.held) b.spin += glance * 0.4;
}

/** True once nothing moves fast enough to be seen, so the animation loop can stop. */
export function atRest(bodies: readonly Body[], threshold = 6): boolean {
  return bodies.every((body) => body.held !== true && Math.hypot(body.vx, body.vy) < threshold && Math.abs(body.spin) < threshold);
}
