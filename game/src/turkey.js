// Tom the Turkey — physics, jump/flutter, duck/slide, dash, hide, damage, and layered art.

import { GROUND_Y, PALETTE, PHYSICS, SCORING } from './config.js';
import { emitDustPuff, emitFeathers, emitFloatingText } from './particles.js';
import { playDashBurst, playHideRustle, playHurtSquawk, playJumpWhoosh } from './audio.js';

export function createTurkey() {
  return {
    x: PHYSICS.turkeyBaseX,
    y: GROUND_Y,
    vy: 0,
    onGround: true,
    ducking: false,
    hiding: false,
    hideTimer: 0,
    hideCooldown: 0,
    activeHideSpot: null,
    canFlutter: true,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,
    invincibleTimer: 0,
    hurtFlashTimer: 0,
    lives: SCORING.maxLives,
    runPhase: 0,
    squashX: 1,
    squashY: 1,
    trail: [],
    nearHideSpot: null,
  };
}

export function getTurkeyHitbox(turkey) {
  const height = turkey.ducking || turkey.hiding ? PHYSICS.duckHeight : PHYSICS.turkeyHeight;
  const width = turkey.ducking ? PHYSICS.turkeyWidth + 10 : PHYSICS.turkeyWidth - 10;
  return {
    left: turkey.x - width * 0.45,
    right: turkey.x + width * 0.45,
    top: turkey.y - height + 6,
    bottom: turkey.y - 2,
  };
}

export function triggerTurkeyJump(world) {
  const { turkey, particles, sound, rng } = world;
  if (turkey.hiding) {
    exitTurkeyHide(world, false);
  }
  if (turkey.onGround || turkey.coyoteTimer > 0) {
    turkey.vy = PHYSICS.jumpVelocity;
    turkey.onGround = false;
    turkey.coyoteTimer = 0;
    turkey.jumpBufferTimer = 0;
    turkey.canFlutter = true;
    turkey.ducking = false;
    turkey.squashX = 0.82;
    turkey.squashY = 1.24;
    emitDustPuff(particles, turkey.x - 10, GROUND_Y, 6, rng);
    emitFeathers(particles, turkey.x - 18, turkey.y - 30, 3, rng);
    playJumpWhoosh(sound, false);
    return true;
  }
  if (turkey.canFlutter && turkey.vy > -220) {
    turkey.vy = PHYSICS.doubleFlutterVelocity;
    turkey.canFlutter = false;
    turkey.jumpBufferTimer = 0;
    turkey.squashX = 0.88;
    turkey.squashY = 1.15;
    emitFeathers(particles, turkey.x - 8, turkey.y - 28, 5, rng);
    playJumpWhoosh(sound, true);
    return true;
  }
  return false;
}

export function triggerTurkeyDash(world) {
  const { turkey, farmer, particles, sound, rng } = world;
  if (turkey.dashCooldown > 0 || turkey.dashTimer > 0) return false;
  if (turkey.hiding) exitTurkeyHide(world, false);

  turkey.dashTimer = PHYSICS.dashDuration;
  turkey.dashCooldown = PHYSICS.dashCooldown;
  turkey.squashX = 1.32;
  turkey.squashY = 0.78;
  farmer.gap = Math.min(100, farmer.gap + 22);
  emitFeathers(particles, turkey.x - 20, turkey.y - 36, 9, rng);
  emitFloatingText(particles, turkey.x + 12, turkey.y - 90, 'GOBBLE DASH!', '#ffe066', 0.95);
  playDashBurst(sound);
  return true;
}

export function enterTurkeyHide(world, spot) {
  const { turkey, particles, sound, rng } = world;
  if (turkey.hiding || turkey.hideCooldown > 0 || !spot) return false;
  turkey.hiding = true;
  turkey.hideTimer = 0;
  turkey.activeHideSpot = spot;
  turkey.ducking = true;
  turkey.y = GROUND_Y;
  turkey.vy = 0;
  turkey.onGround = true;
  emitDustPuff(particles, spot.x + spot.w * 0.5, GROUND_Y, 5, rng);
  playHideRustle(sound);
  return true;
}

export function exitTurkeyHide(world, flushedOut = false) {
  const { turkey, particles, rng } = world;
  if (!turkey.hiding) return;
  turkey.hiding = false;
  turkey.activeHideSpot = null;
  turkey.hideCooldown = PHYSICS.hideCooldown;
  turkey.ducking = false;
  if (flushedOut) {
    emitFeathers(particles, turkey.x, turkey.y - 30, 6, rng);
    emitFloatingText(particles, turkey.x, turkey.y - 88, 'FLUSHED OUT!', '#ff7648', 0.95);
  }
}

export function damageTurkey(world, reasonLabel = 'OUCH!', knockGap = 24) {
  const { turkey, farmer, particles, sound, rng } = world;
  if (turkey.invincibleTimer > 0 || turkey.dashTimer > 0) return false;

  if (turkey.hiding) exitTurkeyHide(world, true);
  turkey.lives = Math.max(0, turkey.lives - 1);
  turkey.invincibleTimer = PHYSICS.invincibleDuration;
  turkey.hurtFlashTimer = 0.45;
  turkey.vy = Math.min(turkey.vy, -360);
  turkey.onGround = false;
  turkey.squashX = 1.25;
  turkey.squashY = 0.76;

  farmer.gap = Math.max(4, farmer.gap - knockGap);
  world.combo = 0;
  world.screenShake = Math.max(world.screenShake, 12);

  emitFeathers(particles, turkey.x, turkey.y - 36, 12, rng);
  emitFloatingText(particles, turkey.x, turkey.y - 92, reasonLabel, '#ff5247', 1.15);
  playHurtSquawk(sound);

  if (turkey.lives <= 0) {
    world.loseReason = reasonLabel === 'ROASTED!' ? 'roasted' : reasonLabel === 'CARVED!' ? 'carved' : 'caught';
    return true;
  }
  return false;
}

export function updateTurkeyPhysics(world, input, dt) {
  const { turkey, particles, rng } = world;

  if (turkey.dashTimer > 0) turkey.dashTimer = Math.max(0, turkey.dashTimer - dt);
  if (turkey.dashCooldown > 0) turkey.dashCooldown = Math.max(0, turkey.dashCooldown - dt);
  if (turkey.invincibleTimer > 0) turkey.invincibleTimer = Math.max(0, turkey.invincibleTimer - dt);
  if (turkey.hurtFlashTimer > 0) turkey.hurtFlashTimer = Math.max(0, turkey.hurtFlashTimer - dt);
  if (turkey.hideCooldown > 0) turkey.hideCooldown = Math.max(0, turkey.hideCooldown - dt);

  // Smooth squash-and-stretch recovery.
  turkey.squashX += (1 - turkey.squashX) * Math.min(1, dt * 14);
  turkey.squashY += (1 - turkey.squashY) * Math.min(1, dt * 14);

  // Detect nearby hide spot (haystack / crate / pantry box).
  turkey.nearHideSpot = null;
  for (let i = 0; i < world.hazards.hideSpots.length; i += 1) {
    const spot = world.hazards.hideSpots[i];
    const center = spot.x + spot.w * 0.5;
    if (Math.abs(turkey.x - center) < spot.w * 0.62) {
      turkey.nearHideSpot = spot;
      break;
    }
  }

  // Handle hiding toggle / automatic release.
  if (turkey.hiding) {
    turkey.hideTimer += dt;
    if (turkey.activeHideSpot) {
      turkey.x += (turkey.activeHideSpot.x + turkey.activeHideSpot.w * 0.5 - turkey.x) * Math.min(1, dt * 14);
    }
    const wantsExit =
      input.jumpPressed ||
      input.dashPressed ||
      (!input.hideHeld && !input.duckHeld && turkey.hideTimer > 0.35) ||
      turkey.hideTimer >= PHYSICS.maxHideDuration;
    if (wantsExit) {
      exitTurkeyHide(world, turkey.hideTimer >= PHYSICS.maxHideDuration);
    }
  } else {
    const wantsHide =
      turkey.onGround &&
      turkey.nearHideSpot &&
      (input.hidePressed || input.hideHeld || (input.duckHeld && world.farmer.state === 'search'));
    if (wantsHide && enterTurkeyHide(world, turkey.nearHideSpot)) {
      return;
    }
  }

  // Horizontal micro-positioning (nudge left/right to dodge falling knives or center on cover).
  if (!turkey.hiding) {
    let moveDir = 0;
    if (input.moveLeft) moveDir -= 1;
    if (input.moveRight) moveDir += 1;
    if (moveDir !== 0) {
      turkey.x += moveDir * PHYSICS.nudgeSpeed * dt;
    } else {
      // Gentle drift back toward comfortable camera anchor.
      turkey.x += (PHYSICS.turkeyBaseX - turkey.x) * Math.min(1, dt * 1.4);
    }
    turkey.x = Math.max(PHYSICS.turkeyMinX, Math.min(PHYSICS.turkeyMaxX, turkey.x));
  }

  // Jump buffering and coyote time.
  if (input.jumpPressed) {
    turkey.jumpBufferTimer = PHYSICS.jumpBufferTime;
  } else if (turkey.jumpBufferTimer > 0) {
    turkey.jumpBufferTimer = Math.max(0, turkey.jumpBufferTimer - dt);
  }

  if (turkey.onGround) {
    turkey.coyoteTimer = PHYSICS.coyoteTime;
  } else if (turkey.coyoteTimer > 0) {
    turkey.coyoteTimer = Math.max(0, turkey.coyoteTimer - dt);
  }

  if (input.dashPressed) {
    triggerTurkeyDash(world);
  }

  if (turkey.jumpBufferTimer > 0 && !turkey.hiding) {
    if (turkey.onGround || turkey.coyoteTimer > 0 || (input.jumpPressed && turkey.canFlutter)) {
      triggerTurkeyJump(world);
    }
  }

  // Duck / slide on ground, fast-fall in air.
  turkey.ducking = !turkey.hiding && input.duckHeld && turkey.onGround;

  if (!turkey.onGround && !turkey.hiding) {
    const grav = input.duckHeld ? PHYSICS.fastFallGravity : PHYSICS.gravity;
    turkey.vy += grav * dt;
    turkey.y += turkey.vy * dt;
    if (turkey.y >= GROUND_Y) {
      turkey.y = GROUND_Y;
      turkey.vy = 0;
      turkey.onGround = true;
      turkey.canFlutter = true;
      turkey.squashX = 1.24;
      turkey.squashY = 0.78;
      emitDustPuff(particles, turkey.x, GROUND_Y, 5, rng);
    }
  }

  // Advance leg stride phase & dash afterimage trail.
  const strideMult = turkey.dashTimer > 0 ? 22 : 14;
  if (!turkey.hiding) {
    turkey.runPhase += dt * strideMult * (world.scrollSpeed / 390);
  }
  if (turkey.dashTimer > 0) {
    turkey.trail.push({ x: turkey.x, y: turkey.y, alpha: 0.55 });
    if (turkey.trail.length > 7) turkey.trail.shift();
  }
  for (let i = turkey.trail.length - 1; i >= 0; i -= 1) {
    turkey.trail[i].x -= world.scrollSpeed * dt * 0.75;
    turkey.trail[i].alpha -= dt * 2.4;
    if (turkey.trail[i].alpha <= 0) turkey.trail.splice(i, 1);
  }
}

export function drawTurkey(ctx, turkey, time, options = {}) {
  const { celebrate = false, alarmed = false, scale = 1.14 } = options;

  // Dash motion-blur speed trails.
  for (let i = 0; i < turkey.trail.length; i += 1) {
    const tr = turkey.trail[i];
    ctx.save();
    ctx.globalAlpha = tr.alpha * 0.45;
    ctx.fillStyle = '#f5b82e';
    ctx.beginPath();
    ctx.ellipse(tr.x - 10, tr.y - 34, 30, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Blink during invulnerability frames (skip when paused for cover/title shots).
  if (turkey.invincibleTimer > 0 && Math.floor(time * 16) % 2 === 0) {
    ctx.save();
    ctx.globalAlpha = 0.48;
    drawTurkeyBody(ctx, turkey, time, celebrate, alarmed, scale);
    ctx.restore();
    return;
  }

  drawTurkeyBody(ctx, turkey, time, celebrate, alarmed, scale);
}

function drawTurkeyBody(ctx, turkey, time, celebrate, alarmed, scale) {
  ctx.save();
  ctx.translate(turkey.x, turkey.y);
  ctx.scale(scale, scale);

  // Ground shadow.
  const heightAbove = Math.max(0, GROUND_Y - turkey.y);
  const shadowScale = Math.max(0.38, 1 - heightAbove / 260);
  ctx.fillStyle = 'rgba(26, 12, 6, 0.34)';
  ctx.beginPath();
  ctx.ellipse(0, 4 + heightAbove * 0.02, 34 * shadowScale, 9 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  if (turkey.hiding) {
    // Peeking tail feathers + wide eyes above cover!
    ctx.translate(0, -14);
    drawTailFan(ctx, -18, -18, 0.72, Math.sin(time * 5) * 0.04);
    ctx.fillStyle = '#5a2e16';
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(10, -28, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Big stealth peeking eyes.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(15, -30, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.arc(16.5, -30, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const duckScaleY = turkey.ducking ? 0.64 : 1;
  const duckScaleX = turkey.ducking ? 1.22 : 1;
  const bounce = turkey.onGround ? Math.abs(Math.sin(turkey.runPhase)) * 5 : 0;
  ctx.translate(0, -bounce);
  ctx.scale(turkey.squashX * duckScaleX, turkey.squashY * duckScaleY);
  if (turkey.dashTimer > 0) {
    ctx.rotate(0.16);
  } else if (!turkey.onGround) {
    ctx.rotate(Math.max(-0.24, Math.min(0.22, turkey.vy * 0.00032)));
  }

  // Animated sprinting legs.
  const strideA = Math.sin(turkey.runPhase);
  const strideB = Math.sin(turkey.runPhase + Math.PI);
  drawTurkeyLeg(ctx, -6, -16, celebrate ? -0.35 : strideA * 0.82);
  drawTurkeyLeg(ctx, 8, -16, celebrate ? 0.35 : strideB * 0.82);

  // Iconic fanned autumn tail feathers!
  const tailWag = Math.sin(turkey.runPhase * 0.8) * 0.08;
  drawTailFan(ctx, -26, -42, 1.04, tailWag);

  // Plump dark-roast brown body with warm rim highlight.
  const bodyGrad = ctx.createRadialGradient(4, -44, 6, -4, -34, 34);
  bodyGrad.addColorStop(0, '#9c562c');
  bodyGrad.addColorStop(0.65, '#6b3317');
  bodyGrad.addColorStop(1, '#431d0c');
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.ellipse(-2, -36, 30, 24, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Cream breast plumage patch.
  ctx.fillStyle = '#e7c391';
  ctx.beginPath();
  ctx.ellipse(14, -34, 12, 14, 0.25, 0, Math.PI * 2);
  ctx.fill();

  // Flapping wing!
  const wingFlap = !turkey.onGround || celebrate
    ? Math.sin(time * 26) * 0.72 - 0.5
    : Math.sin(turkey.runPhase) * 0.22;
  ctx.save();
  ctx.translate(-4, -38);
  ctx.rotate(wingFlap);
  ctx.fillStyle = '#85421e';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.ellipse(-4, 4, 18, 10, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f2d3a2';
  ctx.beginPath();
  ctx.ellipse(-10, 6, 8, 4.5, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Neck & expressive head.
  ctx.fillStyle = '#753819';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(22, -52, 11, 16, 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#8a4420';
  ctx.beginPath();
  ctx.arc(28, -64, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Vibrant red snood & hanging wattle (unmistakable turkey silhouette!).
  ctx.fillStyle = '#d92626';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(36, -69);
  ctx.quadraticCurveTo(46, -65, 42, -54);
  ctx.quadraticCurveTo(38, -51, 35, -57);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(34, -49, 5.5, 8.5, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Sharp golden beak (open squawking when alarmed or dashing!).
  ctx.fillStyle = '#f7b924';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(39, -66);
  ctx.lineTo(54, -61);
  ctx.lineTo(39, -57);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (alarmed || turkey.dashTimer > 0 || celebrate) {
    ctx.fillStyle = '#e09b16';
    ctx.beginPath();
    ctx.moveTo(39, -57);
    ctx.lineTo(50, -54);
    ctx.lineTo(38, -53);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Wide cartoon eye with panicked/determined pupil.
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(31, -67, 6.2, 7.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath();
  ctx.arc(33.2, -67, alarmed ? 2.5 : 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(34.2, -68.8, 1.3, 0, Math.PI * 2);
  ctx.fill();

  // Expressive eyebrow & sweat drops when farmer is close!
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  if (celebrate) {
    ctx.moveTo(25, -75);
    ctx.quadraticCurveTo(31, -78, 36, -74);
  } else {
    ctx.moveTo(24, -76);
    ctx.lineTo(36, -72);
  }
  ctx.stroke();

  if (alarmed && !celebrate) {
    ctx.fillStyle = '#7ad4ff';
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(18, -78, 3.2, 5.5, -0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Victory "PARDONED" gold ribbon medal when celebrating!
  if (celebrate) {
    ctx.fillStyle = '#f5b82e';
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(16, -42, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b8251e';
    ctx.fillRect(13, -35, 6, 8);
  }

  ctx.restore();
}

function drawTailFan(ctx, x, y, scale, wag) {
  const feathers = [
    { angle: -1.18, color: '#8f281e', tip: '#f5d28c' },
    { angle: -0.82, color: '#d45a1e', tip: '#fff0c2' },
    { angle: -0.45, color: '#f2a429', tip: '#6b3015' },
    { angle: -0.1, color: '#b8251e', tip: '#f5d28c' },
    { angle: 0.24, color: '#d45a1e', tip: '#fff0c2' },
  ];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.rotate(wag);
  for (let i = 0; i < feathers.length; i += 1) {
    const f = feathers[i];
    ctx.save();
    ctx.rotate(f.angle);
    ctx.fillStyle = f.color;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(-18, 0, 23, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = f.tip;
    ctx.beginPath();
    ctx.ellipse(-34, 0, 6.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawTurkeyLeg(ctx, x, y, swing) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(swing);
  ctx.strokeStyle = '#e5941a';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 14);
  ctx.lineTo(8, 17);
  ctx.moveTo(0, 14);
  ctx.lineTo(-4, 17);
  ctx.stroke();
  ctx.restore();
}
