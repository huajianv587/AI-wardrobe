"use client";

import { useEffect, useState } from "react";

import { type CurrentWeatherResult, fetchCurrentWeather } from "@/lib/api";

const WEATHER_CACHE_KEY = "wenwen-home-weather-cache-v1";
const WEATHER_POSITION_KEY = "wenwen-home-weather-position-v1";
const WEATHER_REFRESH_MS = 2 * 60 * 60 * 1000;
const POSITION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type HomeWeatherSource = "live" | "cache" | "placeholder";

interface StoredPosition {
  latitude: number;
  longitude: number;
  timezone: string | null;
  locationName: string | null;
  savedAt: number;
}

interface StoredWeatherCache {
  fetchedAt: number;
  data: CurrentWeatherResult;
}

interface HomeWeatherState {
  weather: CurrentWeatherResult | null;
  chips: string[];
  meta: string;
  loading: boolean;
  source: HomeWeatherSource;
}

const PLACEHOLDER_CHIPS = ["定位天气中", "稍等一会", "2 小时自动刷新"];
const PLACEHOLDER_META = "定位成功后会显示实时天气";

const PLACEHOLDER_STATE: HomeWeatherState = {
  weather: null,
  chips: PLACEHOLDER_CHIPS,
  meta: PLACEHOLDER_META,
  loading: true,
  source: "placeholder",
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures and keep runtime data only.
  }
}

function formatTimeLabel(currentTime: string) {
  const date = new Date(currentTime);
  if (Number.isNaN(date.getTime())) {
    return "刚刚更新";
  }

  return `${date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  })} 更新`;
}

function describeWind(speed: number | null) {
  if (speed == null) {
    return "风感轻柔";
  }

  if (speed < 8) {
    return "微风轻拂";
  }

  if (speed < 20) {
    return `轻风 ${Math.round(speed)} km/h`;
  }

  if (speed < 33) {
    return `风力明显 ${Math.round(speed)} km/h`;
  }

  return `大风 ${Math.round(speed)} km/h`;
}

function buildChips(weather: CurrentWeatherResult | null) {
  if (!weather) {
    return PLACEHOLDER_CHIPS;
  }

  return [
    `${Math.round(weather.temperature)}°C ${weather.condition_label_zh}`,
    describeWind(weather.wind_speed),
    weather.outfit_hint,
  ];
}

function buildMeta(weather: CurrentWeatherResult | null, source: HomeWeatherSource) {
  if (!weather) {
    return PLACEHOLDER_META;
  }

  const location = weather.location_name || "当前位置";
  const refreshLabel = source === "cache" ? "使用 2 小时内缓存" : "每 2 小时自动刷新";
  return `${location} · ${refreshLabel} · ${formatTimeLabel(weather.current_time)}`;
}

function buildState(weather: CurrentWeatherResult | null, source: HomeWeatherSource, loading: boolean): HomeWeatherState {
  return {
    weather,
    chips: buildChips(weather),
    meta: buildMeta(weather, source),
    loading,
    source,
  };
}

function readFreshCache(now = Date.now()) {
  const cached = readJson<StoredWeatherCache>(WEATHER_CACHE_KEY);
  if (!cached) {
    return null;
  }

  if (now - cached.fetchedAt > WEATHER_REFRESH_MS) {
    return null;
  }

  return cached;
}

function readStoredPosition(now = Date.now()) {
  const stored = readJson<StoredPosition>(WEATHER_POSITION_KEY);
  if (!stored) {
    return null;
  }

  if (now - stored.savedAt > POSITION_CACHE_TTL_MS) {
    return null;
  }

  return stored;
}

function saveStoredPosition(position: StoredPosition) {
  writeJson(WEATHER_POSITION_KEY, position);
}

function saveWeatherCache(data: CurrentWeatherResult) {
  writeJson(WEATHER_CACHE_KEY, {
    fetchedAt: Date.now(),
    data,
  } satisfies StoredWeatherCache);
}

function getBrowserTimezone() {
  if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat !== "function") {
    return null;
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
}

function resolveGeolocation(positionFallback: StoredPosition | null): Promise<StoredPosition | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(positionFallback);
  }

  if (!("geolocation" in navigator)) {
    return Promise.resolve(positionFallback);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timezone: getBrowserTimezone(),
          locationName: "当前位置",
          savedAt: Date.now(),
        } satisfies StoredPosition;
        saveStoredPosition(nextPosition);
        resolve(nextPosition);
      },
      () => resolve(positionFallback),
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: WEATHER_REFRESH_MS,
      }
    );
  });
}

export function useHomeWeather() {
  const [state, setState] = useState<HomeWeatherState>(PLACEHOLDER_STATE);

  useEffect(() => {
    let cancelled = false;

    const applyState = (nextState: HomeWeatherState) => {
      if (!cancelled) {
        setState(nextState);
      }
    };

    const applyWeather = (weather: CurrentWeatherResult | null, source: HomeWeatherSource, loading: boolean) => {
      applyState(buildState(weather, source, loading));
    };

    const applyFallback = (cached: StoredWeatherCache | null) => {
      if (cached?.data) {
        applyWeather(cached.data, "cache", false);
        return;
      }

      applyWeather(null, "placeholder", false);
    };

    const setLoading = () => {
      if (cancelled) {
        return;
      }

      const cached = readFreshCache();
      if (cached?.data) {
        applyWeather(cached.data, "cache", true);
        return;
      }

      applyWeather(null, "placeholder", true);
    };

    async function hydrateWeather() {
      setLoading();

      const cached = readFreshCache();
      const storedPosition = readStoredPosition();
      const resolvedPosition = await resolveGeolocation(storedPosition);

      try {
        const payload = await fetchCurrentWeather({
          latitude: resolvedPosition?.latitude,
          longitude: resolvedPosition?.longitude,
          timezone: resolvedPosition?.timezone ?? null,
          location_name: resolvedPosition?.locationName ?? null,
        });

        saveWeatherCache(payload);
        applyWeather(payload, "live", false);
      } catch {
        applyFallback(cached);
      }
    }

    void hydrateWeather();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

