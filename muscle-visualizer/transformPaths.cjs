// Transform react-native-body-highlighter SVG paths to our 240x500 viewBox
// Preserves left/right/common separation for per-side editing
const fs = require('fs');

const SCALE = 0.345;
const FRONT_TX = -7, FRONT_TY = 7;
const BACK_TX = -742, BACK_TY = 7;

function tokenize(d) {
  const tokens = [];
  const re = /([A-Za-z])|([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g;
  let m;
  while ((m = re.exec(d)) !== null) {
    if (m[1]) tokens.push({ type: 'cmd', value: m[1] });
    else tokens.push({ type: 'num', value: parseFloat(m[2]) });
  }
  return tokens;
}

const CMD_PARAMS = {
  M: ['x','y'], L: ['x','y'], T: ['x','y'],
  m: ['x','y'], l: ['x','y'], t: ['x','y'],
  H: ['x'], h: ['x'], V: ['y'], v: ['y'],
  C: ['x','y','x','y','x','y'], c: ['x','y','x','y','x','y'],
  S: ['x','y','x','y'], s: ['x','y','x','y'],
  Q: ['x','y','x','y'], q: ['x','y','x','y'],
  A: ['rx','ry','rot','flag','flag','x','y'],
  a: ['rx','ry','rot','flag','flag','x','y'],
  Z: [], z: [],
};

function transformPath(d, tx, ty, sx, sy) {
  const tokens = tokenize(d);
  let parts = [];
  let i = 0;
  let cmd = '';

  while (i < tokens.length) {
    if (tokens[i].type === 'cmd') {
      cmd = tokens[i].value;
      parts.push(cmd);
      i++;
      if (cmd === 'Z' || cmd === 'z') continue;
    }
    const params = CMD_PARAMS[cmd];
    if (!params || params.length === 0) continue;
    const isAbs = cmd === cmd.toUpperCase();

    while (i < tokens.length && tokens[i].type === 'num') {
      for (let p = 0; p < params.length; p++) {
        if (i >= tokens.length || tokens[i].type !== 'num') break;
        const v = tokens[i].value;
        const kind = params[p];
        let nv;
        if (kind === 'x') nv = isAbs ? (v + tx) * sx : v * sx;
        else if (kind === 'y') nv = isAbs ? (v + ty) * sy : v * sy;
        else if (kind === 'rx') nv = v * sx;
        else if (kind === 'ry') nv = v * sy;
        else nv = v;
        if (kind === 'flag' || kind === 'rot') parts.push(String(nv));
        else parts.push(nv.toFixed(2));
        i++;
      }
    }
  }

  let result = '';
  for (let j = 0; j < parts.length; j++) {
    const p = parts[j];
    if (j > 0 && /^[A-Za-z]$/.test(p)) result += p;
    else if (j > 0) result += ' ' + p;
    else result += p;
  }
  return result;
}

function parseBodyParts(content) {
  const parts = [];
  const regex = /slug:\s*"([^"]+)"[\s\S]*?path:\s*\{([\s\S]*?)\}\s*,?\s*\}/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const slug = match[1];
    const pathBlock = match[2];
    const paths = { left: [], right: [], common: [] };
    for (const side of ['left', 'right', 'common']) {
      const sideRegex = new RegExp(`${side}:\\s*\\[([\\s\\S]*?)\\]`);
      const sideMatch = sideRegex.exec(pathBlock);
      if (sideMatch) {
        const pathRegex = /"((?:[^"\\]|\\.)*)"/g;
        let pm;
        while ((pm = pathRegex.exec(sideMatch[1])) !== null) {
          paths[side].push(pm[1]);
        }
      }
    }
    parts.push({ slug, paths });
  }
  return parts;
}

const FRONT_MUSCLE_MAP = {
  chest: 'chest', obliques: 'core', abs: 'core',
  biceps: 'biceps', triceps: 'triceps', trapezius: 'traps',
  deltoids: 'shoulders', quadriceps: 'quadriceps',
  tibialis: 'calves', calves: 'calves', forearm: 'forearms',
  adductors: 'adductors',
};
const FRONT_BODY_PARTS = new Set(['neck', 'knees', 'hands', 'ankles', 'feet', 'head', 'hair']);

const BACK_MUSCLE_MAP = {
  trapezius: 'traps', deltoids: 'shoulders', 'upper-back': 'lats',
  triceps: 'triceps', 'lower-back': 'lowerBack', forearm: 'forearms',
  gluteal: 'glutes', hamstring: 'hamstrings', calves: 'calves',
  adductors: 'adductors',
};
const BACK_BODY_PARTS = new Set(['neck', 'ankles', 'feet', 'hands', 'head', 'hair']);

function processView(parts, tx, ty, muscleMap, bodyParts) {
  // muscles: { muscleKey: { left: [...], right: [...], common: [...] } }
  const muscles = {};
  const body = [];

  for (const part of parts) {
    const transformSide = (arr) => arr.map(p => transformPath(p, tx, ty, SCALE, SCALE));

    if (bodyParts.has(part.slug)) {
      const all = [...part.paths.common, ...part.paths.left, ...part.paths.right];
      body.push({ slug: part.slug, paths: transformSide(all) });
    } else {
      const key = muscleMap[part.slug];
      if (key) {
        if (!muscles[key]) muscles[key] = { left: [], right: [], common: [] };
        muscles[key].left.push(...transformSide(part.paths.left));
        muscles[key].right.push(...transformSide(part.paths.right));
        muscles[key].common.push(...transformSide(part.paths.common));
      } else {
        const all = [...part.paths.common, ...part.paths.left, ...part.paths.right];
        body.push({ slug: part.slug, paths: transformSide(all) });
      }
    }
  }
  return { muscles, body };
}

const frontContent = fs.readFileSync(__dirname + '/tmp_bodyFront.ts', 'utf8');
const backContent = fs.readFileSync(__dirname + '/tmp_bodyBack.ts', 'utf8');

const frontParts = parseBodyParts(frontContent);
const backParts = parseBodyParts(backContent);

const front = processView(frontParts, FRONT_TX, FRONT_TY, FRONT_MUSCLE_MAP, FRONT_BODY_PARTS);
const back = processView(backParts, BACK_TX, BACK_TY, BACK_MUSCLE_MAP, BACK_BODY_PARTS);

const output = { front, back };
fs.writeFileSync(__dirname + '/tmp_transformed.json', JSON.stringify(output, null, 2));

console.log('Front muscles:', Object.keys(front.muscles).join(', '));
for (const [key, sides] of Object.entries(front.muscles)) {
  console.log(`  ${key}: L=${sides.left.length} R=${sides.right.length} C=${sides.common.length}`);
}
console.log('Back muscles:', Object.keys(back.muscles).join(', '));
for (const [key, sides] of Object.entries(back.muscles)) {
  console.log(`  ${key}: L=${sides.left.length} R=${sides.right.length} C=${sides.common.length}`);
}
