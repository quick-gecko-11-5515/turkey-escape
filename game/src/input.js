// Unified keyboard and mouse input controller with edge-triggered action buffers.

import { CANVAS_HEIGHT, CANVAS_WIDTH } from './config.js';

export function createInputController() {
  return {
    keysDown: new Set(),
    jumpPressed: false,
    dashPressed: false,
    hidePressed: false,
    pausePressed: false,
    restartPressed: false,
    mutePressed: false,
    pointerClicks: [],
    pointerPos: { x: 0, y: 0 },
  };
}

function toCanvasCoords(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return { x: 0, y: 0 };
  return {
    x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
    y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
  };
}

export function bindKeyboardAndMouse(input, canvas, onUserInteraction) {
  const onKeyDown = (event) => {
    const code = event.code;
    if (
      code === 'Space' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight'
    ) {
      event.preventDefault();
    }
    if (onUserInteraction) onUserInteraction();
    const firstPress = !input.keysDown.has(code);
    input.keysDown.add(code);
    if (!firstPress) return;

    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
      input.jumpPressed = true;
    } else if (code === 'ShiftLeft' || code === 'ShiftRight') {
      input.dashPressed = true;
    } else if (code === 'KeyH') {
      input.hidePressed = true;
    } else if (code === 'KeyP' || code === 'Escape') {
      input.pausePressed = true;
    } else if (code === 'KeyR') {
      input.restartPressed = true;
    } else if (code === 'KeyM') {
      input.mutePressed = true;
    }
  };

  const onKeyUp = (event) => {
    input.keysDown.delete(event.code);
  };

  const onBlur = () => {
    input.keysDown.clear();
  };

  const onMouseDown = (event) => {
    if (onUserInteraction) onUserInteraction();
    const pos = toCanvasCoords(canvas, event.clientX, event.clientY);
    input.pointerPos = pos;
    if (event.button === 2) {
      input.dashPressed = true;
    } else if (event.button === 0) {
      input.pointerClicks.push(pos);
    }
  };

  const onMouseMove = (event) => {
    input.pointerPos = toCanvasCoords(canvas, event.clientX, event.clientY);
  };

  const onContextMenu = (event) => {
    event.preventDefault();
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('contextmenu', onContextMenu);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('contextmenu', onContextMenu);
  };
}

export function consumeInputSnapshot(input) {
  const down = input.keysDown;
  const snapshot = {
    moveLeft: down.has('ArrowLeft') || down.has('KeyA'),
    moveRight: down.has('ArrowRight') || down.has('KeyD'),
    duckHeld: down.has('ArrowDown') || down.has('KeyS'),
    hideHeld: down.has('KeyH'),
    jumpHeld: down.has('Space') || down.has('ArrowUp') || down.has('KeyW'),
    jumpPressed: input.jumpPressed,
    dashPressed: input.dashPressed,
    hidePressed: input.hidePressed,
    pausePressed: input.pausePressed,
    restartPressed: input.restartPressed,
    mutePressed: input.mutePressed,
    clicks: input.pointerClicks.splice(0),
    pointerPos: input.pointerPos,
  };
  input.jumpPressed = false;
  input.dashPressed = false;
  input.hidePressed = false;
  input.pausePressed = false;
  input.restartPressed = false;
  input.mutePressed = false;
  return snapshot;
}
