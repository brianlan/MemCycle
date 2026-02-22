use tauri::menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter};

pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let open_dashboard = MenuItem::with_id(app, "open_dashboard", "Open Dashboard", true, None::<&str>)?;
    let review_now = MenuItem::with_id(app, "review_now", "Review Now", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(app, &[&open_dashboard, &review_now, &separator, &settings, &quit])?;

    TrayIconBuilder::with_id("memcycle-tray")
        .menu(&menu)
        .on_menu_event(|app: &AppHandle, event: MenuEvent| match event.id().as_ref() {
            "open_dashboard" => {
                let _ = app.emit("tray:open_dashboard", ());
            }
            "review_now" => {
                let _ = app.emit("tray:review_now", ());
            }
            "settings" => {
                let _ = app.emit("tray:settings", ());
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray: &TrayIcon, event: TrayIconEvent| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let _ = tray.app_handle().emit("tray:left_click", ());
            }
        })
        .build(app)?;

    Ok(())
}
