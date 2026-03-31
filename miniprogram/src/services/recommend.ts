import { request } from "./http";

export function fetchRecommendation(session, prompt) {
  return request({
    path: "/api/v1/outfits/recommend",
    method: "POST",
    data: { prompt },
    accessToken: session.accessToken
  });
}
