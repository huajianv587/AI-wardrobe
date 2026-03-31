import { requestWithStoredSession } from "./http";

export function fetchAssistantOverview() {
  return requestWithStoredSession({
    path: "/api/v1/client/assistant/overview",
  });
}

export function runQuickMode(mode) {
  return requestWithStoredSession({
    path: "/api/v1/client/assistant/quick-mode",
    method: "POST",
    data: { mode },
  });
}

export function fetchTomorrowAssistant(payload) {
  return requestWithStoredSession({
    path: "/api/v1/client/assistant/tomorrow",
    method: "POST",
    data: payload,
  });
}
