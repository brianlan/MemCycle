import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";

const isTauri = typeof window !== "undefined" && navigator.userAgent.includes("Tauri");

export async function enableAutostart(): Promise<void> {
  if (!isTauri) return;
  await enable();
}

export async function disableAutostart(): Promise<void> {
  if (!isTauri) return;
  await disable();
}

export async function isAutostartEnabled(): Promise<boolean | undefined> {
  if (!isTauri) return undefined;
  return await isEnabled();
}
