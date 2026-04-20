import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

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
  } catch {
    return NextResponse.json(
      { detail: "首页天气服务暂时不可用，请稍后再试。" },
      {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}

