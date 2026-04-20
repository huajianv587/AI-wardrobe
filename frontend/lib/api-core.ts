import { clearStoredSession, getStoredAccessToken } from "@/lib/auth-session";

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export interface ApiRequestOptions {
  skipAuth?: boolean;
  cache?: RequestCache;
}

export function extractErrorMessage(payload: unknown, status: number) {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if (typeof record.detail === "string") {
      return record.detail;
    }

    if (typeof record.message === "string") {
      return record.message;
    }
  }

  return `Request failed with status ${status}`;
}

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit, options?: ApiRequestOptions): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const headers = new Headers(init?.headers);
  const accessToken = options?.skipAuth ? null : getStoredAccessToken();

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      cache: init?.cache ?? options?.cache ?? "no-store",
      headers,
    });
  } catch (error) {
    throw new ApiError(
      "暂时无法连接后端服务，请确认后端已经启动，并检查当前前端地址是否已加入后端 CORS 白名单。",
      0,
      error
    );
  }

  const text = await response.text();
  const payload = text
    ? (() => {
      try {
        return JSON.parse(text) as unknown;
      } catch {
        return text;
      }
    })()
    : null;

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredSession();
    }

    throw new ApiError(extractErrorMessage(payload, response.status), response.status, payload);
  }

  return payload as T;
}
