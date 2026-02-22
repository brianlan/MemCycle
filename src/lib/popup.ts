import { invoke } from "@tauri-apps/api/core";

export function showPopup(): Promise<void> {
  return invoke("show_popup");
}

export function hidePopup(): Promise<void> {
  return invoke("hide_popup");
}

export function isPopupVisible(): Promise<boolean> {
  return invoke<boolean>("is_popup_visible");
}
