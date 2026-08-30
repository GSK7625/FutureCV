import { useMutation } from "@tanstack/react-query";
import { jobService } from "../services/jobService";
import { useUIStore } from "~/stores/useUIStore";
import type { ApplicationDto } from "../types";

export function useApplyJob(jobId: string) {
  const showToast = useUIStore((s) => s.showToast);

  return useMutation({
    mutationFn: (input: Omit<ApplicationDto, "jobId">) => {
      const payload: ApplicationDto = { ...input, jobId };
      return jobService().apply(payload);
    },
    onSuccess: () => {
      showToast("Đã gửi hồ sơ ứng tuyển thành công", "success");
    },
  });
}
