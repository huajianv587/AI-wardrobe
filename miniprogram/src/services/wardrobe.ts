import { requestWithStoredSession } from "./http";

export function fetchMiniProgramWardrobe() {
  return requestWithStoredSession({
    path: "/api/v1/client/wardrobe",
  });
}
