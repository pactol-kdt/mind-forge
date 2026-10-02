CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text,
  "email" text,
  "emailVerified" timestamp,
  "image" text,
  "display_name" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "accounts" (
  "userId" text NOT NULL,
  "type" text NOT NULL,
  "provider" text NOT NULL,
  "providerAccountId" text NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text,
  CONSTRAINT "accounts_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "sessionToken" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL,
  "expires" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "verificationTokens" (
  "identifier" text NOT NULL,
  "token" text NOT NULL,
  "expires" timestamp NOT NULL,
  CONSTRAINT "verificationTokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);

CREATE TABLE IF NOT EXISTS "player_profiles" (
  "user_id" text PRIMARY KEY NOT NULL,
  "schema_version" integer DEFAULT 6 NOT NULL,
  "revision" integer DEFAULT 0 NOT NULL,
  "payload" jsonb NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "run_summaries" (
  "id" text NOT NULL,
  "user_id" text NOT NULL,
  "timestamp" integer NOT NULL,
  "mode" text NOT NULL,
  "seed" text,
  "score" integer NOT NULL,
  "floor_reached" integer NOT NULL,
  "accuracy" integer NOT NULL,
  "best_streak" integer,
  "difficulty_tier" text NOT NULL,
  "archetype" text,
  "challenge_id" text,
  "weekly_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "run_summaries_user_id_id_pk" PRIMARY KEY("user_id","id")
);

CREATE TABLE IF NOT EXISTS "challenge_records" (
  "user_id" text NOT NULL,
  "challenge_id" text NOT NULL,
  "completions" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "challenge_records_user_id_challenge_id_pk" PRIMARY KEY("user_id","challenge_id")
);

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "run_summaries" ADD CONSTRAINT "run_summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "challenge_records" ADD CONSTRAINT "challenge_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "player_profiles_updated_idx" ON "player_profiles" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "run_summaries_user_ts_idx" ON "run_summaries" USING btree ("user_id","timestamp");
CREATE UNIQUE INDEX IF NOT EXISTS "challenge_records_uid_cid" ON "challenge_records" USING btree ("user_id","challenge_id");
