// Hazards, cover spots, and corn pickups: roasting ovens, carving knives, fences, dogs, rafters, pot racks.

import { GROUND_Y, PALETTE, SCORING } from './config.js';
import { emitFloatingText, emitOvenEmbers, emitSparkles } from './particles.js';
import { damageTurkey, getTurkeyHitbox } from './turkey.js';
import { playCornChime, playKnifeShing, playStageFanfare } from './audio.js';

export function createHazardState() {
  return {
    ovens: [],
    knives: [],
    barriers: [],
    hideSpots: [],
    corns: [],
  };
}

export function spawnRoastingOven(hazards, x, variant = 'castiron') {
  hazards.ovens.push({
    x,
    y: GROUND_Y,
    w: 112,
    h: 82,
    variant, // 'brick' | 'stove' | 'castiron'
    phase: x * 0.02,
    closeCallScored: false,
  });
}

export function spawnFallingKnife(hazards, x, stageId = 'farmyard', delay = 0) {
  hazards.knives.push({
    x,
    y: -120,
    vy: 0,
    state: 'warning', // 'warning' | 'falling' | 'stuck'
    timer: (stageId === 'kitchen' ? 0.66 : 0.78) + delay,
    stuckTimer: 0.45,
    playedSound: false,
    closeCallScored: false,
  });
}

export function spawnStageBarrier(hazards, x, kind) {
  if (kind === 'fence') {
    hazards.barriers.push({ kind, x, y: GROUND_Y, w: 54, h: 68, cleared: false });
  } else if (kind === 'dog') {
    hazards.barriers.push({ kind, x, y: GROUND_Y, w: 84, h: 64, animPhase: 0, cleared: false });
  } else if (kind === 'rafter') {
    // Low overhead timber beam — duck/slide under!
    hazards.barriers.push({ kind, x, y: GROUND_Y - 52, w: 116, h: 52, cleared: false });
  } else if (kind === 'potrack') {
    // Hanging copper kitchen pot rack — duck/slide under!
    hazards.barriers.push({ kind, x, y: GROUND_Y - 52, w: 124, h: 56, cleared: false });
  } else if (kind === 'butcher') {
    hazards.barriers.push({ kind, x, y: GROUND_Y, w: 96, h: 68, cleared: false });
  }
}

export function spawnHideSpot(hazards, x, style = 'haystack') {
  hazards.hideSpots.push({
    x,
    y: GROUND_Y,
    w: 118,
    h: 82,
    style, // 'haystack' | 'crate' | 'pantry'
  });
}

export function spawnCornArc(hazards, startX, peakY, count = 3, stepX = 52) {
  const mid = (count - 1) * 0.5;
  for (let i = 0; i < count; i += 1) {
    const offset = i - mid;
    const arcDrop = offset * offset * 14;
    hazards.corns.push({
      x: startX + i * stepX,
      y: peakY + arcDrop,
      collected: false,
      bobPhase: i * 0.8,
    });
  }
}

export function scoreCornPickup(world, corn) {
  const { turkey, particles, sound, rng } = world;
  corn.collected = true;
  world.cornCount += 1;
  world.cornForLife += 1;
  world.combo += 1;
  world.comboTimer = SCORING.comboDecaySeconds;

  const mult = Math.min(4, 1 + Math.floor(world.combo / 5));
  const points = SCORING.cornPoints * mult;
  world.score += points;

  emitSparkles(particles, corn.x, corn.y, '#ffe066', 7, rng);
  emitFloatingText(
    particles,
    corn.x,
    corn.y - 22,
    mult > 1 ? `+${points} x${mult}` : `+${points}`,
    '#ffe066',
    mult > 1 ? 1.05 : 0.9,
  );
  playCornChime(sound, world.combo);

  if (world.cornForLife >= SCORING.cornForExtraLife) {
    world.cornForLife = 0;
    if (turkey.lives < SCORING.maxLives) {
      turkey.lives += 1;
      emitFloatingText(particles, turkey.x, turkey.y - 108, 'EXTRA HEART! +1', '#ff7096', 1.2);
    } else {
      world.score += 500;
      emitFloatingText(particles, turkey.x, turkey.y - 108, 'CORN FEAST! +500', '#ffe066', 1.2);
    }
    playStageFanfare(sound, false);
  }
}

function rectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function updateHazards(world, dt) {
  const { hazards, particles, sound, rng } = world;
  const dx = world.scrollSpeed * dt;

  // Ovens.
  for (let i = hazards.ovens.length - 1; i >= 0; i -= 1) {
    const oven = hazards.ovens[i];
    oven.x -= dx;
    oven.phase += dt * 7;
    if (rng() < dt * 8) {
      emitOvenEmbers(particles, oven.x + oven.w * 0.5, oven.y - oven.h - 4, 1, rng);
    }
    if (oven.x + oven.w < -140) hazards.ovens.splice(i, 1);
  }

  // Falling carving knives.
  for (let i = hazards.knives.length - 1; i >= 0; i -= 1) {
    const knife = hazards.knives[i];
    if (knife.state === 'warning') {
      knife.x -= dx * 0.35;
      knife.timer -= dt;
      if (!knife.playedSound && knife.timer < 0.35) {
        knife.playedSound = true;
        playKnifeShing(sound);
      }
      if (knife.timer <= 0) {
        knife.state = 'falling';
        knife.y = -40;
        knife.vy = 980;
      }
    } else if (knife.state === 'falling') {
      knife.x -= dx * 0.2;
      knife.vy += 1100 * dt;
      knife.y += knife.vy * dt;
      if (knife.y >= GROUND_Y - 10) {
        knife.y = GROUND_Y - 10;
        knife.state = 'stuck';
        world.screenShake = Math.max(world.screenShake, 4.5);
        emitSparkles(particles, knife.x, GROUND_Y - 6, '#e8f1f8', 6, rng);
      }
    } else {
      knife.x -= dx;
      knife.stuckTimer -= dt;
      if (knife.stuckTimer <= 0 || knife.x < -90) {
        hazards.knives.splice(i, 1);
      }
    }
  }

  // Stage barriers.
  for (let i = hazards.barriers.length - 1; i >= 0; i -= 1) {
    const b = hazards.barriers[i];
    b.x -= dx;
    if (b.kind === 'dog') b.animPhase += dt * 11;
    if (b.x + b.w < -140) hazards.barriers.splice(i, 1);
  }

  // Hide spots.
  for (let i = hazards.hideSpots.length - 1; i >= 0; i -= 1) {
    const spot = hazards.hideSpots[i];
    spot.x -= dx;
    if (spot.x + spot.w < -160) hazards.hideSpots.splice(i, 1);
  }

  // Corn pickups.
  for (let i = hazards.corns.length - 1; i >= 0; i -= 1) {
    const corn = hazards.corns[i];
    corn.x -= dx;
    corn.bobPhase += dt * 4.5;
    if (corn.collected || corn.x < -80) hazards.corns.splice(i, 1);
  }
}

export function resolveHazardCollisions(world) {
  const { turkey, hazards, particles } = world;
  const hit = getTurkeyHitbox(turkey);

  // Collect corn first (generous pickup radius).
  for (let i = 0; i < hazards.corns.length; i += 1) {
    const corn = hazards.corns[i];
    if (corn.collected) continue;
    const cBox = { left: corn.x - 24, right: corn.x + 24, top: corn.y - 24, bottom: corn.y + 24 };
    if (rectsOverlap(hit, cBox)) {
      scoreCornPickup(world, corn);
    }
  }

  // Skip lethal hazard damage if hidden cleanly inside cover.
  if (turkey.hiding) return false;

  // Roasting ovens (fire top & body).
  for (let i = 0; i < hazards.ovens.length; i += 1) {
    const oven = hazards.ovens[i];
    const flameRise = 26 + Math.sin(oven.phase) * 8;
    const oBox = {
      left: oven.x + 12,
      right: oven.x + oven.w - 12,
      top: oven.y - oven.h - flameRise * 0.55,
      bottom: oven.y,
    };
    if (rectsOverlap(hit, oBox)) {
      if (damageTurkey(world, 'ROASTED!', 26)) return true;
    } else if (!oven.closeCallScored && turkey.x > oven.x + oven.w && !turkey.onGround) {
      oven.closeCallScored = true;
      world.score += SCORING.closeCallBonus;
      emitFloatingText(particles, turkey.x, turkey.y - 84, `OVER THE OVEN! +${SCORING.closeCallBonus}`, '#ffb84d', 0.92);
    }
  }

  // Falling carving knives.
  for (let i = 0; i < hazards.knives.length; i += 1) {
    const knife = hazards.knives[i];
    if (knife.state !== 'falling' && knife.state !== 'stuck') continue;
    const kBox = {
      left: knife.x - 13,
      right: knife.x + 13,
      top: knife.y - 78,
      bottom: knife.y + 6,
    };
    if (rectsOverlap(hit, kBox)) {
      if (damageTurkey(world, 'CARVED!', 24)) return true;
    } else if (!knife.closeCallScored && knife.state === 'stuck' && Math.abs(turkey.x - knife.x) < 76) {
      knife.closeCallScored = true;
      world.score += SCORING.closeCallBonus;
      emitFloatingText(particles, turkey.x, turkey.y - 84, `CLOSE SHAVE! +${SCORING.closeCallBonus}`, '#9be3ff', 0.9);
    }
  }

  // Stage barriers (fences, guard dogs, overhead rafters & pot racks, butcher blocks).
  for (let i = 0; i < hazards.barriers.length; i += 1) {
    const b = hazards.barriers[i];
    const bBox =
      b.kind === 'rafter' || b.kind === 'potrack'
        ? { left: b.x + 8, right: b.x + b.w - 8, top: b.y - b.h, bottom: b.y - 4 }
        : { left: b.x + 10, right: b.x + b.w - 10, top: b.y - b.h + 10, bottom: b.y };

    if (rectsOverlap(hit, bBox)) {
      const label = b.kind === 'dog' ? 'BARKED!' : b.kind === 'rafter' || b.kind === 'potrack' ? 'BONK!' : 'TRIPPED!';
      if (damageTurkey(world, label, 20)) return true;
    }
  }

  return false;
}

export function drawHideSpots(ctx, hazards, nearSpot, time) {
  for (let i = 0; i < hazards.hideSpots.length; i += 1) {
    const spot = hazards.hideSpots[i];
    const highlighted = nearSpot === spot;
    ctx.save();
    ctx.translate(spot.x, spot.y);

    if (spot.style === 'haystack') {
      // Golden autumn haystack mound.
      const grad = ctx.createLinearGradient(0, -spot.h, 0, 0);
      grad.addColorStop(0, '#f3c652');
      grad.addColorStop(1, '#b67422');
      ctx.fillStyle = grad;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(spot.w * 0.16, -spot.h * 1.15, spot.w * 0.5, -spot.h);
      ctx.quadraticCurveTo(spot.w * 0.88, -spot.h * 1.08, spot.w, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Straw texture strokes.
      ctx.strokeStyle = '#7c4c15';
      ctx.lineWidth = 2;
      for (let s = 18; s < spot.w - 14; s += 16) {
        ctx.beginPath();
        ctx.moveTo(s, -10);
        ctx.lineTo(s + 6, -34 - (s % 22));
        ctx.stroke();
      }
    } else {
      // Barn wooden crate or kitchen pantry crate.
      ctx.fillStyle = spot.style === 'crate' ? '#8c5328' : '#7b4a26';
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.roundRect(4, -spot.h, spot.w - 8, spot.h, 8);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#472512';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(10, -spot.h + 10);
      ctx.lineTo(spot.w - 10, -10);
      ctx.moveTo(spot.w - 10, -spot.h + 10);
      ctx.lineTo(10, -10);
      ctx.stroke();

      ctx.fillStyle = '#f6e3ba';
      ctx.font = '800 13px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(spot.style === 'crate' ? 'FEED' : 'SPICES', spot.w * 0.5, -spot.h * 0.52);
    }

    // Floating [H] HIDE badge when Tom approaches!
    if (highlighted) {
      const bob = Math.sin(time * 8) * 3;
      ctx.fillStyle = '#24130a';
      ctx.strokeStyle = '#8ef58a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(spot.w * 0.5 - 40, -spot.h - 38 + bob, 80, 26, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#8ef58a';
      ctx.font = '900 13px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('[H] HIDE', spot.w * 0.5, -spot.h - 25 + bob);
    }

    ctx.restore();
  }
}

export function drawHazards(ctx, hazards, time) {
  // Draw corn pickups.
  for (let i = 0; i < hazards.corns.length; i += 1) {
    const corn = hazards.corns[i];
    if (corn.collected) continue;
    const bob = Math.sin(corn.bobPhase) * 5;
    drawCornCob(ctx, corn.x, corn.y + bob);
  }

  // Draw stage barriers.
  for (let i = 0; i < hazards.barriers.length; i += 1) {
    drawBarrier(ctx, hazards.barriers[i], time);
  }

  // Draw roasting ovens with blazing animated flames & temperature dial!
  for (let i = 0; i < hazards.ovens.length; i += 1) {
    drawRoastingOven(ctx, hazards.ovens[i], time);
  }

  // Draw falling carving knives + warning shadows.
  for (let i = 0; i < hazards.knives.length; i += 1) {
    drawCarvingKnife(ctx, hazards.knives[i], time);
  }
}

function drawCornCob(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.22);

  // Soft golden aura.
  ctx.fillStyle = 'rgba(255, 224, 102, 0.26)';
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();

  // Green husks.
  ctx.fillStyle = '#4e8a3c';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(-7, 8, 10, 5, -0.5, 0, Math.PI * 2);
  ctx.ellipse(7, 8, 10, 5, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Plump golden cob.
  ctx.fillStyle = '#ffcf33';
  ctx.beginPath();
  ctx.ellipse(0, -2, 10, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Kernel grid dots.
  ctx.fillStyle = '#d98a16';
  for (let row = -10; row <= 6; row += 5) {
    ctx.fillRect(-5, row, 3, 3);
    ctx.fillRect(1, row, 3, 3);
  }
  ctx.restore();
}

function drawRoastingOven(ctx, oven, time) {
  ctx.save();
  ctx.translate(oven.x, oven.y);

  // Radiant heat halo behind oven.
  const glow = ctx.createRadialGradient(oven.w * 0.5, -oven.h * 0.7, 10, oven.w * 0.5, -oven.h * 0.7, 92);
  glow.addColorStop(0, 'rgba(255, 138, 31, 0.52)');
  glow.addColorStop(1, 'rgba(255, 70, 15, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(oven.w * 0.5, -oven.h * 0.7, 92, 0, Math.PI * 2);
  ctx.fill();

  // Animated roaring flames bursting from top grate!
  const flames = 5;
  for (let f = 0; f < flames; f += 1) {
    const fx = 18 + f * ((oven.w - 36) / (flames - 1));
    const fh = 28 + Math.sin(time * 15 + f * 1.4 + oven.phase) * 10;
    ctx.fillStyle = '#e63b14';
    ctx.beginPath();
    ctx.moveTo(fx - 13, -oven.h + 4);
    ctx.quadraticCurveTo(fx - 4, -oven.h - fh, fx, -oven.h - fh - 8);
    ctx.quadraticCurveTo(fx + 5, -oven.h - fh, fx + 13, -oven.h + 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffbf3b';
    ctx.beginPath();
    ctx.moveTo(fx - 7, -oven.h + 4);
    ctx.quadraticCurveTo(fx, -oven.h - fh * 0.72, fx + 7, -oven.h + 4);
    ctx.closePath();
    ctx.fill();
  }

  // Oven body (brick outdoor roaster vs dark cast-iron kitchen oven).
  const isBrick = oven.variant === 'brick';
  ctx.fillStyle = isBrick ? '#9a3b26' : '#2f2d34';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.roundRect(0, -oven.h, oven.w, oven.h, 8);
  ctx.fill();
  ctx.stroke();

  // Top metallic trim & chimney vent.
  ctx.fillStyle = isBrick ? '#592c1e' : '#535763';
  ctx.fillRect(0, -oven.h, oven.w, 12);
  ctx.strokeRect(0, -oven.h, oven.w, 12);

  // Glowing furnace window with blazing firelight inside!
  const winGrad = ctx.createLinearGradient(0, -56, 0, -14);
  winGrad.addColorStop(0, '#fff3a8');
  winGrad.addColorStop(0.5, '#ff8a1f');
  winGrad.addColorStop(1, '#c92a14');
  ctx.fillStyle = winGrad;
  ctx.strokeStyle = '#1d1410';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(14, -56, oven.w - 28, 40, 6);
  ctx.fill();
  ctx.stroke();

  // Grate bars across oven window.
  ctx.strokeStyle = '#24130a';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(16, -36);
  ctx.lineTo(oven.w - 16, -36);
  ctx.moveTo(oven.w * 0.38, -56);
  ctx.lineTo(oven.w * 0.38, -16);
  ctx.moveTo(oven.w * 0.62, -56);
  ctx.lineTo(oven.w * 0.62, -16);
  ctx.stroke();

  // Crisp "450°F" oven temperature tag!
  ctx.fillStyle = '#fff5e1';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(oven.w * 0.5 - 26, -oven.h + 15, 52, 16, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#b8251e';
  ctx.font = '900 11px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('450°F', oven.w * 0.5, -oven.h + 23);

  ctx.restore();
}

function drawCarvingKnife(ctx, knife, time) {
  ctx.save();

  // Floor warning shadow & pulsing red danger reticle!
  if (knife.state === 'warning' || knife.state === 'falling') {
    const pulse = 0.72 + Math.sin(time * 24) * 0.28;
    ctx.fillStyle = `rgba(217, 38, 38, ${0.42 * pulse})`;
    ctx.beginPath();
    ctx.ellipse(knife.x, GROUND_Y + 2, 34 * pulse, 9 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    // Vertical faint danger guide line.
    ctx.strokeStyle = `rgba(255, 92, 66, ${0.45 * pulse})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(knife.x, 82);
    ctx.lineTo(knife.x, GROUND_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Top warning badge placed cleanly below HUD & farmer alert banner!
    if (knife.state === 'warning') {
      ctx.fillStyle = '#d92626';
      ctx.strokeStyle = '#fff5e1';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(knife.x, 194);
      ctx.lineTo(knife.x - 20, 158);
      ctx.lineTo(knife.x + 20, 158);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff5e1';
      ctx.font = '900 19px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', knife.x, 174);
    }
  }

  // Gleaming chunky chef's carving knife blade & riveted walnut handle (crystal-clear silhouette!).
  if (knife.state === 'falling' || knife.state === 'stuck') {
    ctx.translate(knife.x, knife.y);

    // Motion streak when plunging.
    if (knife.state === 'falling') {
      const streak = ctx.createLinearGradient(0, -210, 0, -60);
      streak.addColorStop(0, 'rgba(255, 255, 255, 0)');
      streak.addColorStop(1, 'rgba(235, 248, 255, 0.58)');
      ctx.fillStyle = streak;
      ctx.fillRect(-13, -210, 26, 125);
    }

    // Wide gleaming steel carving blade pointing down.
    const bladeGrad = ctx.createLinearGradient(-18, 0, 18, 0);
    bladeGrad.addColorStop(0, '#f4f9fc');
    bladeGrad.addColorStop(0.5, '#c2d1de');
    bladeGrad.addColorStop(1, '#687987');
    ctx.fillStyle = bladeGrad;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(0, 12); // razor tip
    ctx.lineTo(-16, -24);
    ctx.lineTo(-15, -104);
    ctx.lineTo(13, -104);
    ctx.lineTo(15, -26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bright steel specular glint edge.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(-8, -24);
    ctx.lineTo(-8, -94);
    ctx.stroke();

    // Steel bolster guard & rich walnut handle with gold rivets.
    ctx.fillStyle = '#9aa8b5';
    ctx.fillRect(-20, -109, 40, 9);
    ctx.strokeRect(-20, -109, 40, 9);

    ctx.fillStyle = '#5c2f16';
    ctx.beginPath();
    ctx.roundRect(-10, -156, 20, 48, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f5b82e';
    ctx.beginPath();
    ctx.arc(0, -142, 3.2, 0, Math.PI * 2);
    ctx.arc(0, -124, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawBarrier(ctx, b, time) {
  ctx.save();
  ctx.translate(b.x, b.y);

  if (b.kind === 'fence') {
    // Rustic farmyard wooden fence with autumn vine.
    ctx.fillStyle = '#8b5328';
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 3;
    ctx.fillRect(4, -b.h, 14, b.h);
    ctx.strokeRect(4, -b.h, 14, b.h);
    ctx.fillRect(b.w - 18, -b.h, 14, b.h);
    ctx.strokeRect(b.w - 18, -b.h, 14, b.h);
    ctx.fillStyle = '#a86936';
    ctx.fillRect(-2, -b.h + 12, b.w + 4, 13);
    ctx.strokeRect(-2, -b.h + 12, b.w + 4, 13);
    ctx.fillRect(-2, -32, b.w + 4, 13);
    ctx.strokeRect(-2, -32, b.w + 4, 13);
  } else if (b.kind === 'dog') {
    // Barking barn hound guarding the aisle!
    const hop = Math.abs(Math.sin(b.animPhase)) * 7;
    ctx.translate(b.w * 0.5, -hop);
    ctx.fillStyle = '#8a522a';
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 3;
    // Body.
    ctx.beginPath();
    ctx.ellipse(4, -26, 28, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Legs.
    ctx.fillRect(-16, -16, 8, 16);
    ctx.strokeRect(-16, -16, 8, 16);
    ctx.fillRect(14, -16, 8, 16);
    ctx.strokeRect(14, -16, 8, 16);
    // Head facing left toward Tom.
    ctx.beginPath();
    ctx.arc(-22, -40, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Floppy ear & red collar.
    ctx.fillStyle = '#472512';
    ctx.beginPath();
    ctx.ellipse(-14, -36, 6, 12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b8251e';
    ctx.fillRect(-18, -30, 14, 6);
    // Bark text bubble!
    ctx.fillStyle = '#fff5e1';
    ctx.font = '900 13px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WOOF!', -26, -64 + Math.sin(time * 12) * 2);
  } else if (b.kind === 'rafter') {
    // Low hanging barn timber beam — duck under!
    ctx.fillStyle = '#5c3116';
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 3.2;
    ctx.fillRect(0, -b.h, b.w, b.h);
    ctx.strokeRect(0, -b.h, b.w, b.h);
    // Chains holding it from the ceiling.
    ctx.strokeStyle = '#33241c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(16, -b.h);
    ctx.lineTo(16, -420);
    ctx.moveTo(b.w - 16, -b.h);
    ctx.lineTo(b.w - 16, -420);
    ctx.stroke();
    // Yellow-black "DUCK!" indicator.
    ctx.fillStyle = '#f5b82e';
    ctx.font = '900 15px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DUCK ↓', b.w * 0.5, -b.h * 0.42);
  } else if (b.kind === 'potrack') {
    // Hanging copper kitchen pot rack — slide underneath!
    ctx.strokeStyle = '#2d2420';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(18, -b.h);
    ctx.lineTo(18, -420);
    ctx.moveTo(b.w - 18, -b.h);
    ctx.lineTo(b.w - 18, -420);
    ctx.stroke();
    ctx.fillStyle = '#3d2c26';
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 3;
    ctx.fillRect(0, -b.h, b.w, 12);
    ctx.strokeRect(0, -b.h, b.w, 12);
    // Gleaming hanging copper pots.
    for (let p = 0; p < 3; p += 1) {
      const px = 22 + p * 38;
      ctx.fillStyle = p % 2 === 0 ? '#d97236' : '#c95c24';
      ctx.beginPath();
      ctx.arc(px, -22, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffd1a3';
      ctx.beginPath();
      ctx.arc(px - 5, -26, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (b.kind === 'butcher') {
    // Butcher block kitchen table with chopping board & pumpkin.
    ctx.fillStyle = '#c88c4b';
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 3.2;
    ctx.fillRect(0, -b.h, b.w, 20);
    ctx.strokeRect(0, -b.h, b.w, 20);
    ctx.fillStyle = '#8b5328';
    ctx.fillRect(8, -b.h + 20, 14, b.h - 20);
    ctx.strokeRect(8, -b.h + 20, 14, b.h - 20);
    ctx.fillRect(b.w - 22, -b.h + 20, 14, b.h - 20);
    ctx.strokeRect(b.w - 22, -b.h + 20, 14, b.h - 20);
    // Small Thanksgiving pumpkin on the butcher block.
    ctx.fillStyle = '#e66b19';
    ctx.beginPath();
    ctx.ellipse(b.w * 0.52, -b.h - 10, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3f6e2d';
    ctx.fillRect(b.w * 0.52 - 2, -b.h - 25, 5, 7);
  }

  ctx.restore();
}
