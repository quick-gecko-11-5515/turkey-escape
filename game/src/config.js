// Gobble & Gone — game constants, physics tuning, scoring, and autumn palette.

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const GROUND_Y = 588;
export const FIXED_DT = 1 / 60;

export const STORAGE_KEY = 'gobble_and_gone_records_v1';

export const PHYSICS = {
  gravity: 2250,
  jumpVelocity: -840,
  doubleFlutterVelocity: -520,
  fastFallGravity: 4200,
  coyoteTime: 0.11,
  jumpBufferTime: 0.12,
  turkeyBaseX: 390,
  turkeyMinX: 250,
  turkeyMaxX: 560,
  nudgeSpeed: 290,
  turkeyWidth: 68,
  turkeyHeight: 74,
  duckHeight: 40,
  dashDuration: 0.34,
  dashCooldown: 2.6,
  dashSpeedBoost: 240,
  invincibleDuration: 1.45,
  maxHideDuration: 2.35,
  hideCooldown: 0.55,
  pixelsPerMeter: 24,
};

export const SCORING = {
  maxLives: 3,
  cornPoints: 100,
  cornForExtraLife: 25,
  stealthBonus: 150,
  closeCallBonus: 50,
  stageClearBonus: 500,
  escapeWinBonus: 1500,
  heartBonusOnWin: 350,
  distancePointsPerMeter: 5,
  comboDecaySeconds: 3.4,
};

export const FARMER_TUNING = {
  startGap: 66,
  maxGap: 100,
  caughtGap: 0,
  baseCreepPerSec: 2.4,
  surgeCreepPerSec: 12.5,
  cornerCreepPerSec: 16.0,
  searchDrainPerSec: -3.2,
  dashPushGap: 24,
  stealthPushGap: 30,
  hitLossGap: 26,
  stumbleLossGap: 14,
  surgeIntervalMin: 7.5,
  surgeIntervalMax: 12.0,
  surgeDuration: 2.8,
  searchIntervalMin: 9.0,
  searchIntervalMax: 14.5,
  searchDuration: 3.6,
  warningDuration: 1.1,
};

export const PALETTE = {
  ink: '#24130a',
  cream: '#fff5e1',
  parchment: '#f6e3ba',
  gold: '#f5b82e',
  amber: '#e67e22',
  burntOrange: '#c94c1a',
  crimson: '#b8251e',
  berry: '#7a1c24',
  plum: '#3d1c2e',
  barnRed: '#8f281e',
  woodDark: '#472512',
  woodMid: '#73401f',
  woodLight: '#a96c3a',
  pine: '#2c4a2e',
  sage: '#537043',
  steel: '#dce5ec',
  steelDark: '#7a8a99',
  flameCore: '#fff3a8',
  flameMid: '#ff8a1f',
  flameOuter: '#d93215',
  skyDuskTop: '#3e213d',
  skyDuskMid: '#a63f2a',
  skyDuskLow: '#f29c38',
  hudBg: 'rgba(34, 17, 9, 0.84)',
  hudBorder: '#e2a346',
};

export const CONTROLS_LEGEND = [
  { key: 'SPACE / W / UP', action: 'Jump (+ Flutter)' },
  { key: 'DOWN / S', action: 'Duck & Slide' },
  { key: 'SHIFT / R-CLICK', action: 'Gobble Dash' },
  { key: 'H / DOWN @ COVER', action: 'Hide from Farmer' },
  { key: 'A / D', action: 'Adjust Position' },
  { key: 'P / M / R', action: 'Pause / Mute / Restart' },
];
