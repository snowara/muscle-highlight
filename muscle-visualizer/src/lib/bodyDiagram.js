// ============================================================
// bodyDiagram.js — Anatomical SVG muscle diagram renderer
// Medical-textbook style front/back body views with muscle highlighting
// ViewBox: 240 x 500 (portrait)
// ============================================================

// --------------- SVG Filter & Style Definitions ---------------

const SVG_DEFS = `
<defs>
  <!-- Glow filter for active muscles -->
  <filter id="muscleGlow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
    <feComposite in="SourceGraphic" in2="blur" operator="over"/>
  </filter>
  <filter id="muscleGlowStrong" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
    <feMerge>
      <feMergeNode in="blur"/>
      <feMergeNode in="blur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
  <!-- Subtle inner shadow for depth -->
  <filter id="innerDepth" x="-10%" y="-10%" width="120%" height="120%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
    <feOffset dx="0" dy="1" result="offsetBlur"/>
    <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="inverse"/>
    <feFlood flood-color="#000" flood-opacity="0.3" result="color"/>
    <feComposite in="color" in2="inverse" operator="in" result="shadow"/>
    <feComposite in="SourceGraphic" in2="shadow" operator="over"/>
  </filter>
</defs>
`;

// --------------- Color Constants ---------------

const COLORS = {
  bg: "#0a0a1a",
  bodyOutline: "#555",
  bodyOutlineWidth: 0.8,
  inactiveFill: "#1a1a2e",
  inactiveStroke: "#333",
  fiberLine: "#333",
  fiberOpacity: 0.3,
  primaryFill: "#E53E3E",
  primaryOpacity: 0.85,
  secondaryFill: "#ECC94B",
  secondaryOpacity: 0.65,
  anatomyDetail: "#444",
  anatomyDetailWidth: 0.5,
  spineDetail: "#3a3a4e",
};

// --------------- Helper: get fill/stroke for a muscle ---------------

function getMuscleStyle(muscleKey, activeMuscles) {
  const info = activeMuscles && activeMuscles[muscleKey];
  if (!info) {
    return {
      fill: COLORS.inactiveFill,
      fillOpacity: 1,
      stroke: COLORS.inactiveStroke,
      strokeWidth: 0.6,
      filter: "",
    };
  }
  const isPrimary = info.level === "primary";
  return {
    fill: isPrimary ? COLORS.primaryFill : COLORS.secondaryFill,
    fillOpacity: isPrimary ? COLORS.primaryOpacity : COLORS.secondaryOpacity,
    stroke: isPrimary ? "#FF6B6B" : "#F6E05E",
    strokeWidth: isPrimary ? 1.0 : 0.8,
    filter: isPrimary ? 'filter="url(#muscleGlowStrong)"' : 'filter="url(#muscleGlow)"',
  };
}

function musclePathTag(id, d, activeMuscles, extraAttrs = "") {
  const s = getMuscleStyle(id, activeMuscles);
  return `<path id="${id}" d="${d}" fill="${s.fill}" fill-opacity="${s.fillOpacity}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linejoin="round" ${s.filter} ${extraAttrs}/>`;
}

// --------------- Fiber direction lines (anatomical detail) ---------------

function fiberLines(lines) {
  return lines
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="${COLORS.fiberLine}" stroke-width="0.4" stroke-opacity="${COLORS.fiberOpacity}" stroke-linecap="round"/>`
    )
    .join("\n");
}

// ===============================================================
// FRONT VIEW — Body Outline & Muscle Paths
// ===============================================================

// Body silhouette outline (front view) — continuous path
const FRONT_BODY_OUTLINE = `
  M120,12
  C106,12 96,22 96,36
  C96,50 106,60 120,60
  C134,60 144,50 144,36
  C144,22 134,12 120,12 Z

  M108,60
  C106,62 104,66 103,70
  L98,72 80,78 68,86
  C62,90 58,94 54,100
  L48,115 44,130 42,148
  C40,162 42,172 46,182
  L48,194 48,208 48,225
  C48,228 47,232 46,236

  M172,60
  C174,62 176,66 177,70
  L182,72 200,78 212,86
  C218,90 222,94 226,100
  L232,115 236,130 238,148
  C240,162 238,172 234,182
  L232,194 232,208 232,225
  C232,228 233,232 234,236

  M103,70
  C102,74 100,80 98,86

  M177,70
  C178,74 180,80 182,86

  M68,86
  C72,100 78,116 82,130
  L86,150 88,168 88,186
  L88,200 86,215 84,228
  C82,238 82,240 82,242

  M212,86
  C208,100 202,116 198,130
  L194,150 192,168 192,186
  L192,200 194,215 196,228
  C198,238 198,240 198,242

  M82,242
  L80,260 82,280 84,296
  C86,310 88,320 90,330
  L92,342 92,358 92,375
  L92,395 92,410 93,425
  C93,432 92,440 90,448
  L86,460 82,470 80,478
  C78,484 78,488 80,490
  L108,492

  M198,242
  L200,260 198,280 196,296
  C194,310 192,320 190,330
  L188,342 188,358 188,375
  L188,395 188,410 187,425
  C187,432 188,440 190,448
  L194,460 198,470 200,478
  C202,484 202,488 200,490
  L172,492

  M108,492
  L118,494 128,494 138,492

  M172,492
  L162,494 152,494 142,492
`;

// --------------- Front Muscles ---------------

// Chest — left pec
const FRONT_CHEST_L = `M88,102 C90,96 96,92 104,90 C112,88 118,90 120,92 L120,108 C120,118 118,124 114,128 C108,134 100,132 94,128 C88,122 86,114 88,102 Z`;
// Chest — right pec
const FRONT_CHEST_R = `M152,102 C150,96 144,92 136,90 C128,88 122,90 120,92 L120,108 C120,118 122,124 126,128 C132,134 140,132 146,128 C152,122 154,114 152,102 Z`;

// Shoulders (anterior deltoid) — left
const FRONT_SHOULDER_L = `M80,86 C74,88 70,92 68,98 C66,106 68,114 72,118 C76,122 82,120 86,116 C90,112 92,106 92,98 C92,92 88,88 80,86 Z`;
// Shoulders — right
const FRONT_SHOULDER_R = `M160,86 C166,88 170,92 172,98 C174,106 172,114 168,118 C164,122 158,120 154,116 C150,112 148,106 148,98 C148,92 152,88 160,86 Z`;

// Biceps — left
const FRONT_BICEP_L = `M72,126 C68,130 64,140 62,152 C60,164 62,174 66,178 C70,182 76,178 78,172 C82,162 82,150 80,138 C78,130 76,126 72,126 Z`;
// Biceps — right
const FRONT_BICEP_R = `M168,126 C172,130 176,140 178,152 C180,164 178,174 174,178 C170,182 164,178 162,172 C158,162 158,150 160,138 C162,130 164,126 168,126 Z`;

// Forearms — left
const FRONT_FOREARM_L = `M64,182 C60,188 56,198 54,210 C52,222 50,232 48,238 C48,230 50,220 52,210 C54,198 58,188 64,182 Z
M66,182 C62,190 58,202 56,216 C54,226 54,234 56,238 C56,230 58,218 60,206 C62,196 66,186 66,182 Z`;
const FRONT_FOREARM_L_FULL = `M64,182 C58,190 54,202 50,216 C48,226 46,234 46,238 L58,238 C58,232 60,222 62,212 C64,200 68,188 72,182 Z`;
// Forearms — right
const FRONT_FOREARM_R_FULL = `M176,182 C182,190 186,202 190,216 C192,226 194,234 194,238 L182,238 C182,232 180,222 178,212 C176,200 172,188 168,182 Z`;

// Core (rectus abdominis) — 6-pack shape
const FRONT_CORE = `M108,132 C106,138 104,148 104,158 C104,172 104,186 106,200 C108,210 110,218 112,226 L120,228 L128,226 C130,218 132,210 134,200 C136,186 136,172 136,158 C136,148 134,138 132,132 L120,130 Z`;

// Quadriceps — left
const FRONT_QUAD_L = `M86,248 C84,258 82,272 82,288 C82,304 84,318 88,330 C90,338 92,344 94,348 L102,348 C104,342 104,334 104,324 C104,310 102,296 100,282 C98,268 96,256 94,248 Z`;
// Quadriceps — right
const FRONT_QUAD_R = `M154,248 C156,258 158,272 158,288 C158,304 156,318 152,330 C150,338 148,344 146,348 L138,348 C136,342 136,334 136,324 C136,310 138,296 140,282 C142,268 144,256 146,248 Z`;

// Calves (front) — left
const FRONT_CALF_L = `M90,360 C88,370 86,382 86,396 C86,410 88,420 90,428 C92,434 94,436 96,434 C98,428 98,420 98,408 C98,394 96,380 94,368 C92,362 90,360 90,360 Z`;
// Calves — right
const FRONT_CALF_R = `M150,360 C152,370 154,382 154,396 C154,410 152,420 150,428 C148,434 146,436 144,434 C142,428 142,420 142,408 C142,394 144,380 146,368 C148,362 150,360 150,360 Z`;

// --------------- Front Anatomical Details ---------------

function frontAnatomyDetails() {
  return `
    <!-- Clavicle lines -->
    <path d="M88,88 C96,84 108,82 120,82 C132,82 144,84 152,88" fill="none" stroke="${COLORS.anatomyDetail}" stroke-width="${COLORS.anatomyDetailWidth}" stroke-linecap="round"/>

    <!-- Rib cage hints -->
    <path d="M102,108 C108,110 114,112 120,112 C126,112 132,110 138,108" fill="none" stroke="${COLORS.anatomyDetail}" stroke-width="0.4" stroke-opacity="0.4" stroke-linecap="round"/>
    <path d="M104,116 C110,119 116,120 120,120 C124,120 130,119 136,116" fill="none" stroke="${COLORS.anatomyDetail}" stroke-width="0.4" stroke-opacity="0.4" stroke-linecap="round"/>
    <path d="M106,124 C112,127 116,128 120,128 C124,128 128,127 134,124" fill="none" stroke="${COLORS.anatomyDetail}" stroke-width="0.4" stroke-opacity="0.3" stroke-linecap="round"/>

    <!-- Sternum center line -->
    <line x1="120" y1="86" x2="120" y2="130" stroke="${COLORS.anatomyDetail}" stroke-width="0.5" stroke-opacity="0.5"/>

    <!-- Navel -->
    <ellipse cx="120" cy="210" rx="3" ry="4" fill="none" stroke="${COLORS.anatomyDetail}" stroke-width="0.5" stroke-opacity="0.5"/>

    <!-- Linea alba (center abdominal line) -->
    <line x1="120" y1="130" x2="120" y2="230" stroke="${COLORS.anatomyDetail}" stroke-width="0.6" stroke-opacity="0.5"/>

    <!-- Kneecap left -->
    <ellipse cx="93" cy="348" rx="6" ry="7" fill="none" stroke="${COLORS.anatomyDetail}" stroke-width="0.5" stroke-opacity="0.5"/>
    <!-- Kneecap right -->
    <ellipse cx="147" cy="348" rx="6" ry="7" fill="none" stroke="${COLORS.anatomyDetail}" stroke-width="0.5" stroke-opacity="0.5"/>

    <!-- Hip crease lines -->
    <path d="M84,236 C90,242 100,246 110,246" fill="none" stroke="${COLORS.anatomyDetail}" stroke-width="0.4" stroke-opacity="0.4" stroke-linecap="round"/>
    <path d="M156,236 C150,242 140,246 130,246" fill="none" stroke="${COLORS.anatomyDetail}" stroke-width="0.4" stroke-opacity="0.4" stroke-linecap="round"/>
  `;
}

// --------------- Front Fiber Lines ---------------

function frontChestFibers() {
  return fiberLines([
    // Left pec fibers — fan pattern from sternum outward
    "M118,96 C112,98 104,102 96,108",
    "M118,102 C112,106 104,112 96,118",
    "M118,108 C112,112 106,118 100,124",
    "M118,114 C114,118 108,124 104,128",
    // Right pec fibers
    "M122,96 C128,98 136,102 144,108",
    "M122,102 C128,106 136,112 144,118",
    "M122,108 C128,112 134,118 140,124",
    "M122,114 C126,118 132,124 136,128",
  ]);
}

function frontCoreFibers() {
  return fiberLines([
    // Horizontal segmentation lines (six-pack divisions)
    "M110,142 L130,142",
    "M108,156 L132,156",
    "M108,170 L132,170",
    "M108,184 L132,184",
    "M110,198 L130,198",
    // Vertical center line already in anatomyDetails
    // Linea semilunaris (outer ab borders) — subtle curves
    "M108,134 C106,150 106,170 106,190 C108,210 110,222 112,228",
    "M132,134 C134,150 134,170 134,190 C132,210 130,222 128,228",
  ]);
}

function frontQuadFibers() {
  return fiberLines([
    // Left quad — vertical striations
    "M90,256 C90,272 90,290 90,310 C90,324 92,336 94,344",
    "M96,254 C96,270 96,290 98,310 C100,328 100,340 100,346",
    "M86,262 C84,278 84,296 86,316 C88,330 90,340 92,346",
    // Right quad
    "M150,256 C150,272 150,290 150,310 C150,324 148,336 146,344",
    "M144,254 C144,270 144,290 142,310 C140,328 140,340 140,346",
    "M154,262 C156,278 156,296 154,316 C152,330 150,340 148,346",
  ]);
}

function frontBicepFibers() {
  return fiberLines([
    // Left bicep
    "M72,132 C70,142 68,154 66,166 C66,172 68,176 70,178",
    "M76,130 C74,142 72,156 72,168 C72,174 74,178 76,178",
    // Right bicep
    "M168,132 C170,142 172,154 174,166 C174,172 172,176 170,178",
    "M164,130 C166,142 168,156 168,168 C168,174 166,178 164,178",
  ]);
}

function frontCalfFibers() {
  return fiberLines([
    // Left calf
    "M90,366 C88,378 88,392 88,408 C90,420 92,430 94,434",
    "M94,364 C94,376 94,392 94,410 C94,422 94,432 94,434",
    // Right calf
    "M150,366 C152,378 152,392 152,408 C150,420 148,430 146,434",
    "M146,364 C146,376 146,392 146,410 C146,422 146,432 146,434",
  ]);
}

// ===============================================================
// BACK VIEW — Body Outline & Muscle Paths
// ===============================================================

const BACK_BODY_OUTLINE = `
  M120,12
  C106,12 96,22 96,36
  C96,50 106,60 120,60
  C134,60 144,50 144,36
  C144,22 134,12 120,12 Z

  M108,60
  C106,62 104,66 103,70
  L98,72 80,78 68,86
  C62,90 58,94 54,100
  L48,115 44,130 42,148
  C40,162 42,172 46,182
  L48,194 48,208 48,225
  C48,228 47,232 46,236

  M172,60
  C174,62 176,66 177,70
  L182,72 200,78 212,86
  C218,90 222,94 226,100
  L232,115 236,130 238,148
  C240,162 238,172 234,182
  L232,194 232,208 232,225
  C232,228 233,232 234,236

  M68,86
  C72,100 78,116 82,130
  L86,150 88,168 88,186
  L88,200 86,215 84,228
  C82,238 82,240 82,242

  M212,86
  C208,100 202,116 198,130
  L194,150 192,168 192,186
  L192,200 194,215 196,228
  C198,238 198,240 198,242

  M82,242
  L80,260 82,280 84,296
  C86,310 88,320 90,330
  L92,342 92,358 92,375
  L92,395 92,410 93,425
  C93,432 92,440 90,448
  L86,460 82,470 80,478
  C78,484 78,488 80,490
  L108,492

  M198,242
  L200,260 198,280 196,296
  C194,310 192,320 190,330
  L188,342 188,358 188,375
  L188,395 188,410 187,425
  C187,432 188,440 190,448
  L194,460 198,470 200,478
  C202,484 202,488 200,490
  L172,492

  M108,492
  L118,494 128,494 138,492

  M172,492
  L162,494 152,494 142,492
`;

// --------------- Back Muscles ---------------

// Traps — large diamond/kite from neck to mid-back
const BACK_TRAPS = `M120,62 C114,64 108,68 100,74 C92,80 86,86 82,92 C86,98 92,104 100,108 C108,112 114,114 120,114 C126,114 132,112 140,108 C148,104 154,98 158,92 C154,86 148,80 140,74 C132,68 126,64 120,62 Z`;

// Lats — left wing
const BACK_LAT_L = `M96,110 C90,116 86,126 84,138 C82,152 82,168 84,182 C86,194 90,204 96,210 L108,214 C112,210 114,202 114,192 C114,178 112,164 110,150 C108,136 104,122 100,112 Z`;
// Lats — right wing
const BACK_LAT_R = `M144,110 C150,116 154,126 156,138 C158,152 158,168 156,182 C154,194 150,204 144,210 L132,214 C128,210 126,202 126,192 C126,178 128,164 130,150 C132,136 136,122 140,112 Z`;

// Shoulders (posterior deltoid) — left
const BACK_SHOULDER_L = `M80,86 C74,88 70,92 68,98 C66,106 68,114 72,118 C76,122 82,120 86,116 C90,112 92,106 92,98 C92,92 88,88 80,86 Z`;
// Shoulders — right
const BACK_SHOULDER_R = `M160,86 C166,88 170,92 172,98 C174,106 172,114 168,118 C164,122 158,120 154,116 C150,112 148,106 148,98 C148,92 152,88 160,86 Z`;

// Triceps — left (horseshoe shape on back of arm)
const BACK_TRICEP_L = `M72,124 C68,130 64,140 62,154 C60,166 60,176 64,182 C68,188 74,184 76,178 C80,168 80,156 78,142 C76,132 74,126 72,124 Z`;
// Triceps — right
const BACK_TRICEP_R = `M168,124 C172,130 176,140 178,154 C180,166 180,176 176,182 C172,188 166,184 164,178 C160,168 160,156 162,142 C164,132 166,126 168,124 Z`;

// Lower back (erector spinae) — two vertical bands flanking spine
const BACK_LOWER_BACK_L = `M108,168 C106,178 106,190 106,202 C106,214 108,224 110,232 L118,234 C118,226 118,214 118,200 C118,186 116,174 114,168 Z`;
const BACK_LOWER_BACK_R = `M132,168 C134,178 134,190 134,202 C134,214 132,224 130,232 L122,234 C122,226 122,214 122,200 C122,186 124,174 126,168 Z`;

// Glutes — left
const BACK_GLUTE_L = `M86,236 C84,242 84,250 86,258 C88,266 92,272 98,276 C104,280 110,278 114,274 C118,270 120,264 120,256 C120,248 118,242 114,238 C108,234 96,234 86,236 Z`;
// Glutes — right
const BACK_GLUTE_R = `M154,236 C156,242 156,250 154,258 C152,266 148,272 142,276 C136,280 130,278 126,274 C122,270 120,264 120,256 C120,248 122,242 126,238 C132,234 144,234 154,236 Z`;

// Hamstrings — left
const BACK_HAM_L = `M86,280 C84,290 82,304 82,320 C82,336 84,348 88,356 L100,358 C102,350 102,338 102,324 C102,308 100,294 98,282 Z`;
// Hamstrings — right
const BACK_HAM_R = `M154,280 C156,290 158,304 158,320 C158,336 156,348 152,356 L140,358 C138,350 138,338 138,324 C138,308 140,294 142,282 Z`;

// Calves (gastrocnemius) — left
const BACK_CALF_L = `M88,362 C86,370 84,382 84,396 C84,410 86,422 90,432 C92,438 96,440 98,436 C100,430 100,420 100,408 C100,392 98,378 96,368 C94,362 92,360 88,362 Z`;
// Calves — right
const BACK_CALF_R = `M152,362 C154,370 156,382 156,396 C156,410 154,422 150,432 C148,438 144,440 142,436 C140,430 140,420 140,408 C140,392 142,378 144,368 C146,362 148,360 152,362 Z`;

// --------------- Back Anatomical Details ---------------

function backAnatomyDetails() {
  return `
    <!-- Spine — vertebral bumps -->
    <line x1="120" y1="62" x2="120" y2="234" stroke="${COLORS.spineDetail}" stroke-width="1.2" stroke-opacity="0.5" stroke-linecap="round"/>
    <!-- Vertebral processes -->
    ${[72, 82, 92, 102, 112, 122, 132, 142, 152, 162, 172, 182, 192, 202, 212, 222]
      .map(
        (y) =>
          `<ellipse cx="120" cy="${y}" rx="2.5" ry="1.8" fill="${COLORS.spineDetail}" fill-opacity="0.4"/>`
      )
      .join("\n    ")}

    <!-- Scapula (shoulder blade) outlines — left -->
    <path d="M96,96 C92,104 90,114 92,124 C94,132 100,136 106,134 C110,132 112,126 112,118 C112,108 108,98 102,94 Z" fill="none" stroke="${COLORS.anatomyDetail}" stroke-width="0.5" stroke-opacity="0.4"/>
    <!-- Scapula — right -->
    <path d="M144,96 C148,104 150,114 148,124 C146,132 140,136 134,134 C130,132 128,126 128,118 C128,108 132,98 138,94 Z" fill="none" stroke="${COLORS.anatomyDetail}" stroke-width="0.5" stroke-opacity="0.4"/>

    <!-- Sacrum triangle at base of spine -->
    <path d="M114,228 L120,242 L126,228 Z" fill="none" stroke="${COLORS.anatomyDetail}" stroke-width="0.5" stroke-opacity="0.4"/>

    <!-- Gluteal fold lines -->
    <path d="M88,274 C96,278 106,280 114,278" fill="none" stroke="${COLORS.anatomyDetail}" stroke-width="0.4" stroke-opacity="0.3" stroke-linecap="round"/>
    <path d="M152,274 C144,278 134,280 126,278" fill="none" stroke="${COLORS.anatomyDetail}" stroke-width="0.4" stroke-opacity="0.3" stroke-linecap="round"/>

    <!-- Back knee crease -->
    <path d="M86,356 C90,360 96,362 102,360" fill="none" stroke="${COLORS.anatomyDetail}" stroke-width="0.4" stroke-opacity="0.3" stroke-linecap="round"/>
    <path d="M154,356 C150,360 144,362 138,360" fill="none" stroke="${COLORS.anatomyDetail}" stroke-width="0.4" stroke-opacity="0.3" stroke-linecap="round"/>

    <!-- Achilles tendon hints -->
    <line x1="92" y1="438" x2="92" y2="460" stroke="${COLORS.anatomyDetail}" stroke-width="0.4" stroke-opacity="0.3"/>
    <line x1="148" y1="438" x2="148" y2="460" stroke="${COLORS.anatomyDetail}" stroke-width="0.4" stroke-opacity="0.3"/>
  `;
}

// --------------- Back Fiber Lines ---------------

function backTrapFibers() {
  return fiberLines([
    // Upper traps — fibers angle up from spine to shoulders
    "M120,68 C114,72 106,78 96,86",
    "M120,68 C126,72 134,78 144,86",
    // Middle traps — horizontal fibers
    "M120,84 C112,86 104,90 96,96",
    "M120,84 C128,86 136,90 144,96",
    // Lower traps — fibers angle down from spine to scapula
    "M120,100 C114,102 108,106 102,110",
    "M120,100 C126,102 132,106 138,110",
  ]);
}

function backLatFibers() {
  return fiberLines([
    // Left lat — fibers sweep from spine outward-downward
    "M112,120 C106,130 98,142 92,156",
    "M114,134 C108,146 100,160 94,174",
    "M114,150 C110,162 104,176 98,190",
    "M114,166 C110,178 106,192 102,204",
    // Right lat
    "M128,120 C134,130 142,142 148,156",
    "M126,134 C132,146 140,160 146,174",
    "M126,150 C130,162 136,176 142,190",
    "M126,166 C130,178 134,192 138,204",
  ]);
}

function backGluteFibers() {
  return fiberLines([
    // Left glute — radiating fibers
    "M96,240 C98,248 100,258 104,268",
    "M90,244 C92,254 96,264 100,272",
    "M108,238 C108,250 110,262 114,272",
    // Right glute
    "M144,240 C142,248 140,258 136,268",
    "M150,244 C148,254 144,264 140,272",
    "M132,238 C132,250 130,262 126,272",
  ]);
}

function backHamFibers() {
  return fiberLines([
    // Left hamstring — vertical striations
    "M90,284 C88,300 88,318 88,340 C88,350 90,354 90,356",
    "M96,282 C94,300 94,320 96,340 C98,350 98,356 98,358",
    // Right hamstring
    "M150,284 C152,300 152,318 152,340 C152,350 150,354 150,356",
    "M144,282 C146,300 146,320 144,340 C142,350 142,356 142,358",
  ]);
}

function backCalfFibers() {
  return fiberLines([
    // Left calf — converging fibers (gastrocnemius shape)
    "M90,366 C88,380 86,396 88,414 C90,426 92,434 94,438",
    "M96,364 C96,380 96,398 96,416 C96,428 96,436 96,438",
    // Right calf
    "M150,366 C152,380 154,396 152,414 C150,426 148,434 146,438",
    "M144,364 C144,380 144,398 144,416 C144,428 144,436 144,438",
  ]);
}

function backLowerBackFibers() {
  return fiberLines([
    // Left erector spinae — vertical fibers
    "M110,172 C110,186 110,200 110,216 C110,226 112,232 112,234",
    "M114,170 C114,184 114,198 114,214 C114,226 116,232 116,234",
    // Right erector spinae
    "M130,172 C130,186 130,200 130,216 C130,226 128,232 128,234",
    "M126,170 C126,184 126,198 126,214 C126,226 124,232 124,234",
  ]);
}

function backTricepFibers() {
  return fiberLines([
    // Left tricep
    "M72,130 C70,142 66,158 64,170 C62,178 64,184 66,184",
    "M76,128 C74,142 72,158 72,172 C72,180 74,184 76,182",
    // Right tricep
    "M168,130 C170,142 174,158 176,170 C178,178 176,184 174,184",
    "M164,128 C166,142 168,158 168,172 C168,180 166,184 164,182",
  ]);
}

// ===============================================================
// Head silhouette (shared by both views)
// ===============================================================

function headSVG() {
  return `
    <!-- Head -->
    <ellipse cx="120" cy="36" rx="22" ry="24" fill="#111122" stroke="${COLORS.bodyOutline}" stroke-width="${COLORS.bodyOutlineWidth}"/>
    <!-- Neck -->
    <rect x="110" y="56" width="20" height="16" rx="4" fill="#111122" stroke="${COLORS.bodyOutline}" stroke-width="${COLORS.bodyOutlineWidth * 0.8}"/>
  `;
}

// ===============================================================
// Body outline renderer
// ===============================================================

function renderBodyOutline(outlinePath) {
  return `<path d="${outlinePath}" fill="none" stroke="${COLORS.bodyOutline}" stroke-width="${COLORS.bodyOutlineWidth}" stroke-linecap="round" stroke-linejoin="round" fill-rule="evenodd"/>`;
}

// Torso fill (behind muscles, subtle body shape)
function torsoFillFront() {
  return `<path d="M82,86 C78,92 76,100 78,112 C80,128 82,148 82,168 C82,190 82,210 82,230 L84,242 L156,242 L158,230 C158,210 158,190 158,168 C158,148 160,128 162,112 C164,100 162,92 158,86 Z" fill="#0e0e20" stroke="none"/>`;
}

function torsoFillBack() {
  return `<path d="M82,86 C78,92 76,100 78,112 C80,128 82,148 82,168 C82,190 82,210 82,230 L84,242 L156,242 L158,230 C158,210 158,190 158,168 C158,148 160,128 162,112 C164,100 162,92 158,86 Z" fill="#0e0e20" stroke="none"/>`;
}

// Arms fill (behind arm muscles)
function armsFill() {
  return `
    <!-- Left arm -->
    <path d="M68,88 C62,96 56,110 52,128 C48,148 46,168 46,188 C46,200 46,214 46,228 L48,238 L58,238 C62,224 66,208 68,192 C72,172 74,152 74,136 C76,120 78,108 80,96 Z" fill="#0e0e20" stroke="none"/>
    <!-- Right arm -->
    <path d="M172,88 C178,96 184,110 188,128 C192,148 194,168 194,188 C194,200 194,214 194,228 L192,238 L182,238 C178,224 174,208 172,192 C168,172 166,152 166,136 C164,120 162,108 160,96 Z" fill="#0e0e20" stroke="none"/>
  `;
}

// Legs fill (behind leg muscles)
function legsFill() {
  return `
    <!-- Left leg -->
    <path d="M82,242 C80,260 80,282 82,304 C84,324 88,340 92,356 C92,376 92,400 92,420 C92,440 90,456 86,470 L80,490 L108,492 C106,478 104,462 102,446 C100,426 100,404 100,382 C102,360 102,340 104,322 C106,302 106,280 104,260 L102,242 Z" fill="#0e0e20" stroke="none"/>
    <!-- Right leg -->
    <path d="M158,242 C160,260 160,282 158,304 C156,324 152,340 148,356 C148,376 148,400 148,420 C148,440 150,456 154,470 L160,490 L132,492 C134,478 136,462 138,446 C140,426 140,404 140,382 C138,360 138,340 136,322 C134,302 134,280 136,260 L138,242 Z" fill="#0e0e20" stroke="none"/>
  `;
}

// Hands/feet outlines
function extremities() {
  return `
    <!-- Left hand -->
    <path d="M46,236 C44,242 42,248 42,252 C42,256 44,258 48,258 C50,256 52,252 52,248 C52,244 50,240 48,238" fill="#111122" stroke="${COLORS.bodyOutline}" stroke-width="0.5"/>
    <!-- Right hand -->
    <path d="M194,236 C196,242 198,248 198,252 C198,256 196,258 192,258 C190,256 188,252 188,248 C188,244 190,240 192,238" fill="#111122" stroke="${COLORS.bodyOutline}" stroke-width="0.5"/>
    <!-- Left foot -->
    <path d="M80,490 C76,492 74,494 74,496 L112,496 C112,494 110,492 108,492" fill="#111122" stroke="${COLORS.bodyOutline}" stroke-width="0.5"/>
    <!-- Right foot -->
    <path d="M200,490 C204,492 206,494 206,496 L168,496 C168,494 170,492 172,492" fill="#111122" stroke="${COLORS.bodyOutline}" stroke-width="0.5"/>
  `;
}

// ===============================================================
// PUBLIC API — renderFrontBodySVG
// ===============================================================

/**
 * Render front-view anatomical body diagram with highlighted muscles.
 *
 * @param {Object} activeMuscles — e.g. { chest: { level: "primary", status: "good" }, biceps: { level: "secondary", status: "good" } }
 * @returns {string} Complete SVG string
 */
export function renderFrontBodySVG(activeMuscles = {}) {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 500" width="100%" height="100%" style="background:transparent;">
${SVG_DEFS}

<!-- Background body fills -->
${torsoFillFront()}
${armsFill()}
${legsFill()}

<!-- Muscle regions (rendered back-to-front for correct layering) -->
<g class="muscles-front">
  <!-- Core (behind chest) -->
  ${musclePathTag("core", FRONT_CORE.trim(), activeMuscles)}
  ${frontCoreFibers()}

  <!-- Quadriceps -->
  ${musclePathTag("quadriceps", FRONT_QUAD_L.trim(), activeMuscles)}
  ${musclePathTag("quadriceps", FRONT_QUAD_R.trim(), activeMuscles)}
  ${frontQuadFibers()}

  <!-- Calves -->
  ${musclePathTag("calves", FRONT_CALF_L.trim(), activeMuscles)}
  ${musclePathTag("calves", FRONT_CALF_R.trim(), activeMuscles)}
  ${frontCalfFibers()}

  <!-- Forearms -->
  ${musclePathTag("forearms", FRONT_FOREARM_L_FULL.trim(), activeMuscles)}
  ${musclePathTag("forearms", FRONT_FOREARM_R_FULL.trim(), activeMuscles)}

  <!-- Chest -->
  ${musclePathTag("chest", FRONT_CHEST_L.trim(), activeMuscles)}
  ${musclePathTag("chest", FRONT_CHEST_R.trim(), activeMuscles)}
  ${frontChestFibers()}

  <!-- Shoulders -->
  ${musclePathTag("shoulders", FRONT_SHOULDER_L.trim(), activeMuscles)}
  ${musclePathTag("shoulders", FRONT_SHOULDER_R.trim(), activeMuscles)}

  <!-- Biceps -->
  ${musclePathTag("biceps", FRONT_BICEP_L.trim(), activeMuscles)}
  ${musclePathTag("biceps", FRONT_BICEP_R.trim(), activeMuscles)}
  ${frontBicepFibers()}
</g>

<!-- Anatomical detail lines (clavicles, ribs, kneecaps, etc.) -->
<g class="anatomy-details">
  ${frontAnatomyDetails()}
</g>

<!-- Head and body outline (on top) -->
${headSVG()}
${renderBodyOutline(FRONT_BODY_OUTLINE.trim())}
${extremities()}

<!-- View label -->
<text x="120" y="14" text-anchor="middle" fill="rgba(255,255,255,0.2)" font-size="8" font-family="'Noto Sans KR', sans-serif" font-weight="600">FRONT</text>
</svg>`;

  return svg.trim();
}

// ===============================================================
// PUBLIC API — renderBackBodySVG
// ===============================================================

/**
 * Render back-view anatomical body diagram with highlighted muscles.
 *
 * @param {Object} activeMuscles — e.g. { lats: { level: "primary", status: "good" }, traps: { level: "secondary", status: "good" } }
 * @returns {string} Complete SVG string
 */
export function renderBackBodySVG(activeMuscles = {}) {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 500" width="100%" height="100%" style="background:transparent;">
${SVG_DEFS}

<!-- Background body fills -->
${torsoFillBack()}
${armsFill()}
${legsFill()}

<!-- Muscle regions (rendered back-to-front for correct layering) -->
<g class="muscles-back">
  <!-- Traps (deepest torso layer in back view) -->
  ${musclePathTag("traps", BACK_TRAPS.trim(), activeMuscles)}
  ${backTrapFibers()}

  <!-- Lats -->
  ${musclePathTag("lats", BACK_LAT_L.trim(), activeMuscles)}
  ${musclePathTag("lats", BACK_LAT_R.trim(), activeMuscles)}
  ${backLatFibers()}

  <!-- Lower back (erector spinae) -->
  ${musclePathTag("lowerBack", BACK_LOWER_BACK_L.trim(), activeMuscles)}
  ${musclePathTag("lowerBack", BACK_LOWER_BACK_R.trim(), activeMuscles)}
  ${backLowerBackFibers()}

  <!-- Glutes -->
  ${musclePathTag("glutes", BACK_GLUTE_L.trim(), activeMuscles)}
  ${musclePathTag("glutes", BACK_GLUTE_R.trim(), activeMuscles)}
  ${backGluteFibers()}

  <!-- Hamstrings -->
  ${musclePathTag("hamstrings", BACK_HAM_L.trim(), activeMuscles)}
  ${musclePathTag("hamstrings", BACK_HAM_R.trim(), activeMuscles)}
  ${backHamFibers()}

  <!-- Calves -->
  ${musclePathTag("calves", BACK_CALF_L.trim(), activeMuscles)}
  ${musclePathTag("calves", BACK_CALF_R.trim(), activeMuscles)}
  ${backCalfFibers()}

  <!-- Shoulders (posterior deltoid) -->
  ${musclePathTag("shoulders", BACK_SHOULDER_L.trim(), activeMuscles)}
  ${musclePathTag("shoulders", BACK_SHOULDER_R.trim(), activeMuscles)}

  <!-- Triceps -->
  ${musclePathTag("triceps", BACK_TRICEP_L.trim(), activeMuscles)}
  ${musclePathTag("triceps", BACK_TRICEP_R.trim(), activeMuscles)}
  ${backTricepFibers()}
</g>

<!-- Anatomical detail lines (spine, scapulae, sacrum, etc.) -->
<g class="anatomy-details">
  ${backAnatomyDetails()}
</g>

<!-- Head and body outline (on top) -->
${headSVG()}
${renderBodyOutline(BACK_BODY_OUTLINE.trim())}
${extremities()}

<!-- View label -->
<text x="120" y="14" text-anchor="middle" fill="rgba(255,255,255,0.2)" font-size="8" font-family="'Noto Sans KR', sans-serif" font-weight="600">BACK</text>
</svg>`;

  return svg.trim();
}
