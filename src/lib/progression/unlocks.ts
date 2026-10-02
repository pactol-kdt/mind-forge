import type { MetaProgression, DifficultyTier } from "@/types/run";
import type { BrainProfile } from "@/types/profile";
import type { LifetimeStats } from "@/types/game";
import { CHALLENGE_DEFINITIONS } from "@/lib/game/challenges";
import { DIFFICULTY_TIERS } from "@/lib/game/modifiers";

export interface UnlockDefinition {
  id: string;
  type: "challenge" | "modifier" | "boss" | "difficulty" | "upgrade" | "variant";
  title: string;
  description: string;
  requirement: (ctx: UnlockContext) => boolean;
}

export interface UnlockContext {
  profile: BrainProfile;
  lifetime: LifetimeStats;
  milestones: string[];
  meta: MetaProgression;
  highestFloorEver: number;
  bossesDefeated: number;
  elitesCleared: number;
}

export function createDefaultMeta(): MetaProgression {
  return {
    unlockedChallengeIds: ["precision", "endurance", "balanced-mind"],
    unlockedModifierIds: [],
    unlockedBossIds: [
      "archivist",
      "architect",
      "logician",
      "calculator",
      "sentinel",
    ],
    unlockedUpgradeIds: [],
    difficultyTiersUnlocked: ["standard"],
    completedChallenges: {},
    pendingUnlockNotices: [],
  };
}

export const UNLOCK_DEFINITIONS: UnlockDefinition[] = [
  {
    id: "challenge-blitz",
    type: "challenge",
    title: "Challenge Mode",
    description: "Blitz Run — short timers, faster scoring.",
    requirement: (ctx) => ctx.profile.playerLevel >= 3,
  },
  {
    id: "challenge-specialist",
    type: "challenge",
    title: "Challenge Mode",
    description: "Specialist Run — train one category heavily.",
    requirement: (ctx) => ctx.profile.playerLevel >= 4,
  },
  {
    id: "challenge-no-mercy",
    type: "challenge",
    title: "Challenge Mode",
    description: "No Mercy — high pressure, high reward.",
    requirement: (ctx) => ctx.profile.playerLevel >= 15,
  },
  {
    id: "difficulty-advanced",
    type: "difficulty",
    title: "Difficulty Unlocked",
    description: "Advanced tier is now available.",
    requirement: (ctx) => ctx.profile.playerLevel >= 5,
  },
  {
    id: "difficulty-expert",
    type: "difficulty",
    title: "Difficulty Unlocked",
    description: "Expert tier is now available.",
    requirement: (ctx) => ctx.profile.playerLevel >= 12,
  },
  {
    id: "difficulty-master",
    type: "difficulty",
    title: "Difficulty Unlocked",
    description: "Master tier is now available.",
    requirement: (ctx) => ctx.profile.playerLevel >= 20,
  },
  {
    id: "boss-mindforge",
    type: "boss",
    title: "Boss Unlocked",
    description: "The Mindforge — mixed late-game encounter.",
    requirement: (ctx) =>
      ctx.highestFloorEver >= 30 || ctx.profile.playerLevel >= 10,
  },
  {
    id: "upgrade-glass-mind",
    type: "upgrade",
    title: "Upgrade Unlocked",
    description: "Glass Mind — huge score, lower max lives.",
    requirement: (ctx) => ctx.profile.playerLevel >= 8,
  },
  {
    id: "upgrade-phoenix",
    type: "upgrade",
    title: "Upgrade Unlocked",
    description: "Phoenix — once per run, cheat death.",
    requirement: (ctx) =>
      ctx.profile.playerLevel >= 10 ||
      ctx.milestones.includes("first-run"),
  },
];

function challengeIdFromUnlock(id: string): string | null {
  if (id.startsWith("challenge-")) return id.replace("challenge-", "");
  return null;
}

function difficultyFromUnlock(id: string): DifficultyTier | null {
  if (id === "difficulty-advanced") return "advanced";
  if (id === "difficulty-expert") return "expert";
  if (id === "difficulty-master") return "master";
  return null;
}

function bossFromUnlock(id: string): string | null {
  if (id === "boss-mindforge") return "mindforge";
  return null;
}

function upgradeFromUnlock(id: string): string | null {
  if (id === "upgrade-glass-mind") return "glass_mind";
  if (id === "upgrade-phoenix") return "phoenix";
  return null;
}

/** Evaluate unlocks; never removes already unlocked content. */
export function evaluateUnlocks(
  ctx: UnlockContext
): { meta: MetaProgression; newlyUnlocked: UnlockDefinition[] } {
  const meta: MetaProgression = {
    ...ctx.meta,
    unlockedChallengeIds: [...ctx.meta.unlockedChallengeIds],
    unlockedModifierIds: [...ctx.meta.unlockedModifierIds],
    unlockedBossIds: [...ctx.meta.unlockedBossIds],
    unlockedUpgradeIds: [...ctx.meta.unlockedUpgradeIds],
    difficultyTiersUnlocked: [...ctx.meta.difficultyTiersUnlocked],
    pendingUnlockNotices: [...ctx.meta.pendingUnlockNotices],
  };
  const newly: UnlockDefinition[] = [];

  for (const def of UNLOCK_DEFINITIONS) {
    if (!def.requirement(ctx)) continue;
    const notice = `${def.title}: ${def.description}`;

    if (def.type === "challenge") {
      const cid = challengeIdFromUnlock(def.id);
      if (cid && !meta.unlockedChallengeIds.includes(cid)) {
        meta.unlockedChallengeIds.push(cid);
        newly.push(def);
        meta.pendingUnlockNotices.push(notice);
      }
    } else if (def.type === "difficulty") {
      const tier = difficultyFromUnlock(def.id);
      if (tier && !meta.difficultyTiersUnlocked.includes(tier)) {
        meta.difficultyTiersUnlocked.push(tier);
        newly.push(def);
        meta.pendingUnlockNotices.push(notice);
      }
    } else if (def.type === "boss") {
      const bid = bossFromUnlock(def.id);
      if (bid && !meta.unlockedBossIds.includes(bid)) {
        meta.unlockedBossIds.push(bid);
        newly.push(def);
        meta.pendingUnlockNotices.push(notice);
      }
    } else if (def.type === "upgrade") {
      const uid = upgradeFromUnlock(def.id);
      if (uid && !meta.unlockedUpgradeIds.includes(uid)) {
        meta.unlockedUpgradeIds.push(uid);
        newly.push(def);
        meta.pendingUnlockNotices.push(notice);
      }
    }
  }

  // Auto-include level-gated challenges that unlock by level
  for (const c of CHALLENGE_DEFINITIONS) {
    if (
      c.unlockPlayerLevel <= ctx.profile.playerLevel &&
      !meta.unlockedChallengeIds.includes(c.id)
    ) {
      meta.unlockedChallengeIds.push(c.id);
    }
  }
  for (const t of DIFFICULTY_TIERS) {
    if (
      t.unlockPlayerLevel <= ctx.profile.playerLevel &&
      !meta.difficultyTiersUnlocked.includes(t.id)
    ) {
      meta.difficultyTiersUnlocked.push(t.id);
    }
  }

  return { meta, newlyUnlocked: newly };
}

export function clearUnlockNotices(meta: MetaProgression): MetaProgression {
  return { ...meta, pendingUnlockNotices: [] };
}
