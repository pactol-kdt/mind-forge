const DEVICE_KEY = "mindforge:device-id";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Non-sensitive installation ID for sync conflict detection only. */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = randomId();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return randomId();
  }
}
