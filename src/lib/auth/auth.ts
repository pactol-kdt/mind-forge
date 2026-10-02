import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb, isDatabaseConfigured } from "@/lib/db/client";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";

function buildProviders() {
  const providers = [];
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    );
  }
  if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
    providers.push(
      GitHub({
        clientId: process.env.GITHUB_ID,
        clientSecret: process.env.GITHUB_SECRET,
      })
    );
  }
  if (
    process.env.AUTH_DEV_LOGIN === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    providers.push(
      Credentials({
        id: "dev-login",
        name: "Dev Login",
        credentials: {
          email: { label: "Email", type: "email" },
        },
        async authorize(credentials) {
          const email = String(credentials?.email ?? "").trim().toLowerCase();
          if (!email || !email.includes("@")) return null;
          return {
            id: `dev_${email.replace(/[^a-z0-9]/g, "_")}`,
            email,
            name: email.split("@")[0],
          };
        },
      })
    );
  }
  return providers;
}

const providers = buildProviders();
const useDb = isDatabaseConfigured() && process.env.AUTH_DEV_LOGIN !== "true";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret:
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "mindforge-dev-secret-change-me"),
  adapter: useDb
    ? DrizzleAdapter(getDb(), {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      })
    : undefined,
  providers:
    providers.length > 0
      ? providers
      : [
          Credentials({
            id: "unconfigured",
            name: "Unconfigured",
            credentials: {},
            async authorize() {
              return null;
            },
          }),
        ],
  session: {
    strategy: useDb ? "database" : "jwt",
  },
  pages: {
    signIn: "/account",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, user, token }) {
      if (session.user) {
        session.user.id = user?.id ?? (token.sub as string) ?? "";
      }
      return session;
    },
  },
  trustHost: true,
});

export function authProvidersAvailable(): string[] {
  const list: string[] = [];
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    list.push("google");
  }
  if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
    list.push("github");
  }
  if (
    process.env.AUTH_DEV_LOGIN === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    list.push("dev-login");
  }
  return list;
}
