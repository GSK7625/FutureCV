import { fetcher } from "~/lib/fetcher";
import type { ApplicationDto, Job, JobFilters, JobListResult } from "../types";

/**
 * Hiện tại backend mới có Auth API. Khi Jobs API sẵn sàng, các hàm dưới
 * sẽ tự gọi endpoint thật; tạm thời nếu API chưa có, trả về dữ liệu demo
 * để toàn bộ luồng UI hoạt động được.
 */

const DEMO_JOBS: Job[] = [
  {
    id: "1",
    title: "Trưởng Nhóm Phát Triển Phần Mềm (Team Lead)",
    company: "Techcom Solutions VN",
    location: "Hà Nội",
    salaryMin: 25,
    salaryMax: 40,
    jobType: "Toàn thời gian",
    experience: "Trên 3 năm",
    categories: ["IT / Phần mềm"],
    postedAt: new Date(Date.now() - 2 * 864e5).toISOString(),
    hot: true,
    description:
      "Dẫn dắt đội ngũ phát triển sản phẩm, xây dựng kiến trúc hệ thống và đảm bảo chất lượng bản release.",
    requirements: ["5 năm kinh nghiệm phát triển", "Tinh thần dẫn dắt đội nhóm", "Tiếng Anh giao tiếp tốt"],
    benefits: ["Lương thưởng cạnh tranh", "Bảo hiểm sức khỏe cao cấp", "Chế độ remote linh hoạt"],
  },
  {
    id: "2",
    title: "Chuyên Viên Marketing Digital (Tối ưu chuyển đổi)",
    company: "Global Commerce",
    location: "TP. HCM",
    salaryMin: 15,
    salaryMax: 25,
    jobType: "Toàn thời gian",
    experience: "2 năm",
    categories: ["Marketing / PR"],
    postedAt: new Date(Date.now() - 5 * 864e5).toISOString(),
    description:
      "Lên kế hoạch và vận hành các kênh marketing số, tối ưu tỷ lệ chuyển đổi cho website thương mại điện tử.",
    requirements: ["Thành thạo GA4, Google Ads, Meta Ads", "Có mindset dựa trên dữ liệu"],
    benefits: ["Thưởng theo hiệu suất", "Du lịch công ty hằng năm"],
  },
  {
    id: "3",
    title: "Nhân Viên Kinh Doanh B2B Y tế",
    company: "Vietnam Healthcare Group",
    location: "Đà Nẵng",
    jobType: "Toàn thời gian",
    experience: "Dưới 1 năm",
    categories: ["Kinh doanh / Bán hàng"],
    postedAt: new Date(Date.now() - 1 * 864e5).toISOString(),
    hot: true,
    description:
      "Tư vấn và phát triển mạng lưới khách hàng bệnh viện, phòng khám trong khu vực miền Trung.",
    requirements: ["Kỹ năng giao tiếp và đàm phán", "Sẵn sàng công tác tỉnh"],
    benefits: ["Phụ cấp xăng xe", "Lương cứng + hoa hồng hấp dẫn"],
  },
  {
    id: "4",
    title: "Nhân Viên Kế Toán Tổng Hợp",
    company: "EduTech VN",
    location: "Hà Nội",
    salaryMin: 12,
    salaryMax: 18,
    jobType: "Toàn thời gian",
    experience: "2 năm",
    categories: ["Tài chính / Kế toán"],
    postedAt: new Date(Date.now() - 10 * 864e5).toISOString(),
    description: "Theo dõi sổ sách, lập báo cáo tài chính nội bộ và làm việc với cơ quan thuế.",
    requirements: ["Chứng chỉ kế toán", "Thành thạo Excel, MISA"],
    benefits: ["Giờ làm việc linh hoạt"],
  },
  {
    id: "5",
    title: "Nhân Viên Nhân Sự (C&B)",
    company: "Techcom Solutions VN",
    location: "Hà Nội",
    salaryMin: 12,
    salaryMax: 20,
    jobType: "Toàn thời gian",
    experience: "2 năm",
    categories: ["Nhân sự (HR)"],
    postedAt: new Date(Date.now() - 3 * 864e5).toISOString(),
    description: "Quản lý chính sách lương thưởng, phúc lợi và các chương trình giữ chân nhân tài.",
    requirements: ["Hiểu biết luật lao động", "Kinh nghiệm C&B ít nhất 1 năm"],
    benefits: ["Lương review 2 lần/năm"],
  },
  {
    id: "6",
    title: "Thiết Kế Đồ Họa (UI/UX)",
    company: "Global Commerce",
    location: "Từ xa",
    salaryMin: 14,
    salaryMax: 22,
    jobType: "Bán thời gian",
    experience: "1 năm",
    categories: ["Thiết kế / Nghệ thuật"],
    postedAt: new Date(Date.now() - 7 * 864e5).toISOString(),
    description: "Thiết kế giao diện sản phẩm web/app, xây dựng design system thống nhất.",
    requirements: ["Portfolio chất lượng", "Thành thạo Figma"],
    benefits: ["Làm việc từ xa 100%"],
  },
];

function demoList(filters: JobFilters): JobListResult {
  const keyword = (filters.keyword ?? "").trim().toLowerCase();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 5;

  const filtered = DEMO_JOBS.filter((job) => {
    const matchKeyword =
      !keyword ||
      job.title.toLowerCase().includes(keyword) ||
      job.company.toLowerCase().includes(keyword);
    const matchCategory =
      !filters.category?.length ||
      job.categories.some((c) => filters.category!.some((f) => c.toLowerCase().includes(f.toLowerCase())));
    const matchLocation =
      !filters.location?.length || filters.location.includes(job.location);
    const matchType = !filters.jobType?.length || filters.jobType.includes(job.jobType);
    return matchKeyword && matchCategory && matchLocation && matchType;
  });

  const start = (page - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
  };
}

async function withDemoFallback<T>(apiCall: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    if (error instanceof TypeError) {
      // Network lỗi (API chưa chạy) → dữ liệu demo
      return fallback();
    }
    throw error;
  }
}

export function jobService() {
  return {
    list: (filters: JobFilters) =>
      withDemoFallback<JobListResult>(
        () => fetcher<JobListResult>("/api/jobs", { method: "GET", body: undefined }),
        () => demoList(filters),
      ),

    detail: (id: string) =>
      withDemoFallback<Job>(
        () => fetcher<Job>(`/api/jobs/${id}`, { method: "GET", body: undefined }),
        () => {
          const job = DEMO_JOBS.find((j) => j.id === id) ?? DEMO_JOBS[0];
          return job;
        },
      ),

    apply: (dto: ApplicationDto) =>
      fetcher<{ id: string }>("/api/applications", { method: "POST", body: dto, auth: true }),

    similar: (id: string) =>
      withDemoFallback<Job[]>(
        () => fetcher<Job[]>(`/api/jobs/${id}/similar`, { method: "GET", body: undefined }),
        () => DEMO_JOBS.filter((j) => j.id !== id).slice(0, 3),
      ),
  };
}
