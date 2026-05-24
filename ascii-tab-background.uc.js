// ASCII Tab Background — Sine / Zen userChromeJS
// Clean-room implementation of an interactive ASCII background for the vertical tab bar.
// Drag over the sidebar to "paint" energy. Click to emit expanding ASCII ripples.

(() => {
  "use strict";

  if (window.__asciiTabBackgroundLoaded) return;
  window.__asciiTabBackgroundLoaded = true;

  const CONFIG = {
    // First existing selector wins. Edit this if your Zen build/theme uses a different sidebar host.
    targetSelectors: [
      "#TabsToolbar",
      ".zen-workspace-tabs-section",
      "#navigator-toolbox"
    ],
    canvasId: "ascii-tab-bg-canvas",
    fontSize: 10,
    cellWidth: 8,
    lineHeight: 13,
    frameMs: 33, // ~30 fps to keep chrome light.
    chars: " ·:;+=xX$#@",
    idleAlpha: 0.038,
    activeAlpha: 0.38,
    decay: 0.912,
    dragRadius: 4.25,
    clickRadius: 7.75,
    maxRipples: 12,
    rippleSpeed: 18,
    rippleThickness: 18,
    ripplePower: 1.15,
    whiteToneMin: 218,
    whiteToneMax: 255,
    inkFallback: "rgba(255, 255, 255, 0.62)"
  };

  const HTML_NS = "http://www.w3.org/1999/xhtml";
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  let host = null;
  let canvas = null;
  let ctx = null;
  let rect = null;
  let resizeObserver = null;
  let cols = 0;
  let rows = 0;
  let field = new Float32Array(0);
  let ripples = [];
  let lastPointer = null;
  let lastFrame = 0;
  let raf = 0;
  let ink = CONFIG.inkFallback;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function findHost() {
    for (const selector of CONFIG.targetSelectors) {
      const node = document.querySelector(selector);
      if (node) return node;
    }
    return null;
  }

  function setup() {
    host = findHost();
    if (!host) {
      window.setTimeout(setup, 700);
      return;
    }

    host.setAttribute("ascii-tab-bg-host", "true");

    canvas = document.getElementById(CONFIG.canvasId);
    if (!canvas) {
      canvas = document.createElementNS(HTML_NS, "canvas");
      canvas.id = CONFIG.canvasId;
      canvas.setAttribute("aria-hidden", "true");
      host.prepend(canvas);
    }

    Object.assign(canvas.style, {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
      zIndex: "0",
      background: "transparent",
      backgroundColor: "transparent",
      opacity: "1",
      mixBlendMode: "normal",
      filter: "none",
      backdropFilter: "none",
    });

      if (getComputedStyle(host).position === "static") {
      host.style.position = "relative";
    }

    host.style.overflow = "hidden";

    ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    updateInk();
    resize();

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerUp, true);
    window.addEventListener("blur", onPointerUp, true);
    window.addEventListener("themechange", updateInk, true);

    raf = requestAnimationFrame(draw);
  }

  function updateInk() {
    try {
      const style = getComputedStyle(host || document.documentElement);
      ink = style.color || CONFIG.inkFallback;
    } catch (_) {
      ink = CONFIG.inkFallback;
    }
  }

  function resize() {
    if (!host || !canvas || !ctx) return;
    rect = host.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `${CONFIG.fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    ctx.textBaseline = "top";

    cols = Math.ceil(width / CONFIG.cellWidth) + 1;
    rows = Math.ceil(height / CONFIG.lineHeight) + 1;
    field = new Float32Array(cols * rows);
  }

  function pointInHost(event) {
    if (!host) return null;
    rect = host.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    return { x, y };
  }

  function onPointerDown(event) {
    const point = pointInHost(event);
    if (!point) return;
    lastPointer = point;
    excite(point.x, point.y, CONFIG.clickRadius, 1.5);
    ripples.unshift({
      x: point.x,
      y: point.y,
      r: 0,
      power: CONFIG.ripplePower,
      life: 1
    });
    if (ripples.length > CONFIG.maxRipples) ripples.pop();
  }

  function onPointerMove(event) {
    const point = pointInHost(event);
    if (!point) {
      if (event.buttons === 0) lastPointer = null;
      return;
    }

    // Hover gives a faint disturbance; dragging paints a strong trail.
    if (event.buttons === 1 || event.buttons === 2 || event.buttons === 4) {
      if (lastPointer) paintLine(lastPointer, point, CONFIG.dragRadius, 0.95);
      excite(point.x, point.y, CONFIG.dragRadius, 1.05);
      lastPointer = point;
    } else if (!reduceMotion) {
      excite(point.x, point.y, 2.2, 0.14);
      lastPointer = point;
    }
  }

  function onPointerUp() {
    lastPointer = null;
  }

  function paintLine(from, to, radius, power) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / 8));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      excite(from.x + dx * t, from.y + dy * t, radius, power);
    }
  }

  function excite(px, py, radiusCells, power) {
    if (!cols || !rows || !field.length) return;
    const cx = Math.round(px / CONFIG.cellWidth);
    const cy = Math.round(py / CONFIG.lineHeight);
    // Use pixel-space distance instead of grid-space distance. The text grid cells are
    // taller than they are wide, so grid-space circles looked vertically squashed.
    const radiusPx = radiusCells * ((CONFIG.cellWidth + CONFIG.lineHeight) * 0.5);
    const rx = Math.ceil(radiusPx / CONFIG.cellWidth);
    const ry = Math.ceil(radiusPx / CONFIG.lineHeight);
    const sigma = radiusPx * radiusPx * 0.72;

    for (let y = cy - ry; y <= cy + ry; y++) {
      if (y < 0 || y >= rows) continue;
      for (let x = cx - rx; x <= cx + rx; x++) {
        if (x < 0 || x >= cols) continue;
        const dx = x * CONFIG.cellWidth + CONFIG.cellWidth * 0.5 - px;
        const dy = y * CONFIG.lineHeight + CONFIG.lineHeight * 0.5 - py;
        const dist2 = dx * dx + dy * dy;
        if (dist2 > radiusPx * radiusPx) continue;
        const index = y * cols + x;
        field[index] = clamp(field[index] + Math.exp(-dist2 / sigma) * power, 0, 2.25);
      }
    }
  }

  function stepRipples(dt) {
    if (!ripples.length || reduceMotion) return;
    const maxR = Math.hypot(rect?.width || 0, rect?.height || 0) + CONFIG.rippleThickness;

    for (const ripple of ripples) {
      ripple.r += CONFIG.rippleSpeed * dt;
      ripple.life = clamp(1 - ripple.r / maxR, 0, 1);

      const samples = Math.max(10, Math.floor((Math.PI * 2 * Math.max(1, ripple.r)) / 18));
      for (let i = 0; i < samples; i++) {
        const angle = (i / samples) * Math.PI * 2;
        const x = ripple.x + Math.cos(angle) * ripple.r;
        const y = ripple.y + Math.sin(angle) * ripple.r;
        if (x < -20 || y < -20 || x > rect.width + 20 || y > rect.height + 20) continue;
        excite(x, y, 2.2, ripple.power * ripple.life * 0.075);
      }
    }

    ripples = ripples.filter((ripple) => ripple.life > 0.015);
  }

  function draw(now) {
    raf = requestAnimationFrame(draw);
    if (!ctx || !canvas || !host) return;
    if (now - lastFrame < CONFIG.frameMs) return;

    const dt = Math.max(0.001, Math.min(0.08, (now - lastFrame) / 1000 || 0.033));
    lastFrame = now;

    rect = host.getBoundingClientRect();
    stepRipples(dt * 60);

    const width = rect.width;
    const height = rect.height;
    const t = now * 0.001;
    const chars = CONFIG.chars;
    const lastChar = chars.length - 1;

    ctx.clearRect(0, 0, width, height);
    ctx.font = `${CONFIG.fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const index = y * cols + x;
        const wave = Math.sin(x * 0.47 + t * 0.9) * Math.cos(y * 0.29 - t * 0.75);
        const shimmer = (Math.sin((x * 13.13 + y * 7.71) + t * 1.8) + 1) * 0.5;
        const ambient = reduceMotion ? 0.025 : 0.045 + wave * 0.025 + shimmer * 0.025;
        const energy = field[index];
        const value = clamp(ambient + energy, 0, 1.65);
        const charIndex = clamp(Math.floor(value * lastChar), 0, lastChar);

        if (charIndex <= 0 && energy < 0.02) {
          field[index] *= CONFIG.decay;
          continue;
        }

        // Slightly varied white tones/opacity, matching the sampled-site effect more closely
        // than a single static glyph color.
        const toneNoise = (Math.sin(x * 19.19 + y * 41.41 + t * 2.6) + 1) * 0.5;
        const tone = Math.round(clamp(
          CONFIG.whiteToneMin + shimmer * 18 + toneNoise * 19 + energy * 12,
          CONFIG.whiteToneMin,
          CONFIG.whiteToneMax
        ));
        const alpha = clamp(CONFIG.idleAlpha + energy * CONFIG.activeAlpha + toneNoise * 0.018 + wave * 0.008, 0.018, 0.72);
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(${tone}, ${tone}, ${tone}, ${alpha})`;
        ctx.fillText(chars[charIndex], x * CONFIG.cellWidth, y * CONFIG.lineHeight);
        field[index] *= CONFIG.decay;
      }
    }

    ctx.globalAlpha = 1;
  }

  function destroy() {
    cancelAnimationFrame(raf);
    resizeObserver?.disconnect();
    window.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("pointermove", onPointerMove, true);
    window.removeEventListener("pointerup", onPointerUp, true);
    window.removeEventListener("pointercancel", onPointerUp, true);
    window.removeEventListener("blur", onPointerUp, true);
    window.removeEventListener("themechange", updateInk, true);
    canvas?.remove();
    host?.removeAttribute("ascii-tab-bg-host");
    window.__asciiTabBackgroundLoaded = false;
  }

  window.__asciiTabBackgroundDestroy = destroy;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  } else {
    setup();
  }
})();
