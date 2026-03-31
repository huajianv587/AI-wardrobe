import { request } from "./http";
import { AiDemoRunResponse, AiDemoWorkflow, MiniProgramSession } from "../types/api";

export function fetchAiDemoWorkflows(session: MiniProgramSession) {
  return request<AiDemoWorkflow[]>({
    path: "/api/v1/ai-demo/workflows",
    accessToken: session.accessToken
  });
}

export function runAiDemoWorkflow(session: MiniProgramSession, data: { workflow_id: string; prompt: string }) {
  return request<AiDemoRunResponse>({
    path: "/api/v1/ai-demo/run",
    method: "POST",
    data,
    accessToken: session.accessToken
  });
}
