import type {
  GenerateOptions,
  PuzzleEngine,
  SpatialPuzzle,
  SpatialVariant,
} from "@/types/puzzles";
import { engineScore, makeId } from "./shared";
import { pickRandom, randomInt, shuffle } from "@/lib/game/utils";

const GLYPHS = ["■", "□", "▲", "●", "◆"];

function pickVariant(
  difficulty: number,
  options?: GenerateOptions
): SpatialVariant {
  if (options?.forceVariant) return options.forceVariant as SpatialVariant;
  if (options?.floorType === "boss") return "boss";
  const unlocked = options?.unlockedVariants ?? [];
  const pool: SpatialVariant[] = ["rotation"];
  if (unlocked.includes("mirror") || difficulty >= 2) pool.push("mirror");
  if (unlocked.includes("grid-move") || difficulty >= 3) pool.push("grid-move");
  if (unlocked.includes("missing-tile") || difficulty >= 4)
    pool.push("missing-tile");
  if (unlocked.includes("transform") || difficulty >= 5) pool.push("transform");
  if (unlocked.includes("path-trace") || difficulty >= 5) pool.push("path-trace");
  if (unlocked.includes("shape-assembly") || difficulty >= 6)
    pool.push("shape-assembly");
  if (unlocked.includes("block-shift") || difficulty >= 7)
    pool.push("block-shift");
  if (unlocked.includes("orientation") || difficulty >= 4)
    pool.push("orientation");
  return pickRandom(pool);
}

function genPathTrace(difficulty: number): SpatialPuzzle {
  const size = 3;
  const path = [4, 1, 2, 5]; // center → up → right → down-ish
  const end = path[path.length - 1]!;
  const source = Array(size * size).fill("·");
  path.forEach((i, step) => {
    source[i] = step === 0 ? "●" : "·";
  });
  source[path[0]!] = "●";
  // Show path briefly conceptually via prompt; answer is end cell
  const nearby = shuffle(
    Array.from({ length: 9 }, (_, i) => i).filter((i) => i !== end)
  ).slice(0, 3);
  const pickIdx = shuffle([end, ...nearby]);
  const choices = pickIdx.map((i) => {
    const g = Array(9).fill("·");
    g[i] = "★";
    return g;
  });
  return {
    id: makeId("spa"),
    type: "spatial",
    variant: "path-trace",
    difficulty,
    prompt: `Path: center → up → right → down-right-ish. Path indices ${path.join(",")}. Where does it end?`,
    gridSize: size,
    source,
    choices,
    correctIndex: pickIdx.indexOf(end),
    pathIndices: path,
    timeLimit: 16000 + difficulty * 200,
    family: "path-trace",
  };
}

function genShapeAssembly(difficulty: number): SpatialPuzzle {
  // Multiple choice: which shape can two bars form?
  const choices = [
    ["■", "■", "·", "·", "·", "·", "·", "·", "·"], // horizontal-ish
    ["■", "·", "·", "■", "·", "·", "·", "·", "·"],
    ["▲", "·", "·", "·", "·", "·", "·", "·", "·"],
    ["●", "●", "●", "·", "·", "·", "·", "·", "·"],
  ];
  const correctIndex = 0;
  return {
    id: makeId("spa"),
    type: "spatial",
    variant: "shape-assembly",
    difficulty,
    prompt: "Two ■ side by side form which layout?",
    gridSize: 3,
    source: ["■", "■", "·", "·", "·", "·", "·", "·", "·"],
    pieces: ["■", "■"],
    choices,
    correctIndex,
    timeLimit: 14000 + difficulty * 150,
    family: "shape-assembly",
  };
}

function genBlockShift(difficulty: number): SpatialPuzzle {
  const size = 3;
  const source = ["■", "·", "·", "·", "▲", "·", "·", "·", "●"];
  // Move every symbol one cell right (wrap ignore — drop off)
  const correct = ["·", "■", "·", "·", "·", "▲", "·", "·", "·"];
  // ● at 8 moves right off grid
  const wrong1 = ["·", "·", "■", "·", "·", "·", "·", "·", "▲"];
  const wrong2 = rotate90(source, size);
  const wrong3 = [...source];
  const { choices, correctIndex } = uniqueGridChoices(correct, [
    wrong1,
    wrong2,
    wrong3,
  ]);
  return {
    id: makeId("spa"),
    type: "spatial",
    variant: "block-shift",
    difficulty,
    prompt: "Move every symbol one cell right. Result?",
    gridSize: size,
    source,
    choices,
    correctIndex,
    timeLimit: 16000 + difficulty * 200,
    family: "block-shift",
  };
}

function genOrientation(difficulty: number): SpatialPuzzle {
  const dirs = ["↑", "→", "↓", "←"] as const;
  let facing: (typeof dirs)[number] = "↑";
  const steps = difficulty >= 10 ? ["right", "right", "left"] : ["right", "right"];
  for (const s of steps) {
    const idx = dirs.indexOf(facing);
    facing = s === "right" ? dirs[(idx + 1) % 4]! : dirs[(idx + 3) % 4]!;
  }
  const facingChoices = shuffle([...dirs]);
  const source = Array(9).fill("·");
  source[4] = "↑";
  const choices = facingChoices.map((d) => {
    const g = Array(9).fill("·");
    g[4] = d;
    return g;
  });
  return {
    id: makeId("spa"),
    type: "spatial",
    variant: "orientation",
    difficulty,
    prompt: `Arrow starts ↑. ${steps.map((s) => `Rotate ${s}`).join(". ")}. Facing?`,
    gridSize: 3,
    source,
    choices,
    correctIndex: facingChoices.indexOf(facing),
    orientationSteps: steps,
    startFacing: "↑",
    facingChoices: [...facingChoices],
    correctFacing: facing,
    timeLimit: 14000 + difficulty * 150,
    family: "orientation",
  };
}

function rotate90(grid: string[], size: number): string[] {
  const out = Array(size * size).fill("");
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      out[c * size + (size - 1 - r)] = grid[r * size + c]!;
    }
  }
  return out;
}

function mirrorH(grid: string[], size: number): string[] {
  const out = Array(size * size).fill("");
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      out[r * size + (size - 1 - c)] = grid[r * size + c]!;
    }
  }
  return out;
}

function mirrorV(grid: string[], size: number): string[] {
  const out = Array(size * size).fill("");
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      out[(size - 1 - r) * size + c] = grid[r * size + c]!;
    }
  }
  return out;
}

function randomPattern(size: number, filled: number): string[] {
  const cells = Array(size * size).fill("·");
  const idxs = shuffle(Array.from({ length: size * size }, (_, i) => i));
  for (let i = 0; i < filled; i++) {
    cells[idxs[i]!] = pickRandom(GLYPHS);
  }
  return cells;
}

function gridsEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function uniqueGridChoices(
  correct: string[],
  distractors: string[][],
  count = 4
): { choices: string[][]; correctIndex: number } {
  const list: string[][] = [correct];
  for (const d of distractors) {
    if (list.length >= count) break;
    if (!list.some((g) => gridsEqual(g, d))) list.push(d);
  }
  while (list.length < count) {
    const noise = correct.map((c) =>
      Math.random() < 0.3 ? pickRandom(GLYPHS) : c
    );
    if (!list.some((g) => gridsEqual(g, noise))) list.push(noise);
  }
  const shuffled = shuffle(list.slice(0, count));
  const correctIndex = shuffled.findIndex((g) => gridsEqual(g, correct));
  return { choices: shuffled, correctIndex: Math.max(0, correctIndex) };
}

function genRotation(difficulty: number): SpatialPuzzle {
  const size = difficulty >= 10 ? 3 : 2;
  const source = randomPattern(size, Math.min(size * size - 1, 2 + Math.floor(difficulty / 4)));
  const correct = rotate90(source, size);
  const wrong1 = rotate90(correct, size);
  const wrong2 = mirrorH(source, size);
  const wrong3 = mirrorV(source, size);
  const { choices, correctIndex } = uniqueGridChoices(correct, [
    wrong1,
    wrong2,
    wrong3,
  ]);
  return {
    id: makeId("spa"),
    type: "spatial",
    variant: "rotation",
    difficulty,
    prompt: "Which option is this shape rotated 90° clockwise?",
    gridSize: size,
    source,
    choices,
    correctIndex,
    timeLimit: 16000 + difficulty * 200,
  };
}

function genMirror(difficulty: number): SpatialPuzzle {
  const size = 3;
  const source = randomPattern(size, 3 + Math.floor(difficulty / 5));
  const correct = mirrorH(source, size);
  const { choices, correctIndex } = uniqueGridChoices(correct, [
    mirrorV(source, size),
    rotate90(source, size),
    source,
  ]);
  return {
    id: makeId("spa"),
    type: "spatial",
    variant: "mirror",
    difficulty,
    prompt: "Which is the left–right mirror image?",
    gridSize: size,
    source,
    choices,
    correctIndex,
    timeLimit: 16000 + difficulty * 200,
  };
}

function genGridMove(difficulty: number): SpatialPuzzle {
  const size = 3;
  const startIndex = 4; // center
  const moveCount = clampMoves(2 + Math.floor(difficulty / 4));
  const moves: string[] = [];
  let r = 1;
  let c = 1;
  for (let i = 0; i < moveCount; i++) {
    const options: Array<"↑" | "↓" | "←" | "→"> = [];
    if (r > 0) options.push("↑");
    if (r < size - 1) options.push("↓");
    if (c > 0) options.push("←");
    if (c < size - 1) options.push("→");
    const d = pickRandom(options);
    moves.push(d);
    if (d === "↑") r--;
    if (d === "↓") r++;
    if (d === "←") c--;
    if (d === "→") c++;
  }
  const end = r * size + c;
  const source = Array(size * size).fill("·");
  source[startIndex] = "●";
  const nearby = shuffle(
    Array.from({ length: size * size }, (_, i) => i).filter((i) => i !== end)
  ).slice(0, 3);
  const pickIdx = shuffle([end, ...nearby]);
  const choiceGrids = pickIdx.map((i) => {
    const g = Array(size * size).fill("·");
    g[i] = "●";
    return g;
  });
  const correctIndex = pickIdx.indexOf(end);
  return {
    id: makeId("spa"),
    type: "spatial",
    variant: "grid-move",
    difficulty,
    prompt: `Start center. Follow: ${moves.join(" ")}. Where do you finish?`,
    gridSize: size,
    source,
    choices: choiceGrids,
    correctIndex,
    moves,
    startIndex,
    timeLimit: 18000 + difficulty * 250,
  };
}

function clampMoves(n: number): number {
  return Math.min(6, Math.max(2, n));
}

function genMissingTile(difficulty: number): SpatialPuzzle {
  const size = 3;
  // Checker pattern
  const source: string[] = Array.from({ length: size * size }, (_, i) => {
    const r = Math.floor(i / size);
    const c = i % size;
    return (r + c) % 2 === 0 ? "■" : "□";
  });
  const missing = size * size - 1;
  const display = [...source];
  display[missing] = "?";
  const correctCell = source[missing]!;
  const correct = [...source];
  const wrongA = [...source];
  wrongA[missing] = correctCell === "■" ? "□" : "■";
  const wrongB = [...source];
  wrongB[missing] = "▲";
  const wrongC = [...source];
  wrongC[missing] = "●";
  const { choices, correctIndex } = uniqueGridChoices(correct, [
    wrongA,
    wrongB,
    wrongC,
  ]);
  return {
    id: makeId("spa"),
    type: "spatial",
    variant: "missing-tile",
    difficulty,
    prompt: "Which tile completes the pattern?",
    gridSize: size,
    source: display,
    choices,
    correctIndex,
    timeLimit: 14000 + difficulty * 150,
  };
}

function genTransform(difficulty: number): SpatialPuzzle {
  const size = 3;
  const source = randomPattern(size, 3);
  // Place a unique target
  const targetIdx = randomInt(0, size * size - 1);
  source[targetIdx] = "★";
  const transform = pickRandom(["rotate90", "mirror-h"] as const);
  const mapped =
    transform === "rotate90" ? rotate90(source, size) : mirrorH(source, size);
  const newIdx = mapped.indexOf("★");
  const choiceIdxs = shuffle(
    Array.from({ length: size * size }, (_, i) => i)
  ).slice(0, 4);
  if (!choiceIdxs.includes(newIdx)) {
    choiceIdxs[0] = newIdx;
  }
  const uniqueIdx = [...new Set(choiceIdxs)].slice(0, 4);
  while (uniqueIdx.length < 4) {
    const n = randomInt(0, size * size - 1);
    if (!uniqueIdx.includes(n)) uniqueIdx.push(n);
  }
  const shuffledIdx = shuffle(uniqueIdx);
  const choices = shuffledIdx.map((i) => {
    const g = Array(size * size).fill("·");
    g[i] = "★";
    return g;
  });
  const correctIndex = shuffledIdx.indexOf(newIdx);
  return {
    id: makeId("spa"),
    type: "spatial",
    variant: "transform",
    difficulty,
    prompt:
      transform === "rotate90"
        ? "Rotate 90° clockwise. Where does ★ move?"
        : "Mirror left–right. Where does ★ move?",
    gridSize: size,
    source,
    choices,
    correctIndex,
    transform,
    targetSymbol: "★",
    timeLimit: 18000 + difficulty * 250,
  };
}

function genBoss(difficulty: number): SpatialPuzzle {
  const base = genRotation(difficulty + 2);
  return {
    ...base,
    id: makeId("spa"),
    variant: "boss",
    prompt: "Boss — find the 90° clockwise rotation",
    timeLimit: (base.timeLimit ?? 16000) + 4000,
  };
}

export const spatialEngine: PuzzleEngine<SpatialPuzzle, number> = {
  generate(difficulty: number, options?: GenerateOptions): SpatialPuzzle {
    const variant = pickVariant(difficulty, options);
    const timeBonus = options?.timeBonusPct ?? 0;
    let puzzle: SpatialPuzzle;
    switch (variant) {
      case "mirror":
        puzzle = genMirror(difficulty);
        break;
      case "grid-move":
        puzzle = genGridMove(difficulty);
        break;
      case "missing-tile":
        puzzle = genMissingTile(difficulty);
        break;
      case "transform":
        puzzle = genTransform(difficulty);
        break;
      case "path-trace":
        puzzle = genPathTrace(difficulty);
        break;
      case "shape-assembly":
        puzzle = genShapeAssembly(difficulty);
        break;
      case "block-shift":
        puzzle = genBlockShift(difficulty);
        break;
      case "orientation":
        puzzle = genOrientation(difficulty);
        break;
      case "boss":
        puzzle = genBoss(difficulty);
        break;
      default:
        puzzle = genRotation(difficulty);
    }
    if (puzzle.timeLimit) {
      puzzle.timeLimit = Math.round(puzzle.timeLimit * (1 + timeBonus));
    }
    return puzzle;
  },

  validate(puzzle, answer) {
    return answer === puzzle.correctIndex;
  },

  calculateScore(puzzle, answer, responseTimeMs) {
    return engineScore(
      puzzle.difficulty,
      responseTimeMs,
      puzzle.timeLimit,
      this.validate(puzzle, answer)
    );
  },
};

export function formatSpatialAnswer(puzzle: SpatialPuzzle): string {
  return `Option ${puzzle.correctIndex + 1}`;
}
