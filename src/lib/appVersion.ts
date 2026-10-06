import packageJson from "../../package.json";

/** App release version (from package.json). */
export const APP_VERSION = packageJson.version;

export function formatAppVersion(prefix = "v"): string {
  return `${prefix}${APP_VERSION}`;
}
