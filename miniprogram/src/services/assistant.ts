import { request } from "./http";

export function fetchAssistantOverview(session) {
  return request({
    path: "/api/v1/client/assistant/overview",
    accessToken: session.accessToken
  });
}

export function runQuickMode(session, mode) {
  return request({
    path: "/api/v1/client/assistant/quick-mode",
    method: "POST",
    data: { mode },
    accessToken: session.accessToken
  });
}

export function fetchTomorrowAssistant(session, payload) {
  return request({
    path: "/api/v1/client/assistant/tomorrow",
    method: "POST",
    data: payload,
    accessToken: session.accessToken
  });
}
