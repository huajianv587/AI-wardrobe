import Taro from "@tarojs/taro";

import { MINI_PROGRAM_API_BASE_URL } from "./config";

export async function request<T>(options: {
  path: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  data?: unknown;
  accessToken?: string;
}) {
  const response = await Taro.request<T>({
    url: `${MINI_PROGRAM_API_BASE_URL}${options.path}`,
    method: options.method ?? "GET",
    data: options.data,
    header: {
      "Content-Type": "application/json",
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {})
    }
  });

  if (response.statusCode >= 400) {
    throw new Error((response.data as { detail?: string }).detail ?? "Mini program API request failed.");
  }

  return response.data;
}
