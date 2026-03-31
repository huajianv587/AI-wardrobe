import { request } from "./http";
import { MiniProgramSession, MiniProgramWardrobeResponse } from "../types/api";

export function fetchMiniProgramWardrobe(session: MiniProgramSession) {
  return request<MiniProgramWardrobeResponse>({
    path: "/api/v1/mini-program/wardrobe",
    accessToken: session.accessToken
  });
}
