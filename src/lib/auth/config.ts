/** Client-safe flags — never import server secrets here. */

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_AUTH_ENABLED === "true" ||
      process.env.AUTH_SECRET ||
      process.env.GOOGLE_CLIENT_ID ||
      process.env.GITHUB_ID
  );
}

export function isCloudConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.AUTH_SECRET);
}

export const AUTH_PROVIDERS = {
  google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  github: Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET),
} as const;
