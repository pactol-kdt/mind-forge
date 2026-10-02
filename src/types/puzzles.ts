export type PuzzleType =
  | "memory"
  | "attention"
  | "math"
  | "logic"
  | "spatial"
  | "combined";

export type PuzzleTag =
  | "memory"
  | "speed"
  | "visual"
  | "math"
  | "logic"
  | "spatial"
  | "multi-stage"
  | "combined"
  | "boss"
  | "elite"
  | "attention";

export type MemoryVariant =
  | "sequence"
  | "reverse"
  | "missing"
  | "position"
  | "chunk"
  | "ordered-groups"
  | "interference"
  | "transform-recall"
  | "boss";

export type AttentionVariant =
  | "odd"
  | "direction"
  | "stroop"
  | "find-two"
  | "multi-target"
  | "alternating"
  | "symbol-count"
  | "rule-switch";

export type MathVariant =
  | "arithmetic"
  | "missing-operator"
  | "comparison"
  | "target"
  | "equation-chain"
  | "number-sequence"
  | "estimation"
  | "constraint";

export type LogicVariant =
  | "pattern-sequence"
  | "symbol-pattern"
  | "odd-rule"
  | "ordering"
  | "conditional"
  | "rule-matrix"
  | "set-membership"
  | "deduction-lite"
  | "boolean-rule"
  | "boss";

export type SpatialVariant =
  | "rotation"
  | "mirror"
  | "grid-move"
  | "missing-tile"
  | "transform"
  | "path-trace"
  | "shape-assembly"
  | "block-shift"
  | "orientation"
  | "boss";

export type CombinedVariant =
  | "memory-math"
  | "memory-logic"
  | "attention-math"
  | "memory-spatial"
  | "attention-logic"
  | "logic-math"
  | "spatial-logic";

export interface PuzzleMetadata {
  id: string;
  category: PuzzleType;
  family: string;
  variant: string;
  difficulty: number;
  tags: PuzzleTag[];
  estimatedComplexity?: number;
  signature?: string;
}

export interface BasePuzzle {
  id: string;
  type: PuzzleType;
  difficulty: number;
  timeLimit?: number;
  variant: string;
  family?: string;
  tags?: PuzzleTag[];
  signature?: string;
  estimatedComplexity?: number;
  prompt?: string;
}

export type MemorySymbol =
  | "circle"
  | "triangle"
  | "square"
  | "star"
  | "diamond"
  | "hexagon";

export interface MemoryPuzzle extends BasePuzzle {
  type: "memory";
  variant: MemoryVariant;
  sequence: MemorySymbol[];
  symbolPool: MemorySymbol[];
  displayDurationMs: number;
  missingIndex?: number;
  missingIndices?: number[];
  gridSize?: number;
  positions?: Array<{ symbol: MemorySymbol; index: number }>;
  promptSymbol?: MemorySymbol;
  correctIndex?: number;
  distraction?: {
    expression: string;
    correctAnswer: number;
    choices: number[];
  };
  /** chunk / ordered-groups */
  chunks?: string[][];
  correctChunkIndex?: number;
  chunkChoices?: string[][];
  groupOrderPrompt?: "first" | "symbol-group";
  correctGroupIndex?: number;
  /** transform-recall */
  transformRule?: "reverse" | "replace";
  replaceFrom?: MemorySymbol;
  replaceTo?: MemorySymbol;
  transformedSequence?: MemorySymbol[];
  /** multiple choice recall */
  sequenceChoices?: MemorySymbol[][];
  correctChoiceIndex?: number;
}

export interface AttentionPuzzle extends BasePuzzle {
  type: "attention";
  variant: AttentionVariant;
  gridSize: number;
  cells: string[];
  targetIndex?: number;
  targetIndices?: number[];
  normalSymbol?: string;
  targetSymbol?: string;
  stroopWord?: string;
  stroopColor?: string;
  stroopAsk?: "word" | "color";
  stroopChoices?: string[];
  correctChoice?: string;
  /** symbol-count */
  countPromptSymbol?: string;
  correctCount?: number;
  countChoices?: number[];
  /** alternating */
  alternateOrder?: string[];
  /** rule-switch */
  ruleStages?: Array<{
    prompt: string;
    cells: string[];
    targetIndex: number;
  }>;
  currentRuleStage?: number;
}

export interface MathPuzzle extends BasePuzzle {
  type: "math";
  variant: MathVariant;
  expression?: string;
  correctAnswer?: number;
  choices?: Array<number | string>;
  leftExpression?: string;
  rightExpression?: string;
  leftValue?: number;
  rightValue?: number;
  /** three-way comparison */
  expressions?: string[];
  expressionValues?: number[];
  comparisonAsk?: "largest" | "smallest";
  left?: number;
  right?: number;
  result?: number;
  operatorChoices?: string[];
  correctOperator?: string;
  target?: number;
  numbers?: number[];
  expressionChoices?: string[];
  correctExpression?: string;
  /** equation-chain */
  chainLines?: string[];
  /** number-sequence */
  sequence?: number[];
  /** constraint */
  constraintLines?: string[];
}

export interface LogicPuzzle extends BasePuzzle {
  type: "logic";
  variant: LogicVariant;
  prompt: string;
  detailLines?: string[];
  choices: string[];
  correctAnswer: string;
  items?: string[];
  /** rule-matrix */
  matrixRows?: string[][];
  missingRow?: number;
  missingCol?: number;
  /** internal rule id for validation */
  ruleId?: string;
}

export interface SpatialPuzzle extends BasePuzzle {
  type: "spatial";
  variant: SpatialVariant;
  prompt: string;
  gridSize: number;
  source: string[];
  choices: string[][];
  correctIndex: number;
  moves?: string[];
  startIndex?: number;
  transform?: "rotate90" | "mirror-h" | "mirror-v";
  targetSymbol?: string;
  /** path-trace */
  pathIndices?: number[];
  /** orientation */
  orientationSteps?: string[];
  startFacing?: string;
  facingChoices?: string[];
  correctFacing?: string;
  /** shape-assembly */
  pieces?: string[];
  assemblyChoices?: string[];
}

export interface CombinedPuzzle extends BasePuzzle {
  type: "combined";
  variant: CombinedVariant;
  mapping?: Array<{ symbol: MemorySymbol; value: number }>;
  expression?: string;
  displayDurationMs?: number;
  correctAnswer: number | string;
  choices: Array<number | string>;
  rememberedSequence?: string[];
  prompt?: string;
  gridCells?: string[];
  gridSize?: number;
  targetCell?: string;
  mathPrompt?: string;
  /** memory-spatial */
  spatialPrompt?: string;
  sourceGrid?: string[];
  transform?: "rotate90" | "mirror-h";
  targetSymbol?: string;
  /** logic-math / spatial-logic */
  detailLines?: string[];
  ruleLabel?: string;
}

export type Puzzle =
  | MemoryPuzzle
  | AttentionPuzzle
  | MathPuzzle
  | LogicPuzzle
  | SpatialPuzzle
  | CombinedPuzzle;

export type PuzzleAnswer =
  | MemorySymbol[]
  | MemorySymbol
  | number
  | number[]
  | string;

export interface PuzzleEngine<TPuzzle extends BasePuzzle, TAnswer> {
  generate(difficulty: number, options?: GenerateOptions): TPuzzle;
  validate(puzzle: TPuzzle, answer: TAnswer): boolean;
  calculateScore(
    puzzle: TPuzzle,
    answer: TAnswer,
    responseTimeMs: number
  ): number;
}

export interface GenerateOptions {
  forceVariant?: string;
  displayBonusMs?: number;
  timeBonusPct?: number;
  floorType?: "normal" | "special" | "boss";
  unlockedVariants?: string[];
  seed?: string;
  floor?: number;
  recentFamilies?: string[];
  eliteType?: string;
  challengeId?: string;
  familyDifficultyAdjust?: number;
}

export const PUZZLE_TYPE_LABELS: Record<PuzzleType, string> = {
  memory: "Memory",
  attention: "Attention",
  math: "Math",
  logic: "Logic",
  spatial: "Spatial",
  combined: "Combined",
};

export const ALL_PUZZLE_TYPES: PuzzleType[] = [
  "memory",
  "attention",
  "math",
  "logic",
  "spatial",
  "combined",
];

export const STANDARD_PUZZLE_TYPES: PuzzleType[] = [
  "memory",
  "attention",
  "math",
  "logic",
  "spatial",
];
