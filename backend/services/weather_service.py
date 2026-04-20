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

WEATHER_CODE_LABELS_ZH = {
    0: "晴",
    1: "晴间多云",
    2: "多云",
    3: "阴天",
    45: "雾",
    48: "冻雾",
    51: "毛毛雨",
    53: "小阵雨",
    55: "中雨",
    56: "冻雨",
    57: "强冻雨",
    61: "小雨",
    63: "雨天",
    65: "大雨",
    66: "冻雨",
    67: "强冻雨",
    71: "小雪",
    73: "雪天",
    75: "大雪",
    77: "冰粒",
    80: "阵雨",
    81: "较强阵雨",
    82: "强阵雨",
    85: "阵雪",
    86: "强阵雪",
    95: "雷暴",
    96: "冰雹雷暴",
    99: "强雷暴",
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


@dataclass(slots=True)
class CurrentWeather:
    location_name: str
    timezone: str
    current_time: str
    weather_code: int
    condition_label: str
    condition_label_zh: str
    temperature: float
    apparent_temperature: float | None
    wind_speed: float | None
    is_day: bool | None
    precipitation: float | None
    temperature_max: float | None
    temperature_min: float | None
    precipitation_probability_max: float | None
    outfit_hint: str


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


def _label_for_code_zh(weather_code: int) -> str:
    return WEATHER_CODE_LABELS_ZH.get(weather_code, "天气多变")


def _outfit_hint(
    *,
    temperature: float | None,
    temperature_max: float | None,
    precipitation_probability_max: float | None,
    weather_code: int,
) -> str:
    effective_temperature = temperature if temperature is not None else temperature_max

    if precipitation_probability_max is not None and precipitation_probability_max >= 50:
        return "记得带伞，优先轻外搭"
    if weather_code in {45, 48}:
        return "有雾感，适合柔和层次"
    if weather_code in {61, 63, 65, 80, 81, 82}:
        return "有雨意，鞋子尽量防滑"
    if weather_code in {71, 73, 75, 85, 86}:
        return "偏冷，适合针织加外套"
    if effective_temperature is None:
        return "出门前看一眼温差"
    if effective_temperature <= 12:
        return "适合叠穿针织和外套"
    if effective_temperature <= 20:
        return "适合薄针织"
    if effective_temperature <= 27:
        return "适合轻薄衬衫"
    return "适合轻薄透气单品"


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


def _today_date_string(timezone_name: str | None) -> str:
    timezone = timezone_name or "Asia/Shanghai"

    try:
        now = datetime.now(ZoneInfo(timezone))
    except Exception:
        now = datetime.utcnow()

    return now.date().isoformat()


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


def fetch_current_weather(
    *,
    latitude: float,
    longitude: float,
    location_name: str,
    timezone_name: str | None = None,
) -> CurrentWeather:
    timezone = timezone_name or "auto"
    payload = _fetch_json(
        FORECAST_API_URL,
        {
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
            "forecast_days": 1,
            "timezone": timezone,
        },
    )

    current = payload.get("current") or {}
    if not current:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Weather service did not return current conditions.",
        )

    daily = payload.get("daily") or {}
    target_date = _today_date_string(payload.get("timezone") or timezone_name)
    dates = daily.get("time") or []
    index = dates.index(target_date) if target_date in dates else 0
    temperatures_max = daily.get("temperature_2m_max") or []
    temperatures_min = daily.get("temperature_2m_min") or []
    precipitation = daily.get("precipitation_probability_max") or []

    weather_code = int(current.get("weather_code") or 0)
    temperature = current.get("temperature_2m")
    temperature_max = float(temperatures_max[index]) if index < len(temperatures_max) else None
    precipitation_probability_max = float(precipitation[index]) if index < len(precipitation) and precipitation[index] is not None else None

    return CurrentWeather(
        location_name=location_name,
        timezone=str(payload.get("timezone") or timezone_name or "Asia/Shanghai"),
        current_time=str(current.get("time") or ""),
        weather_code=weather_code,
        condition_label=_label_for_code(weather_code),
        condition_label_zh=_label_for_code_zh(weather_code),
        temperature=float(temperature) if temperature is not None else 0.0,
        apparent_temperature=float(current.get("apparent_temperature")) if current.get("apparent_temperature") is not None else None,
        wind_speed=float(current.get("wind_speed_10m")) if current.get("wind_speed_10m") is not None else None,
        is_day=bool(current.get("is_day")) if current.get("is_day") is not None else None,
        precipitation=float(current.get("precipitation")) if current.get("precipitation") is not None else None,
        temperature_max=temperature_max,
        temperature_min=float(temperatures_min[index]) if index < len(temperatures_min) else None,
        precipitation_probability_max=precipitation_probability_max,
        outfit_hint=_outfit_hint(
            temperature=float(temperature) if temperature is not None else None,
            temperature_max=temperature_max,
            precipitation_probability_max=precipitation_probability_max,
            weather_code=weather_code,
        ),
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
