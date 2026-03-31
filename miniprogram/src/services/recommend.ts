import { requestWithStoredSession } from "./http";

export function fetchRecommendation(prompt) {
  return requestWithStoredSession({
    path: "/api/v1/outfits/recommend",
    method: "POST",
    data: { prompt },
  });
}
