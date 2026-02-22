use std::sync::Mutex;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::popup;

const DEFAULT_INTERVAL_MINUTES: u64 = 25;
const LOOP_SLEEP_MS: u64 = 500;

#[derive(Debug)]
struct TimerInner {
    interval_minutes: u64,
    next_fire_timestamp_ms: Option<i64>,
    is_running: bool,
    generation: u64,
}

pub struct TimerState {
    inner: Mutex<TimerInner>,
}

impl Default for TimerState {
    fn default() -> Self {
        Self {
            inner: Mutex::new(TimerInner {
                interval_minutes: DEFAULT_INTERVAL_MINUTES,
                next_fire_timestamp_ms: None,
                is_running: false,
                generation: 0,
            }),
        }
    }
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
struct NextFirePayload {
    next_fire_timestamp_ms: i64,
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
struct TimerFiredPayload {
    fired_at_timestamp_ms: i64,
    next_fire_timestamp_ms: i64,
    dnd_deferred: bool,
}

fn now_timestamp_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

fn interval_to_ms(interval_minutes: u64) -> i64 {
    let minutes = interval_minutes.max(1);
    (minutes as i64) * 60 * 1000
}

fn next_timestamp_from_now(interval_minutes: u64) -> i64 {
    now_timestamp_ms().saturating_add(interval_to_ms(interval_minutes))
}

fn is_dnd_enabled() -> bool {
    false
}

fn spawn_timer_worker(app: AppHandle, generation: u64) {
    thread::spawn(move || loop {
        thread::sleep(Duration::from_millis(LOOP_SLEEP_MS));

        let Some(timer_state) = app.try_state::<TimerState>() else {
            return;
        };

        let maybe_event = {
            let mut timer = match timer_state.inner.lock() {
                Ok(guard) => guard,
                Err(_) => return,
            };

            if timer.generation != generation || !timer.is_running {
                return;
            }

            let Some(next_fire_timestamp_ms) = timer.next_fire_timestamp_ms else {
                return;
            };

            let now = now_timestamp_ms();
            if now < next_fire_timestamp_ms {
                continue;
            }

            let dnd_deferred = is_dnd_enabled();
            let next_after_fire = now.saturating_add(interval_to_ms(timer.interval_minutes));
            timer.next_fire_timestamp_ms = Some(next_after_fire);

            Some(TimerFiredPayload {
                fired_at_timestamp_ms: now,
                next_fire_timestamp_ms: next_after_fire,
                dnd_deferred,
            })
        };

        if let Some(event_payload) = maybe_event {
            if !event_payload.dnd_deferred {
                let _ = popup::show_popup_from_timer(&app);
            }

            let _ = app.emit(
                "timer:next_fire_updated",
                NextFirePayload {
                    next_fire_timestamp_ms: event_payload.next_fire_timestamp_ms,
                },
            );
            let _ = app.emit("timer:fired", event_payload);
        }
    });
}

#[tauri::command]
pub fn start_timer(
    app: AppHandle,
    state: State<'_, TimerState>,
    interval_minutes: Option<u64>,
    next_fire_timestamp_ms: Option<i64>,
) -> Result<i64, String> {
    let mut timer = state
        .inner
        .lock()
        .map_err(|_| "failed to lock timer state".to_string())?;

    if let Some(interval) = interval_minutes {
        timer.interval_minutes = interval.max(1);
    }

    let fallback_next = next_timestamp_from_now(timer.interval_minutes);
    let requested = next_fire_timestamp_ms.unwrap_or(fallback_next);
    let scheduled_next = requested.max(now_timestamp_ms());

    timer.is_running = true;
    timer.next_fire_timestamp_ms = Some(scheduled_next);
    timer.generation = timer.generation.saturating_add(1);
    let generation = timer.generation;

    drop(timer);

    spawn_timer_worker(app.clone(), generation);
    app.emit(
        "timer:next_fire_updated",
        NextFirePayload {
            next_fire_timestamp_ms: scheduled_next,
        },
    )
    .map_err(|err| format!("failed to emit timer update: {err}"))?;

    Ok(scheduled_next)
}

#[tauri::command]
pub fn stop_timer(app: AppHandle, state: State<'_, TimerState>) -> Result<(), String> {
    let mut timer = state
        .inner
        .lock()
        .map_err(|_| "failed to lock timer state".to_string())?;

    timer.is_running = false;
    timer.next_fire_timestamp_ms = None;
    timer.generation = timer.generation.saturating_add(1);

    drop(timer);

    app.emit("timer:stopped", ())
        .map_err(|err| format!("failed to emit timer stopped event: {err}"))?;
    Ok(())
}

#[tauri::command]
pub fn reset_timer(
    app: AppHandle,
    state: State<'_, TimerState>,
    interval_minutes: Option<u64>,
) -> Result<i64, String> {
    let mut timer = state
        .inner
        .lock()
        .map_err(|_| "failed to lock timer state".to_string())?;

    if let Some(interval) = interval_minutes {
        timer.interval_minutes = interval.max(1);
    }

    let next_fire = next_timestamp_from_now(timer.interval_minutes);
    timer.is_running = true;
    timer.next_fire_timestamp_ms = Some(next_fire);
    timer.generation = timer.generation.saturating_add(1);
    let generation = timer.generation;

    drop(timer);

    spawn_timer_worker(app.clone(), generation);
    app.emit(
        "timer:next_fire_updated",
        NextFirePayload {
            next_fire_timestamp_ms: next_fire,
        },
    )
    .map_err(|err| format!("failed to emit timer update: {err}"))?;

    Ok(next_fire)
}

#[tauri::command]
pub fn get_time_until_next(state: State<'_, TimerState>) -> Result<Option<u64>, String> {
    let timer = state
        .inner
        .lock()
        .map_err(|_| "failed to lock timer state".to_string())?;

    if !timer.is_running {
        return Ok(None);
    }

    let Some(next_fire_timestamp_ms) = timer.next_fire_timestamp_ms else {
        return Ok(None);
    };

    let now = now_timestamp_ms();
    if next_fire_timestamp_ms <= now {
        return Ok(Some(0));
    }

    let remaining_ms = (next_fire_timestamp_ms - now) as u64;
    let remaining_seconds = (remaining_ms.saturating_add(999)) / 1000;

    Ok(Some(remaining_seconds))
}
