import { fetcher } from "~/lib/fetcher";
import type { AuthResponseDto, ForgotPasswordDto, LoginDto, MessageDto, RegisterCandidateDto } from "../types";

export function authService() {
  return {
    login: (dto: LoginDto) =>
      fetcher<AuthResponseDto>("/api/auth/login", { method: "POST", body: dto }),

    registerCandidate: (dto: RegisterCandidateDto) =>
      fetcher<AuthResponseDto>("/api/auth/register/candidate", { method: "POST", body: dto }),

    forgotPassword: (dto: ForgotPasswordDto) =>
      fetcher<MessageDto>("/api/auth/forgot-password", { method: "POST", body: dto }),

    logout: (refreshToken: string) =>
      fetcher<void>("/api/auth/logout", { method: "POST", body: { refreshToken }, auth: true }),
  };
}
