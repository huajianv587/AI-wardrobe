import { request } from "./http";
import { MiniProgramAccountResponse, MiniProgramHomeResponse, MiniProgramSession } from "../types/api";

export function fetchMiniProgramHome(session: MiniProgramSession) {
  return request<MiniProgramHomeResponse>({
    path: "/api/v1/client/bootstrap",
    accessToken: session.accessToken
  });
}

export function fetchMiniProgramAccount(session: MiniProgramSession) {
  return request<MiniProgramAccountResponse>({
    path: "/api/v1/client/account",
    accessToken: session.accessToken
  });
}
