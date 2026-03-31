from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status


GEOCODING_API_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_API_URL = "https://api.open-meteo.com/v1/forecast"
REQUEST_TIMEOUT_SECONDS = 8.0

WEATHER_CODE_LABELS = {
    0: "Clear",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Dense drizzle",
    56: "Freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Rain showers",
    81: "Rain showers",
    82: "Heavy showers",
    85: "Snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Severe thunderstorm",
}


@dataclass(slots=True)
class LocationResult:
    name: str
    country: str | None
    admin1: str | None
    latitude: float
    longitude: float
    timezone: str | None


@dataclass(slots=True)
class DailyForecast:
    location_name: str
    timezone: str
    date: str
    weather_code: int
    condition_label: str
    temperature_max: float
    temperature_min: float
    precipitation_probability_max: float | None


def _fetch_json(url: str, params: dict[str, Any]) -> dict[str, Any]:
    query = urlencode({key: value for key, value in params.items() if value is not None})
    request = Request(f"{url}?{query}", headers={"User-Agent": "AI-Wardrobe/1.0"})

    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - network failure path
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Weather service is temporarily unavailable. Please try again in a moment.",
        ) from exc


def _label_for_code(weather_code: int) -> str:
    return WEATHER_CODE_LABELS.get(weather_code, "Variable weather")


def search_locations(query: str) -> list[LocationResult]:
    if not query.strip():
        return []

    payload = _fetch_json(
        GEOCODING_API_URL,
        {
            "name": query.strip(),
            "count": 6,
            "language": "zh",
            "format": "json",
        },
    )

    results = payload.get("results") or []
    return [
        LocationResult(
            name=result.get("name", "Unknown"),
            country=result.get("country"),
            admin1=result.get("admin1"),
            latitude=float(result["latitude"]),
            longitude=float(result["longitude"]),
            timezone=result.get("timezone"),
        )
        for result in results
        if "latitude" in result and "longitude" in result
    ]


def _tomorrow_date_string(timezone_name: str | None) -> str:
    timezone = timezone_name or "Asia/Shanghai"

    try:
        now = datetime.now(ZoneInfo(timezone))
    except Exception:
        now = datetime.utcnow()

    return (now + timedelta(days=1)).date().isoformat()


def fetch_daily_forecast(
    *,
    latitude: float,
    longitude: float,
    location_name: str,
    timezone_name: str | None = None,
    date: str | None = None,
) -> DailyForecast:
    timezone = timezone_name or "auto"
    payload = _fetch_json(
        FORECAST_API_URL,
        {
            "latitude": latitude,
            "longitude": longitude,
            "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
            "forecast_days": 4,
            "timezone": timezone,
        },
    )

    daily = payload.get("daily") or {}
    dates = daily.get("time") or []
    weather_codes = daily.get("weather_code") or []
    temperatures_max = daily.get("temperature_2m_max") or []
    temperatures_min = daily.get("temperature_2m_min") or []
    precipitation = daily.get("precipitation_probability_max") or []

    target_date = date or _tomorrow_date_string(payload.get("timezone") or timezone_name)

    if target_date in dates:
        index = dates.index(target_date)
    elif dates:
        index = min(1, len(dates) - 1)
        target_date = dates[index]
    else:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Weather service did not return a daily forecast.",
        )

    weather_code = int(weather_codes[index]) if index < len(weather_codes) else 0
    precipitation_probability = precipitation[index] if index < len(precipitation) else None

    return DailyForecast(
        location_name=location_name,
        timezone=str(payload.get("timezone") or timezone_name or "Asia/Shanghai"),
        date=target_date,
        weather_code=weather_code,
        condition_label=_label_for_code(weather_code),
        temperature_max=float(temperatures_max[index]) if index < len(temperatures_max) else 26.0,
        temperature_min=float(temperatures_min[index]) if index < len(temperatures_min) else 18.0,
        precipitation_probability_max=float(precipitation_probability) if precipitation_probability is not None else None,
    )


def resolve_location(
    *,
    location_query: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    timezone_name: str | None = None,
) -> LocationResult:
    if latitude is not None and longitude is not None:
        return LocationResult(
            name=location_query or "Selected location",
            country=None,
            admin1=None,
            latitude=latitude,
            longitude=longitude,
            timezone=timezone_name or "Asia/Shanghai",
        )

    if location_query:
        matches = search_locations(location_query)
        if matches:
            return matches[0]

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Please provide a valid location name or latitude/longitude for weather lookup.",
    )
