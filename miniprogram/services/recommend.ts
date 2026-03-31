import { request } from "./http";
import { MiniProgramSession } from "../types/api";

export function fetchRecommendation(session: MiniProgramSession, prompt: string) {
  return request({
    path: "/api/v1/outfits/recommend",
    method: "POST",
    data: { prompt },
    accessToken: session.accessToken
  });
}
