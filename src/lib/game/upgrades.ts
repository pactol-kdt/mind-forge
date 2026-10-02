import type {
  ActiveUpgrade,
  GameUpgrade,
  UpgradeEffect,
  UpgradeRarity,
  UpgradeTag,
} from "@/types/game";
import type { PuzzleType } from "@/types/puzzles";
import { createSeededRng, rngShuffle, type Rng } from "./seededRandom";
import { shuffle } from "./utils";

function lv(
  levels: Array<{ description: string; effect: UpgradeEffect }>
): GameUpgrade["levels"] {
  return levels.map((l, i) => ({ level: i + 1, ...l }));
}

function def(
  partial: Omit<GameUpgrade, "levels" | "maxLevel" | "effect" | "description"> & {
    levels: Array<{ description: string; effect: UpgradeEffect }>;
    unlockRequired?: boolean;
  }
): GameUpgrade {
  const levels = lv(partial.levels);
  return {
    id: partial.id,
    name: partial.name,
    rarity: partial.rarity,
    tags: partial.tags,
    levels,
    maxLevel: levels.length,
    effect: levels[0]!.effect,
    description: levels[0]!.description,
    unlockRequired: partial.unlockRequired,
  };
}

export const UPGRADE_CATALOG: GameUpgrade[] = [
  def({
    id: "quick-mind",
    name: "Quick Mind",
    rarity: "common",
    tags: ["speed"],
    levels: [
      { description: "+15% time on timed puzzles", effect: { kind: "time_bonus", pct: 0.15 } },
      { description: "+25% time on timed puzzles", effect: { kind: "time_bonus", pct: 0.25 } },
      { description: "+35% time on timed puzzles", effect: { kind: "time_bonus", pct: 0.35 } },
    ],
  }),
  def({
    id: "second-chance",
    name: "Second Chance",
    rarity: "rare",
    tags: ["survival"],
    levels: [
      { description: "Ignore the next incorrect answer once", effect: { kind: "second_chance" } },
    ],
  }),
  def({
    id: "memory-flash",
    name: "Memory Flash",
    rarity: "common",
    tags: ["memory"],
    levels: [
      { description: "Memory sequences stay visible 0.5s longer", effect: { kind: "memory_display", ms: 500 } },
      { description: "Memory sequences stay visible 0.9s longer", effect: { kind: "memory_display", ms: 900 } },
    ],
  }),
  def({
    id: "focus",
    name: "Focus",
    rarity: "common",
    tags: ["attention", "score"],
    levels: [
      { description: "+20% score from Attention puzzles", effect: { kind: "category_score", category: "attention", pct: 0.2 } },
      { description: "+30% score from Attention puzzles", effect: { kind: "category_score", category: "attention", pct: 0.3 } },
    ],
  }),
  def({
    id: "number-master",
    name: "Number Master",
    rarity: "common",
    tags: ["math", "score"],
    levels: [
      { description: "+20% score from Math puzzles", effect: { kind: "category_score", category: "math", pct: 0.2 } },
      { description: "+30% score from Math puzzles", effect: { kind: "category_score", category: "math", pct: 0.3 } },
    ],
  }),
  def({
    id: "combo-master",
    name: "Combo Master",
    rarity: "rare",
    tags: ["streak", "score"],
    levels: [
      { description: "Streak bonus increased by 25%", effect: { kind: "streak_bonus", pct: 0.25 } },
      { description: "Streak bonus increased by 40%", effect: { kind: "streak_bonus", pct: 0.4 } },
    ],
  }),
  def({
    id: "mental-shield",
    name: "Mental Shield",
    rarity: "epic",
    tags: ["survival"],
    levels: [
      { description: "Recover 1 life every 10 floors", effect: { kind: "life_every_n_floors", n: 10 } },
      { description: "Recover 1 life every 8 floors", effect: { kind: "life_every_n_floors", n: 8 } },
    ],
  }),
  def({
    id: "momentum",
    name: "Momentum",
    rarity: "rare",
    tags: ["streak", "speed", "score"],
    levels: [
      { description: "Every 5-streak grants a temporary score surge", effect: { kind: "momentum", every: 5, bonusPct: 0.3 } },
      { description: "Every 4-streak grants a stronger score surge", effect: { kind: "momentum", every: 4, bonusPct: 0.4 } },
    ],
  }),
  def({
    id: "high-risk",
    name: "High Risk",
    rarity: "epic",
    tags: ["risk", "score"],
    levels: [
      { description: "+2 difficulty, +40% all score rewards", effect: { kind: "high_risk", difficultyDelta: 2, scorePct: 0.4 } },
      { description: "+3 difficulty, +55% all score rewards", effect: { kind: "high_risk", difficultyDelta: 3, scorePct: 0.55 } },
    ],
  }),
  def({
    id: "calm-mind",
    name: "Calm Mind",
    rarity: "rare",
    tags: ["speed", "balanced"],
    levels: [
      { description: "Softer timing pressure on hard timed puzzles", effect: { kind: "calm_mind", reliefPct: 0.2 } },
    ],
  }),
  def({
    id: "clear-thinking",
    name: "Clear Thinking",
    rarity: "common",
    tags: ["logic", "score"],
    levels: [
      { description: "+20% score from Logic puzzles", effect: { kind: "category_score", category: "logic", pct: 0.2 } },
      { description: "+30% score from Logic puzzles", effect: { kind: "category_score", category: "logic", pct: 0.3 } },
    ],
  }),
  def({
    id: "spatial-insight",
    name: "Spatial Insight",
    rarity: "common",
    tags: ["spatial", "score"],
    levels: [
      { description: "+20% score from Spatial puzzles", effect: { kind: "category_score", category: "spatial", pct: 0.2 } },
      { description: "+30% score from Spatial puzzles", effect: { kind: "category_score", category: "spatial", pct: 0.3 } },
    ],
  }),
  def({
    id: "pattern-recognition",
    name: "Pattern Recognition",
    rarity: "rare",
    tags: ["logic", "spatial", "speed"],
    levels: [
      { description: "+15% time on Logic and Spatial puzzles", effect: { kind: "logic_spatial_time", pct: 0.15 } },
      { description: "+25% time on Logic and Spatial puzzles", effect: { kind: "logic_spatial_time", pct: 0.25 } },
    ],
  }),
  def({
    id: "balanced-mind",
    name: "Balanced Mind",
    rarity: "epic",
    tags: ["balanced", "score"],
    levels: [
      { description: "+25% score after 3 different categories in a row", effect: { kind: "balanced_mind", bonusPct: 0.25 } },
      { description: "+40% score after 3 different categories in a row", effect: { kind: "balanced_mind", bonusPct: 0.4 } },
    ],
  }),
  // --- v0.4 new upgrades ---
  def({
    id: "adaptive-focus",
    name: "Adaptive Focus",
    rarity: "rare",
    tags: ["balanced", "score"],
    levels: [
      { description: "+15% score after three distinct categories", effect: { kind: "adaptive_focus", bonusPct: 0.15 } },
      { description: "+25% score after three distinct categories", effect: { kind: "adaptive_focus", bonusPct: 0.25 } },
    ],
  }),
  def({
    id: "iron-mind",
    name: "Iron Mind",
    rarity: "epic",
    tags: ["survival"],
    levels: [
      { description: "Every 15 floors restore one life", effect: { kind: "life_every_n_floors", n: 15 } },
      { description: "Every 12 floors restore one life", effect: { kind: "life_every_n_floors", n: 12 } },
    ],
  }),
  def({
    id: "precision",
    name: "Precision",
    rarity: "rare",
    tags: ["score", "speed"],
    levels: [
      {
        description: "Fast corrects grant bonus score (capped)",
        effect: { kind: "precision_speed", windowPct: 0.4, bonusPct: 0.25, cap: 80 },
      },
    ],
  }),
  def({
    id: "scholar",
    name: "Scholar",
    rarity: "common",
    tags: ["balanced"],
    levels: [
      { description: "+15% XP (no score bonus)", effect: { kind: "xp_bonus", pct: 0.15 } },
      { description: "+25% XP (no score bonus)", effect: { kind: "xp_bonus", pct: 0.25 } },
    ],
  }),
  def({
    id: "logic-engine",
    name: "Logic Engine",
    rarity: "common",
    tags: ["logic", "score"],
    levels: [
      { description: "+20% Logic score", effect: { kind: "category_score", category: "logic", pct: 0.2 } },
      { description: "+35% Logic score", effect: { kind: "category_score", category: "logic", pct: 0.35 } },
    ],
  }),
  def({
    id: "perfect-memory",
    name: "Perfect Memory",
    rarity: "rare",
    tags: ["memory", "risk"],
    levels: [
      {
        description: "Longer memory reveal; slightly lower Memory score",
        effect: { kind: "perfect_memory", displayMs: 700, scorePct: -0.1 },
      },
    ],
  }),
  def({
    id: "glass-mind",
    name: "Glass Mind",
    rarity: "legendary",
    tags: ["risk", "score"],
    unlockRequired: true,
    levels: [
      { description: "+60% score, −1 max life", effect: { kind: "glass_mind", scorePct: 0.6, maxLivesDelta: -1 } },
    ],
  }),
  def({
    id: "steady-hand",
    name: "Steady Hand",
    rarity: "epic",
    tags: ["streak", "survival"],
    levels: [
      { description: "On miss, keep 50% of your streak", effect: { kind: "steady_hand", keepFraction: 0.5 } },
    ],
  }),
  def({
    id: "diversity",
    name: "Diversity",
    rarity: "rare",
    tags: ["balanced", "score"],
    levels: [
      { description: "Bonus score for three distinct categories", effect: { kind: "diversity", bonusPct: 0.2 } },
    ],
  }),
  def({
    id: "specialist",
    name: "Specialist",
    rarity: "epic",
    tags: ["score"],
    levels: [
      { description: "Pick a category: +30% there, −5% elsewhere", effect: { kind: "specialist" } },
    ],
  }),
  def({
    id: "phoenix",
    name: "Phoenix",
    rarity: "legendary",
    tags: ["survival"],
    unlockRequired: true,
    levels: [
      { description: "Once per run, restore 1 life at 0", effect: { kind: "phoenix" } },
    ],
  }),
];

export function getUpgradeById(id: string): GameUpgrade | undefined {
  return UPGRADE_CATALOG.find((u) => u.id === id);
}

export function getEffectForActive(active: ActiveUpgrade): UpgradeEffect | undefined {
  const defn = getUpgradeById(active.upgradeId);
  if (!defn) return undefined;
  const level = Math.min(Math.max(1, active.level || 1), defn.maxLevel);
  return defn.levels[level - 1]?.effect ?? defn.effect;
}

export function getUpgradeDisplay(active: ActiveUpgrade): {
  name: string;
  description: string;
  rarity: UpgradeRarity;
  level: number;
} {
  const defn = getUpgradeById(active.upgradeId);
  const level = active.level || 1;
  const roman = ["", "I", "II", "III"][level] ?? String(level);
  return {
    name: defn ? `${defn.name}${defn.maxLevel > 1 ? ` ${roman}` : ""}` : active.upgradeId,
    description: defn?.levels[level - 1]?.description ?? defn?.description ?? "",
    rarity: defn?.rarity ?? "common",
    level,
  };
}

export function getSynergyHint(owned: ActiveUpgrade[], candidate: GameUpgrade): string | null {
  const ids = new Set(owned.map((o) => o.upgradeId));
  if (candidate.id === "momentum" && ids.has("quick-mind")) {
    return "SYNERGY — Momentum works well with Quick Mind.";
  }
  if (candidate.id === "quick-mind" && ids.has("momentum")) {
    return "SYNERGY — Quick Mind fuels Momentum builds.";
  }
  if (
    candidate.id === "balanced-mind" &&
    (ids.has("focus") || ids.has("clear-thinking") || ids.has("spatial-insight"))
  ) {
    return "SYNERGY — Category score upgrades empower Balanced Mind.";
  }
  if (candidate.id === "diversity" && ids.has("adaptive-focus")) {
    return "SYNERGY — Diversity pairs with Adaptive Focus.";
  }
  return null;
}

export function selectUpgradeChoices(
  owned: ActiveUpgrade[],
  count = 3,
  opts?: {
    seed?: string;
    unlockedUpgradeIds?: string[];
    preferTags?: UpgradeTag[];
  }
): GameUpgrade[] {
  const ownedMap = new Map(owned.map((o) => [o.upgradeId, o]));
  const unlocked = new Set(opts?.unlockedUpgradeIds ?? []);

  const pool = UPGRADE_CATALOG.filter((u) => {
    if (u.unlockRequired && !unlocked.has(u.id)) return false;
    const current = ownedMap.get(u.id);
    if (current && (current.level || 1) >= u.maxLevel) return false;
    return true;
  });

  const rng: Rng | null = opts?.seed
    ? createSeededRng(`${opts.seed}:upgrades:${owned.length}`)
    : null;
  const shuffled = rng ? rngShuffle(rng, pool) : shuffle(pool);

  // Weight: prefer unowned, then evolvable, then tag matches
  const scored = shuffled.map((u) => {
    let w = 1;
    const cur = ownedMap.get(u.id);
    if (!cur) w += 2;
    else w += 1.5; // evolution opportunity
    if (u.rarity === "legendary") w *= 0.35;
    else if (u.rarity === "epic") w *= 0.7;
    if (opts?.preferTags?.some((t) => u.tags.includes(t))) w += 1;
    return { u, w };
  });

  const picked: GameUpgrade[] = [];
  const seen = new Set<string>();
  const work = [...scored];
  while (picked.length < count && work.length > 0) {
    const total = work.reduce((s, x) => s + x.w, 0);
    let roll = (rng ? rng() : Math.random()) * total;
    let idx = 0;
    for (let i = 0; i < work.length; i++) {
      roll -= work[i]!.w;
      if (roll <= 0) {
        idx = i;
        break;
      }
    }
    const chosen = work.splice(idx, 1)[0]!;
    if (seen.has(chosen.u.id)) continue;
    seen.add(chosen.u.id);
    // Present evolved description if already owned
    const cur = ownedMap.get(chosen.u.id);
    if (cur) {
      const nextLevel = Math.min((cur.level || 1) + 1, chosen.u.maxLevel);
      const levelDef = chosen.u.levels[nextLevel - 1]!;
      picked.push({
        ...chosen.u,
        description: `Evolve to Level ${nextLevel}: ${levelDef.description}`,
        effect: levelDef.effect,
      });
    } else {
      picked.push(chosen.u);
    }
  }
  return picked;
}

export function activateUpgrade(
  upgrade: GameUpgrade,
  existing?: ActiveUpgrade,
  specialistCategory?: PuzzleType
): ActiveUpgrade {
  if (existing) {
    const nextLevel = Math.min((existing.level || 1) + 1, upgrade.maxLevel);
    return {
      ...existing,
      level: nextLevel,
      charges:
        upgrade.effect.kind === "second_chance"
          ? (existing.charges ?? 0) + 1
          : existing.charges,
    };
  }
  const base: ActiveUpgrade = {
    upgradeId: upgrade.id,
    level: 1,
  };
  if (upgrade.effect.kind === "second_chance") base.charges = 1;
  if (upgrade.effect.kind === "phoenix") base.charges = 1;
  if (upgrade.effect.kind === "specialist" && specialistCategory) {
    base.specialistCategory = specialistCategory;
  }
  return base;
}

export function collectEffects(active: ActiveUpgrade[]): UpgradeEffect[] {
  return active
    .map((a) => getEffectForActive(a))
    .filter((e): e is UpgradeEffect => Boolean(e));
}

export function getTimeBonusPct(active: ActiveUpgrade[]): number {
  return collectEffects(active)
    .filter((e): e is Extract<UpgradeEffect, { kind: "time_bonus" }> => e.kind === "time_bonus")
    .reduce((sum, e) => sum + e.pct, 0);
}

export function getMemoryDisplayBonusMs(active: ActiveUpgrade[]): number {
  let ms = 0;
  for (const e of collectEffects(active)) {
    if (e.kind === "memory_display") ms += e.ms;
    if (e.kind === "perfect_memory") ms += e.displayMs;
  }
  return ms;
}

export function getCategoryScorePct(
  active: ActiveUpgrade[],
  category: PuzzleType
): number {
  let pct = 0;
  for (const a of active) {
    const e = getEffectForActive(a);
    if (!e) continue;
    if (e.kind === "category_score" && e.category === category) pct += e.pct;
    if (e.kind === "perfect_memory" && category === "memory") pct += e.scorePct;
    if (e.kind === "specialist") {
      if (a.specialistCategory === category) pct += 0.3;
      else pct -= 0.05;
    }
  }
  return pct;
}

export function getStreakBonusPct(active: ActiveUpgrade[]): number {
  return collectEffects(active)
    .filter(
      (e): e is Extract<UpgradeEffect, { kind: "streak_bonus" }> =>
        e.kind === "streak_bonus"
    )
    .reduce((sum, e) => sum + e.pct, 0);
}

export function getHighRisk(active: ActiveUpgrade[]): {
  difficultyDelta: number;
  scorePct: number;
} {
  return collectEffects(active)
    .filter(
      (e): e is Extract<UpgradeEffect, { kind: "high_risk" }> =>
        e.kind === "high_risk"
    )
    .reduce(
      (acc, e) => ({
        difficultyDelta: acc.difficultyDelta + e.difficultyDelta,
        scorePct: acc.scorePct + e.scorePct,
      }),
      { difficultyDelta: 0, scorePct: 0 }
    );
}

export function getGlassMind(active: ActiveUpgrade[]): {
  scorePct: number;
  maxLivesDelta: number;
} {
  return collectEffects(active)
    .filter(
      (e): e is Extract<UpgradeEffect, { kind: "glass_mind" }> =>
        e.kind === "glass_mind"
    )
    .reduce(
      (acc, e) => ({
        scorePct: acc.scorePct + e.scorePct,
        maxLivesDelta: acc.maxLivesDelta + e.maxLivesDelta,
      }),
      { scorePct: 0, maxLivesDelta: 0 }
    );
}

export function getXpBonusPct(active: ActiveUpgrade[]): number {
  return collectEffects(active)
    .filter(
      (e): e is Extract<UpgradeEffect, { kind: "xp_bonus" }> =>
        e.kind === "xp_bonus"
    )
    .reduce((sum, e) => sum + e.pct, 0);
}

export function getSteadyHandKeep(active: ActiveUpgrade[]): number {
  const e = collectEffects(active).find(
    (x): x is Extract<UpgradeEffect, { kind: "steady_hand" }> =>
      x.kind === "steady_hand"
  );
  return e?.keepFraction ?? 0;
}

export function getCalmMindRelief(active: ActiveUpgrade[]): number {
  return collectEffects(active)
    .filter(
      (e): e is Extract<UpgradeEffect, { kind: "calm_mind" }> =>
        e.kind === "calm_mind"
    )
    .reduce((sum, e) => sum + e.reliefPct, 0);
}

export function getMomentumBonus(
  active: ActiveUpgrade[],
  streak: number
): number {
  let bonus = 0;
  for (const effect of collectEffects(active)) {
    if (effect.kind === "momentum" && streak > 0 && streak % effect.every === 0) {
      bonus += effect.bonusPct;
    }
  }
  return bonus;
}

export function hasSecondChanceCharge(active: ActiveUpgrade[]): boolean {
  return active.some(
    (a) =>
      a.upgradeId === "second-chance" &&
      (a.charges === undefined || a.charges > 0)
  );
}

export function consumeSecondChance(
  active: ActiveUpgrade[]
): ActiveUpgrade[] {
  return active
    .map((a) => {
      if (a.upgradeId !== "second-chance") return a;
      const charges = (a.charges ?? 1) - 1;
      if (charges <= 0) return null;
      return { ...a, charges };
    })
    .filter((a): a is ActiveUpgrade => a !== null);
}

export function tryPhoenix(active: ActiveUpgrade[]): {
  upgrades: ActiveUpgrade[];
  revived: boolean;
} {
  const idx = active.findIndex(
    (a) => a.upgradeId === "phoenix" && !a.consumed && (a.charges ?? 1) > 0
  );
  if (idx < 0) return { upgrades: active, revived: false };
  const next = active.map((a, i) =>
    i === idx ? { ...a, consumed: true, charges: 0 } : a
  );
  return { upgrades: next, revived: true };
}

export function shouldGrantLifeFromShield(
  active: ActiveUpgrade[],
  floor: number
): boolean {
  return collectEffects(active).some(
    (e) => e.kind === "life_every_n_floors" && floor > 0 && floor % e.n === 0
  );
}

export function getLogicSpatialTimeBonus(active: ActiveUpgrade[]): number {
  return collectEffects(active)
    .filter(
      (e): e is Extract<UpgradeEffect, { kind: "logic_spatial_time" }> =>
        e.kind === "logic_spatial_time"
    )
    .reduce((sum, e) => sum + e.pct, 0);
}

export function getBalancedMindBonus(
  active: ActiveUpgrade[],
  recentCategories: PuzzleType[]
): number {
  const last3 = recentCategories.slice(-3);
  if (last3.length < 3 || new Set(last3).size < 3) return 0;
  let bonus = 0;
  for (const e of collectEffects(active)) {
    if (e.kind === "balanced_mind") bonus += e.bonusPct;
    if (e.kind === "adaptive_focus") bonus += e.bonusPct;
    if (e.kind === "diversity") bonus += e.bonusPct;
  }
  return bonus;
}

export function getPrecisionBonus(
  active: ActiveUpgrade[],
  responseTimeMs: number,
  timeLimit: number | undefined
): number {
  if (!timeLimit) return 0;
  let bonus = 0;
  for (const e of collectEffects(active)) {
    if (e.kind !== "precision_speed") continue;
    if (responseTimeMs <= timeLimit * e.windowPct) {
      bonus += Math.min(e.cap, Math.round(40 * e.bonusPct * 10));
    }
  }
  return bonus;
}

export const RARITY_COLORS: Record<UpgradeRarity, string> = {
  common: "border-slate-500 text-slate-200",
  rare: "border-cyan-400/60 text-cyan-200",
  epic: "border-amber-400/70 text-amber-200",
  legendary: "border-rose-400/80 text-rose-200",
};

export const RARITY_LABELS: Record<UpgradeRarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};
