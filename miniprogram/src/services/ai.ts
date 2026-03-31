import { requestWithStoredSession } from "./http";

export function fetchAiDemoWorkflows() {
  return requestWithStoredSession({
    path: "/api/v1/client/ai/workflows",
  });
}

export function runAiDemoWorkflow(data) {
  return requestWithStoredSession({
    path: "/api/v1/ai-demo/run",
    method: "POST",
    data,
  });
}
