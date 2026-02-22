import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

import { DEFAULT_INTERVAL_MINUTES } from "@/lib/constants";
import { getSetting, setSetting } from "@/lib/services/settingsService";

interface TimerNextFirePayload {
  nextFireTimestampMs: number;
}

const NEXT_FIRE_SETTING_KEY = "timerNextFireTimestampMs";

let listenersRegistered = false;

async function getConfiguredIntervalMinutes(): Promise<number> {
  const configured = await getSetting("popupIntervalMinutes");
  return configured > 0 ? configured : DEFAULT_INTERVAL_MINUTES;
}

async function registerTimerPersistenceListeners(): Promise<void> {
  if (listenersRegistered) {
    return;
  }

  listenersRegistered = true;

  await listen<TimerNextFirePayload>("timer:next_fire_updated", async (event) => {
    const nextFire = Number(event.payload?.nextFireTimestampMs ?? 0);
    await setSetting(NEXT_FIRE_SETTING_KEY, Number.isFinite(nextFire) ? nextFire : 0);
  });

  await listen("timer:stopped", async () => {
    await setSetting(NEXT_FIRE_SETTING_KEY, 0);
  });
}

export async function startTimer(): Promise<number> {
  await registerTimerPersistenceListeners();

  const intervalMinutes = await getConfiguredIntervalMinutes();
  const persistedNextFire = await getSetting(NEXT_FIRE_SETTING_KEY);
  const nextFireTimestampMs = persistedNextFire > 0 ? persistedNextFire : null;

  const nextFire = await invoke<number>("start_timer", {
    intervalMinutes,
    nextFireTimestampMs,
  });

  await setSetting(NEXT_FIRE_SETTING_KEY, nextFire);
  return nextFire;
}

export async function stopTimer(): Promise<void> {
  await invoke("stop_timer");
  await setSetting(NEXT_FIRE_SETTING_KEY, 0);
}

export async function resetTimer(): Promise<number> {
  await registerTimerPersistenceListeners();

  const intervalMinutes = await getConfiguredIntervalMinutes();
  const nextFire = await invoke<number>("reset_timer", { intervalMinutes });

  await setSetting(NEXT_FIRE_SETTING_KEY, nextFire);
  return nextFire;
}

export function getTimeUntilNext(): Promise<number | null> {
  return invoke<number | null>("get_time_until_next");
}
