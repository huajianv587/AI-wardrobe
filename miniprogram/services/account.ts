import { request } from "./http";
import { MiniProgramAccountResponse, MiniProgramHomeResponse, MiniProgramSession } from "../types/api";

export function fetchMiniProgramHome(session: MiniProgramSession) {
  return request<MiniProgramHomeResponse>({
    path: "/api/v1/mini-program/home",
    accessToken: session.accessToken
  });
}

export function fetchMiniProgramAccount(session: MiniProgramSession) {
  return request<MiniProgramAccountResponse>({
    path: "/api/v1/mini-program/account",
    accessToken: session.accessToken
  });
}
