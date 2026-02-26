// ============================================================
// Rendering functions for bodyDiagram.js
// Scaled for 724x1448 viewBox (from react-muscle-highlighter)
// This file is concatenated with generated path data by generateDiagram.cjs
// ============================================================

const SVG_DEFS = `
<defs>
  <filter id="glowMega" x="-250%" y="-250%" width="600%" height="600%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="78" result="megaBlur"/>
    <feMerge><feMergeNode in="megaBlur"/><feMergeNode in="megaBlur"/></feMerge>
  </filter>
  <filter id="glowHalo" x="-120%" y="-120%" width="340%" height="340%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="30" result="haloBlur"/>
    <feMerge><feMergeNode in="haloBlur"/><feMergeNode in="haloBlur"/><feMergeNode in="haloBlur"/></feMerge>
  </filter>
  <filter id="glowSharp" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="sharpBlur"/>
    <feMerge><feMergeNode in="sharpBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="glowMegaSec" x="-200%" y="-200%" width="500%" height="500%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="60" result="megaBlur"/>
    <feMerge><feMergeNode in="megaBlur"/></feMerge>
  </filter>
  <filter id="glowHaloSec" x="-100%" y="-100%" width="300%" height="300%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="21" result="haloBlur"/>
    <feMerge><feMergeNode in="haloBlur"/><feMergeNode in="haloBlur"/></feMerge>
  </filter>
  <radialGradient id="muscleGradP" cx="50%" cy="42%" r="58%" fx="46%" fy="38%">
    <stop offset="0%" stop-color="#FF4545"/>
    <stop offset="35%" stop-color="#E02828"/>
    <stop offset="70%" stop-color="#B81818"/>
    <stop offset="100%" stop-color="#801010"/>
  </radialGradient>
  <radialGradient id="muscleGradS" cx="50%" cy="42%" r="58%" fx="46%" fy="38%">
    <stop offset="0%" stop-color="#E03838"/>
    <stop offset="35%" stop-color="#C02020"/>
    <stop offset="70%" stop-color="#901515"/>
    <stop offset="100%" stop-color="#600A0A"/>
  </radialGradient>
  <radialGradient id="muscleGradI" cx="50%" cy="50%" r="55%">
    <stop offset="0%" stop-color="#141428"/>
    <stop offset="100%" stop-color="#0a0a18"/>
  </radialGradient>
</defs>
`;

const COLORS = {
  primaryGlow: "#FF1A1A",
  secondaryGlow: "#FF2828",
  inactiveStroke: "#1a1a30",
  bodyFill: "#0d0d1a",
  bodyStroke: "#1e1e35",
};

function getInfo(muscleKey, side, activeMuscles) {
  if (!activeMuscles) return null;
  const sideKey = muscleKey + "_" + side;
  if (sideKey in activeMuscles) return activeMuscles[sideKey];
  if (muscleKey in activeMuscles) return activeMuscles[muscleKey];
  return null;
}

function renderGlowSide(muscleKey, side, paths, activeMuscles) {
  const info = getInfo(muscleKey, side, activeMuscles);
  if (!info) return "";
  const isPrimary = info.level === "primary";
  const glowColor = isPrimary ? COLORS.primaryGlow : COLORS.secondaryGlow;
  const megaFilter = isPrimary ? "url(#glowMega)" : "url(#glowMegaSec)";
  const haloFilter = isPrimary ? "url(#glowHalo)" : "url(#glowHaloSec)";
  const megaOp = isPrimary ? 0.55 : 0.35;
  const haloOp = isPrimary ? 0.65 : 0.45;
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

function renderSharpSide(muscleKey, side, paths, activeMuscles) {
  const info = getInfo(muscleKey, side, activeMuscles);
  const dataAttrs = `data-muscle="${muscleKey}" data-side="${side}"`;
  if (!info) {
    return paths.map(d =>
      `<path ${dataAttrs} d="${d}" fill="url(#muscleGradI)" fill-opacity="1" stroke="${COLORS.inactiveStroke}" stroke-width="1.5" stroke-linejoin="round" style="cursor:pointer"/>`
    ).join("\n");
  }
  const isPrimary = info.level === "primary";
  const grad = isPrimary ? "url(#muscleGradP)" : "url(#muscleGradS)";
  const stroke = isPrimary ? "#FF3030" : "#D03030";
  const sw = isPrimary ? 1.8 : 1.2;
  return paths.map(d =>
    `<path ${dataAttrs} d="${d}" fill="${grad}" fill-opacity="0.95" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" filter="url(#glowSharp)" style="cursor:pointer"/>`
  ).join("\n");
}

function renderSharp(muscleKey, muscleData, activeMuscles) {
  return [
    renderSharpSide(muscleKey, "left", muscleData.left, activeMuscles),
    renderSharpSide(muscleKey, "right", muscleData.right, activeMuscles),
    renderSharpSide(muscleKey, "common", muscleData.common, activeMuscles),
  ].filter(Boolean).join("\n");
}

function renderBody(bodyPaths) {
  return bodyPaths.map(d =>
    `<path d="${d}" fill="${COLORS.bodyFill}" stroke="${COLORS.bodyStroke}" stroke-width="1.5" stroke-linejoin="round"/>`
  ).join("\n");
}

// Muscle render order (back to front, anatomical depth)
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
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 724 1448" width="100%" height="100%" style="background:transparent;">
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
<text x="362" y="40" text-anchor="middle" fill="rgba(255,255,255,0.1)" font-size="24" font-family="'Noto Sans KR', sans-serif" font-weight="600">FRONT</text>
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
<svg xmlns="http://www.w3.org/2000/svg" viewBox="724 0 724 1448" width="100%" height="100%" style="background:transparent;">
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
<text x="1086" y="40" text-anchor="middle" fill="rgba(255,255,255,0.1)" font-size="24" font-family="'Noto Sans KR', sans-serif" font-weight="600">BACK</text>
</svg>`.trim();
}
