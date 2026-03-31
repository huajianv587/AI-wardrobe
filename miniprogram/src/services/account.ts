import { requestWithStoredSession } from "./http";

export function fetchMiniProgramHome() {
  return requestWithStoredSession({
    path: "/api/v1/client/bootstrap",
  });
}

export function fetchMiniProgramAccount() {
  return requestWithStoredSession({
    path: "/api/v1/client/account",
  });
}
