import { fetcher } from "~/lib/fetcher";
import type {
  AuthResponseDto,
  LoginDto,
  RegisterCandidateDto,
  RegisterEmployerDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
  GoogleAuthDto,
  MessageDto,
} from "~/types/api";

export const authApi = {
  login: (dto: LoginDto) =>
    fetcher<AuthResponseDto>("/api/auth/login", {
      method: "POST",
      body: dto,
    }),

  registerCandidate: (dto: RegisterCandidateDto) =>
    fetcher<AuthResponseDto>("/api/auth/register/candidate", {
      method: "POST",
      body: dto,
    }),

  registerEmployer: (dto: RegisterEmployerDto) =>
    fetcher<AuthResponseDto>("/api/auth/register/employer", {
      method: "POST",
      body: dto,
    }),

  googleAuth: (dto: GoogleAuthDto) =>
    fetcher<AuthResponseDto>("/api/auth/google", {
      method: "POST",
      body: dto,
    }),

  forgotPassword: (dto: ForgotPasswordDto) =>
    fetcher<MessageDto>("/api/auth/forgot-password", {
      method: "POST",
      body: dto,
    }),

  resetPassword: (dto: ResetPasswordDto) =>
    fetcher<MessageDto>("/api/auth/reset-password", {
      method: "POST",
      body: dto,
    }),

  refreshToken: (dto: RefreshTokenDto) =>
    fetcher<{ accessToken: string; refreshToken: string }>("/api/auth/refresh", {
      method: "POST",
      body: dto,
    }),

  logout: (refreshToken: string) =>
    fetcher<void>("/api/auth/logout", {
      method: "POST",
      body: { refreshToken },
      auth: true,
    }),
};
