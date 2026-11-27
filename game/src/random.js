// Deterministic Mulberry32 PRNG for reproducible runs and screenshot scenes.

export function createSeededRng(seed = 1) {
  let state = (seed >>> 0) || 1;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomRange(rng, min, max) {
  return min + (max - min) * rng();
}

export function randomInt(rng, min, max) {
  return Math.floor(randomRange(rng, min, max + 1));
}

export function pickWeighted(rng, entries) {
  let total = 0;
  for (let i = 0; i < entries.length; i += 1) total += entries[i].weight;
  let roll = rng() * total;
  for (let i = 0; i < entries.length; i += 1) {
    roll -= entries[i].weight;
    if (roll <= 0) return entries[i].value;
  }
  return entries[entries.length - 1].value;
}
