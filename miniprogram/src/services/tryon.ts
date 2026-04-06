import { requestWithStoredSession } from "./http";

export function renderTryOn(data) {
  return requestWithStoredSession({
    path: "/api/v1/try-on/render",
    method: "POST",
    data,
  });
}
