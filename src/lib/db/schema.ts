import {
  pgTable,
  text,
  timestamp,
  integer,
  primaryKey,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import type { CloudPlayerData } from "@/lib/sync/syncTypes";

/** Auth.js / Drizzle adapter tables */
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

/** App player cloud profile */
export const playerProfiles = pgTable(
  "player_profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    schemaVersion: integer("schema_version").notNull().default(6),
    revision: integer("revision").notNull().default(0),
    payload: jsonb("payload").$type<CloudPlayerData>().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("player_profiles_updated_idx").on(t.updatedAt)]
);

/** Deduplicated run summaries for idempotent sync */
export const runSummaries = pgTable(
  "run_summaries",
  {
    id: text("id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    timestamp: integer("timestamp").notNull(),
    mode: text("mode").notNull(),
    seed: text("seed"),
    score: integer("score").notNull(),
    floorReached: integer("floor_reached").notNull(),
    accuracy: integer("accuracy").notNull(), // store * 10000
    bestStreak: integer("best_streak"),
    difficultyTier: text("difficulty_tier").notNull(),
    archetype: text("archetype"),
    challengeId: text("challenge_id"),
    weeklyId: text("weekly_id"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    index("run_summaries_user_ts_idx").on(t.userId, t.timestamp),
  ]
);

export const challengeRecords = pgTable(
  "challenge_records",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    challengeId: text("challenge_id").notNull(),
    completions: integer("completions").notNull().default(0),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.challengeId] }),
    uniqueIndex("challenge_records_uid_cid").on(t.userId, t.challengeId),
  ]
);

export type UserRow = typeof users.$inferSelect;
export type PlayerProfileRow = typeof playerProfiles.$inferSelect;
