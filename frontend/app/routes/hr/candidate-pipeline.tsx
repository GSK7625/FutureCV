import { MissingBackendFeature } from "~/features/hr/components/MissingBackendFeature";

export default function Page() {
  return <MissingBackendFeature eyebrow="ỨNG VIÊN" title="Application và Recruitment Pipeline" description="Phạm vi Jira yêu cầu xem hồ sơ theo từng Job, MatchResult, xếp hạng Candidate và chuyển trạng thái tuyển dụng. Backend trên master chưa cung cấp các hợp đồng này." requiredData={["Danh sách Application theo Job và bộ lọc trạng thái.", "Chi tiết Candidate, CV đã dùng để Apply và lịch sử trạng thái.", "Match Score, kỹ năng phù hợp, kỹ năng thiếu và Match Explanation.", "Cập nhật Application Status và dữ liệu Pipeline theo Job."]} action={{ to: "/hr/jobs", label: "Quay lại tin tuyển dụng" }} />;
}
