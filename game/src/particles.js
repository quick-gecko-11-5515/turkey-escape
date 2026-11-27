// Visual particles: autumn leaves, turkey feathers, oven embers, dust, sparkles, and score popups.

import { CANVAS_WIDTH, GROUND_Y } from './config.js';
import { randomRange } from './random.js';

export function createParticleSystem() {
  return {
    items: [],
    leaves: [],
    popups: [],
  };
}

export function seedAmbientLeaves(system, rng, count = 20) {
  system.leaves = [];
  const colors = ['#d94c1a', '#f2a429', '#b8251e', '#e07a24', '#c96b1f'];
  for (let i = 0; i < count; i += 1) {
    system.leaves.push({
      x: randomRange(rng, 0, CANVAS_WIDTH),
      y: randomRange(rng, 40, GROUND_Y - 40),
      vx: randomRange(rng, -95, -40),
      vy: randomRange(rng, 22, 58),
      rot: randomRange(rng, 0, Math.PI * 2),
      vrot: randomRange(rng, -2.5, 2.5),
      size: randomRange(rng, 7, 13),
      swayPhase: randomRange(rng, 0, Math.PI * 2),
      color: colors[i % colors.length],
    });
  }
}

export function emitFeathers(system, x, y, count = 7, rng = Math.random) {
  const colors = ['#c94c1a', '#f5b82e', '#8b3a1b', '#fff0d4', '#b8251e'];
  for (let i = 0; i < count; i += 1) {
    const angle = randomRange(rng, -Math.PI, 0.3);
    const speed = randomRange(rng, 70, 230);
    system.items.push({
      kind: 'feather',
      x,
      y,
      vx: Math.cos(angle) * speed - 60,
      vy: Math.sin(angle) * speed - 40,
      rot: randomRange(rng, 0, Math.PI * 2),
      vrot: randomRange(rng, -5, 5),
      size: randomRange(rng, 7, 13),
      life: randomRange(rng, 0.55, 1.05),
      maxLife: 1.05,
      color: colors[Math.floor(rng() * colors.length)],
    });
  }
}

export function emitDustPuff(system, x, y, count = 5, rng = Math.random) {
  for (let i = 0; i < count; i += 1) {
    system.items.push({
      kind: 'dust',
      x: x + randomRange(rng, -12, 12),
      y: y + randomRange(rng, -4, 4),
      vx: randomRange(rng, -120, -25),
      vy: randomRange(rng, -55, -10),
      rot: 0,
      vrot: 0,
      size: randomRange(rng, 6, 13),
      life: randomRange(rng, 0.28, 0.52),
      maxLife: 0.52,
      color: '#e5c69c',
    });
  }
}

export function emitOvenEmbers(system, x, y, count = 2, rng = Math.random) {
  for (let i = 0; i < count; i += 1) {
    system.items.push({
      kind: 'ember',
      x: x + randomRange(rng, -32, 32),
      y,
      vx: randomRange(rng, -80, -20),
      vy: randomRange(rng, -150, -70),
      rot: 0,
      vrot: 0,
      size: randomRange(rng, 2.5, 5.5),
      life: randomRange(rng, 0.35, 0.72),
      maxLife: 0.72,
      color: rng() < 0.5 ? '#fff1a6' : '#ff6f1a',
    });
  }
}

export function emitSparkles(system, x, y, color = '#ffe066', count = 8, rng = Math.random) {
  for (let i = 0; i < count; i += 1) {
    const a = (Math.PI * 2 * i) / count + randomRange(rng, -0.2, 0.2);
    const spd = randomRange(rng, 70, 170);
    system.items.push({
      kind: 'sparkle',
      x,
      y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      rot: 0,
      vrot: 0,
      size: randomRange(rng, 3.5, 6.5),
      life: randomRange(rng, 0.3, 0.55),
      maxLife: 0.55,
      color,
    });
  }
}

export function emitFloatingText(system, x, y, text, color = '#ffe066', scale = 1) {
  // Prevent overlapping popup clutter over Tom by capping active popups & staggering Y.
  let targetY = y;
  for (let i = 0; i < system.popups.length; i += 1) {
    const other = system.popups[i];
    if (Math.abs(other.x - x) < 120 && Math.abs(other.y - targetY) < 34) {
      targetY = other.y - 36;
    }
  }
  if (system.popups.length >= 2) {
    system.popups.shift();
  }
  system.popups.push({
    x,
    y: targetY,
    vy: -64,
    text,
    color,
    scale,
    life: 0.92,
    maxLife: 0.92,
  });
}

export function updateParticles(system, dt, scrollSpeed, stageId, rng) {
  for (let i = system.items.length - 1; i >= 0; i -= 1) {
    const p = system.items[i];
    p.life -= dt;
    if (p.life <= 0) {
      system.items.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vrot * dt;
    if (p.kind === 'feather') {
      p.vy += 170 * dt;
      p.vx *= 0.98;
    } else if (p.kind === 'dust') {
      p.size += 12 * dt;
    }
  }

  for (let i = system.popups.length - 1; i >= 0; i -= 1) {
    const pop = system.popups[i];
    pop.life -= dt;
    pop.y += pop.vy * dt;
    pop.vy *= 0.95;
    if (pop.life <= 0) system.popups.splice(i, 1);
  }

  // Ambient falling autumn leaves (outside & victory) or warm floating motes (barn/kitchen).
  for (let i = 0; i < system.leaves.length; i += 1) {
    const leaf = system.leaves[i];
    leaf.swayPhase += dt * 3.1;
    leaf.x += (leaf.vx - scrollSpeed * 0.28) * dt + Math.sin(leaf.swayPhase) * 26 * dt;
    leaf.y += leaf.vy * dt;
    leaf.rot += leaf.vrot * dt;
    if (leaf.x < -30 || leaf.y > GROUND_Y + 12) {
      leaf.x = randomRange(rng, CANVAS_WIDTH * 0.35, CANVAS_WIDTH + 80);
      leaf.y = randomRange(rng, -20, stageId === 'farmyard' ? 140 : 280);
    }
  }
}

export function drawParticles(ctx, system, stageId) {
  // Ambient leaves in farmyard / dust motes in barn / warm steam flecks in kitchen.
  for (let i = 0; i < system.leaves.length; i += 1) {
    const leaf = system.leaves[i];
    ctx.save();
    ctx.translate(leaf.x, leaf.y);
    if (stageId === 'farmyard' || stageId === 'escaped') {
      ctx.rotate(leaf.rot);
      ctx.fillStyle = leaf.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, leaf.size, leaf.size * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(36, 19, 10, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-leaf.size * 0.8, 0);
      ctx.lineTo(leaf.size * 0.8, 0);
      ctx.stroke();
    } else if (stageId === 'barn') {
      ctx.fillStyle = 'rgba(255, 224, 150, 0.28)';
      ctx.beginPath();
      ctx.arc(0, 0, leaf.size * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255, 236, 200, 0.22)';
      ctx.beginPath();
      ctx.arc(0, 0, leaf.size * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  for (let i = 0; i < system.items.length; i += 1) {
    const p = system.items[i];
    const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    if (p.kind === 'feather') {
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#24130a';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else if (p.kind === 'dust') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'ember') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'sparkle') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.lineTo(p.size * 0.38, -p.size * 0.38);
      ctx.lineTo(p.size, 0);
      ctx.lineTo(p.size * 0.38, p.size * 0.38);
      ctx.lineTo(0, p.size);
      ctx.lineTo(-p.size * 0.38, p.size * 0.38);
      ctx.lineTo(-p.size, 0);
      ctx.lineTo(-p.size * 0.38, -p.size * 0.38);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Floating score/feedback popups.
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < system.popups.length; i += 1) {
    const pop = system.popups[i];
    const alpha = Math.max(0, Math.min(1, pop.life / pop.maxLife));
    ctx.globalAlpha = alpha;
    ctx.font = `900 ${Math.round(24 * pop.scale)}px "Trebuchet MS", system-ui, sans-serif`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#24130a';
    ctx.strokeText(pop.text, pop.x, pop.y);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, pop.x, pop.y);
  }
  ctx.restore();
}
