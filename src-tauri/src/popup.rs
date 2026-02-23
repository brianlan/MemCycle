use std::sync::Mutex;
use std::time::Duration;

use tauri::window::Color;
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, Position, State, WebviewUrl, WebviewWindow,
};

pub const POPUP_WINDOW_LABEL: &str = "popup";
const POPUP_WIDTH: i32 = 400;
const POPUP_HEIGHT: i32 = 500;

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

fn center_popup_window(app: &AppHandle, window: &WebviewWindow) -> Result<(), String> {
    let monitor = if let Some(main_window) = app.get_webview_window("main") {
        main_window
            .current_monitor()
            .map_err(|err| format!("failed to query main window monitor: {err}"))?
            .or(
                app.primary_monitor()
                    .map_err(|err| format!("failed to query primary monitor: {err}"))?,
            )
    } else {
        app.primary_monitor()
            .map_err(|err| format!("failed to query primary monitor: {err}"))?
    };

    if let Some(monitor) = monitor {
        let monitor_size = monitor.size();
        let monitor_position = monitor.position();

        let x = monitor_position.x + ((monitor_size.width as i32 - POPUP_WIDTH) / 2).max(0);
        let y = monitor_position.y + ((monitor_size.height as i32 - POPUP_HEIGHT) / 2).max(0);

        window
            .set_position(Position::Physical(PhysicalPosition::new(x, y)))
            .map_err(|err| format!("failed to position popup window: {err}"))?;
    }

    Ok(())
}

fn ensure_popup_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    if let Some(window) = app.get_webview_window(POPUP_WINDOW_LABEL) {
        return Ok(window);
    }

    let window = tauri::WebviewWindowBuilder::new(app, POPUP_WINDOW_LABEL, WebviewUrl::App("index.html".into()))
        .title("MemCycle Popup")
        .inner_size(POPUP_WIDTH as f64, POPUP_HEIGHT as f64)
        .resizable(false)
        .decorations(false)
        .background_color(Color(0, 0, 0, 0))
        .always_on_top(true)
        .visible(false)
        .skip_taskbar(true)
        .build()
        .map_err(|err| format!("failed to build popup window: {err}"))?;

    center_popup_window(app, &window)?;

    Ok(window)
}

fn show_popup_inner(app: &AppHandle, state: &PopupState) -> Result<(), String> {
    let window = ensure_popup_window(app)?;

    center_popup_window(app, &window)?;

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
