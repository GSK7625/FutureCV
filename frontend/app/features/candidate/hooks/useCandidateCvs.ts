/**
 * @file useCandidateCvs.ts
 * @description Hooks truy vấn và tải lên danh sách CV của ứng viên (P3-UC01, P3-UC05).
 * @architecture Sử dụng TanStack Query với candidateQueryKeys.cvs, hỗ trợ invalidate khi tải lên CV mới.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { candidateCvService } from "../services/candidateCvService";
import { candidateQueryKeys } from "../queries/candidateQueryKeys";
import { useAuthStore } from "~/stores/useAuthStore";
import { useUIStore } from "~/stores/useUIStore";

/**
 * Hook lấy toàn bộ danh sách CV đã tải lên của ứng viên hiện tại.
 */
export function useCandidateCvs() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: candidateQueryKeys.cvs.all,
    queryFn: ({ signal }) => candidateCvService.list(signal),
    enabled: !!user && user.role === "candidate",
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook tải lên CV mới dưới dạng PDF. Invalidate danh sách CV khi thành công.
 */
export function useUploadCandidateCv() {
  const queryClient = useQueryClient();
  const showToast = useUIStore((s) => s.showToast);

  return useMutation({
    mutationFn: ({ file, title }: { file: File; title?: string }) =>
      candidateCvService.upload(file, title),
    onSuccess: (newCv) => {
      showToast(`Đã tải lên CV "${newCv.title || "mới"}" thành công`, "success");
      queryClient.invalidateQueries({ queryKey: candidateQueryKeys.cvs.all });
    },
    onError: (err: Error) => {
      showToast(err.message || "Tải lên CV thất bại, vui lòng thử lại.", "error");
    },
  });
}
