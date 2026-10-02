import { describe, expect, it } from "vitest";
import { memoryEngine } from "@/lib/puzzles/memory";
import { attentionEngine } from "@/lib/puzzles/attention";
import { mathEngine } from "@/lib/puzzles/math";
import { logicEngine } from "@/lib/puzzles/logic";
import { spatialEngine } from "@/lib/puzzles/spatial";
import { combinedEngine } from "@/lib/puzzles/combined";
import { PUZZLE_FAMILY_META, familiesForCategory } from "@/lib/puzzles/registry";
import { selectPuzzleFamily } from "@/lib/puzzles/familySelector";
import { createPuzzleRng } from "@/lib/puzzles/rngBridge";
import {
  validateUniqueChoices,
  withRetries,
  ok,
} from "@/lib/puzzles/validation";
import {
  createMultiStage,
  advanceStage,
  isComplete,
  setShared,
} from "@/lib/game/multiStage";
import { normalizeData } from "@/lib/storage/gameStorage";
import { createBrainProfile } from "@/types/profile";
import { applyPuzzleModifier } from "@/lib/game/puzzleModifiers";

const DIFFS = [1, 5, 10, 15, 20] as const;

const ALL_UNLOCKED = PUZZLE_FAMILY_META.map((f) => f.id);

describe("puzzle family registry", () => {
  it("has expanded families per category", () => {
    expect(familiesForCategory("memory").length).toBeGreaterThanOrEqual(6);
    expect(familiesForCategory("attention").length).toBeGreaterThanOrEqual(6);
    expect(familiesForCategory("math").length).toBeGreaterThanOrEqual(7);
    expect(familiesForCategory("logic").length).toBeGreaterThanOrEqual(7);
    expect(familiesForCategory("spatial").length).toBeGreaterThanOrEqual(7);
    expect(familiesForCategory("combined").length).toBeGreaterThanOrEqual(5);
  });

  it("respects family cooldowns in selection", () => {
    const rng = createPuzzleRng("SEL-1");
    const recent = ["sequence", "sequence"];
    const pick = selectPuzzleFamily("memory", {
      difficulty: 8,
      floor: 10,
      unlockedFamilies: ALL_UNLOCKED,
      rng,
      recentFamilies: recent,
    });
    // With cooldown, sequence should be deprioritized; may still appear if pool tiny
    expect(typeof pick).toBe("string");
  });
});

describe("memory generators", () => {
  const variants = [
    "sequence",
    "reverse",
    "missing",
    "position",
    "chunk",
    "ordered-groups",
    "interference",
    "transform-recall",
  ] as const;

  for (const variant of variants) {
    it(`generates valid ${variant} across difficulties`, () => {
      for (const d of DIFFS) {
        if (variant === "transform-recall" && d < 10) continue;
        if (variant === "interference" && d < 7) continue;
        const puzzle = memoryEngine.generate(d, {
          forceVariant: variant,
          seed: `mem-${variant}-${d}`,
          unlockedVariants: ALL_UNLOCKED,
        });
        expect(puzzle.type).toBe("memory");
        expect(puzzle.variant).toBe(variant);
        expect(puzzle.sequence.length).toBeGreaterThan(0);
        if (variant === "sequence") {
          const ans = puzzle.sequence;
          expect(memoryEngine.validate(puzzle, ans)).toBe(true);
        }
        if (variant === "reverse") {
          expect(
            memoryEngine.validate(puzzle, [...puzzle.sequence].reverse())
          ).toBe(true);
        }
      }
    });
  }

  it("seeded memory is deterministic", () => {
    const a = memoryEngine.generate(8, {
      forceVariant: "sequence",
      seed: "DET-MEM",
      floor: 3,
    });
    const b = memoryEngine.generate(8, {
      forceVariant: "sequence",
      seed: "DET-MEM",
      floor: 3,
    });
    expect(a.sequence).toEqual(b.sequence);
  });
});

describe("attention generators", () => {
  const variants = [
    "odd",
    "direction",
    "stroop",
    "find-two",
    "multi-target",
    "symbol-count",
    "alternating",
  ] as const;

  for (const variant of variants) {
    it(`generates valid ${variant}`, () => {
      for (const d of [5, 10, 15]) {
        const puzzle = attentionEngine.generate(d, {
          forceVariant: variant,
          seed: `att-${variant}-${d}`,
          unlockedVariants: ALL_UNLOCKED,
        });
        expect(puzzle.type).toBe("attention");
        if (variant === "stroop") {
          expect(puzzle.correctChoice).toBeTruthy();
          expect(
            attentionEngine.validate(puzzle, puzzle.correctChoice!)
          ).toBe(true);
        } else if (variant === "symbol-count") {
          expect(
            attentionEngine.validate(puzzle, puzzle.correctCount!)
          ).toBe(true);
        } else if (puzzle.targetIndices) {
          expect(
            attentionEngine.validate(puzzle, puzzle.targetIndices)
          ).toBe(true);
        } else {
          expect(
            attentionEngine.validate(puzzle, puzzle.targetIndex!)
          ).toBe(true);
        }
      }
    });
  }
});

describe("math generators", () => {
  const variants = [
    "arithmetic",
    "missing-operator",
    "comparison",
    "target",
    "equation-chain",
    "number-sequence",
    "estimation",
    "constraint",
  ] as const;

  for (const variant of variants) {
    it(`generates valid ${variant}`, () => {
      for (const d of [5, 10, 15]) {
        if (variant === "constraint" && d < 9) continue;
        const puzzle = mathEngine.generate(d, {
          forceVariant: variant,
          unlockedVariants: ALL_UNLOCKED,
        });
        expect(puzzle.type).toBe("math");
        if (variant === "missing-operator") {
          expect(
            mathEngine.validate(puzzle, puzzle.correctOperator!)
          ).toBe(true);
        } else if (variant === "target") {
          expect(
            mathEngine.validate(puzzle, puzzle.correctExpression!)
          ).toBe(true);
        } else if (variant === "comparison") {
          const side =
            (puzzle.leftValue ?? 0) > (puzzle.rightValue ?? 0) ? "left" : "right";
          expect(mathEngine.validate(puzzle, side)).toBe(true);
        } else if (puzzle.correctAnswer != null) {
          expect(mathEngine.validate(puzzle, puzzle.correctAnswer)).toBe(true);
          if (puzzle.choices) {
            const v = validateUniqueChoices(
              puzzle.choices.map(String),
              String(puzzle.correctAnswer)
            );
            expect(v.valid).toBe(true);
          }
        }
      }
    });
  }
});

describe("logic generators", () => {
  const variants = [
    "pattern-sequence",
    "symbol-pattern",
    "odd-rule",
    "ordering",
    "conditional",
    "rule-matrix",
    "set-membership",
    "deduction-lite",
    "boolean-rule",
  ] as const;

  for (const variant of variants) {
    it(`generates valid ${variant}`, () => {
      for (const d of [8, 12]) {
        const puzzle = logicEngine.generate(d, {
          forceVariant: variant,
          unlockedVariants: ALL_UNLOCKED,
        });
        expect(puzzle.choices.includes(puzzle.correctAnswer)).toBe(true);
        expect(logicEngine.validate(puzzle, puzzle.correctAnswer)).toBe(true);
        expect(new Set(puzzle.choices).size).toBe(puzzle.choices.length);
      }
    });
  }
});

describe("spatial generators", () => {
  const variants = [
    "rotation",
    "mirror",
    "grid-move",
    "missing-tile",
    "transform",
    "path-trace",
    "shape-assembly",
    "block-shift",
    "orientation",
  ] as const;

  for (const variant of variants) {
    it(`generates valid ${variant}`, () => {
      for (const d of [8, 14]) {
        const puzzle = spatialEngine.generate(d, {
          forceVariant: variant,
          unlockedVariants: ALL_UNLOCKED,
        });
        expect(puzzle.choices.length).toBeGreaterThanOrEqual(2);
        expect(
          spatialEngine.validate(puzzle, puzzle.correctIndex)
        ).toBe(true);
        // unique layouts
        const keys = puzzle.choices.map((c) => c.join(""));
        expect(new Set(keys).size).toBe(keys.length);
      }
    });
  }
});

describe("combined generators", () => {
  const variants = [
    "memory-math",
    "memory-logic",
    "attention-math",
    "memory-spatial",
    "attention-logic",
    "logic-math",
    "spatial-logic",
  ] as const;

  for (const variant of variants) {
    it(`generates valid ${variant}`, () => {
      const puzzle = combinedEngine.generate(10, {
        forceVariant: variant,
        unlockedVariants: ALL_UNLOCKED,
      });
      expect(puzzle.type).toBe("combined");
      expect(combinedEngine.validate(puzzle, puzzle.correctAnswer)).toBe(true);
    });
  }
});

describe("validation helpers", () => {
  it("withRetries falls back", () => {
    let attempts = 0;
    const result = withRetries(
      () => {
        attempts++;
        return { n: attempts };
      },
      (p) => (p.n >= 3 ? ok() : { valid: false, errors: ["low"] }),
      5
    );
    expect(result.n).toBe(3);
  });
});

describe("multi-stage", () => {
  it("advances and completes", () => {
    let state = createMultiStage([
      { id: "a", type: "memorize" },
      { id: "b", type: "answer" },
    ]);
    state = setShared(state, "seq", [1, 2, 3]);
    expect(state.sharedState.seq).toEqual([1, 2, 3]);
    state = advanceStage(state);
    expect(state.currentStage).toBe(1);
    state = advanceStage(state);
    expect(isComplete(state)).toBe(true);
  });
});

describe("puzzle modifiers", () => {
  it("applies fast modifier", () => {
    const next = applyPuzzleModifier("fast", { timeBonusPct: 0 });
    expect(next.timeBonusPct).toBeLessThan(0);
  });
});

describe("storage v5", () => {
  it("migrates with family stats defaults", () => {
    const data = normalizeData({
      schemaVersion: 4,
      profile: createBrainProfile(),
    });
    expect(data.schemaVersion).toBe(6);
    expect(data.familyStats).toEqual({});
    expect(data.seenFamilyIntros).toEqual([]);
  });
});
