import { MissingBackendFeature } from "~/features/hr/components/MissingBackendFeature";

export default function Page() {
  return <MissingBackendFeature eyebrow="LỊCH TUYỂN DỤNG" title="Lịch phỏng vấn" description="Lên lịch phỏng vấn chỉ được mô tả như luồng mở rộng trong tài liệu. Backend trên master chưa có endpoint hoặc DTO cho Interview." requiredData={["Danh sách lịch phỏng vấn theo Recruiter và Job.", "Tạo lịch từ một Application ở giai đoạn Interview.", "Cập nhật thời gian, hình thức, địa điểm hoặc liên kết họp.", "Hủy lịch và đồng bộ trạng thái Application nếu nghiệp vụ yêu cầu."]} action={{ to: "/hr/pipeline", label: "Xem trạng thái Pipeline" }} />;
}
