import { useMutation, useQueryClient } from "@tanstack/react-query";
import { jobService } from "../services/jobService";
import { candidateQueryKeys } from "../queries/candidateQueryKeys";
import { useUIStore } from "~/stores/useUIStore";
import type { ApplicationDto } from "../types";

export function useApplyJob(jobId: string) {
  const queryClient = useQueryClient();
  const showToast = useUIStore((s) => s.showToast);

  return useMutation({
    mutationKey: ["apply-job", jobId],
    mutationFn: (input: Omit<ApplicationDto, "jobId">) => {
      const payload: ApplicationDto = { ...input, jobId };
      return jobService().apply(payload);
    },
    onSuccess: async () => {
      showToast("Đã gửi hồ sơ ứng tuyển thành công", "success");
      await queryClient.invalidateQueries({
        queryKey: candidateQueryKeys.applications.all,
      });
    },
  });
}
