import { AccentColor, DataSource, GridLayout, TextSize } from "../types";

export interface AppSettings {
  colorAccent: AccentColor;
  textSize: TextSize;
  gridLayout: GridLayout;
  dataSource: DataSource;
}

export const DEFAULT_SETTINGS: AppSettings = {
  colorAccent: "white",
  textSize: "sedang",
  gridLayout: "cols-3",
  dataSource: "Dayynime-v1",
};

export function getSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  const colorAccent = (localStorage.getItem("eight_color_accent") as AccentColor) || "white";
  const textSize = (localStorage.getItem("eight_text_size") as TextSize) || "sedang";
  const gridLayout = (localStorage.getItem("eight_grid_layout") as GridLayout) || "cols-3";
  const dataSource = (localStorage.getItem("eight_data_source") as DataSource) || "Dayynime-v1";

  return { colorAccent, textSize, gridLayout, dataSource };
}

export function saveSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
  if (typeof window === "undefined") return;

  if (key === "colorAccent") {
    localStorage.setItem("eight_color_accent", value);
  } else if (key === "textSize") {
    localStorage.setItem("eight_text_size", value);
  } else if (key === "gridLayout") {
    localStorage.setItem("eight_grid_layout", value);
  } else if (key === "dataSource") {
    localStorage.setItem("eight_data_source", value);
    // Set cookie key "data_source"
    document.cookie = `data_source=${value};path=/;max-age=31536000;SameSite=Lax`;
  }
  
  // Dispatch a custom event to notify components
  window.dispatchEvent(new Event("eight_settings_changed"));
}
