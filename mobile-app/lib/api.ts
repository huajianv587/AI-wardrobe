import Constants from "expo-constants";

type JsonBody = Record<string, unknown> | unknown[] | string | number | boolean | null;

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

const configuredBaseUrl =
  Constants.expoConfig?.extra?.apiBaseUrl ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://api.aiwardrobes.com";

export const API_BASE_URL = String(configuredBaseUrl).replace(/\/$/, "");

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function errorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string") {
      return detail;
    }
  }
  return fallback;
}

export type ApiRequestOptions = {
  method?: string;
  token?: string | null;
  body?: JsonBody | FormData;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
};

const DEFAULT_TIMEOUT_MS = 20000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJson(text: string): unknown {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}

function shouldRetry(status: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function normalizeFetchError(error: unknown): NetworkError {
  if (error instanceof Error && error.name === "AbortError") {
    return new NetworkError("Request timed out. Check your connection and try again.");
  }
  if (error instanceof Error) {
    return new NetworkError(error.message || "Network request failed.");
  }
  return new NetworkError("Network request failed.");
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (isFormData(options.body)) {
      body = options.body as BodyInit;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }
  }

  const method = options.method || (body ? "POST" : "GET");
  const retries = options.retries ?? (method === "GET" ? 1 : 0);
  const retryDelayMs = options.retryDelayMs ?? 700;
  let lastNetworkError: NetworkError | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      const text = await response.text();
      const payload = parseJson(text);

      if (!response.ok) {
        if (attempt < retries && shouldRetry(response.status)) {
          await delay(retryDelayMs * (attempt + 1));
          continue;
        }
        throw new ApiError(errorMessage(payload, `Request failed with status ${response.status}`), response.status, payload);
      }

      return payload as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      lastNetworkError = normalizeFetchError(error);
      if (attempt < retries) {
        await delay(retryDelayMs * (attempt + 1));
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastNetworkError ?? new NetworkError("Network request failed.");
}

export function absoluteAssetUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://")) {
    return url;
  }
  if (url.startsWith("/")) {
    return `${API_BASE_URL}${url}`;
  }
  return `${API_BASE_URL}/${url}`;
}

export function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function asText(value: unknown, fallback = "Not set"): string {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ") || fallback;
  }
  if (typeof value === "object") {
    return fallback;
  }
  return String(value);
}
