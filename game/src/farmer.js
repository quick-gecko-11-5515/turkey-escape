// Farmer Jebediah AI: chases, surges ("HE'S COMING!"), searches with lantern, and corners Tom.

import { FARMER_TUNING, GROUND_Y, PALETTE, SCORING } from './config.js';
import { randomRange } from './random.js';
import { emitFloatingText, emitSparkles } from './particles.js';
import { playCornChime, playFarmerAlarm } from './audio.js';

export function createFarmer() {
  return {
    gap: FARMER_TUNING.startGap, // 100 = far behind, 0 = caught!
    x: 110,
    y: GROUND_Y,
    state: 'chase', // 'chase' | 'warn_surge' | 'surge' | 'search' | 'corner'
    stateTimer: 0,
    nextSurgeIn: 8.5,
    nextSearchIn: 11.0,
    runPhase: 0,
    bannerText: '',
    bannerTimer: 0,
    searchAngle: 0,
    stealthRewardedThisSearch: false,
  };
}

export function pushFarmerBack(farmer, amount) {
  farmer.gap = Math.min(FARMER_TUNING.maxGap, farmer.gap + amount);
}

export function alertFarmerSpotted(world) {
  const { farmer, particles, sound } = world;
  farmer.state = 'corner';
  farmer.stateTimer = 2.4;
  farmer.bannerText = 'SPOTTED! RUN!';
  farmer.bannerTimer = 1.6;
  world.screenShake = Math.max(world.screenShake, 7);
  emitFloatingText(particles, farmer.x + 70, GROUND_Y - 148, 'SPOTTED!', '#ff4c38', 1.1);
  playFarmerAlarm(sound);
}

export function updateFarmerAI(world, dt) {
  const { farmer, turkey, stage, rng, particles, sound } = world;
  farmer.runPhase += dt * (farmer.state === 'surge' || farmer.state === 'corner' ? 16 : 11);
  if (farmer.bannerTimer > 0) farmer.bannerTimer = Math.max(0, farmer.bannerTimer - dt);

  const stageMult = stage.farmerCreepMult;

  if (farmer.state === 'chase') {
    farmer.nextSurgeIn -= dt;
    farmer.nextSearchIn -= dt;

    // Steady pursuit, slowed slightly if Tom is cleanly dashing.
    const creep = turkey.dashTimer > 0 ? -14 : FARMER_TUNING.baseCreepPerSec * stageMult;
    farmer.gap -= creep * dt;

    if (farmer.nextSurgeIn <= 0) {
      farmer.state = 'warn_surge';
      farmer.stateTimer = FARMER_TUNING.warningDuration;
      farmer.bannerText = "HE'S COMING!";
      farmer.bannerTimer = 2.1;
      playFarmerAlarm(sound);
    } else if (farmer.nextSearchIn <= 0 && rng() < stage.searchChance) {
      farmer.state = 'search';
      farmer.stateTimer = FARMER_TUNING.searchDuration;
      farmer.stealthRewardedThisSearch = false;
      farmer.bannerText = 'SEARCHING — HIDE!';
      farmer.bannerTimer = 2.0;
    } else if (farmer.nextSearchIn <= 0) {
      farmer.nextSearchIn = randomRange(rng, FARMER_TUNING.searchIntervalMin, FARMER_TUNING.searchIntervalMax);
    }
  } else if (farmer.state === 'warn_surge') {
    farmer.stateTimer -= dt;
    farmer.gap -= FARMER_TUNING.baseCreepPerSec * 0.8 * dt;
    if (farmer.stateTimer <= 0) {
      farmer.state = 'surge';
      farmer.stateTimer = FARMER_TUNING.surgeDuration;
      farmer.bannerText = "HE'S COMING!";
      farmer.bannerTimer = 1.5;
    }
  } else if (farmer.state === 'surge') {
    farmer.stateTimer -= dt;
    if (turkey.hiding) {
      // Hiding as he surges past makes him overshoot & lose your trail!
      if (!farmer.stealthRewardedThisSearch) {
        farmer.stealthRewardedThisSearch = true;
        farmer.gap = Math.min(FARMER_TUNING.maxGap, farmer.gap + FARMER_TUNING.stealthPushGap);
        world.score += SCORING.stealthBonus;
        world.stealthCount += 1;
        emitFloatingText(particles, turkey.x, turkey.y - 102, `SLIPPED PAST! +${SCORING.stealthBonus}`, '#8ef58a', 1.1);
        emitSparkles(particles, turkey.x, turkey.y - 40, '#8ef58a', 10, rng);
        playCornChime(sound, 4);
      }
      farmer.state = 'chase';
      farmer.nextSurgeIn = randomRange(rng, FARMER_TUNING.surgeIntervalMin, FARMER_TUNING.surgeIntervalMax);
    } else {
      const surgeCreep = turkey.dashTimer > 0 ? -10 : FARMER_TUNING.surgeCreepPerSec * stageMult;
      farmer.gap -= surgeCreep * dt;
      if (farmer.stateTimer <= 0) {
        farmer.state = 'chase';
        farmer.nextSurgeIn = randomRange(rng, FARMER_TUNING.surgeIntervalMin, FARMER_TUNING.surgeIntervalMax);
      }
    }
  } else if (farmer.state === 'search') {
    farmer.stateTimer -= dt;
    farmer.searchAngle = Math.sin(world.elapsed * 3.8) * 0.24;
    farmer.gap = Math.min(FARMER_TUNING.maxGap, farmer.gap - FARMER_TUNING.searchDrainPerSec * dt);

    if (turkey.hiding) {
      if (!farmer.stealthRewardedThisSearch) {
        farmer.stealthRewardedThisSearch = true;
        farmer.gap = Math.min(FARMER_TUNING.maxGap, farmer.gap + FARMER_TUNING.stealthPushGap);
        world.score += SCORING.stealthBonus;
        world.stealthCount += 1;
        emitFloatingText(particles, turkey.x, turkey.y - 104, `HIDDEN! +${SCORING.stealthBonus}`, '#8ef58a', 1.08);
        emitSparkles(particles, turkey.x, turkey.y - 36, '#8ef58a', 8, rng);
        playCornChime(sound, 3);
      }
    } else if (farmer.stateTimer < FARMER_TUNING.searchDuration - 1.15 && turkey.dashTimer <= 0 && farmer.gap < 78) {
      // Caught out in the open beam -> farmer corners Tom!
      alertFarmerSpotted(world);
    }

    if (farmer.stateTimer <= 0) {
      farmer.state = 'chase';
      farmer.nextSearchIn = randomRange(rng, FARMER_TUNING.searchIntervalMin, FARMER_TUNING.searchIntervalMax);
    }
  } else if (farmer.state === 'corner') {
    farmer.stateTimer -= dt;
    const cornerCreep = turkey.dashTimer > 0 ? -18 : FARMER_TUNING.cornerCreepPerSec * stageMult;
    farmer.gap -= cornerCreep * dt;
    if (farmer.stateTimer <= 0) {
      farmer.state = 'chase';
      farmer.nextSurgeIn = randomRange(rng, FARMER_TUNING.surgeIntervalMin, FARMER_TUNING.surgeIntervalMax);
      farmer.nextSearchIn = randomRange(rng, FARMER_TUNING.searchIntervalMin, FARMER_TUNING.searchIntervalMax);
    }
  }

  // Clamp gap and map farmer screen X relative to Tom.
  farmer.gap = Math.max(FARMER_TUNING.caughtGap, Math.min(FARMER_TUNING.maxGap, farmer.gap));
  const targetX = turkey.x - 68 - farmer.gap * 3.1;
  farmer.x += (targetX - farmer.x) * Math.min(1, dt * 8);

  if (farmer.gap <= 0.5) {
    world.loseReason = 'caught';
    return true;
  }
  return false;
}

export function drawFarmer(ctx, farmer, time, stageId, options = {}) {
  const { scale = 1, xOverride = null, yOverride = null, angryPose = false } = options;
  const fx = xOverride !== null ? xOverride : farmer.x;
  const fy = yOverride !== null ? yOverride : farmer.y;

  // Skip drawing if far off-screen to the left.
  if (fx < -160) return;

  ctx.save();
  ctx.translate(fx, fy);
  ctx.scale(scale, scale);

  // Sweeping flashlight / lantern beam in Barn or Search mode!
  if (farmer.state === 'search' || stageId === 'barn') {
    ctx.save();
    ctx.translate(38, -74);
    ctx.rotate(farmer.state === 'search' ? farmer.searchAngle : 0.04);
    const beamLen = farmer.state === 'search' ? 420 : 280;
    const grad = ctx.createLinearGradient(0, 0, beamLen, 0);
    grad.addColorStop(0, farmer.state === 'search' ? 'rgba(255, 232, 130, 0.42)' : 'rgba(255, 224, 140, 0.22)');
    grad.addColorStop(1, 'rgba(255, 224, 140, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(beamLen, -88);
    ctx.lineTo(beamLen, 96);
    ctx.lineTo(0, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Ground shadow.
  ctx.fillStyle = 'rgba(26, 12, 6, 0.36)';
  ctx.beginPath();
  ctx.ellipse(0, 5, 42, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  const bounce = Math.abs(Math.sin(farmer.runPhase)) * 7;
  const lean = farmer.state === 'surge' || farmer.state === 'corner' || angryPose ? 0.16 : 0.08;
  ctx.translate(0, -bounce);
  ctx.rotate(lean);

  // Heavy boots & overalls legs.
  const strideA = Math.sin(farmer.runPhase) * 0.72;
  const strideB = Math.sin(farmer.runPhase + Math.PI) * 0.72;
  drawFarmerLeg(ctx, -10, -40, strideA);
  drawFarmerLeg(ctx, 10, -40, strideB);

  // Plaid flannel torso + denim overalls.
  ctx.fillStyle = '#c43124';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.roundRect(-24, -104, 48, 62, 14);
  ctx.fill();
  ctx.stroke();

  // Plaid check lines.
  ctx.strokeStyle = 'rgba(36, 19, 10, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-22, -88);
  ctx.lineTo(22, -88);
  ctx.moveTo(-22, -72);
  ctx.lineTo(22, -72);
  ctx.moveTo(-6, -102);
  ctx.lineTo(-6, -46);
  ctx.moveTo(10, -102);
  ctx.lineTo(10, -46);
  ctx.stroke();

  // Denim overalls bib & straps.
  ctx.fillStyle = '#2d4b73';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-22, -78, 44, 40, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(-15, -102, 9, 26);
  ctx.strokeRect(-15, -102, 9, 26);
  ctx.fillRect(6, -102, 9, 26);
  ctx.strokeRect(6, -102, 9, 26);

  // Brass buttons.
  ctx.fillStyle = '#f5b82e';
  ctx.beginPath();
  ctx.arc(-10.5, -75, 3.2, 0, Math.PI * 2);
  ctx.arc(10.5, -75, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // Reaching arm holding carving fork / lantern!
  ctx.save();
  ctx.translate(16, -92);
  ctx.rotate(Math.sin(farmer.runPhase + 0.6) * 0.25 - 0.15);
  ctx.fillStyle = '#c43124';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-4, -8, 34, 15, 7);
  ctx.fill();
  ctx.stroke();
  // Hand.
  ctx.fillStyle = '#f2be91';
  ctx.beginPath();
  ctx.arc(32, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (farmer.state === 'search' || stageId === 'barn') {
    // Glowing brass barn lantern.
    ctx.fillStyle = '#472512';
    ctx.fillRect(28, 4, 14, 5);
    ctx.fillStyle = '#ffe57f';
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.roundRect(27, 9, 16, 20, 4);
    ctx.fill();
    ctx.stroke();
  } else {
    // Gleaming two-prong Thanksgiving carving fork!
    ctx.strokeStyle = '#dce5ec';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(32, -2);
    ctx.lineTo(66, -18);
    ctx.moveTo(56, -13);
    ctx.lineTo(74, -26);
    ctx.moveTo(59, -11);
    ctx.lineTo(76, -18);
    ctx.stroke();
  }
  ctx.restore();

  // Head & flushed angry face.
  ctx.fillStyle = '#f4bf92';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(4, -122, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Rosy angry cheek & nose.
  ctx.fillStyle = '#e06d53';
  ctx.beginPath();
  ctx.arc(17, -120, 5.5, 0, Math.PI * 2);
  ctx.fill();

  // Bushy autumn-brown mustache.
  ctx.fillStyle = '#5e3117';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(12, -113, 13, 5.5, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Fierce eyes & slanted angry eyebrows.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(12, -126, 4.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath();
  ctx.arc(13.5, -126, 2.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(4, -134);
  ctx.lineTo(18, -129);
  ctx.stroke();

  // Iconic wide-brim farmer straw hat with crimson band!
  ctx.fillStyle = '#e8b954';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.ellipse(2, -138, 34, 8, -0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-16, -138);
  ctx.lineTo(-12, -158);
  ctx.quadraticCurveTo(2, -162, 16, -158);
  ctx.lineTo(19, -138);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#b8251e';
  ctx.fillRect(-15, -144, 33, 6);

  // Comic exclamation / alert badge above hat during surge/corner!
  if (farmer.state === 'warn_surge' || farmer.state === 'surge' || farmer.state === 'corner' || angryPose) {
    const pulse = 1 + Math.sin(time * 16) * 0.1;
    ctx.save();
    ctx.translate(6, -182);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#d92626';
    ctx.strokeStyle = '#fff5e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff5e1';
    ctx.font = '900 22px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 0, 1);
    ctx.restore();
  }

  ctx.restore();
}

function drawFarmerLeg(ctx, x, y, swing) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(swing);
  ctx.fillStyle = '#243d5e';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-8, 0, 16, 28, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#472512';
  ctx.beginPath();
  ctx.roundRect(-8, 24, 22, 13, 5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
