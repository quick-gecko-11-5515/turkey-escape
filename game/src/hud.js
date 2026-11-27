// Full graphical HUD, farmer chase meter, Title screen, Stage Clear banner, Pause & End screens.

import { CANVAS_HEIGHT, CANVAS_WIDTH, CONTROLS_LEGEND, PALETTE, PHYSICS, SCORING } from './config.js';
import { getStageProgress, STAGES, TOTAL_ESCAPE_METERS } from './stages.js';
import { drawTurkey } from './turkey.js';
import { drawFarmer } from './farmer.js';

export const MENU_BUTTONS = {
  titlePlay: { x: 480, y: 406, w: 320, h: 68, id: 'play' },
  hudMute: { x: 1152, y: 18, w: 48, h: 44, id: 'mute' },
  hudPause: { x: 1210, y: 18, w: 48, h: 44, id: 'pause' },
  pauseResume: { x: 470, y: 458, w: 160, h: 54, id: 'resume' },
  pauseRestart: { x: 650, y: 458, w: 160, h: 54, id: 'restart' },
  endPlayAgain: { x: 430, y: 586, w: 230, h: 62, id: 'restart' },
  endTitle: { x: 685, y: 586, w: 175, h: 62, id: 'title' },
};

export function getMenuButtonAtPoint(screen, point) {
  const candidates = [];
  if (screen === 'title') {
    candidates.push(MENU_BUTTONS.titlePlay);
  } else if (screen === 'playing' || screen === 'stage_clear') {
    candidates.push(MENU_BUTTONS.hudMute, MENU_BUTTONS.hudPause);
  } else if (screen === 'paused') {
    candidates.push(MENU_BUTTONS.pauseResume, MENU_BUTTONS.pauseRestart, MENU_BUTTONS.hudMute);
  } else if (screen === 'escaped' || screen === 'caught') {
    candidates.push(MENU_BUTTONS.endPlayAgain, MENU_BUTTONS.endTitle);
  }

  for (let i = 0; i < candidates.length; i += 1) {
    const b = candidates[i];
    if (point.x >= b.x && point.x <= b.x + b.w && point.y >= b.y && point.y <= b.y + b.h) {
      return b.id;
    }
  }
  return null;
}

function formatTimer(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function drawPanel(ctx, x, y, w, h, radius = 14, bg = PALETTE.hudBg, border = PALETTE.hudBorder) {
  ctx.fillStyle = bg;
  ctx.strokeStyle = border;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
  ctx.stroke();
}

function drawHeartIcon(ctx, cx, cy, size, filled) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.65);
  ctx.bezierCurveTo(-size * 1.15, size * 0.05, -size * 1.1, -size * 0.85, 0, -size * 0.25);
  ctx.bezierCurveTo(size * 1.1, -size * 0.85, size * 1.15, size * 0.05, 0, size * 0.65);
  ctx.closePath();
  ctx.fillStyle = filled ? '#e83030' : 'rgba(255, 245, 225, 0.16)';
  ctx.strokeStyle = filled ? '#fff5e1' : 'rgba(255, 245, 225, 0.45)';
  ctx.lineWidth = 2.2;
  ctx.fill();
  ctx.stroke();
  if (filled) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.arc(-size * 0.34, -size * 0.24, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawButton(ctx, rect, label, primary = true, hovered = false) {
  ctx.save();
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  if (primary) {
    grad.addColorStop(0, hovered ? '#ffcb47' : '#f5a623');
    grad.addColorStop(1, hovered ? '#d9531e' : '#b83718');
  } else {
    grad.addColorStop(0, hovered ? '#6b3c20' : '#4f2a15');
    grad.addColorStop(1, '#2b150a');
  }
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#fff5e1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fff8e8';
  ctx.font = '900 24px "Trebuchet MS", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 4;
  ctx.fillText(label, rect.x + rect.w * 0.5, rect.y + rect.h * 0.52);
  ctx.restore();
}

export function drawGameplayHud(ctx, world) {
  const { turkey, farmer, stage } = world;

  // --- TOP-LEFT PANEL: Lives (3 hearts), Score, Corn counter & extra-life bar ---
  drawPanel(ctx, 18, 14, 344, 88, 14);
  for (let i = 0; i < SCORING.maxLives; i += 1) {
    drawHeartIcon(ctx, 46 + i * 36, 42, 14, i < turkey.lives);
  }

  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#f6e3ba';
  ctx.font = '800 12px "Trebuchet MS", sans-serif';
  ctx.fillText('SCORE', 346, 22);
  ctx.fillStyle = '#ffe066';
  ctx.font = '900 28px "Trebuchet MS", sans-serif';
  ctx.fillText(String(Math.floor(world.score)).padStart(5, '0'), 346, 36);

  // Corn icon + progress toward +1 heart every 25 corn.
  ctx.fillStyle = '#ffcf33';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(42, 78, 7, 11, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff5e1';
  ctx.font = '800 15px "Trebuchet MS", sans-serif';
  ctx.fillText(`CORN ${world.cornCount}  (${world.cornForLife}/${SCORING.cornForExtraLife} ♥)`, 58, 70);

  // Mini corn progress bar.
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath();
  ctx.roundRect(244, 73, 102, 11, 5);
  ctx.fill();
  ctx.fillStyle = '#ffcf33';
  ctx.beginPath();
  ctx.roundRect(244, 73, 102 * (world.cornForLife / SCORING.cornForExtraLife), 11, 5);
  ctx.fill();

  // --- TOP-CENTER PANEL: Stage badge, progress bar, Distance (m) & Timer ---
  drawPanel(ctx, 386, 14, 468, 88, 14);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = stage.accentColor;
  ctx.font = '900 15px "Trebuchet MS", sans-serif';
  ctx.fillText(`STAGE ${stage.number}/3 · ${stage.shortName}`, 404, 24);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff5e1';
  ctx.font = '900 17px "Trebuchet MS", sans-serif';
  ctx.fillText(
    `${Math.floor(world.distanceMeters)}m / ${TOTAL_ESCAPE_METERS}m   ⏱ ${formatTimer(world.runTime)}`,
    836,
    22,
  );

  // Stage progress track with turkey marker & goal flag!
  const progX = 404;
  const progY = 58;
  const progW = 432;
  const stageProg = getStageProgress(stage, world.distanceMeters);
  ctx.fillStyle = 'rgba(255, 245, 225, 0.16)';
  ctx.beginPath();
  ctx.roundRect(progX, progY, progW, 20, 10);
  ctx.fill();

  const progGrad = ctx.createLinearGradient(progX, progY, progX + progW, progY);
  progGrad.addColorStop(0, '#e67e22');
  progGrad.addColorStop(1, '#ffe066');
  ctx.fillStyle = progGrad;
  ctx.beginPath();
  ctx.roundRect(progX, progY, Math.max(18, progW * stageProg), 20, 10);
  ctx.fill();

  // Stage finish flag icon.
  ctx.fillStyle = '#fff5e1';
  ctx.fillRect(progX + progW - 14, progY + 2, 3, 16);
  ctx.fillStyle = '#8ef58a';
  ctx.beginPath();
  ctx.moveTo(progX + progW - 11, progY + 2);
  ctx.lineTo(progX + progW - 1, progY + 7);
  ctx.lineTo(progX + progW - 11, progY + 12);
  ctx.closePath();
  ctx.fill();

  // Mini turkey dot on progress bar.
  const markerX = progX + Math.max(10, Math.min(progW - 22, progW * stageProg));
  ctx.fillStyle = '#b8251e';
  ctx.strokeStyle = '#fff5e1';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(markerX, progY + 10, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // --- TOP-RIGHT PANEL: Dash Cooldown Bar, Hide Status, Mute & Pause Buttons ---
  drawPanel(ctx, 878, 14, 260, 88, 14);
  const dashReady = turkey.dashCooldown <= 0;
  const dashFill = dashReady ? 1 : 1 - turkey.dashCooldown / PHYSICS.dashCooldown;

  ctx.textAlign = 'left';
  ctx.fillStyle = dashReady ? '#ffe066' : '#d2c2a8';
  ctx.font = '900 14px "Trebuchet MS", sans-serif';
  ctx.fillText(dashReady ? '⚡ DASH READY [SHIFT]' : '⚡ DASH CHARGING...', 896, 24);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.beginPath();
  ctx.roundRect(896, 46, 224, 15, 7);
  ctx.fill();
  ctx.fillStyle = dashReady ? '#f5b82e' : '#80a7c7';
  ctx.beginPath();
  ctx.roundRect(896, 46, 224 * dashFill, 15, 7);
  ctx.fill();

  // Hide status badge.
  ctx.font = '800 13px "Trebuchet MS", sans-serif';
  if (turkey.hiding) {
    ctx.fillStyle = '#8ef58a';
    ctx.fillText('● HIDDEN IN COVER', 896, 72);
  } else if (turkey.nearHideSpot) {
    ctx.fillStyle = '#ffe066';
    ctx.fillText('● COVER NEARBY — PRESS [H]', 896, 72);
  } else {
    ctx.fillStyle = '#ccb699';
    ctx.fillText('○ [SPACE] JUMP · [↓] DUCK · [H] HIDE', 896, 72);
  }

  // Mute & Pause icon buttons.
  drawSmallHudButton(ctx, MENU_BUTTONS.hudMute, world.sound.muted ? '🔇' : '🔊', 'M');
  drawSmallHudButton(ctx, MENU_BUTTONS.hudPause, '⏸', 'P');

  // --- FARMER ALERT BANNER (HE'S COMING! / SEARCHING — HIDE! / SPOTTED!) ---
  if (farmer.bannerTimer > 0 && farmer.bannerText) {
    const pulse = 1 + Math.sin(world.elapsed * 18) * 0.05;
    ctx.save();
    ctx.translate(CANVAS_WIDTH * 0.5, 132);
    ctx.scale(pulse, pulse);
    const isSearch = farmer.state === 'search';
    drawPanel(ctx, -165, -22, 330, 44, 12, isSearch ? 'rgba(42, 74, 46, 0.92)' : 'rgba(184, 37, 30, 0.94)', '#fff5e1');
    ctx.fillStyle = '#fff5e1';
    ctx.font = '900 22px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`⚠ ${farmer.bannerText}`, 0, 1);
    ctx.restore();
  }

  // --- BOTTOM-CENTER: FARMER CHASE PROXIMITY METER ---
  drawFarmerChaseMeter(ctx, world);
}

function drawSmallHudButton(ctx, rect, icon, shortcut) {
  drawPanel(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fillStyle = '#fff5e1';
  ctx.font = '700 18px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, rect.x + rect.w * 0.5, rect.y + 18);
  ctx.fillStyle = '#e2a346';
  ctx.font = '800 10px "Trebuchet MS", sans-serif';
  ctx.fillText(shortcut, rect.x + rect.w * 0.5, rect.y + 35);
}

export function drawFarmerChaseMeter(ctx, world) {
  const { farmer } = world;
  const barW = 460;
  const barH = 52;
  const x = (CANVAS_WIDTH - barW) * 0.5;
  const y = CANVAS_HEIGHT - 64;

  const danger = 1 - farmer.gap / 100; // 0 = safe, 1 = right behind Tom!
  const borderCol = danger > 0.65 ? '#ff5247' : PALETTE.hudBorder;
  drawPanel(ctx, x, y, barW, barH, 14, 'rgba(30, 14, 7, 0.88)', borderCol);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = danger > 0.65 ? '#ff6959' : '#f6e3ba';
  ctx.font = '900 13px "Trebuchet MS", sans-serif';
  const statusLabel =
    farmer.state === 'search'
      ? 'FARMER SEARCHING (HIDE!)'
      : danger > 0.65
        ? 'FARMER RIGHT BEHIND YOU!'
        : 'FARMER CHASE DISTANCE';
  ctx.fillText(statusLabel, x + 18, y + 7);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffe066';
  ctx.fillText(`${Math.max(1, Math.round(farmer.gap * 0.3))}m LEAD`, x + barW - 18, y + 7);

  // Track bar: Farmer icon on left closing toward Turkey icon on right.
  const trackX = x + 20;
  const trackY = y + 28;
  const trackW = barW - 40;
  ctx.fillStyle = 'rgba(255, 245, 225, 0.16)';
  ctx.beginPath();
  ctx.roundRect(trackX, trackY, trackW, 14, 7);
  ctx.fill();

  const dangerGrad = ctx.createLinearGradient(trackX, trackY, trackX + trackW, trackY);
  dangerGrad.addColorStop(0, '#d92626');
  dangerGrad.addColorStop(0.6, '#e67e22');
  dangerGrad.addColorStop(1, '#58b368');
  ctx.fillStyle = dangerGrad;
  ctx.beginPath();
  ctx.roundRect(trackX, trackY, Math.max(16, trackW * danger), 14, 7);
  ctx.fill();

  // Farmer straw-hat pip advancing toward Tom pip.
  const farmerPipX = trackX + Math.max(10, Math.min(trackW - 26, trackW * danger));
  ctx.fillStyle = '#e8b954';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(farmerPipX, trackY + 7, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#b8251e';
  ctx.fillRect(farmerPipX - 6, trackY + 5, 12, 3);

  // Tom turkey pip on right.
  ctx.fillStyle = '#c94c1a';
  ctx.strokeStyle = '#fff5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(trackX + trackW - 8, trackY + 7, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

export function drawTitleScreen(ctx, world) {
  // Subtle twilight backdrop glaze so title card pops cleanly.
  ctx.fillStyle = 'rgba(30, 12, 6, 0.34)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Live animated showcase flanking the center UI cleanly on left & right (never blocked by controls card!).
  const demoFarmer = { ...world.farmer, runPhase: world.elapsed * 11, state: 'surge', searchAngle: 0 };
  const demoTurkey = {
    ...world.turkey,
    x: 1120,
    y: 590,
    onGround: true,
    hiding: false,
    ducking: false,
    runPhase: world.elapsed * 14,
    invincibleTimer: 0,
    dashTimer: 0,
    trail: [],
    squashX: 1,
    squashY: 1,
    vy: 0,
  };
  drawFarmer(ctx, demoFarmer, world.elapsed, 'farmyard', { xOverride: 155, yOverride: 592, scale: 1.18, angryPose: true });
  drawTurkey(ctx, demoTurkey, world.elapsed, { alarmed: true, scale: 1.48 });

  // Main Autumn Title Banner.
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Tagline ribbon above logo.
  drawPanel(ctx, 415, 58, 450, 38, 19, 'rgba(143, 40, 30, 0.94)', '#f5b82e');
  ctx.fillStyle = '#fff5e1';
  ctx.font = '900 16px "Trebuchet MS", sans-serif';
  ctx.fillText('THANKSGIVING GREAT ESCAPE · 3 STAGES', CANVAS_WIDTH * 0.5, 78);

  // Giant bold title with warm outline & drop shadow.
  ctx.font = '900 94px "Trebuchet MS", Georgia, serif';
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#24130a';
  ctx.strokeText('GOBBLE & GONE', CANVAS_WIDTH * 0.5, 162);

  const titleGrad = ctx.createLinearGradient(0, 114, 0, 210);
  titleGrad.addColorStop(0, '#fff3a8');
  titleGrad.addColorStop(0.45, '#f5b82e');
  titleGrad.addColorStop(1, '#d94c1a');
  ctx.fillStyle = titleGrad;
  ctx.fillText('GOBBLE & GONE', CANVAS_WIDTH * 0.5, 162);

  // Subtitle story hook.
  ctx.font = '800 23px "Trebuchet MS", sans-serif';
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#24130a';
  ctx.strokeText('Outrun Farmer Jebediah, dodge roasting ovens & carving knives, reach the forest!', CANVAS_WIDTH * 0.5, 232);
  ctx.fillStyle = '#fff5e1';
  ctx.fillText('Outrun Farmer Jebediah, dodge roasting ovens & carving knives, reach the forest!', CANVAS_WIDTH * 0.5, 232);

  // 3-stage journey strip.
  drawPanel(ctx, 316, 266, 648, 58, 14);
  for (let i = 0; i < STAGES.length; i += 1) {
    const sx = 415 + i * 225;
    ctx.fillStyle = STAGES[i].accentColor;
    ctx.font = '900 14px "Trebuchet MS", sans-serif';
    ctx.fillText(`STAGE ${i + 1}`, sx, 284);
    ctx.fillStyle = '#fff5e1';
    ctx.font = '800 16px "Trebuchet MS", sans-serif';
    ctx.fillText(STAGES[i].shortName, sx, 306);
    if (i < STAGES.length - 1) {
      ctx.fillStyle = '#f5b82e';
      ctx.font = '900 22px "Trebuchet MS", sans-serif';
      ctx.fillText('➔', sx + 112, 295);
    }
  }

  // High Score badge.
  drawPanel(ctx, 488, 338, 304, 46, 12, 'rgba(34, 17, 9, 0.88)', '#f5b82e');
  ctx.fillStyle = '#ffe066';
  ctx.font = '900 19px "Trebuchet MS", sans-serif';
  ctx.fillText(`🏆 BEST SCORE: ${world.bestScore}   (${world.bestDistance}m)`, CANVAS_WIDTH * 0.5, 362);

  // Play Button.
  const hovered = getMenuButtonAtPoint('title', world.pointerPos) === 'play';
  drawButton(ctx, MENU_BUTTONS.titlePlay, '▶  PLAY ESCAPE  [SPACE]', true, hovered);

  // Controls card centered cleanly between flanking Farmer (left) and Tom (right).
  drawPanel(ctx, 275, 502, 730, 122, 16);
  ctx.fillStyle = '#f5b82e';
  ctx.font = '900 14px "Trebuchet MS", sans-serif';
  ctx.fillText('HOW TO ESCAPE — KEYBOARD & MOUSE CONTROLS', CANVAS_WIDTH * 0.5, 524);

  ctx.textAlign = 'left';
  for (let i = 0; i < CONTROLS_LEGEND.length; i += 1) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = 294 + col * 238;
    const cy = 554 + row * 38;
    ctx.fillStyle = '#472512';
    ctx.strokeStyle = '#e2a346';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(cx, cy - 12, 114, 24, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffe066';
    ctx.font = '900 10px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(CONTROLS_LEGEND[i].key, cx + 57, cy + 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff5e1';
    ctx.font = '700 12px "Trebuchet MS", sans-serif';
    ctx.fillText(CONTROLS_LEGEND[i].action, cx + 120, cy + 1);
  }

  ctx.restore();
}

export function drawStageClearOverlay(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(26, 12, 6, 0.52)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawPanel(ctx, 320, 215, 640, 250, 20, 'rgba(38, 18, 9, 0.94)', '#f5b82e');

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#8ef58a';
  ctx.font = '900 22px "Trebuchet MS", sans-serif';
  ctx.fillText(`STAGE ${world.clearedStageNumber} CLEARED!  +${SCORING.stageClearBonus} PTS`, CANVAS_WIDTH * 0.5, 266);

  ctx.fillStyle = '#ffe066';
  ctx.font = '900 44px "Trebuchet MS", Georgia, serif';
  ctx.fillText(`NEXT: ${world.stage.name.toUpperCase()}`, CANVAS_WIDTH * 0.5, 324);

  ctx.fillStyle = '#fff5e1';
  ctx.font = '700 20px "Trebuchet MS", sans-serif';
  ctx.fillText(world.stage.subtitle, CANVAS_WIDTH * 0.5, 384);

  ctx.fillStyle = '#e2a346';
  ctx.font = '800 16px "Trebuchet MS", sans-serif';
  ctx.fillText('Get ready — Farmer Jebediah is picking up speed!', CANVAS_WIDTH * 0.5, 428);
  ctx.restore();
}

export function drawPauseOverlay(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(20, 9, 4, 0.68)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawPanel(ctx, 350, 150, 580, 396, 20, 'rgba(36, 17, 9, 0.95)', '#f5b82e');

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe066';
  ctx.font = '900 48px "Trebuchet MS", Georgia, serif';
  ctx.fillText('PAUSED', CANVAS_WIDTH * 0.5, 208);

  ctx.fillStyle = '#f6e3ba';
  ctx.font = '700 17px "Trebuchet MS", sans-serif';
  for (let i = 0; i < CONTROLS_LEGEND.length; i += 1) {
    const item = CONTROLS_LEGEND[i];
    ctx.fillText(`${item.key}  —  ${item.action}`, CANVAS_WIDTH * 0.5, 264 + i * 28);
  }

  const hoverId = getMenuButtonAtPoint('paused', world.pointerPos);
  drawButton(ctx, MENU_BUTTONS.pauseResume, 'RESUME [P]', true, hoverId === 'resume');
  drawButton(ctx, MENU_BUTTONS.pauseRestart, 'RESTART [R]', false, hoverId === 'restart');
  ctx.restore();
}

export function drawEndScreen(ctx, world) {
  const isWin = world.screen === 'escaped';

  ctx.save();
  if (!isWin) {
    ctx.fillStyle = 'rgba(28, 8, 6, 0.62)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  // Celebratory Tom in the forest OR triumphant Farmer on defeat.
  if (isWin) {
    const happyTom = {
      ...world.turkey,
      x: 255,
      y: 590,
      onGround: true,
      hiding: false,
      ducking: false,
      invincibleTimer: 0,
      dashTimer: 0,
      trail: [],
      runPhase: world.elapsed * 8,
      squashX: 1,
      squashY: 1,
      vy: 0,
    };
    drawTurkey(ctx, happyTom, world.elapsed, { celebrate: true, scale: 1.65 });
  } else {
    const smugFarmer = { ...world.farmer, runPhase: world.elapsed * 4, state: 'chase', searchAngle: 0 };
    drawFarmer(ctx, smugFarmer, world.elapsed, 'kitchen', { xOverride: 240, yOverride: 604, scale: 1.35, angryPose: true });
  }

  // Main End Summary Card (generous padding so headline & tagline fit crisply inside).
  drawPanel(
    ctx,
    348,
    92,
    604,
    574,
    22,
    isWin ? 'rgba(34, 24, 12, 0.92)' : 'rgba(42, 14, 10, 0.94)',
    isWin ? '#f5b82e' : '#ff5247',
  );

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Ribbon tag.
  drawPanel(
    ctx,
    475,
    114,
    350,
    36,
    18,
    isWin ? '#2c5c30' : '#9c1e1a',
    isWin ? '#8ef58a' : '#ffb84d',
  );
  ctx.fillStyle = '#fff5e1';
  ctx.font = '900 15px "Trebuchet MS", sans-serif';
  ctx.fillText(isWin ? '★ THANKSGIVING FREEDOM ACHIEVED ★' : '✖ THANKSGIVING DINNER AWAITS ✖', 650, 133);

  // Big headline ("PARDONED!" or "ON THE MENU").
  ctx.font = '900 64px "Trebuchet MS", Georgia, serif';
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#24130a';
  const heading = isWin ? 'PARDONED!' : 'ON THE MENU';
  ctx.strokeText(heading, 650, 200);
  ctx.fillStyle = isWin ? '#ffe066' : '#ff6b57';
  ctx.fillText(heading, 650, 200);

  // Flavor tagline.
  ctx.fillStyle = '#fff5e1';
  ctx.font = '700 17px "Trebuchet MS", sans-serif';
  const sub = isWin
    ? 'Tom burst out of the kitchen and escaped into the autumn forest!'
    : world.loseReason === 'roasted'
      ? 'Too close to the 450°F roasting oven — crispy feathers!'
      : world.loseReason === 'carved'
        ? 'Those falling carving knives were razor sharp!'
        : 'Farmer Jebediah cornered Tom before the back door!';
  ctx.fillText(sub, 650, 250);

  // Score & Escape Grade box.
  drawPanel(ctx, 422, 282, 456, 276, 16, 'rgba(20, 10, 5, 0.72)', '#b37b36');

  const grade = isWin
    ? world.turkey.lives >= 3 && world.score >= 5200
      ? 'S'
      : world.turkey.lives >= 2
        ? 'A'
        : 'B'
    : world.stage.number >= 3
      ? 'C'
      : 'D';

  const stats = [
    ['FINAL SCORE', String(Math.floor(world.score))],
    ['DISTANCE ESCAPED', `${Math.floor(world.distanceMeters)}m / ${TOTAL_ESCAPE_METERS}m`],
    ['STAGES CLEARED', `${isWin ? 3 : world.stage.number - 1} / 3`],
    ['CORN COLLECTED', `${world.cornCount} cobs`],
    ['STEALTH EVADES', `${world.stealthCount} slipped past`],
    ['ESCAPE TIME', formatTimer(world.runTime)],
    ['BEST SCORE', `${world.bestScore}`],
  ];

  for (let i = 0; i < stats.length; i += 1) {
    const sy = 310 + i * 35;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#d9bfa0';
    ctx.font = '800 16px "Trebuchet MS", sans-serif';
    ctx.fillText(stats[i][0], 446, sy);

    ctx.textAlign = 'right';
    ctx.fillStyle = i === 0 ? '#ffe066' : '#fff5e1';
    ctx.font = i === 0 ? '900 22px "Trebuchet MS", sans-serif' : '800 18px "Trebuchet MS", sans-serif';
    ctx.fillText(stats[i][1], 852, sy);
  }

  // Rank stamp badge in top-right of end card.
  ctx.save();
  ctx.translate(876, 178);
  ctx.rotate(0.14);
  ctx.fillStyle = isWin ? '#f5b82e' : '#b8251e';
  ctx.strokeStyle = '#fff5e1';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = isWin ? '#24130a' : '#fff5e1';
  ctx.font = '900 34px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(grade, 0, 2);
  ctx.restore();

  // Prominent Restart & Title buttons.
  const hoverId = getMenuButtonAtPoint(world.screen, world.pointerPos);
  drawButton(ctx, MENU_BUTTONS.endPlayAgain, '↻  PLAY AGAIN [R]', true, hoverId === 'restart');
  drawButton(ctx, MENU_BUTTONS.endTitle, 'TITLE', false, hoverId === 'title');

  ctx.restore();
}
