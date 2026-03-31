import { request } from "./http";

export function fetchAiDemoWorkflows(session) {
  return request({
    path: "/api/v1/client/ai/workflows",
    accessToken: session.accessToken
  });
}

export function runAiDemoWorkflow(session, data) {
  return request({
    path: "/api/v1/ai-demo/run",
    method: "POST",
    data,
    accessToken: session.accessToken
  });
}
