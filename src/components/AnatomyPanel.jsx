import { useState, useMemo } from "react";
import { EXERCISE_DB } from "../data/exercises";
import { MUSCLE_REGIONS } from "../data/muscles";
import { getMuscleDisplayColor, getMuscleQuality, CORRECT_COLOR, INCORRECT_COLOR } from "../lib/poseAnalyzer";

// ── Determine best view (front/back) based on exercise's primary muscles ──
const BACK_MUSCLES = new Set(["lats", "traps", "lowerBack", "hamstrings", "glutes"]);

function bestView(exerciseKey) {
  const ex = EXERCISE_DB[exerciseKey];
  if (!ex) return "front";
  const primaryKeys = Object.keys(ex.primary);
  const backCount = primaryKeys.filter((m) => BACK_MUSCLES.has(m)).length;
  return backCount > primaryKeys.length / 2 ? "back" : "front";
}

// ── SVG Paths for FRONT view ── viewBox 0 0 260 520
const FRONT_PATHS = {
  // Left trapezius (upper, visible from front)
  traps: [
    "M105,82 L120,72 L130,72 L130,85 L113,95 Z",
    "M155,82 L140,72 L130,72 L130,85 L147,95 Z",
  ],
  // Pectoralis major
  chest: [
    "M96,108 C96,97 110,92 128,97 L128,120 C120,130 102,128 96,118 Z",
    "M164,108 C164,97 150,92 132,97 L132,120 C140,130 158,128 164,118 Z",
  ],
  // Front deltoids
  shoulders: [
    "M88,90 C78,88 72,96 72,110 L80,118 L96,108 L96,96 Z",
    "M172,90 C182,88 188,96 188,110 L180,118 L164,108 L164,96 Z",
  ],
  // Biceps
  biceps: [
    "M72,118 C66,122 62,140 62,158 C62,168 66,172 72,168 L78,128 Z",
    "M188,118 C194,122 198,140 198,158 C198,168 194,172 188,168 L182,128 Z",
  ],
  // Triceps (partially visible from front)
  triceps: [
    "M78,120 C82,124 84,140 84,155 C84,164 80,168 76,165 L72,130 Z",
    "M182,120 C178,124 176,140 176,155 C176,164 180,168 184,165 L188,130 Z",
  ],
  // Forearms
  forearms: [
    "M58,172 C54,178 50,198 52,218 C54,230 60,232 64,225 L68,180 Z",
    "M202,172 C206,178 210,198 208,218 C206,230 200,232 196,225 L192,180 Z",
  ],
  // Rectus abdominis + obliques = core
  core: [
    "M118,124 L142,124 L142,210 L118,210 Z",
  ],
  // Obliques (visible as part of core from front)
  lats: [
    "M96,120 L116,124 L114,195 L100,188 C96,175 94,150 96,120 Z",
    "M164,120 L144,124 L146,195 L160,188 C164,175 166,150 164,120 Z",
  ],
  // Quadriceps
  quadriceps: [
    "M100,215 C96,220 90,250 88,290 C88,310 94,318 102,314 L110,225 Z",
    "M160,215 C164,220 170,250 172,290 C172,310 166,318 158,314 L150,225 Z",
  ],
  // Adductors / inner thigh
  hamstrings: [
    "M110,218 C112,222 114,250 114,285 C114,305 110,312 106,308 L102,225 Z",
    "M150,218 C148,222 146,250 146,285 C146,305 150,312 154,308 L158,225 Z",
  ],
  glutes: [
    "M102,205 C100,198 108,195 118,210 L118,218 L102,218 Z",
    "M158,205 C160,198 152,195 142,210 L142,218 L158,218 Z",
  ],
  calves: [
    "M86,324 C84,330 80,360 80,390 C80,410 86,420 94,416 L98,340 Z",
    "M174,324 C176,330 180,360 180,390 C180,410 174,420 166,416 L162,340 Z",
  ],
  lowerBack: [],
};

// ── SVG Paths for BACK view ── viewBox 0 0 260 520
const BACK_PATHS = {
  // Trapezius (large diamond from neck to mid-back)
  traps: [
    "M130,65 L168,90 L162,100 L130,85 Z",
    "M130,65 L92,90 L98,100 L130,85 Z",
    "M130,85 L160,100 L148,148 L130,165 Z",
    "M130,85 L100,100 L112,148 L130,165 Z",
  ],
  // Latissimus dorsi (wide wing shape)
  lats: [
    "M100,110 L90,125 C85,145 84,170 88,195 L110,200 L115,165 L108,130 Z",
    "M160,110 L170,125 C175,145 176,170 172,195 L150,200 L145,165 L152,130 Z",
  ],
  // Rear deltoids
  shoulders: [
    "M86,88 C76,86 70,96 70,110 L78,118 L95,108 Z",
    "M174,88 C184,86 190,96 190,110 L182,118 L165,108 Z",
  ],
  // Infraspinatus / Teres (rotator cuff area)
  chest: [
    "M100,100 L115,105 L115,130 L102,128 C98,120 98,110 100,100 Z",
    "M160,100 L145,105 L145,130 L158,128 C162,120 162,110 160,100 Z",
  ],
  // Triceps
  triceps: [
    "M70,118 C66,125 62,145 62,165 C62,175 68,178 74,172 L80,128 Z",
    "M190,118 C194,125 198,145 198,165 C198,175 192,178 186,172 L180,128 Z",
  ],
  // Forearms
  forearms: [
    "M56,178 C52,185 48,205 50,225 C52,235 58,238 62,230 L66,185 Z",
    "M204,178 C208,185 212,205 210,225 C208,235 202,238 198,230 L194,185 Z",
  ],
  biceps: [],
  // Erector spinae (two columns along spine)
  core: [
    "M122,168 L130,168 L130,220 L122,220 Z",
    "M130,168 L138,168 L138,220 L130,220 Z",
  ],
  // Lower back
  lowerBack: [
    "M108,195 L122,200 L122,225 L110,225 C105,215 105,205 108,195 Z",
    "M152,195 L138,200 L138,225 L150,225 C155,215 155,205 152,195 Z",
  ],
  // Glutes
  glutes: [
    "M95,228 C90,225 90,235 92,255 C94,272 105,280 118,278 L120,245 L112,230 Z",
    "M165,228 C170,225 170,235 168,255 C166,272 155,280 142,278 L140,245 L148,230 Z",
  ],
  // Hamstrings
  hamstrings: [
    "M94,282 C90,290 86,320 86,350 C86,365 92,370 100,366 L108,295 Z",
    "M166,282 C170,290 174,320 174,350 C174,365 168,370 160,366 L152,295 Z",
  ],
  quadriceps: [],
  // Calves
  calves: [
    "M84,375 C82,382 78,405 78,425 C78,440 84,448 92,444 L96,388 Z",
    "M176,375 C178,382 182,405 182,425 C182,440 176,448 168,444 L164,388 Z",
  ],
};

// ── Body Outlines ──
const FRONT_OUTLINE = "M130,22 C148,22 156,36 156,50 C156,66 146,76 140,78 L140,84 L168,88 C182,92 192,102 192,114 C196,126 200,142 200,162 C204,178 212,198 210,220 C208,236 198,240 192,230 L186,205 L178,180 L172,155 L168,195 L166,218 C168,238 172,268 174,298 C178,328 180,355 182,395 C182,425 176,452 166,452 L158,440 L148,380 L140,430 L130,470 L120,430 L112,380 L102,440 L94,452 C84,452 78,425 78,395 C80,355 82,328 86,298 C88,268 92,238 94,218 L92,195 L88,155 L82,180 L74,205 L68,230 C62,240 52,236 50,220 C48,198 56,178 60,162 C60,142 64,126 68,114 C68,102 78,92 92,88 L120,84 L120,78 C114,76 104,66 104,50 C104,36 112,22 130,22 Z";
const BACK_OUTLINE = "M130,22 C148,22 156,36 156,50 C156,66 146,76 140,78 L140,84 L170,88 C184,92 194,102 194,114 C198,128 202,148 202,168 C206,185 214,205 212,228 C210,242 200,246 194,236 L188,210 L180,185 L174,160 L170,200 L168,225 C170,245 174,275 176,308 C180,340 182,368 184,405 C184,435 178,460 168,460 L160,448 L150,385 L142,440 L130,480 L118,440 L110,385 L100,448 L92,460 C82,460 76,435 76,405 C78,368 80,340 84,308 C86,275 90,245 92,225 L90,200 L86,160 L80,185 L72,210 L66,236 C60,246 50,242 48,228 C46,205 54,185 58,168 C58,148 62,128 66,114 C66,102 76,92 90,88 L120,84 L120,78 C114,76 104,66 104,50 C104,36 112,22 130,22 Z";

// ── Spine detail for back view ──
const SPINE_PATH = "M130,78 L130,240";
const SPINE_SEGMENTS = Array.from({ length: 18 }, (_, i) => {
  const y = 80 + i * 9;
  return `M127,${y} L133,${y}`;
}).join(" ");

// ── Muscle fiber detail lines (subtle texture) ──
function fiberLines(paths, direction = "vertical") {
  // Return empty for now — we use solid fills like the reference
  return [];
}

const INACTIVE_COLOR = "rgba(180,160,140,0.15)";
const INACTIVE_STROKE = "rgba(140,120,100,0.25)";

// Default colors when no pose quality data
const DEFAULT_PRIMARY = "#E53935";
const DEFAULT_SECONDARY = "#FFC107";

export default function AnatomyPanel({ exerciseKey, brandColor, poseQuality }) {
  const autoView = bestView(exerciseKey);
  const [view, setView] = useState(null); // null = auto
  const activeView = view || autoView;

  const exercise = EXERCISE_DB[exerciseKey];
  const primarySet = useMemo(() => new Set(exercise?.primary || []), [exerciseKey]);
  const secondarySet = useMemo(() => new Set(exercise?.secondary || []), [exerciseKey]);
  const muscleQualityMap = poseQuality ? getMuscleQuality(poseQuality) : null;

  const paths = activeView === "back" ? BACK_PATHS : FRONT_PATHS;
  const outline = activeView === "back" ? BACK_OUTLINE : FRONT_OUTLINE;

  const muscleKeys = Object.keys(paths);

  // Muscle label positions (centroid-based) for active muscles
  const labels = useMemo(() => {
    if (!exercise) return [];
    const result = [];
    const labelPositions = {
      // Front view label anchors
      front: {
        traps: { x: 130, y: 78 }, chest: { x: 130, y: 108 },
        shoulders: { x: 60, y: 98 }, biceps: { x: 55, y: 145 },
        triceps: { x: 195, y: 145 }, forearms: { x: 48, y: 200 },
        core: { x: 130, y: 168 }, lats: { x: 96, y: 155 },
        quadriceps: { x: 88, y: 270 }, hamstrings: { x: 168, y: 270 },
        glutes: { x: 130, y: 208 }, calves: { x: 82, y: 380 },
        lowerBack: { x: 130, y: 195 },
      },
      // Back view label anchors
      back: {
        traps: { x: 130, y: 100 }, lats: { x: 92, y: 155 },
        shoulders: { x: 60, y: 98 }, triceps: { x: 58, y: 148 },
        forearms: { x: 48, y: 208 }, chest: { x: 130, y: 115 },
        core: { x: 130, y: 195 }, lowerBack: { x: 130, y: 218 },
        glutes: { x: 130, y: 255 }, hamstrings: { x: 92, y: 330 },
        calves: { x: 82, y: 415 }, quadriceps: { x: 130, y: 310 },
        biceps: { x: 130, y: 145 },
      },
    };

    const anchors = labelPositions[activeView] || labelPositions.front;
    for (const key of [...Object.keys(exercise.primary || {}), ...Object.keys(exercise.secondary || {})]) {
      const pathArr = paths[key];
      if (!pathArr || (Array.isArray(pathArr) && pathArr.length === 0)) continue;
      if (result.some((r) => r.key === key)) continue;
      const anchor = anchors[key];
      if (!anchor) continue;
      result.push({
        key,
        label: MUSCLE_REGIONS[key]?.label || key,
        isPrimary: primarySet.has(key),
        ...anchor,
      });
    }
    return result;
  }, [exerciseKey, activeView]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      {/* View toggle */}
      <div style={{
        display: "flex", gap: 4, padding: 3,
        background: "rgba(255,255,255,0.05)", borderRadius: 8,
      }}>
        {["front", "back"].map((v) => (
          <button
            key={v}
            onClick={() => setView(v === autoView ? null : v)}
            style={{
              padding: "4px 14px", borderRadius: 6, border: "none", cursor: "pointer",
              background: activeView === v ? (brandColor || "#00E5FF") + "22" : "transparent",
              color: activeView === v ? (brandColor || "#00E5FF") : "rgba(255,255,255,0.4)",
              fontSize: 11, fontWeight: activeView === v ? 700 : 400,
              outline: activeView === v ? `1px solid ${brandColor || "#00E5FF"}30` : "none",
            }}
          >
            {v === "front" ? "전면" : "후면"}
            {v === autoView && !view && " (자동)"}
          </button>
        ))}
      </div>

      {/* SVG Anatomy Diagram */}
      <svg viewBox="0 0 260 500" style={{ width: "100%", maxWidth: 260, height: "auto" }}>
        <defs>
          {/* Glow filter for primary muscles */}
          <filter id="primaryGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Subtle inner shadow for muscle depth */}
          <filter id="muscleDepth">
            <feGaussianBlur stdDeviation="2" in="SourceAlpha" result="shadow" />
            <feOffset dx="1" dy="1" in="shadow" result="offset" />
            <feComposite in="SourceGraphic" in2="offset" operator="over" />
          </filter>
        </defs>

        {/* Background body outline */}
        <path
          d={outline}
          fill="rgba(200,185,170,0.08)"
          stroke="rgba(200,185,170,0.3)"
          strokeWidth="1.2"
        />

        {/* Spine for back view */}
        {activeView === "back" && (
          <g opacity="0.2">
            <path d={SPINE_PATH} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none" />
            <path d={SPINE_SEGMENTS} stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" />
          </g>
        )}

        {/* Muscle fiber detail lines for inactive muscles */}
        {muscleKeys.map((key) => {
          const pathArr = Array.isArray(paths[key]) ? paths[key] : (paths[key] ? [paths[key]] : []);
          if (pathArr.length === 0) return null;
          if (primarySet.has(key) || secondarySet.has(key)) return null;
          return pathArr.map((d, i) => (
            <path
              key={`inactive-${key}-${i}`}
              d={d}
              fill={INACTIVE_COLOR}
              stroke={INACTIVE_STROKE}
              strokeWidth="0.5"
            />
          ));
        })}

        {/* Secondary muscles */}
        {muscleKeys.map((key) => {
          if (!secondarySet.has(key) || primarySet.has(key)) return null;
          const pathArr = Array.isArray(paths[key]) ? paths[key] : (paths[key] ? [paths[key]] : []);
          if (pathArr.length === 0) return null;
          const mq = muscleQualityMap?.[key];
          const color = mq ? getMuscleDisplayColor(mq.score) : DEFAULT_SECONDARY;
          return pathArr.map((d, i) => (
            <path
              key={`secondary-${key}-${i}`}
              d={d}
              fill={color}
              opacity="0.75"
              stroke={color}
              strokeWidth="0.8"
              strokeOpacity="0.5"
            />
          ));
        })}

        {/* Primary muscles (on top) */}
        {muscleKeys.map((key) => {
          if (!primarySet.has(key)) return null;
          const pathArr = Array.isArray(paths[key]) ? paths[key] : (paths[key] ? [paths[key]] : []);
          if (pathArr.length === 0) return null;
          const mq = muscleQualityMap?.[key];
          const color = mq ? getMuscleDisplayColor(mq.score) : DEFAULT_PRIMARY;
          return pathArr.map((d, i) => (
            <path
              key={`primary-${key}-${i}`}
              d={d}
              fill={color}
              opacity="0.85"
              stroke={color}
              strokeWidth="0.8"
              strokeOpacity="0.6"
              filter="url(#primaryGlow)"
            />
          ));
        })}

        {/* Muscle labels with leader lines (quality-colored) */}
        {labels.map(({ key, label, isPrimary, x, y }) => {
          const isRight = x > 130;
          const labelX = isRight ? 210 : 18;
          const textAnchor = isRight ? "start" : "end";
          const mq = muscleQualityMap?.[key];
          const color = mq
            ? getMuscleDisplayColor(mq.score)
            : (isPrimary ? DEFAULT_PRIMARY : DEFAULT_SECONDARY);
          const statusLabel = mq
            ? (mq.isCorrect ? (isPrimary ? "주동근 ✓" : "보조근 ✓") : (isPrimary ? "주동근 ✗" : "보조근 ✗"))
            : (isPrimary ? "주동근" : "보조근");
          return (
            <g key={`label-${key}`}>
              <line
                x1={x} y1={y}
                x2={labelX + (isRight ? -2 : 2)} y2={y}
                stroke={color}
                strokeWidth="0.8"
                strokeDasharray={isPrimary ? "none" : "2,2"}
                opacity="0.6"
              />
              <circle cx={x} cy={y} r="2.5" fill={color} />
              <text
                x={labelX} y={y + 1}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                fontSize="9"
                fontWeight={isPrimary ? "700" : "500"}
                fontFamily="'Pretendard', sans-serif"
                fill={isPrimary ? "#fff" : "rgba(255,255,255,0.6)"}
              >
                {label}
              </text>
              <text
                x={labelX} y={y + 11}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                fontSize="6.5"
                fontWeight="700"
                fontFamily="'Pretendard', sans-serif"
                fill={color}
                opacity="0.8"
              >
                {statusLabel}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Overall pose score display */}
      {poseQuality && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "12px 0 6px",
          gap: 4,
        }}>
          <div style={{
            fontSize: 36, fontWeight: 800, lineHeight: 1,
            color: poseQuality.score >= 80
              ? CORRECT_COLOR
              : poseQuality.score >= 60
                ? "#FF8C42"
                : INCORRECT_COLOR,
            textShadow: `0 0 16px ${
              poseQuality.score >= 80
                ? CORRECT_COLOR + "66"
                : poseQuality.score >= 60
                  ? "#FF8C42" + "66"
                  : INCORRECT_COLOR + "66"
            }`,
          }}>
            {poseQuality.score}
          </div>
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
            color: "rgba(255,255,255,0.45)",
            textTransform: "uppercase",
          }}>
            FORM SCORE
          </div>
          <div style={{
            marginTop: 4,
            padding: "3px 12px", borderRadius: 10,
            fontSize: 10, fontWeight: 700,
            background: poseQuality.status !== 'bad'
              ? CORRECT_COLOR + "18"
              : INCORRECT_COLOR + "18",
            color: poseQuality.status !== 'bad' ? CORRECT_COLOR : INCORRECT_COLOR,
            border: `1px solid ${poseQuality.status !== 'bad' ? CORRECT_COLOR + "30" : INCORRECT_COLOR + "30"}`,
          }}>
            {poseQuality.status !== 'bad' ? "Good Form" : "Needs Fix"}
          </div>
        </div>
      )}

      {/* Color legend */}
      <div style={{
        display: "flex", gap: 12, justifyContent: "center",
        padding: "6px 0", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: CORRECT_COLOR }} />
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 10 }}>올바른 자세</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: INCORRECT_COLOR }} />
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 10 }}>교정 필요</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: INACTIVE_COLOR, border: `1px solid ${INACTIVE_STROKE}` }} />
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 10 }}>비활성</span>
        </div>
      </div>
    </div>
  );
}
