use std::sync::Mutex;
use std::time::Duration;

use tauri::window::Color;
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, Position, State, WebviewUrl, WebviewWindow,
};

pub const POPUP_WINDOW_LABEL: &str = "popup";

#[derive(Default)]
pub struct PopupState {
    nonce: Mutex<u64>,
}

fn lock_nonce(state: &PopupState) -> Result<std::sync::MutexGuard<'_, u64>, String> {
    state
        .nonce
        .lock()
        .map_err(|_| "failed to lock popup state".to_string())
}

fn ensure_popup_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    if let Some(window) = app.get_webview_window(POPUP_WINDOW_LABEL) {
        return Ok(window);
    }

    let window = tauri::WebviewWindowBuilder::new(app, POPUP_WINDOW_LABEL, WebviewUrl::App("index.html".into()))
        .title("MemCycle Popup")
        .inner_size(400.0, 300.0)
        .resizable(false)
        .decorations(false)
        .background_color(Color(0, 0, 0, 0))
        .always_on_top(true)
        .visible(false)
        .skip_taskbar(true)
        .build()
        .map_err(|err| format!("failed to build popup window: {err}"))?;

    if let Some(monitor) = app
        .primary_monitor()
        .map_err(|err| format!("failed to query monitor: {err}"))?
    {
        let width = monitor.size().width as i32;
        let x = (width - 420).max(0);
        let y = 40;

        window
            .set_position(Position::Physical(PhysicalPosition::new(x, y)))
            .map_err(|err| format!("failed to position popup window: {err}"))?;
    }

    Ok(window)
}

fn show_popup_inner(app: &AppHandle, state: &PopupState) -> Result<(), String> {
    let window = ensure_popup_window(app)?;

    window
        .show()
        .map_err(|err| format!("failed to show popup window: {err}"))?;
    window
        .set_focus()
        .map_err(|err| format!("failed to focus popup window: {err}"))?;

    app.emit("popup:shown", ())
        .map_err(|err| format!("failed to emit popup shown event: {err}"))?;

    let token = {
        let mut nonce = lock_nonce(state)?;
        *nonce += 1;
        *nonce
    };

    let app_for_timeout = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(30));

        let Some(timeout_window) = app_for_timeout.get_webview_window(POPUP_WINDOW_LABEL) else {
            return;
        };

        let Some(state) = app_for_timeout.try_state::<PopupState>() else {
            return;
        };

        let is_latest = state
            .nonce
            .lock()
            .map(|nonce| *nonce == token)
            .unwrap_or(false);
        if !is_latest {
            return;
        }

        let is_visible = timeout_window.is_visible().unwrap_or(false);
        if !is_visible {
            return;
        }

        if timeout_window.hide().is_err() {
            return;
        }

        let _ = app_for_timeout.emit("popup:timeout", ());
        let _ = app_for_timeout.emit("popup:dismissed", ());
    });

    Ok(())
}

pub fn show_popup_from_timer(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<PopupState>();
    show_popup_inner(app, &state)
}

#[tauri::command]
pub fn show_popup(app: AppHandle, state: State<'_, PopupState>) -> Result<(), String> {
    show_popup_inner(&app, &state)
}

#[tauri::command]
pub fn hide_popup(app: AppHandle, state: State<'_, PopupState>) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(POPUP_WINDOW_LABEL) {
        let was_visible = window
            .is_visible()
            .map_err(|err| format!("failed to check popup visibility: {err}"))?;

        if was_visible {
            window
                .hide()
                .map_err(|err| format!("failed to hide popup window: {err}"))?;
            app.emit("popup:dismissed", ())
                .map_err(|err| format!("failed to emit popup dismissed event: {err}"))?;
        }
    }

    let mut nonce = lock_nonce(&state)?;
    *nonce += 1;

    Ok(())
}

#[tauri::command]
pub fn is_popup_visible(app: AppHandle) -> Result<bool, String> {
    let Some(window) = app.get_webview_window(POPUP_WINDOW_LABEL) else {
        return Ok(false);
    };

    window
        .is_visible()
        .map_err(|err| format!("failed to check popup visibility: {err}"))
}
