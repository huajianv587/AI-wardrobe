import Taro from "@tarojs/taro";

const API_BASE_URL = process.env.TARO_APP_API_BASE_URL ?? "http://localhost:8000";

export async function request(options) {
  const response = await Taro.request({
    url: `${API_BASE_URL}${options.path}`,
    method: options.method ?? "GET",
    data: options.data,
    header: {
      "Content-Type": "application/json",
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {})
    }
  });

  if (response.statusCode >= 400) {
    const detail = typeof response.data === "object" && response.data !== null && "detail" in response.data
      ? response.data.detail
      : null;
    throw new Error(typeof detail === "string" ? detail : "Mini program API request failed.");
  }

  return response.data;
}
