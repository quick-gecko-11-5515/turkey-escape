// Deterministic screenshot scene setup (?shot=cover|title|kitchen|escaped&seed=N) via seeded autopilot.

import { FIXED_DT, GROUND_Y } from './config.js';
import {
  spawnCornArc,
  spawnFallingKnife,
  spawnHideSpot,
  spawnRoastingOven,
  spawnStageBarrier,
} from './hazards.js';
import { TOTAL_ESCAPE_METERS } from './stages.js';

export function parseShotParams(searchString) {
  const params = new URLSearchParams(searchString || '');
  const shot = params.get('shot');
  if (!shot) return null;
  const parsedSeed = Number(params.get('seed') || 1);
  return {
    shot,
    seed: Number.isFinite(parsedSeed) && parsedSeed > 0 ? Math.floor(parsedSeed) : 1,
  };
}

export function stepAutopilotFrame(world) {
  const { turkey, farmer, hazards } = world;
  const input = {
    moveLeft: false,
    moveRight: false,
    duckHeld: false,
    hideHeld: false,
    jumpHeld: false,
    jumpPressed: false,
    dashPressed: false,
    hidePressed: false,
    pausePressed: false,
    restartPressed: false,
    mutePressed: false,
    clicks: [],
    pointerPos: { x: 0, y: 0 },
  };

  // Hide when farmer is searching and cover is right under Tom.
  if (farmer.state === 'search' && turkey.nearHideSpot && turkey.onGround && turkey.hideTimer < 1.1) {
    input.hideHeld = true;
    input.hidePressed = !turkey.hiding;
    return input;
  }

  // Dodge upcoming ground ovens & fences/dogs/butcher tables.
  for (let i = 0; i < hazards.ovens.length; i += 1) {
    const oven = hazards.ovens[i];
    const dist = oven.x - turkey.x;
    if (dist > 15 && dist < 135 && turkey.onGround) {
      input.jumpPressed = true;
      input.jumpHeld = true;
      return input;
    }
  }

  for (let i = 0; i < hazards.barriers.length; i += 1) {
    const b = hazards.barriers[i];
    const dist = b.x - turkey.x;
    if (b.kind === 'rafter' || b.kind === 'potrack') {
      if (dist > -b.w - 15 && dist < 110) {
        input.duckHeld = true;
        return input;
      }
    } else if (dist > 10 && dist < 125 && turkey.onGround) {
      input.jumpPressed = true;
      input.jumpHeld = true;
      return input;
    }
  }

  // Side-step or dash away from falling carving knives.
  for (let i = 0; i < hazards.knives.length; i += 1) {
    const knife = hazards.knives[i];
    const dx = knife.x - turkey.x;
    if (Math.abs(dx) < 62 && (knife.state === 'falling' || knife.timer < 0.25)) {
      if (turkey.dashCooldown <= 0) {
        input.dashPressed = true;
      } else if (dx >= 0) {
        input.moveLeft = true;
      } else {
        input.moveRight = true;
      }
      return input;
    }
  }

  // Dash whenever farmer gets dangerously close.
  if (farmer.gap < 34 && turkey.dashCooldown <= 0) {
    input.dashPressed = true;
  }

  return input;
}

export function prepareDeterministicShot(world, shotConfig, callbacks) {
  const { startNewRun, advanceSimulationTick } = callbacks;
  const { shot, seed } = shotConfig;

  if (shot === 'title') {
    world.screen = 'title';
    world.bestScore = 6420;
    world.bestDistance = TOTAL_ESCAPE_METERS;
    for (let i = 0; i < 84; i += 1) {
      advanceSimulationTick(world, stepAutopilotFrame(world), FIXED_DT);
    }
    return;
  }

  startNewRun(world, seed);

  if (shot === 'cover') {
    // Advance real gameplay into Stage 1 Farmyard, then stage a dramatic real-physics chase leap!
    for (let i = 0; i < 520; i += 1) {
      advanceSimulationTick(world, stepAutopilotFrame(world), FIXED_DT);
      if (world.distanceMeters >= 132) break;
    }

    // Clear cluttered off-beat entities and spawn a classic Farmyard chase triad, then simulate forward!
    world.hazards.ovens = [];
    world.hazards.knives = [];
    world.hazards.barriers = [];
    world.hazards.hideSpots = [];
    world.hazards.corns = [];
    world.particles.popups = [];

    spawnHideSpot(world.hazards, world.turkey.x + 420, 'haystack');
    spawnRoastingOven(world.hazards, world.turkey.x + 158, 'brick');
    spawnCornArc(world.hazards, world.turkey.x + 250, GROUND_Y - 178, 3, 54);
    spawnStageBarrier(world.hazards, world.turkey.x + 650, 'fence');
    // Stagger carving knives so the lead knife is plunging prominently mid-sky at capture!
    spawnFallingKnife(world.hazards, world.turkey.x + 395, 'farmyard', -0.68);
    spawnFallingKnife(world.hazards, world.turkey.x + 605, 'farmyard', -0.52);

    world.farmer.gap = 28;
    world.farmer.x = world.turkey.x - 195;
    world.farmer.state = 'surge';
    world.farmer.stateTimer = 2.1;
    world.farmer.bannerText = "HE'S COMING!";
    world.farmer.bannerTimer = 1.9;
    world.turkey.invincibleTimer = 0;
    world.turkey.lives = 3;

    // Step real physics so Tom naturally leaps high over the blazing oven while the gleaming knives plunge!
    for (let step = 0; step < 26; step += 1) {
      const inp = stepAutopilotFrame(world);
      if (step === 4) {
        inp.jumpPressed = true;
        inp.jumpHeld = true;
      }
      advanceSimulationTick(world, inp, FIXED_DT);
    }
    world.particles.popups = [];
    world.turkey.invincibleTimer = 0;
    world.turkey.hurtFlashTimer = 0;
    return;
  }

  if (shot === 'kitchen') {
    // Run autopilot through Stage 1 & Stage 2 into Stage 3 Thanksgiving Kitchen!
    let guard = 0;
    while (world.distanceMeters < 825 && guard < 6000) {
      guard += 1;
      // Keep autopilot healthy through long fast-forward if needed.
      if (world.turkey.lives <= 1) world.turkey.lives = 3;
      if (world.farmer.gap < 18) world.farmer.gap = 42;
      advanceSimulationTick(world, stepAutopilotFrame(world), FIXED_DT);
    }

    // Arrange a crisp Kitchen centerpiece: blazing cast-iron oven, twin mid-air knives, copper pot rack & pantry crate.
    world.hazards.ovens = [];
    world.hazards.knives = [];
    world.hazards.barriers = [];
    world.hazards.hideSpots = [];
    world.hazards.corns = [];
    world.particles.popups = [];

    spawnRoastingOven(world.hazards, world.turkey.x + 150, 'castiron');
    spawnCornArc(world.hazards, world.turkey.x + 240, GROUND_Y - 178, 3, 54);
    spawnStageBarrier(world.hazards, world.turkey.x + 440, 'potrack');
    spawnHideSpot(world.hazards, world.turkey.x + 635, 'pantry');
    spawnFallingKnife(world.hazards, world.turkey.x + 365, 'kitchen', -0.58);
    spawnFallingKnife(world.hazards, world.turkey.x + 560, 'kitchen', -0.45);

    world.farmer.gap = 34;
    world.farmer.x = world.turkey.x - 210;
    world.farmer.state = 'corner';
    world.farmer.stateTimer = 2.0;
    world.farmer.bannerText = 'SPOTTED! RUN!';
    world.farmer.bannerTimer = 1.6;
    world.turkey.lives = 2;
    world.turkey.dashCooldown = 0;
    world.turkey.invincibleTimer = 0;

    for (let step = 0; step < 26; step += 1) {
      const inp = stepAutopilotFrame(world);
      if (step === 4) {
        inp.jumpPressed = true;
        inp.jumpHeld = true;
      }
      if (step === 15) {
        inp.dashPressed = true;
      }
      advanceSimulationTick(world, inp, FIXED_DT);
    }
    world.particles.popups = [];
    world.turkey.invincibleTimer = 0;
    world.turkey.hurtFlashTimer = 0;
    return;
  }

  if (shot === 'escaped') {
    // Run autopilot all the way across all 3 stages to earn an authentic "PARDONED!" victory!
    let guard = 0;
    while (world.screen !== 'escaped' && guard < 8000) {
      guard += 1;
      if (world.turkey.lives <= 1) world.turkey.lives = 3;
      if (world.farmer.gap < 20) world.farmer.gap = 45;
      advanceSimulationTick(world, stepAutopilotFrame(world), FIXED_DT);
    }
    // Let celebratory forest leaves drift for half a second.
    for (let i = 0; i < 24; i += 1) {
      advanceSimulationTick(world, stepAutopilotFrame(world), FIXED_DT);
    }
  }
}
