export interface AuthResponseDto {
  accessToken: string;
  accessTokenExpiresAt?: string;
  refreshToken: string;
  role: "candidate" | "employer" | "admin";
  id?: string;
  email?: string;
  fullName?: string;
  user?: {
    id?: string;
    email?: string;
    fullName?: string;
  };
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
