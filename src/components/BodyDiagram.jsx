import { MUSCLE_REGIONS } from "../data/muscles";
import { EXERCISE_DB } from "../data/exercises";

// Simplified front-view body SVG paths for each muscle group
const BODY_PATHS = {
  // head/neck outline (not a muscle, just for reference)
  _head: "M100,28 C112,28 120,38 120,50 C120,62 112,72 100,72 C88,72 80,62 80,50 C80,38 88,28 100,28Z",
  _neck: "M92,72 L108,72 L108,85 L92,85Z",

  traps: [
    "M72,88 L92,85 L92,100 L65,100Z", // left
    "M108,85 L128,88 L135,100 L108,100Z", // right
  ],
  shoulders: [
    "M55,95 C50,95 45,102 45,112 C45,120 50,125 58,122 L65,100Z", // left
    "M145,95 C150,95 155,102 155,112 C155,120 150,125 142,122 L135,100Z", // right
  ],
  chest: [
    "M68,105 C68,100 82,98 92,105 L92,130 C82,132 68,128 68,105Z", // left
    "M108,105 C118,100 132,100 132,105 C132,128 118,132 108,130 L108,105Z", // right
  ],
  biceps: [
    "M48,125 C44,125 40,135 40,150 C40,160 44,165 50,162 L55,130Z", // left
    "M152,125 C156,125 160,135 160,150 C160,160 156,165 150,162 L145,130Z", // right
  ],
  triceps: [
    "M55,125 C58,125 60,135 60,148 C60,158 57,162 53,160 L50,130Z", // left
    "M145,125 C142,125 140,135 140,148 C140,158 143,162 147,160 L150,130Z", // right
  ],
  forearms: [
    "M38,165 C35,165 32,180 34,200 C36,210 42,212 44,205 L46,170Z", // left
    "M162,165 C165,165 168,180 166,200 C164,210 158,212 156,205 L154,170Z", // right
  ],
  lats: [
    "M68,115 L65,105 L60,130 L65,150 L72,145Z", // left
    "M132,115 L135,105 L140,130 L135,150 L128,145Z", // right
  ],
  core: "M82,132 L118,132 L116,180 L84,180Z",
  lowerBack: "M86,155 L114,155 L114,178 L86,178Z",
  glutes: [
    "M78,182 C78,178 88,176 92,182 L92,198 C88,202 78,200 78,182Z", // left
    "M108,182 C112,176 122,178 122,182 C122,200 112,202 108,198 L108,182Z", // right
  ],
  quadriceps: [
    "M76,200 C74,200 70,220 70,250 C70,270 76,275 82,270 L86,205Z", // left
    "M124,200 C126,200 130,220 130,250 C130,270 124,275 118,270 L114,205Z", // right
  ],
  hamstrings: [
    "M82,205 C84,205 88,220 88,248 C88,265 84,268 80,262 L76,210Z", // left
    "M118,205 C116,205 112,220 112,248 C112,265 116,268 120,262 L124,210Z", // right
  ],
  calves: [
    "M72,278 C70,278 68,295 68,315 C68,335 72,345 78,340 L80,285Z", // left
    "M128,278 C130,278 132,295 132,315 C132,335 128,345 122,340 L120,285Z", // right
  ],
};

// body silhouette outline
const BODY_OUTLINE = "M100,28 C115,28 122,40 122,52 C122,65 113,74 108,76 L108,85 L128,88 C140,90 155,98 155,112 C158,120 160,130 160,150 C162,165 168,180 166,200 C164,215 156,218 152,210 L148,190 L140,170 L135,152 L135,180 L132,200 C132,210 130,230 130,250 C130,275 128,290 132,315 C132,340 126,350 118,348 L115,340 L108,310 L105,350 L100,370 L95,350 L92,310 L85,340 L82,348 C74,350 68,340 68,315 C72,290 70,275 70,250 C70,230 68,210 68,200 L65,180 L65,152 L60,170 L52,190 L48,210 C44,218 36,215 34,200 C32,180 38,165 40,150 C40,130 42,120 45,112 C45,98 60,90 72,88 L92,85 L92,76 C87,74 78,65 78,52 C78,40 85,28 100,28Z";

export default function BodyDiagram({ exerciseKey, size = 120 }) {
  const exercise = EXERCISE_DB[exerciseKey];
  if (!exercise) return null;

  const activePrimary = new Set(exercise.primary);
  const activeSecondary = new Set(exercise.secondary);

  function getMuscleColor(key) {
    if (activePrimary.has(key)) return MUSCLE_REGIONS[key]?.color || "#fff";
    if (activeSecondary.has(key)) {
      const c = MUSCLE_REGIONS[key]?.color || "#fff";
      return c + "80"; // 50% opacity for secondary
    }
    return "transparent";
  }

  function renderPaths(key) {
    const paths = BODY_PATHS[key];
    if (!paths) return null;
    const color = getMuscleColor(key);
    if (color === "transparent") return null;

    const pathArray = Array.isArray(paths) ? paths : [paths];
    return pathArray.map((d, i) => (
      <path
        key={`${key}-${i}`}
        d={d}
        fill={color}
        opacity={activePrimary.has(key) ? 0.85 : 0.5}
        filter={activePrimary.has(key) ? "url(#muscleGlow)" : undefined}
      />
    ));
  }

  const muscleKeys = Object.keys(BODY_PATHS).filter((k) => !k.startsWith("_"));

  return (
    <svg
      viewBox="0 0 200 380"
      width={size}
      height={size * 1.9}
      style={{ display: "block" }}
    >
      <defs>
        <filter id="muscleGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* body outline */}
      <path
        d={BODY_OUTLINE}
        fill="rgba(255,255,255,0.06)"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1.5"
      />

      {/* muscle regions */}
      {muscleKeys.map((key) => renderPaths(key))}
    </svg>
  );
}
