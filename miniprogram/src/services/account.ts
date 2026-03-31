import { request } from "./http";

export function fetchMiniProgramHome(session) {
  return request({
    path: "/api/v1/client/bootstrap",
    accessToken: session.accessToken
  });
}

export function fetchMiniProgramAccount(session) {
  return request({
    path: "/api/v1/client/account",
    accessToken: session.accessToken
  });
}
