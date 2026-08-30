export interface AuthResponseDto {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  role: "candidate" | "employer" | "admin";
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterCandidateDto {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface MessageDto {
  message: string;
}
