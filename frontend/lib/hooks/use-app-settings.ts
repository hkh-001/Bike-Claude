"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "bike-platform-settings";

export type ThemeMode = "dark" | "light" | "system";

export interface AppSettings {
  themeMode: ThemeMode;
  dashboardRefreshInterval: number;
  alertRefreshInterval: number;
  emptyBikeThreshold: number;
  fullOccupancyThreshold: number;
  aiTokenBudget: number;
  aiStreamingEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  themeMode: "dark",
  dashboardRefreshInterval: 30_000,
  alertRefreshInterval: 30_000,
  emptyBikeThreshold: 1,
  fullOccupancyThreshold: 0.95,
  aiTokenBudget: 6000,
  aiStreamingEnabled: true,
};

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: AppSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* noop */
  }
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveSettings(settings);
    }
  }, [settings, isLoaded]);

  const update = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, update, reset, isLoaded };
}
