// ============================================================
// bodyDiagram.render.js — Anatomy Illustration Style
// ============================================================
// Clean anatomy illustration as PRIMARY visual
// SVG muscle paths = colored base + interactive highlight
// Anatomy PNG on top via soft-light blend = anatomical texture
// ============================================================

const SVG_DEFS = `
<defs>
  <!-- ===== SPECULAR HIGHLIGHTS ===== -->
  <linearGradient id="specularHL" x1="0.3" y1="0" x2="0.7" y2="1">
    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.30"/>
    <stop offset="18%" stop-color="#ffffff" stop-opacity="0.10"/>
    <stop offset="45%" stop-color="#000000" stop-opacity="0"/>
    <stop offset="80%" stop-color="#000000" stop-opacity="0.08"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0.15"/>
  </linearGradient>

  <!-- ===== GLOW FILTERS ===== -->
  <filter id="glowMega" x="-250%" y="-250%" width="600%" height="600%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="78" result="megaBlur"/>
    <feMerge><feMergeNode in="megaBlur"/><feMergeNode in="megaBlur"/></feMerge>
  </filter>
  <filter id="glowHalo" x="-120%" y="-120%" width="340%" height="340%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="30" result="haloBlur"/>
    <feMerge><feMergeNode in="haloBlur"/><feMergeNode in="haloBlur"/><feMergeNode in="haloBlur"/></feMerge>
  </filter>
  <filter id="glowMegaSec" x="-200%" y="-200%" width="500%" height="500%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="60" result="megaBlur"/>
    <feMerge><feMergeNode in="megaBlur"/></feMerge>
  </filter>
  <filter id="glowHaloSec" x="-100%" y="-100%" width="300%" height="300%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="21" result="haloBlur"/>
    <feMerge><feMergeNode in="haloBlur"/><feMergeNode in="haloBlur"/></feMerge>
  </filter>

  <!-- ===== ACTIVE PRIMARY FILTER (inner shadow + contour) ===== -->
  <filter id="muscleActiveP" x="-20%" y="-20%" width="140%" height="140%">
    <feComponentTransfer in="SourceAlpha" result="invAlpha">
      <feFuncA type="table" tableValues="1 0"/>
    </feComponentTransfer>
    <feGaussianBlur in="invAlpha" stdDeviation="10" result="innerBlur"/>
    <feOffset in="innerBlur" dx="2" dy="5" result="innerOff"/>
    <feFlood flood-color="#3A0505" flood-opacity="0.80" result="shadowColor"/>
    <feComposite in="shadowColor" in2="innerOff" operator="in" result="coloredInner"/>
    <feComposite in="coloredInner" in2="SourceAlpha" operator="in" result="clippedShadow"/>
    <feMorphology operator="erode" radius="3.5" in="SourceAlpha" result="eroded"/>
    <feComposite in="SourceAlpha" in2="eroded" operator="out" result="contourMask"/>
    <feFlood flood-color="#501515" flood-opacity="0.35" result="contourColor"/>
    <feComposite in="contourColor" in2="contourMask" operator="in" result="contourLine"/>
    <feMerge>
      <feMergeNode in="SourceGraphic"/>
      <feMergeNode in="clippedShadow"/>
      <feMergeNode in="contourLine"/>
    </feMerge>
  </filter>

  <!-- ===== ACTIVE SECONDARY FILTER ===== -->
  <filter id="muscleActiveS" x="-15%" y="-15%" width="130%" height="130%">
    <feComponentTransfer in="SourceAlpha" result="invAlpha">
      <feFuncA type="table" tableValues="1 0"/>
    </feComponentTransfer>
    <feGaussianBlur in="invAlpha" stdDeviation="7" result="innerBlur"/>
    <feOffset in="innerBlur" dx="1" dy="4" result="innerOff"/>
    <feFlood flood-color="#2A0505" flood-opacity="0.65" result="shadowColor"/>
    <feComposite in="shadowColor" in2="innerOff" operator="in" result="coloredInner"/>
    <feComposite in="coloredInner" in2="SourceAlpha" operator="in" result="clippedShadow"/>
    <feMorphology operator="erode" radius="2.5" in="SourceAlpha" result="eroded"/>
    <feComposite in="SourceAlpha" in2="eroded" operator="out" result="contourMask"/>
    <feFlood flood-color="#401010" flood-opacity="0.25" result="contourColor"/>
    <feComposite in="contourColor" in2="contourMask" operator="in" result="contourLine"/>
    <feMerge>
      <feMergeNode in="SourceGraphic"/>
      <feMergeNode in="clippedShadow"/>
      <feMergeNode in="contourLine"/>
    </feMerge>
  </filter>

  <!-- ===== INACTIVE MUSCLE FILTER ===== -->
  <filter id="muscleInactive" x="-10%" y="-10%" width="120%" height="120%">
    <feComponentTransfer in="SourceAlpha" result="invAlpha">
      <feFuncA type="table" tableValues="1 0"/>
    </feComponentTransfer>
    <feGaussianBlur in="invAlpha" stdDeviation="4" result="innerBlur"/>
    <feOffset in="innerBlur" dx="1" dy="2" result="innerOff"/>
    <feFlood flood-color="#5A3535" flood-opacity="0.25" result="shadowColor"/>
    <feComposite in="shadowColor" in2="innerOff" operator="in" result="coloredInner"/>
    <feComposite in="coloredInner" in2="SourceAlpha" operator="in" result="clippedShadow"/>
    <feMorphology operator="erode" radius="1.5" in="SourceAlpha" result="eroded"/>
    <feComposite in="SourceAlpha" in2="eroded" operator="out" result="contourMask"/>
    <feFlood flood-color="#5A4040" flood-opacity="0.20" result="contourColor"/>
    <feComposite in="contourColor" in2="contourMask" operator="in" result="contourLine"/>
    <feMerge>
      <feMergeNode in="SourceGraphic"/>
      <feMergeNode in="clippedShadow"/>
      <feMergeNode in="contourLine"/>
    </feMerge>
  </filter>

  <!-- ===== BODY SHADOW ===== -->
  <filter id="bodyShadow" x="-5%" y="-5%" width="110%" height="110%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="bShadow"/>
    <feOffset in="bShadow" dx="3" dy="5" result="bOff"/>
    <feFlood flood-color="#B89090" flood-opacity="0.18" result="bColor"/>
    <feComposite in="bColor" in2="bOff" operator="in" result="bClipped"/>
    <feMerge>
      <feMergeNode in="bClipped"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>

  <!-- ===== MUSCLE GRADIENTS (medical palette) ===== -->
  <radialGradient id="muscleGradP" cx="45%" cy="35%" r="65%" fx="38%" fy="28%">
    <stop offset="0%" stop-color="#E8907A"/>
    <stop offset="20%" stop-color="#D87060"/>
    <stop offset="45%" stop-color="#C06858"/>
    <stop offset="70%" stop-color="#A04838"/>
    <stop offset="100%" stop-color="#7A3020"/>
  </radialGradient>
  <radialGradient id="muscleGradS" cx="46%" cy="38%" r="60%" fx="40%" fy="32%">
    <stop offset="0%" stop-color="#D07868"/>
    <stop offset="30%" stop-color="#B85848"/>
    <stop offset="60%" stop-color="#A04838"/>
    <stop offset="100%" stop-color="#6B2818"/>
  </radialGradient>
  <radialGradient id="muscleGradI" cx="48%" cy="42%" r="58%">
    <stop offset="0%" stop-color="#D8B8B0"/>
    <stop offset="40%" stop-color="#C8A8A0"/>
    <stop offset="75%" stop-color="#B89890"/>
    <stop offset="100%" stop-color="#A88880"/>
  </radialGradient>
</defs>
`;

// ============================================================
// ANATOMY ILLUSTRATION OVERLAY
// ============================================================
const ANATOMY_BASE = (typeof import.meta !== 'undefined' && import.meta.env)
  ? import.meta.env.BASE_URL : '/';

function renderAnatomyOverlay(view, bodyPaths) {
  const img = view === "front" ? "anatomy-front.png" : "anatomy-back.png";
  const href = ANATOMY_BASE + "assets/" + img;
  const clipId = view === "front" ? "bodyClipF" : "bodyClipB";
  const x = view === "front" ? 62 : 786;
  const y = 50;
  const w = 600;
  const h = 1360;
  const clipPathsDef = bodyPaths.map(d => `<path d="${d}"/>`).join("\n");
  return `<clipPath id="${clipId}">${clipPathsDef}</clipPath>
<image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none" opacity="0.65" clip-path="url(#${clipId})" style="mix-blend-mode:soft-light;pointer-events:none"/>`;
}

// ============================================================
// COLORS
// ============================================================
const COLORS = {
  primaryGlow: "#D04030",
  secondaryGlow: "#C04838",
  inactiveStroke: "#9A8080",
  bodyFill: "#F0DDD5",
  bodyStroke: "#C8A898",
};

function getInfo(muscleKey, side, activeMuscles) {
  if (!activeMuscles) return null;
  const sideKey = muscleKey + "_" + side;
  if (sideKey in activeMuscles) return activeMuscles[sideKey];
  if (muscleKey in activeMuscles) return activeMuscles[muscleKey];
  return null;
}

// ============================================================
// GLOW PASS
// ============================================================
function renderGlowSide(muscleKey, side, paths, activeMuscles) {
  const info = getInfo(muscleKey, side, activeMuscles);
  if (!info) return "";
  const isPrimary = info.level === "primary";
  const glowColor = isPrimary ? COLORS.primaryGlow : COLORS.secondaryGlow;
  const megaFilter = isPrimary ? "url(#glowMega)" : "url(#glowMegaSec)";
  const haloFilter = isPrimary ? "url(#glowHalo)" : "url(#glowHaloSec)";
  const megaOp = isPrimary ? 0.30 : 0.18;
  const haloOp = isPrimary ? 0.40 : 0.25;
  return paths.map(d =>
    `<path d="${d}" fill="${glowColor}" fill-opacity="${megaOp}" stroke="none" filter="${megaFilter}"/>
<path d="${d}" fill="${glowColor}" fill-opacity="${haloOp}" stroke="none" filter="${haloFilter}"/>`
  ).join("\n");
}

function renderGlow(muscleKey, muscleData, activeMuscles) {
  return [
    renderGlowSide(muscleKey, "left", muscleData.left, activeMuscles),
    renderGlowSide(muscleKey, "right", muscleData.right, activeMuscles),
    renderGlowSide(muscleKey, "common", muscleData.common, activeMuscles),
  ].filter(Boolean).join("\n");
}

// ============================================================
// SHARP PASS — muscle fills
// ============================================================
function renderSharpSide(muscleKey, side, paths, activeMuscles) {
  const info = getInfo(muscleKey, side, activeMuscles);
  const dataAttrs = `data-muscle="${muscleKey}" data-side="${side}"`;

  if (!info) {
    return paths.map(d =>
      `<path ${dataAttrs} d="${d}" fill="url(#muscleGradI)" fill-opacity="1" stroke="${COLORS.inactiveStroke}" stroke-width="0.8" stroke-linejoin="round" filter="url(#muscleInactive)" style="cursor:pointer"/>`
    ).join("\n");
  }

  const isPrimary = info.level === "primary";
  const grad = isPrimary ? "url(#muscleGradP)" : "url(#muscleGradS)";
  const activeFilter = isPrimary ? "url(#muscleActiveP)" : "url(#muscleActiveS)";
  const stroke = isPrimary ? "#6B2020" : "#5A2525";
  const sw = isPrimary ? 1.8 : 1.3;

  return paths.map(d =>
    `<path ${dataAttrs} d="${d}" fill="${grad}" fill-opacity="1" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" filter="${activeFilter}" style="cursor:pointer"/>
<path d="${d}" fill="url(#specularHL)" fill-opacity="0.35" style="pointer-events:none"/>`
  ).join("\n");
}

function renderSharp(muscleKey, muscleData, activeMuscles) {
  return [
    renderSharpSide(muscleKey, "left", muscleData.left, activeMuscles),
    renderSharpSide(muscleKey, "right", muscleData.right, activeMuscles),
    renderSharpSide(muscleKey, "common", muscleData.common, activeMuscles),
  ].filter(Boolean).join("\n");
}

// ============================================================
// BODY OUTLINE
// ============================================================
function renderBody(bodyPaths) {
  return bodyPaths.map(d =>
    `<path d="${d}" fill="${COLORS.bodyFill}" stroke="${COLORS.bodyStroke}" stroke-width="1.8" stroke-linejoin="round" filter="url(#bodyShadow)"/>`
  ).join("\n");
}

const FRONT_ORDER = ["core", "adductors", "quadriceps", "tibialis", "calves", "forearms", "chest", "traps", "shoulders", "biceps", "triceps"];
const BACK_ORDER = ["lowerBack", "lats", "adductors", "hamstrings", "calves", "forearms", "glutes", "traps", "shoulders", "triceps"];

// ===============================================================
// PUBLIC API
// ===============================================================
export function renderFrontBodySVG(activeMuscles = {}) {
  const glowSVG = FRONT_ORDER.map(key =>
    FRONT_MUSCLES[key] ? renderGlow(key, FRONT_MUSCLES[key], activeMuscles) : ""
  ).filter(Boolean).join("\n");

  const sharpSVG = FRONT_ORDER.map(key =>
    FRONT_MUSCLES[key] ? renderSharp(key, FRONT_MUSCLES[key], activeMuscles) : ""
  ).filter(Boolean).join("\n");

  return `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 724 1448" width="100%" height="100%" style="background:transparent;">
${SVG_DEFS}
<g class="body-outline">
${renderBody(FRONT_BODY)}
</g>
<g class="glow-pass">
${glowSVG}
</g>
<g class="sharp-pass">
${sharpSVG}
</g>
</svg>`.trim();
}

export function renderBackBodySVG(activeMuscles = {}) {
  const glowSVG = BACK_ORDER.map(key =>
    BACK_MUSCLES[key] ? renderGlow(key, BACK_MUSCLES[key], activeMuscles) : ""
  ).filter(Boolean).join("\n");

  const sharpSVG = BACK_ORDER.map(key =>
    BACK_MUSCLES[key] ? renderSharp(key, BACK_MUSCLES[key], activeMuscles) : ""
  ).filter(Boolean).join("\n");

  return `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="724 0 724 1448" width="100%" height="100%" style="background:transparent;">
${SVG_DEFS}
<g class="body-outline">
${renderBody(BACK_BODY)}
</g>
<g class="glow-pass">
${glowSVG}
</g>
<g class="sharp-pass">
${sharpSVG}
</g>
</svg>`.trim();
}
