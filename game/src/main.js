// Gobble & Gone — main game state, fixed-timestep loop, screen transitions, and boot entrypoint.

import { CANVAS_HEIGHT, CANVAS_WIDTH, FIXED_DT, PHYSICS, SCORING, STORAGE_KEY } from './config.js';
import { createSeededRng } from './random.js';
import {
  createLevelGenerator,
  generateStageChunk,
  getStageByDistance,
  resetLevelGenerator,
  STAGES,
  TOTAL_ESCAPE_METERS,
} from './stages.js';
import { createTurkey, triggerTurkeyDash, triggerTurkeyJump, updateTurkeyPhysics } from './turkey.js';
import { createFarmer, updateFarmerAI } from './farmer.js';
import { createHazardState, resolveHazardCollisions, updateHazards } from './hazards.js';
import { createParticleSystem, seedAmbientLeaves, updateParticles } from './particles.js';
import {
  createSoundEngine,
  playStageFanfare,
  playTurkeyGobble,
  toggleMute,
  unlockAudio,
  updateBackgroundMusic,
} from './audio.js';
import { bindKeyboardAndMouse, consumeInputSnapshot, createInputController } from './input.js';
import { getMenuButtonAtPoint } from './hud.js';
import { renderGameFrame } from './render.js';
import { parseShotParams, prepareDeterministicShot } from './shots.js';

function loadRecords() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { bestScore: 0, bestDistance: 0 };
    const parsed = JSON.parse(raw);
    return {
      bestScore: Number.isFinite(parsed.bestScore) ? Math.floor(parsed.bestScore) : 0,
      bestDistance: Number.isFinite(parsed.bestDistance) ? Math.floor(parsed.bestDistance) : 0,
    };
  } catch {
    return { bestScore: 0, bestDistance: 0 };
  }
}

function saveRecords(world) {
  const scoreInt = Math.floor(world.score);
  const distInt = Math.floor(world.distanceMeters);
  if (scoreInt > world.bestScore) world.bestScore = scoreInt;
  if (distInt > world.bestDistance) world.bestDistance = distInt;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ bestScore: world.bestScore, bestDistance: world.bestDistance }),
    );
  } catch {
    // Ignore restricted storage environments.
  }
}

export function createGameState(seed = 1) {
  const records = loadRecords();
  const rng = createSeededRng(seed);
  const particles = createParticleSystem();
  seedAmbientLeaves(particles, rng, 22);

  return {
    screen: 'title', // 'title' | 'playing' | 'stage_clear' | 'paused' | 'escaped' | 'caught'
    seed,
    rng,
    elapsed: 0,
    runTime: 0,
    score: 0,
    distanceMeters: 0,
    scrollX: 0,
    scrollSpeed: STAGES[0].baseSpeed,
    stage: STAGES[0],
    clearedStageNumber: 0,
    stageClearTimer: 0,
    cornCount: 0,
    cornForLife: 0,
    stealthCount: 0,
    combo: 0,
    comboTimer: 0,
    screenShake: 0,
    loseReason: 'caught',
    bestScore: records.bestScore,
    bestDistance: records.bestDistance,
    turkey: createTurkey(),
    farmer: createFarmer(),
    hazards: createHazardState(),
    generator: createLevelGenerator(),
    particles,
    sound: createSoundEngine(),
    pointerPos: { x: 0, y: 0 },
  };
}

export function startNewRun(world, customSeed = null) {
  const nextSeed = customSeed !== null ? customSeed : ((Date.now() & 0xffffff) || 1);
  world.seed = nextSeed;
  world.rng = createSeededRng(nextSeed);
  world.screen = 'playing';
  world.runTime = 0;
  world.score = 0;
  world.distanceMeters = 0;
  world.scrollX = 0;
  world.stage = STAGES[0];
  world.scrollSpeed = STAGES[0].baseSpeed;
  world.clearedStageNumber = 0;
  world.stageClearTimer = 0;
  world.cornCount = 0;
  world.cornForLife = 0;
  world.stealthCount = 0;
  world.combo = 0;
  world.comboTimer = 0;
  world.screenShake = 0;
  world.loseReason = 'caught';
  world.turkey = createTurkey();
  world.farmer = createFarmer();
  world.hazards = createHazardState();
  resetLevelGenerator(world.generator, 150);
  world.particles = createParticleSystem();
  seedAmbientLeaves(world.particles, world.rng, 22);
  playTurkeyGobble(world.sound);
}

export function handlePointerClick(world, point) {
  const buttonId = getMenuButtonAtPoint(world.screen, point);
  if (buttonId === 'play' || buttonId === 'restart') {
    startNewRun(world);
    return;
  }
  if (buttonId === 'title') {
    world.screen = 'title';
    return;
  }
  if (buttonId === 'mute') {
    toggleMute(world.sound);
    return;
  }
  if (buttonId === 'pause') {
    if (world.screen === 'playing') world.screen = 'paused';
    return;
  }
  if (buttonId === 'resume') {
    if (world.screen === 'paused') world.screen = 'playing';
    return;
  }

  // Clicking gameplay canvas triggers jump (left side / main area) or dash if right-clicked.
  if (world.screen === 'playing') {
    if (point.x > CANVAS_WIDTH * 0.78 && point.y > 110) {
      triggerTurkeyDash(world);
    } else {
      triggerTurkeyJump(world);
    }
  }
}

export function advanceSimulationTick(world, input, dt) {
  world.elapsed += dt;
  world.pointerPos = input.pointerPos || world.pointerPos;

  if (input.mutePressed) toggleMute(world.sound);

  // Process queued mouse clicks.
  if (input.clicks && input.clicks.length > 0) {
    for (let i = 0; i < input.clicks.length; i += 1) {
      handlePointerClick(world, input.clicks[i]);
    }
  }

  if (world.screen === 'title') {
    updateParticles(world.particles, dt, 160, 'farmyard', world.rng);
    if (input.jumpPressed) startNewRun(world);
    return;
  }

  if (world.screen === 'paused') {
    if (input.pausePressed) world.screen = 'playing';
    else if (input.restartPressed) startNewRun(world);
    return;
  }

  if (world.screen === 'escaped' || world.screen === 'caught') {
    updateParticles(world.particles, dt, 90, world.screen === 'escaped' ? 'escaped' : 'kitchen', world.rng);
    if (input.restartPressed || input.jumpPressed) startNewRun(world);
    return;
  }

  if (input.pausePressed) {
    world.screen = 'paused';
    return;
  }
  if (input.restartPressed) {
    startNewRun(world);
    return;
  }

  if (world.screen === 'stage_clear') {
    world.stageClearTimer -= dt;
    world.scrollX += world.stage.baseSpeed * 0.35 * dt;
    updateParticles(world.particles, dt, world.stage.baseSpeed * 0.35, world.stage.id, world.rng);
    if (world.stageClearTimer <= 0) {
      world.screen = 'playing';
    }
    return;
  }

  // --- ACTIVE GAMEPLAY SIMULATION ---
  world.runTime += dt;
  if (world.screenShake > 0) world.screenShake = Math.max(0, world.screenShake - dt * 28);
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 0;
  }

  // Compute stage speed ramp + dash boost + hide slow-down.
  const stageSpan = Math.max(1, world.stage.endMeters - world.stage.startMeters);
  const stagePct = Math.max(0, Math.min(1, (world.distanceMeters - world.stage.startMeters) / stageSpan));
  let targetSpeed = world.stage.baseSpeed + (world.stage.maxSpeed - world.stage.baseSpeed) * stagePct;
  if (world.turkey.dashTimer > 0) targetSpeed += PHYSICS.dashSpeedBoost;
  if (world.turkey.hiding) targetSpeed = 0;

  world.scrollSpeed += (targetSpeed - world.scrollSpeed) * Math.min(1, dt * 10);

  // Advance distance & distance score.
  const dx = world.scrollSpeed * dt;
  const deltaMeters = dx / PHYSICS.pixelsPerMeter;
  world.scrollX += dx;
  world.distanceMeters += deltaMeters;
  world.score += deltaMeters * SCORING.distancePointsPerMeter;

  // Update entities.
  updateTurkeyPhysics(world, input, dt);
  generateStageChunk(world, dt);
  updateHazards(world, dt);
  const diedFromHazard = resolveHazardCollisions(world);
  const caughtByFarmer = !diedFromHazard && updateFarmerAI(world, dt);
  updateParticles(world.particles, dt, world.scrollSpeed, world.stage.id, world.rng);
  updateBackgroundMusic(
    world.sound,
    dt,
    true,
    world.stage.number,
    world.turkey.onGround && !world.turkey.hiding,
  );

  // Check lose condition ("ON THE MENU").
  if (diedFromHazard || caughtByFarmer) {
    world.screen = 'caught';
    world.particles.popups = [];
    saveRecords(world);
    return;
  }

  // Check victory ("PARDONED!" — escaped the Thanksgiving Kitchen!).
  if (world.distanceMeters >= TOTAL_ESCAPE_METERS) {
    world.distanceMeters = TOTAL_ESCAPE_METERS;
    world.score += SCORING.escapeWinBonus + world.turkey.lives * SCORING.heartBonusOnWin;
    world.screen = 'escaped';
    world.particles.popups = [];
    saveRecords(world);
    playStageFanfare(world.sound, true);
    return;
  }

  // Check stage progression (Farmyard -> Barn -> Kitchen).
  const nextStage = getStageByDistance(world.distanceMeters);
  if (nextStage.index > world.stage.index) {
    world.clearedStageNumber = world.stage.number;
    world.stage = nextStage;
    world.score += SCORING.stageClearBonus;
    world.farmer.gap = Math.min(100, world.farmer.gap + 20);
    world.hazards.knives = [];
    world.hazards.ovens = [];
    world.hazards.barriers = [];
    world.generator.nextSpawnX = CANVAS_WIDTH + 220;
    world.screen = 'stage_clear';
    world.stageClearTimer = 1.9;
    playStageFanfare(world.sound, false);
  }
}

export function bootGobbleAndGone() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');

  const shotConfig = parseShotParams(window.location.search);
  const world = createGameState(shotConfig ? shotConfig.seed : 1);
  const input = createInputController();
  bindKeyboardAndMouse(input, canvas, () => unlockAudio(world.sound));

  // Read-only inspection helper for verification tests.
  window.__GOBBLE_INSPECT__ = () => ({
    screen: world.screen,
    stage: world.stage.id,
    stageNumber: world.stage.number,
    distanceMeters: Math.floor(world.distanceMeters),
    score: Math.floor(world.score),
    lives: world.turkey.lives,
    farmerGap: Math.round(world.farmer.gap),
    cornCount: world.cornCount,
    hiding: world.turkey.hiding,
    dashCooldown: Number(world.turkey.dashCooldown.toFixed(2)),
    muted: world.sound.muted,
  });

  if (shotConfig) {
    prepareDeterministicShot(world, shotConfig, { startNewRun, advanceSimulationTick });
    renderGameFrame(ctx, world);
    canvas.dataset.shotReady = shotConfig.shot;
    return;
  }

  let lastTimestamp = performance.now();
  let accumulator = 0;

  function frameLoop(now) {
    const rawDt = Math.min(0.08, Math.max(0, (now - lastTimestamp) / 1000));
    lastTimestamp = now;
    accumulator += rawDt;

    while (accumulator >= FIXED_DT) {
      const snapshot = consumeInputSnapshot(input);
      advanceSimulationTick(world, snapshot, FIXED_DT);
      accumulator -= FIXED_DT;
    }

    renderGameFrame(ctx, world);
    window.requestAnimationFrame(frameLoop);
  }

  renderGameFrame(ctx, world);
  window.requestAnimationFrame(frameLoop);
}

bootGobbleAndGone();
