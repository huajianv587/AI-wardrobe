import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_BASE_URL = (
  process.env.BACKEND_PUBLIC_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

interface CurrentWeatherPayload {
  location_query?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string | null;
  location_name?: string | null;
}

interface IpLocationPayload {
  city?: string | null;
  country_name?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  timezone?: string | null;
}

async function resolveIpLocation() {
  try {
    const response = await fetch("https://ipapi.co/json/", {
      headers: {
        "User-Agent": "AI-Wardrobe/1.0",
      },
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as IpLocationPayload;
    const latitude = Number(payload.latitude);
    const longitude = Number(payload.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return {
      latitude,
      longitude,
      timezone: payload.timezone || null,
      location_name: [payload.city, payload.country_name].filter(Boolean).join(", ") || "当前位置",
    } satisfies Required<Pick<CurrentWeatherPayload, "latitude" | "longitude">> &
      Pick<CurrentWeatherPayload, "timezone" | "location_name">;
  } catch {
    return null;
  }
}

function parsePayload(value: unknown): CurrentWeatherPayload {
  if (!value || typeof value !== "object") {
    return {};
  }

  const payload = value as Record<string, unknown>;
  return {
    location_query: typeof payload.location_query === "string" ? payload.location_query : undefined,
    latitude: typeof payload.latitude === "number" ? payload.latitude : undefined,
    longitude: typeof payload.longitude === "number" ? payload.longitude : undefined,
    timezone: typeof payload.timezone === "string" ? payload.timezone : null,
    location_name: typeof payload.location_name === "string" ? payload.location_name : null,
  };
}

function buildFallbackWeather(payload: CurrentWeatherPayload) {
  return {
    location_name: payload.location_name ?? payload.location_query ?? "当前位置",
    timezone: payload.timezone ?? "Asia/Singapore",
    current_time: new Date().toISOString(),
    weather_code: 0,
    condition_label: "Clear",
    condition_label_zh: "晴朗",
    temperature: 24,
    apparent_temperature: 24,
    wind_speed: 8,
    is_day: true,
    precipitation: 0,
    temperature_max: 28,
    temperature_min: 21,
    precipitation_probability_max: 10,
    outfit_hint: "天气温和，适合轻薄外套、衬衫或通勤套装。",
  };
}

function fallbackResponse(payload: CurrentWeatherPayload) {
  return NextResponse.json(buildFallbackWeather(payload), {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}

async function fetchCurrentWeather(payload: CurrentWeatherPayload) {
  const response = await fetch(`${BACKEND_API_BASE_URL}/api/v1/assistant/current-weather`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": response.headers.get("content-type") ?? "application/json; charset=utf-8",
    },
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const latitude = Number(searchParams.get("latitude"));
  const longitude = Number(searchParams.get("longitude"));
  const payload: CurrentWeatherPayload = {
    location_query: searchParams.get("location_query") ?? undefined,
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
    timezone: searchParams.get("timezone"),
    location_name: searchParams.get("location_name") ?? "当前位置",
  };

  try {
    const response = await fetchCurrentWeather(payload);
    return response.ok ? response : fallbackResponse(payload);
  } catch {
    return fallbackResponse(payload);
  }
}

export async function POST(request: NextRequest) {
  try {
    const incoming = parsePayload(await request.json().catch(() => ({})));
    const needsFallback = incoming.latitude == null || incoming.longitude == null;
    const ipLocation = needsFallback ? await resolveIpLocation() : null;

    const payload: CurrentWeatherPayload = {
      ...incoming,
      latitude: incoming.latitude ?? ipLocation?.latitude,
      longitude: incoming.longitude ?? ipLocation?.longitude,
      timezone: incoming.timezone ?? ipLocation?.timezone ?? null,
      location_name: incoming.location_name ?? ipLocation?.location_name ?? "当前位置",
    };

    return fetchCurrentWeather(payload);
  } catch {
    return fallbackResponse({ location_name: "当前位置" });
  }
}

