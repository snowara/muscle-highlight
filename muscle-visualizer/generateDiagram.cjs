// Generate bodyDiagram.js with left/right separation for per-side editing
const fs = require('fs');
const data = require('./tmp_transformed.json');

function pathsToJS(paths) {
  return paths.map(p => `    "${p}"`).join(',\n');
}

function musclesToJS(muscles) {
  let out = '';
  for (const [key, sides] of Object.entries(muscles)) {
    out += `  ${key}: {\n`;
    out += `    left: [\n${pathsToJS(sides.left)}\n    ],\n`;
    out += `    right: [\n${pathsToJS(sides.right)}\n    ],\n`;
    out += `    common: [\n${pathsToJS(sides.common)}\n    ],\n`;
    out += `  },\n`;
  }
  return out;
}

let out = `// ============================================================
// bodyDiagram.js — Anatomical SVG muscle diagram renderer
// Source: react-native-body-highlighter (MIT License)
// Paths transformed to 240x500 viewBox
// Left/Right separation for per-side editing
// ============================================================

const SVG_DEFS = \`
<defs>
  <filter id="glowMega" x="-250%" y="-250%" width="600%" height="600%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="26" result="megaBlur"/>
    <feMerge><feMergeNode in="megaBlur"/><feMergeNode in="megaBlur"/></feMerge>
  </filter>
  <filter id="glowHalo" x="-120%" y="-120%" width="340%" height="340%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="haloBlur"/>
    <feMerge><feMergeNode in="haloBlur"/><feMergeNode in="haloBlur"/><feMergeNode in="haloBlur"/></feMerge>
  </filter>
  <filter id="glowSharp" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="sharpBlur"/>
    <feMerge><feMergeNode in="sharpBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="glowMegaSec" x="-200%" y="-200%" width="500%" height="500%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="20" result="megaBlur"/>
    <feMerge><feMergeNode in="megaBlur"/></feMerge>
  </filter>
  <filter id="glowHaloSec" x="-100%" y="-100%" width="300%" height="300%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="haloBlur"/>
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
\`;

const COLORS = {
  primaryGlow: "#FF1A1A",
  secondaryGlow: "#FF2828",
  inactiveStroke: "#1a1a30",
  bodyFill: "#0d0d1a",
  bodyStroke: "#1e1e35",
};

// ===============================================================
// FRONT VIEW — Muscle Paths { left: [], right: [], common: [] }
// ===============================================================

const FRONT_MUSCLES = {
${musclesToJS(data.front.muscles)}};

const FRONT_BODY = [
${data.front.body.map(p => p.paths.map(d => `  "${d}"`).join(',\n')).join(',\n')}
];

// ===============================================================
// BACK VIEW — Muscle Paths { left: [], right: [], common: [] }
// ===============================================================

const BACK_MUSCLES = {
${musclesToJS(data.back.muscles)}};

const BACK_BODY = [
${data.back.body.map(p => p.paths.map(d => `  "${d}"`).join(',\n')).join(',\n')}
];

// ===============================================================
// Rendering Helpers — with left/right/common data attributes
// ===============================================================

/**
 * Resolve the activation info for a specific muscle+side combination.
 * activeMuscles can have:
 *   "chest"       → both sides
 *   "chest_left"  → left only
 *   "chest_right" → right only
 * Side-specific keys override the base key.
 */
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
    \`<path d="\${d}" fill="\${glowColor}" fill-opacity="\${megaOp}" stroke="none" filter="\${megaFilter}"/>
<path d="\${d}" fill="\${glowColor}" fill-opacity="\${haloOp}" stroke="none" filter="\${haloFilter}"/>\`
  ).join("\\n");
}

function renderGlow(muscleKey, muscleData, activeMuscles) {
  return [
    renderGlowSide(muscleKey, "left", muscleData.left, activeMuscles),
    renderGlowSide(muscleKey, "right", muscleData.right, activeMuscles),
    renderGlowSide(muscleKey, "common", muscleData.common, activeMuscles),
  ].filter(Boolean).join("\\n");
}

function renderSharpSide(muscleKey, side, paths, activeMuscles) {
  const info = getInfo(muscleKey, side, activeMuscles);
  const dataAttrs = \`data-muscle="\${muscleKey}" data-side="\${side}"\`;
  if (!info) {
    return paths.map(d =>
      \`<path \${dataAttrs} d="\${d}" fill="url(#muscleGradI)" fill-opacity="1" stroke="\${COLORS.inactiveStroke}" stroke-width="0.5" stroke-linejoin="round" style="cursor:pointer"/>\`
    ).join("\\n");
  }
  const isPrimary = info.level === "primary";
  const grad = isPrimary ? "url(#muscleGradP)" : "url(#muscleGradS)";
  const stroke = isPrimary ? "#FF3030" : "#D03030";
  const sw = isPrimary ? 0.6 : 0.4;
  return paths.map(d =>
    \`<path \${dataAttrs} d="\${d}" fill="\${grad}" fill-opacity="0.95" stroke="\${stroke}" stroke-width="\${sw}" stroke-linejoin="round" filter="url(#glowSharp)" style="cursor:pointer"/>\`
  ).join("\\n");
}

function renderSharp(muscleKey, muscleData, activeMuscles) {
  return [
    renderSharpSide(muscleKey, "left", muscleData.left, activeMuscles),
    renderSharpSide(muscleKey, "right", muscleData.right, activeMuscles),
    renderSharpSide(muscleKey, "common", muscleData.common, activeMuscles),
  ].filter(Boolean).join("\\n");
}

function renderBody(bodyPaths) {
  return bodyPaths.map(d =>
    \`<path d="\${d}" fill="\${COLORS.bodyFill}" stroke="\${COLORS.bodyStroke}" stroke-width="0.5" stroke-linejoin="round"/>\`
  ).join("\\n");
}

// Muscle render order (back to front, anatomical depth)
const FRONT_ORDER = ["core", "adductors", "quadriceps", "calves", "forearms", "chest", "traps", "shoulders", "biceps", "triceps"];
const BACK_ORDER = ["lowerBack", "lats", "adductors", "hamstrings", "calves", "forearms", "glutes", "traps", "shoulders", "triceps"];

// Export available muscle keys per view (for edit UI)
export const FRONT_MUSCLE_KEYS = Object.keys(FRONT_MUSCLES);
export const BACK_MUSCLE_KEYS = Object.keys(BACK_MUSCLES);

// ===============================================================
// PUBLIC API
// ===============================================================

export function renderFrontBodySVG(activeMuscles = {}) {
  const glowSVG = FRONT_ORDER.map(key =>
    FRONT_MUSCLES[key] ? renderGlow(key, FRONT_MUSCLES[key], activeMuscles) : ""
  ).filter(Boolean).join("\\n");

  const sharpSVG = FRONT_ORDER.map(key =>
    FRONT_MUSCLES[key] ? renderSharp(key, FRONT_MUSCLES[key], activeMuscles) : ""
  ).filter(Boolean).join("\\n");

  return \`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 500" width="100%" height="100%" style="background:transparent;">
\${SVG_DEFS}
<g class="body-outline">
\${renderBody(FRONT_BODY)}
</g>
<g class="glow-pass">
\${glowSVG}
</g>
<g class="sharp-pass">
\${sharpSVG}
</g>
<text x="120" y="14" text-anchor="middle" fill="rgba(255,255,255,0.1)" font-size="8" font-family="'Noto Sans KR', sans-serif" font-weight="600">FRONT</text>
</svg>\`.trim();
}

export function renderBackBodySVG(activeMuscles = {}) {
  const glowSVG = BACK_ORDER.map(key =>
    BACK_MUSCLES[key] ? renderGlow(key, BACK_MUSCLES[key], activeMuscles) : ""
  ).filter(Boolean).join("\\n");

  const sharpSVG = BACK_ORDER.map(key =>
    BACK_MUSCLES[key] ? renderSharp(key, BACK_MUSCLES[key], activeMuscles) : ""
  ).filter(Boolean).join("\\n");

  return \`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 500" width="100%" height="100%" style="background:transparent;">
\${SVG_DEFS}
<g class="body-outline">
\${renderBody(BACK_BODY)}
</g>
<g class="glow-pass">
\${glowSVG}
</g>
<g class="sharp-pass">
\${sharpSVG}
</g>
<text x="120" y="14" text-anchor="middle" fill="rgba(255,255,255,0.1)" font-size="8" font-family="'Noto Sans KR', sans-serif" font-weight="600">BACK</text>
</svg>\`.trim();
}
`;

fs.writeFileSync(__dirname + '/src/lib/bodyDiagram.js', out);
console.log('Generated bodyDiagram.js with left/right separation!');
console.log('File size:', out.length, 'bytes');
