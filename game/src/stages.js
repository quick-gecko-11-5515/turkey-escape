// Stage definitions (Farmyard -> Barn -> Kitchen) and procedural obstacle chunk generator.

import { CANVAS_WIDTH, GROUND_Y } from './config.js';
import { pickWeighted, randomRange } from './random.js';
import {
  spawnCornArc,
  spawnFallingKnife,
  spawnHideSpot,
  spawnRoastingOven,
  spawnStageBarrier,
} from './hazards.js';

export const STAGES = [
  {
    id: 'farmyard',
    index: 0,
    number: 1,
    name: 'Autumn Farmyard',
    shortName: 'FARMYARD',
    subtitle: 'Jump fences, dodge wood-fired roasters, and hide in haystacks!',
    startMeters: 0,
    endMeters: 320,
    baseSpeed: 375,
    maxSpeed: 455,
    knifeCooldownMin: 2.3,
    knifeCooldownMax: 3.7,
    farmerCreepMult: 1.0,
    searchChance: 0.35,
    coverStyle: 'haystack',
    accentColor: '#e67e22',
  },
  {
    id: 'barn',
    index: 1,
    number: 2,
    name: 'Midnight Barn',
    shortName: 'BARN',
    subtitle: 'Duck under rafters, leap past guard dogs, and hide from the lantern!',
    startMeters: 320,
    endMeters: 680,
    baseSpeed: 430,
    maxSpeed: 525,
    knifeCooldownMin: 1.65,
    knifeCooldownMax: 2.85,
    farmerCreepMult: 1.18,
    searchChance: 0.65,
    coverStyle: 'crate',
    accentColor: '#d49434',
  },
  {
    id: 'kitchen',
    index: 2,
    number: 3,
    name: 'Thanksgiving Kitchen',
    shortName: 'KITCHEN',
    subtitle: 'Roaring ovens & raining carving knives — burst through the back door!',
    startMeters: 680,
    endMeters: 1050,
    baseSpeed: 485,
    maxSpeed: 590,
    knifeCooldownMin: 1.15,
    knifeCooldownMax: 2.1,
    farmerCreepMult: 1.36,
    searchChance: 0.55,
    coverStyle: 'pantry',
    accentColor: '#c94c1a',
  },
];

export const TOTAL_ESCAPE_METERS = STAGES[STAGES.length - 1].endMeters;

export function getStageByDistance(meters) {
  for (let i = STAGES.length - 1; i >= 0; i -= 1) {
    if (meters >= STAGES[i].startMeters) return STAGES[i];
  }
  return STAGES[0];
}

export function getStageProgress(stage, meters) {
  const span = Math.max(1, stage.endMeters - stage.startMeters);
  return Math.max(0, Math.min(1, (meters - stage.startMeters) / span));
}

export function createLevelGenerator() {
  return {
    nextSpawnX: CANVAS_WIDTH + 180,
    knifeTimer: 1.7,
    patternIndex: 0,
  };
}

export function resetLevelGenerator(gen, initialDelay = 160) {
  gen.nextSpawnX = CANVAS_WIDTH + initialDelay;
  gen.knifeTimer = 1.6;
  gen.patternIndex = 0;
}

export function generateStageChunk(world, dt) {
  const { stage, rng, generator, hazards } = world;
  const scrollDx = world.scrollSpeed * dt;
  generator.nextSpawnX -= scrollDx;

  // Periodic falling carving knives targeted ahead of Tom's running path.
  generator.knifeTimer -= dt;
  if (generator.knifeTimer <= 0 && world.distanceMeters < TOTAL_ESCAPE_METERS - 20) {
    const targetX = world.turkey.x + randomRange(rng, 120, 320);
    const clampedX = Math.max(300, Math.min(CANVAS_WIDTH - 120, targetX));
    spawnFallingKnife(hazards, clampedX, stage.id);

    // Kitchen occasionally drops twin staggered knives.
    if (stage.id === 'kitchen' && rng() < 0.36) {
      const twinX = Math.max(320, Math.min(CANVAS_WIDTH - 90, clampedX + randomRange(rng, 145, 220)));
      spawnFallingKnife(hazards, twinX, stage.id, 0.32);
    }

    generator.knifeTimer = randomRange(rng, stage.knifeCooldownMin, stage.knifeCooldownMax);
  }

  // Spawn ground chunks ahead of the right screen edge.
  while (generator.nextSpawnX < CANVAS_WIDTH + 220) {
    const x = generator.nextSpawnX;
    let spacing = randomRange(rng, 390, 520);

    if (stage.id === 'farmyard') {
      const kind = pickWeighted(rng, [
        { value: 'fence', weight: 28 },
        { value: 'oven', weight: 26 },
        { value: 'haystack', weight: 24 },
        { value: 'fence_oven', weight: 22 },
      ]);
      if (kind === 'fence') {
        spawnStageBarrier(hazards, x, 'fence');
        spawnCornArc(hazards, x + 28, GROUND_Y - 128, 3, 52);
        spacing = randomRange(rng, 360, 460);
      } else if (kind === 'oven') {
        spawnRoastingOven(hazards, x, 'brick');
        spawnCornArc(hazards, x + 60, GROUND_Y - 155, 4, 54);
        spacing = randomRange(rng, 440, 540);
      } else if (kind === 'haystack') {
        spawnHideSpot(hazards, x, 'haystack');
        spawnCornArc(hazards, x + 20, GROUND_Y - 58, 3, 48);
        spacing = randomRange(rng, 370, 470);
      } else {
        spawnStageBarrier(hazards, x, 'fence');
        spawnCornArc(hazards, x + 32, GROUND_Y - 132, 3, 52);
        spawnRoastingOven(hazards, x + 310, 'brick');
        spacing = randomRange(rng, 680, 780);
      }
    } else if (stage.id === 'barn') {
      const kind = pickWeighted(rng, [
        { value: 'rafter', weight: 26 },
        { value: 'dog', weight: 25 },
        { value: 'crate', weight: 25 },
        { value: 'oven', weight: 24 },
      ]);
      if (kind === 'rafter') {
        spawnStageBarrier(hazards, x, 'rafter');
        spawnCornArc(hazards, x + 24, GROUND_Y - 38, 4, 48);
        spacing = randomRange(rng, 400, 500);
      } else if (kind === 'dog') {
        spawnStageBarrier(hazards, x, 'dog');
        spawnCornArc(hazards, x + 46, GROUND_Y - 152, 4, 52);
        spacing = randomRange(rng, 430, 530);
      } else if (kind === 'crate') {
        spawnHideSpot(hazards, x, 'crate');
        spawnCornArc(hazards, x + 15, GROUND_Y - 62, 3, 50);
        spacing = randomRange(rng, 380, 470);
      } else {
        spawnRoastingOven(hazards, x, 'stove');
        spawnCornArc(hazards, x + 64, GROUND_Y - 160, 4, 52);
        spacing = randomRange(rng, 450, 560);
      }
    } else {
      const kind = pickWeighted(rng, [
        { value: 'oven', weight: 32 },
        { value: 'potrack', weight: 24 },
        { value: 'butcher', weight: 22 },
        { value: 'pantry', weight: 22 },
      ]);
      if (kind === 'oven') {
        spawnRoastingOven(hazards, x, 'castiron');
        spawnCornArc(hazards, x + 68, GROUND_Y - 166, 4, 54);
        spacing = randomRange(rng, 440, 540);
      } else if (kind === 'potrack') {
        spawnStageBarrier(hazards, x, 'potrack');
        spawnCornArc(hazards, x + 22, GROUND_Y - 36, 4, 48);
        spacing = randomRange(rng, 410, 500);
      } else if (kind === 'butcher') {
        spawnStageBarrier(hazards, x, 'butcher');
        spawnCornArc(hazards, x + 55, GROUND_Y - 146, 4, 52);
        spacing = randomRange(rng, 430, 520);
      } else {
        spawnHideSpot(hazards, x, 'pantry');
        spawnCornArc(hazards, x + 16, GROUND_Y - 64, 3, 48);
        spacing = randomRange(rng, 390, 470);
      }
    }

    generator.nextSpawnX += spacing;
    generator.patternIndex += 1;
  }
}
