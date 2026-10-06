import { describe, expect, it } from "vitest";
import {
  FOCUS_CATEGORY_OPTS,
  choiceTrialLabel,
  pickChoicePathOptions,
} from "@/lib/game/choicePath";

describe("choice path options", () => {
  it("picks two distinct categories from the five", () => {
    const [a, b] = pickChoicePathOptions("MINDFORGE-TEST", 7, []);
    expect(a).not.toBe(b);
    expect(FOCUS_CATEGORY_OPTS).toContain(a);
    expect(FOCUS_CATEGORY_OPTS).toContain(b);
  });

  it("is deterministic for the same seed and floor", () => {
    const x = pickChoicePathOptions("MINDFORGE-SEED", 12, ["math", "math"]);
    const y = pickChoicePathOptions("MINDFORGE-SEED", 12, ["math", "math"]);
    expect(x).toEqual(y);
  });

  it("changes with floor", () => {
    const a = pickChoicePathOptions("MINDFORGE-SEED", 7, []);
    const b = pickChoicePathOptions("MINDFORGE-SEED", 19, []);
    expect(a[0]).not.toBe(a[1]);
    expect(b[0]).not.toBe(b[1]);
  });

  it("labels trials from category names", () => {
    expect(choiceTrialLabel("spatial")).toBe("Spatial Trial");
  });
});
