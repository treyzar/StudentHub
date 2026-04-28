import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type ThemeMode = "light" | "dark" | "system";

export interface UserSettings {
  theme: ThemeMode;
  dayStart: string;
  dayEnd: string;
  weekStartsOn: 0 | 1;
  defaultLessonDurationMinutes: number;
  reminderHours: number;
  userName: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  dayStart: "08:00",
  dayEnd: "22:00",
  weekStartsOn: 1,
  defaultLessonDurationMinutes: 90,
  reminderHours: 24,
  userName: "",
};

const STORAGE_KEY = "studenthub.settings.v1";

function loadSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: UserSettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const resolved =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  root.classList.toggle("dark", resolved === "dark");
}

interface SettingsContextValue {
  settings: UserSettings;
  setSettings: (next: Partial<UserSettings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<UserSettings>(loadSettings);

  useEffect(() => {
    applyTheme(settings.theme);
    if (settings.theme === "system" && typeof window !== "undefined") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }
    return undefined;
  }, [settings.theme]);

  const setSettings = useCallback((next: Partial<UserSettings>) => {
    setSettingsState((prev) => {
      const merged = { ...prev, ...next };
      saveSettings(merged);
      return merged;
    });
  }, []);

  const reset = useCallback(() => {
    setSettingsState(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, setSettings, reset }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
