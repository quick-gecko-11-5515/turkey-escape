// Scene renderer: parallax autumn backdrops (Farmyard, Barn, Kitchen), ground track, and full frame composition.

import { CANVAS_HEIGHT, CANVAS_WIDTH, GROUND_Y, PALETTE } from './config.js';
import { TOTAL_ESCAPE_METERS } from './stages.js';
import { drawTurkey } from './turkey.js';
import { drawFarmer } from './farmer.js';
import { drawHazards, drawHideSpots } from './hazards.js';
import { drawParticles } from './particles.js';
import {
  drawEndScreen,
  drawGameplayHud,
  drawPauseOverlay,
  drawStageClearOverlay,
  drawTitleScreen,
} from './hud.js';

export function renderGameFrame(ctx, world) {
  ctx.save();

  if (world.screen === 'title') {
    drawFarmyardBackdrop(ctx, world.elapsed * 55, world.elapsed);
    drawGroundTrack(ctx, world.elapsed * 55, 'farmyard');
    drawParticles(ctx, world.particles, 'farmyard');
    drawTitleScreen(ctx, world);
    ctx.restore();
    return;
  }

  if (world.screen === 'escaped' || world.screen === 'caught') {
    if (world.screen === 'escaped') {
      drawForestVictoryBackdrop(ctx, world.elapsed);
    } else {
      drawKitchenBackdrop(ctx, world.scrollX, world.elapsed);
      drawGroundTrack(ctx, world.scrollX, 'kitchen');
    }
    drawParticles(ctx, world.particles, world.screen === 'escaped' ? 'escaped' : 'kitchen');
    drawEndScreen(ctx, world);
    ctx.restore();
    return;
  }

  // Camera shake during impacts or close calls.
  if (world.screenShake > 0.2) {
    const sx = Math.sin(world.elapsed * 75) * world.screenShake;
    const sy = Math.cos(world.elapsed * 63) * world.screenShake * 0.65;
    ctx.translate(sx, sy);
  }

  // 1. Stage-specific parallax backdrop & ground.
  drawStageParallax(ctx, world.stage.id, world.scrollX, world.elapsed);
  drawGroundTrack(ctx, world.scrollX, world.stage.id);

  // Draw glowing exit freedom door when nearing end of Stage 3 Kitchen!
  if (world.stage.id === 'kitchen' && world.distanceMeters > TOTAL_ESCAPE_METERS - 46) {
    const doorX = world.turkey.x + (TOTAL_ESCAPE_METERS - world.distanceMeters) * 24 + 90;
    drawEscapeBackDoor(ctx, doorX);
  }

  // 2. Hide spots behind Tom when standing, or in front of Tom when hiding!
  if (!world.turkey.hiding) {
    drawHideSpots(ctx, world.hazards, world.turkey.nearHideSpot, world.elapsed);
  }

  // 3. Hazards (ovens, knives, barriers, corn).
  drawHazards(ctx, world.hazards, world.elapsed);

  // 4. Tom the Turkey & chasing Farmer Jebediah.
  const alarmed = world.farmer.gap < 36 || world.farmer.state === 'surge' || world.farmer.state === 'corner';
  drawTurkey(ctx, world.turkey, world.elapsed, { alarmed });
  if (world.turkey.hiding) {
    drawHideSpots(ctx, world.hazards, world.turkey.nearHideSpot, world.elapsed);
  }
  drawFarmer(ctx, world.farmer, world.elapsed, world.stage.id);

  // 5. Particles & score popups.
  drawParticles(ctx, world.particles, world.stage.id);

  // 6. Danger edge vignette when Farmer is very close or Tom is hurt.
  const dangerRatio = Math.max(0, 1 - world.farmer.gap / 34);
  if (dangerRatio > 0 || world.turkey.hurtFlashTimer > 0) {
    const alpha = Math.min(0.48, dangerRatio * 0.34 + world.turkey.hurtFlashTimer * 0.55);
    const vig = ctx.createRadialGradient(
      CANVAS_WIDTH * 0.5,
      CANVAS_HEIGHT * 0.5,
      CANVAS_WIDTH * 0.28,
      CANVAS_WIDTH * 0.5,
      CANVAS_HEIGHT * 0.5,
      CANVAS_WIDTH * 0.65,
    );
    vig.addColorStop(0, 'rgba(184, 37, 30, 0)');
    vig.addColorStop(1, `rgba(184, 37, 30, ${alpha.toFixed(3)})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  ctx.restore();

  // 7. Crisp non-shaking HUD + optional stage-clear or pause overlay.
  drawGameplayHud(ctx, world);
  if (world.screen === 'stage_clear') {
    drawStageClearOverlay(ctx, world);
  } else if (world.screen === 'paused') {
    drawPauseOverlay(ctx, world);
  }
}

export function drawStageParallax(ctx, stageId, scrollX, time) {
  if (stageId === 'farmyard') {
    drawFarmyardBackdrop(ctx, scrollX, time);
  } else if (stageId === 'barn') {
    drawBarnBackdrop(ctx, scrollX, time);
  } else {
    drawKitchenBackdrop(ctx, scrollX, time);
  }
}

export function drawFarmyardBackdrop(ctx, scrollX, time) {
  // Golden-hour Thanksgiving sunset sky.
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#462242');
  sky.addColorStop(0.38, '#a84028');
  sky.addColorStop(0.76, '#ea8c32');
  sky.addColorStop(1, '#fbd07a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);

  // Big harvest sun with warm halo.
  const sunX = 960;
  const sunY = 235;
  const halo = ctx.createRadialGradient(sunX, sunY, 30, sunX, sunY, 175);
  halo.addColorStop(0, 'rgba(255, 244, 184, 0.92)');
  halo.addColorStop(0.45, 'rgba(255, 198, 92, 0.35)');
  halo.addColorStop(1, 'rgba(255, 160, 60, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 175, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff1b3';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 54, 0, Math.PI * 2);
  ctx.fill();

  // Soft autumn clouds.
  ctx.fillStyle = 'rgba(255, 214, 150, 0.28)';
  for (let i = 0; i < 4; i += 1) {
    const cx = ((i * 390 - scrollX * 0.06) % (CANVAS_WIDTH + 260) + CANVAS_WIDTH + 260) % (CANVAS_WIDTH + 260) - 130;
    const cy = 115 + (i % 2) * 58;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 86, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 42, cy - 10, 56, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Distant plum-umber autumn hills.
  ctx.fillStyle = '#5e2b2b';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  for (let x = 0; x <= CANVAS_WIDTH + 80; x += 80) {
    const h = 155 + Math.sin((x + scrollX * 0.12) * 0.0055) * 42 + Math.cos((x + scrollX * 0.12) * 0.011) * 18;
    ctx.lineTo(x, GROUND_Y - h);
  }
  ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  // Midground red barn & silo silhouettes + golden autumn maple trees.
  const barnSpan = 820;
  for (let i = -1; i < 3; i += 1) {
    const bx = i * barnSpan - ((scrollX * 0.24) % barnSpan);
    drawBackgroundBarn(ctx, bx + 160, GROUND_Y - 56);
    drawAutumnTree(ctx, bx + 480, GROUND_Y - 46, '#c94c1a', '#f2a429', 1.0);
    drawAutumnTree(ctx, bx + 620, GROUND_Y - 40, '#9e261c', '#e67e22', 0.84);
  }

  // Rolling warm russet pasture strip & distant split-rail fence.
  ctx.fillStyle = '#8b461f';
  ctx.fillRect(0, GROUND_Y - 56, CANVAS_WIDTH, 56);

  const railStep = 120;
  const railOffset = -((scrollX * 0.5) % railStep);
  ctx.strokeStyle = '#572d14';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y - 36);
  ctx.lineTo(CANVAS_WIDTH, GROUND_Y - 36);
  ctx.moveTo(0, GROUND_Y - 18);
  ctx.lineTo(CANVAS_WIDTH, GROUND_Y - 18);
  ctx.stroke();
  ctx.fillStyle = '#472512';
  for (let x = railOffset; x < CANVAS_WIDTH + railStep; x += railStep) {
    ctx.fillRect(x, GROUND_Y - 52, 10, 52);
  }

  // Subtle windmill vane rotation in far distance for life.
  const wmX = 240 - ((scrollX * 0.15) % 900);
  if (wmX > -80 && wmX < CANVAS_WIDTH + 80) {
    ctx.save();
    ctx.translate(wmX, GROUND_Y - 210);
    ctx.strokeStyle = '#47221f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-12, 110);
    ctx.lineTo(0, 0);
    ctx.lineTo(12, 110);
    ctx.stroke();
    ctx.rotate(time * 0.9);
    for (let b = 0; b < 4; b += 1) {
      ctx.rotate(Math.PI * 0.5);
      ctx.fillStyle = '#d48d44';
      ctx.fillRect(-3, 0, 6, 36);
    }
    ctx.restore();
  }
}

function drawBackgroundBarn(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  // Silo.
  ctx.fillStyle = '#6c2920';
  ctx.fillRect(102, -135, 38, 135);
  ctx.beginPath();
  ctx.arc(121, -135, 19, Math.PI, 0);
  ctx.fill();
  // Barn walls & gambrel roof.
  ctx.fillStyle = '#8f281e';
  ctx.strokeStyle = '#33150e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(-12, -88);
  ctx.lineTo(14, -132);
  ctx.lineTo(54, -152);
  ctx.lineTo(94, -132);
  ctx.lineTo(118, -88);
  ctx.lineTo(118, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // White X barn doors & loft window.
  ctx.strokeStyle = '#f6e3ba';
  ctx.lineWidth = 3;
  ctx.strokeRect(28, -56, 52, 56);
  ctx.beginPath();
  ctx.moveTo(28, -56);
  ctx.lineTo(80, 0);
  ctx.moveTo(80, -56);
  ctx.lineTo(28, 0);
  ctx.stroke();
  ctx.fillStyle = '#ffd573';
  ctx.fillRect(44, -114, 20, 22);
  ctx.restore();
}

function drawAutumnTree(ctx, x, y, colorA, colorB, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#472512';
  ctx.fillRect(-10, -78, 20, 78);
  ctx.fillStyle = colorA;
  ctx.beginPath();
  ctx.arc(0, -104, 52, 0, Math.PI * 2);
  ctx.arc(-34, -82, 34, 0, Math.PI * 2);
  ctx.arc(34, -84, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colorB;
  ctx.beginPath();
  ctx.arc(12, -112, 30, 0, Math.PI * 2);
  ctx.arc(-18, -96, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawBarnBackdrop(ctx, scrollX, time) {
  // Deep timber barn interior with warm lantern pools & moonlight slats.
  const wallGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  wallGrad.addColorStop(0, '#1c100b');
  wallGrad.addColorStop(0.55, '#3b2113');
  wallGrad.addColorStop(1, '#54301a');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);

  // Vertical barn wall planks & moonlight window beams.
  const plankStep = 72;
  const plankOff = -((scrollX * 0.25) % plankStep);
  ctx.strokeStyle = 'rgba(20, 10, 5, 0.55)';
  ctx.lineWidth = 3;
  for (let x = plankOff; x < CANVAS_WIDTH + plankStep; x += plankStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, GROUND_Y);
    ctx.stroke();
  }

  // Moonlit hayloft windows & hanging warm lanterns.
  const baySpan = 440;
  for (let i = -1; i < 4; i += 1) {
    const bx = i * baySpan - ((scrollX * 0.35) % baySpan);
    // Moonlit window.
    ctx.fillStyle = '#263859';
    ctx.strokeStyle = '#24130a';
    ctx.lineWidth = 4;
    ctx.fillRect(bx + 70, 140, 88, 96);
    ctx.strokeRect(bx + 70, 140, 88, 96);
    // Slanted moonlight shaft.
    ctx.fillStyle = 'rgba(155, 198, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(bx + 70, 236);
    ctx.lineTo(bx + 158, 236);
    ctx.lineTo(bx + 290, GROUND_Y);
    ctx.lineTo(bx + 140, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    // Heavy structural barn timber column.
    ctx.fillStyle = '#2c170c';
    ctx.fillRect(bx + 260, 0, 38, GROUND_Y);

    // Swinging warm lantern!
    const sway = Math.sin(time * 2.2 + i) * 0.08;
    ctx.save();
    ctx.translate(bx + 279, 105);
    ctx.rotate(sway);
    const lGlow = ctx.createRadialGradient(0, 44, 6, 0, 44, 150);
    lGlow.addColorStop(0, 'rgba(255, 206, 94, 0.42)');
    lGlow.addColorStop(1, 'rgba(255, 148, 36, 0)');
    ctx.fillStyle = lGlow;
    ctx.beginPath();
    ctx.arc(0, 44, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1f120b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -105);
    ctx.lineTo(0, 32);
    ctx.stroke();
    ctx.fillStyle = '#ffdf78';
    ctx.fillRect(-10, 32, 20, 24);
    ctx.strokeRect(-10, 32, 20, 24);
    ctx.restore();
  }

  // Stacked background hayloft silhouette.
  ctx.fillStyle = '#331d0f';
  ctx.fillRect(0, GROUND_Y - 58, CANVAS_WIDTH, 58);
}

export function drawKitchenBackdrop(ctx, scrollX, time) {
  // Warm rustic Thanksgiving farmhouse kitchen interior!
  const wallGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  wallGrad.addColorStop(0, '#5a291b');
  wallGrad.addColorStop(0.45, '#b85c34');
  wallGrad.addColorStop(1, '#e8b67d');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);

  // Subtle farmhouse backsplash tiles.
  const tile = 54;
  const tileOff = -((scrollX * 0.25) % tile);
  ctx.strokeStyle = 'rgba(110, 48, 22, 0.24)';
  ctx.lineWidth = 1.8;
  for (let x = tileOff; x < CANVAS_WIDTH + tile; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, 120);
    ctx.lineTo(x, GROUND_Y - 110);
    ctx.stroke();
  }
  for (let y = 120; y < GROUND_Y - 110; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }

  // Repeating kitchen scenery: dusk window, wooden shelves with pies/spices, copper pans, "DINNER AT 6!" chalkboard.
  const baySpan = 560;
  for (let i = -1; i < 4; i += 1) {
    const bx = i * baySpan - ((scrollX * 0.34) % baySpan);

    // Kitchen window looking out to golden autumn dusk!
    ctx.fillStyle = '#e58636';
    ctx.strokeStyle = '#472512';
    ctx.lineWidth = 6;
    ctx.fillRect(bx + 60, 152, 134, 134);
    ctx.strokeRect(bx + 60, 152, 134, 134);
    ctx.fillStyle = '#753129';
    ctx.fillRect(bx + 63, 240, 128, 42);
    ctx.beginPath();
    ctx.moveTo(bx + 127, 152);
    ctx.lineTo(bx + 127, 286);
    ctx.moveTo(bx + 60, 218);
    ctx.lineTo(bx + 194, 218);
    ctx.stroke();

    // Wooden spice & pumpkin pie shelf.
    ctx.fillStyle = '#6b381a';
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 3;
    ctx.fillRect(bx + 240, 228, 175, 16);
    ctx.strokeRect(bx + 240, 228, 175, 16);

    // Pumpkin pie & spice jars on shelf.
    ctx.fillStyle = '#d96b20';
    ctx.beginPath();
    ctx.ellipse(bx + 292, 220, 28, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#7a1c24';
    ctx.fillRect(bx + 344, 198, 20, 30);
    ctx.strokeRect(bx + 344, 198, 20, 30);
    ctx.fillStyle = '#4e8a3c';
    ctx.fillRect(bx + 372, 204, 18, 24);
    ctx.strokeRect(bx + 372, 204, 18, 24);

    // Comic "THANKSGIVING MENU" chalkboard!
    ctx.fillStyle = '#242b26';
    ctx.strokeStyle = '#73401f';
    ctx.lineWidth = 5;
    ctx.fillRect(bx + 440, 166, 98, 108);
    ctx.strokeRect(bx + 440, 166, 98, 108);
    ctx.fillStyle = '#f6e3ba';
    ctx.font = '800 12px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TONIGHT:', bx + 489, 194);
    ctx.fillStyle = '#ffb84d';
    ctx.font = '900 13px "Trebuchet MS", sans-serif';
    ctx.fillText('ROAST', bx + 489, 218);
    ctx.fillText('TURKEY!', bx + 489, 236);
    ctx.fillStyle = '#e56b52';
    ctx.fillText('450°F', bx + 489, 258);

    // Overhead warm pendant kitchen lamp.
    const lampGlow = ctx.createRadialGradient(bx + 310, 115, 8, bx + 310, 140, 165);
    lampGlow.addColorStop(0, `rgba(255, 226, 145, ${0.32 + Math.sin(time * 4 + i) * 0.04})`);
    lampGlow.addColorStop(1, 'rgba(255, 190, 90, 0)');
    ctx.fillStyle = lampGlow;
    ctx.beginPath();
    ctx.arc(bx + 310, 140, 165, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lower wainscoting cabinets along back wall.
  ctx.fillStyle = '#7c4322';
  ctx.fillRect(0, GROUND_Y - 108, CANVAS_WIDTH, 108);
  ctx.fillStyle = '#472512';
  ctx.fillRect(0, GROUND_Y - 114, CANVAS_WIDTH, 10);
}

export function drawGroundTrack(ctx, scrollX, stageId) {
  const groundH = CANVAS_HEIGHT - GROUND_Y;
  if (stageId === 'kitchen') {
    // Classic warm cream-and-russet checkered kitchen tile floor!
    const tileW = 64;
    const off = -((scrollX) % (tileW * 2));
    for (let x = off - tileW * 2; x < CANVAS_WIDTH + tileW * 2; x += tileW) {
      const idx = Math.round((x - off) / tileW);
      ctx.fillStyle = idx % 2 === 0 ? '#f0d8b4' : '#9c4024';
      ctx.fillRect(x, GROUND_Y, tileW, 44);
      ctx.fillStyle = idx % 2 === 0 ? '#9c4024' : '#f0d8b4';
      ctx.fillRect(x, GROUND_Y + 44, tileW, groundH - 44);
    }
    ctx.fillStyle = '#3a1b10';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 6);
  } else if (stageId === 'barn') {
    // Timber plank barn floor with straw wisps.
    ctx.fillStyle = '#5c3419';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, groundH);
    const step = 96;
    const off = -(scrollX % step);
    ctx.strokeStyle = '#331a0b';
    ctx.lineWidth = 3;
    for (let x = off; x < CANVAS_WIDTH + step; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.lineTo(x - 24, CANVAS_HEIGHT);
      ctx.stroke();
    }
    ctx.fillStyle = '#8b5328';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 8);
  } else {
    // Warm autumn farm dirt path topped with russet grass verge.
    ctx.fillStyle = '#6e3d1d';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, groundH);
    ctx.fillStyle = '#a85b24';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 16);
    ctx.fillStyle = '#c97826';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 6);

    const pebbleStep = 84;
    const off = -(scrollX % pebbleStep);
    ctx.fillStyle = '#4e2912';
    for (let x = off; x < CANVAS_WIDTH + pebbleStep; x += pebbleStep) {
      ctx.beginPath();
      ctx.ellipse(x + 22, GROUND_Y + 34, 14, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 58, GROUND_Y + 58, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawEscapeBackDoor(ctx, x) {
  ctx.save();
  ctx.translate(x, GROUND_Y);
  // Bright autumn sunlight pouring through the open back kitchen door!
  const sunBeam = ctx.createLinearGradient(0, -180, -180, 0);
  sunBeam.addColorStop(0, 'rgba(255, 244, 170, 0.72)');
  sunBeam.addColorStop(1, 'rgba(255, 210, 100, 0)');
  ctx.fillStyle = sunBeam;
  ctx.beginPath();
  ctx.moveTo(0, -210);
  ctx.lineTo(110, -210);
  ctx.lineTo(110, 0);
  ctx.lineTo(-170, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffe999';
  ctx.strokeStyle = '#472512';
  ctx.lineWidth = 6;
  ctx.fillRect(0, -210, 106, 210);
  ctx.strokeRect(0, -210, 106, 210);

  ctx.fillStyle = '#2c4a2e';
  ctx.font = '900 18px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FREEDOM!', 53, -224);
  ctx.restore();
}

function drawForestVictoryBackdrop(ctx, time) {
  // Radiant golden-autumn forest sanctuary where Tom is PARDONED!
  const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  sky.addColorStop(0, '#5a324e');
  sky.addColorStop(0.35, '#d1652c');
  sky.addColorStop(0.7, '#f7c15c');
  sky.addColorStop(1, '#4a6b35');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Glowing golden sun.
  const sun = ctx.createRadialGradient(240, 180, 20, 240, 180, 220);
  sun.addColorStop(0, 'rgba(255, 250, 210, 0.95)');
  sun.addColorStop(1, 'rgba(255, 190, 90, 0)');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(240, 180, 220, 0, Math.PI * 2);
  ctx.fill();

  // Layered autumn forest hills.
  ctx.fillStyle = '#4a3525';
  ctx.beginPath();
  ctx.moveTo(0, 520);
  ctx.quadraticCurveTo(320, 380, 660, 470);
  ctx.quadraticCurveTo(980, 360, CANVAS_WIDTH, 490);
  ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.lineTo(0, CANVAS_HEIGHT);
  ctx.closePath();
  ctx.fill();

  // Lush autumn maple & pine forest framing the meadow.
  drawAutumnTree(ctx, 130, 560, '#c94c1a', '#f5b82e', 1.45);
  drawAutumnTree(ctx, 290, 545, '#b8251e', '#e67e22', 1.15);
  drawAutumnTree(ctx, 1020, 550, '#d45a1e', '#f5b82e', 1.35);
  drawAutumnTree(ctx, 1170, 575, '#8f281e', '#e67e22', 1.5);

  // Distant defeated farmhouse & tiny shaking-fist farmer silhouette.
  drawBackgroundBarn(ctx, 845, 505);

  // Foreground sunlit meadow hill.
  ctx.fillStyle = '#3f6331';
  ctx.beginPath();
  ctx.moveTo(0, 565);
  ctx.quadraticCurveTo(360, 515, 760, 560);
  ctx.quadraticCurveTo(1060, 595, CANVAS_WIDTH, 545);
  ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.lineTo(0, CANVAS_HEIGHT);
  ctx.closePath();
  ctx.fill();

  // Subtle celebratory twinkling sunbeams.
  ctx.save();
  ctx.globalAlpha = 0.14 + Math.sin(time * 2) * 0.04;
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.moveTo(240, 180);
  ctx.lineTo(440, 620);
  ctx.lineTo(140, 620);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
