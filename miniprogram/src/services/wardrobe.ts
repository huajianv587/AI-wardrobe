import { request } from "./http";

export function fetchMiniProgramWardrobe(session) {
  return request({
    path: "/api/v1/client/wardrobe",
    accessToken: session.accessToken
  });
}
