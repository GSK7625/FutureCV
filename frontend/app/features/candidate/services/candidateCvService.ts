/**
 * @file candidateCvService.ts
 * @description Candidate CV Service: Giao tiếp API quản lý CV của ứng viên (P3-UC01, P3-UC05).
 * @architecture Gọi API thật qua fetcher (auth: true), hỗ trợ tải lên file multipart FormData.
 */

import { fetcher } from "~/lib/fetcher";
import type { CvResponse } from "../types";

export const candidateCvService = {
  /**
   * Lấy danh sách tất cả CV của ứng viên hiện tại.
   */
  async list(signal?: AbortSignal): Promise<CvResponse[]> {
    return fetcher<CvResponse[]>("/api/candidate/cvs", {
      method: "GET",
      auth: true,
      signal,
    });
  },

  /**
   * Lấy thông tin chi tiết một CV theo ID.
   */
  async getById(id: string, signal?: AbortSignal): Promise<CvResponse> {
    return fetcher<CvResponse>(`/api/candidate/cvs/${id}`, {
      method: "GET",
      auth: true,
      signal,
    });
  },

  /**
   * Tải lên một file CV mới (hỗ trợ PDF tối đa 5MB).
   */
  async upload(file: File, title?: string): Promise<CvResponse> {
    const formData = new FormData();
    formData.append("cv", file);
    formData.append("file", file); // Fallback

    const url = title?.trim()
      ? `/api/candidate/cvs?title=${encodeURIComponent(title.trim())}`
      : "/api/candidate/cvs";

    return fetcher<CvResponse>(url, {
      method: "POST",
      auth: true,
      body: formData,
    });
  },

  /**
   * Chọn một CV làm CV chính (Primary) cho hồ sơ ứng viên.
   */
  async selectPrimary(id: string): Promise<CvResponse> {
    return fetcher<CvResponse>(`/api/candidate/cvs/${id}/select`, {
      method: "PUT",
      auth: true,
    });
  },
};
