# API còn thiếu cho giao diện Nhà tuyển dụng

Tài liệu này đối chiếu giao diện HR với backend trên `master` sau commit `a36ae3c`. Frontend chỉ tích hợp endpoint và DTO đã được backend công bố.

## API Application đã có và đã tích hợp

- `GET /api/employer/jobs/{jobId}/applications`: danh sách Application theo Job, có lọc trạng thái, rating, từ khóa và phân trang.
- `GET /api/employer/applications/{id}`: chi tiết Candidate, CV, Match Score, Match Explanation, kỹ năng và lịch sử trạng thái.
- `PUT /api/employer/applications/{id}/evaluation`: rating, nhãn đánh giá và ghi chú riêng.
- `PATCH /api/employer/applications/{id}/status`: cập nhật trạng thái và lý do.
- `GET /api/employer/jobs/{jobId}/pipeline`: Recruitment Pipeline theo Job.

## API hoặc dữ liệu vẫn còn thiếu

### Danh sách Application toàn công ty

Backend mới chỉ cung cấp danh sách theo `jobId`. Chưa có endpoint lấy toàn bộ Application mà Recruiter có quyền xem trên nhiều Job trong một truy vấn.

### Dashboard HR tổng hợp

Chưa có endpoint thống kê tổng hợp cho:

- Tổng Application và Application mới của toàn công ty.
- Số Candidate ở từng stage trên tất cả Job.
- Số lịch phỏng vấn sắp tới.
- Conversion rate, time to hire hoặc bottleneck.

Dashboard hiện chỉ hiển thị số liệu Job lấy chính xác từ `GET /api/employer/jobs`.

### Interview

Backend chưa có hợp đồng cho:

- Danh sách lịch theo Recruiter, Job và khoảng thời gian.
- Tạo lịch từ Application.
- Cập nhật hoặc hủy lịch.
- Thời gian, múi giờ, hình thức, địa điểm hoặc liên kết họp và người tham gia.

### Dữ liệu Candidate và MatchResult chi tiết

- DTO có `CandidateEmail` nhưng service hiện trả `null`, nên giao diện chưa thể hiển thị email thực tế.
- MatchResult mới có điểm, giải thích, kỹ năng phù hợp và kỹ năng thiếu; chưa có so sánh kinh nghiệm, học vấn và mức độ liên quan của dự án dưới dạng trường riêng.
- Chưa có endpoint hoặc dữ liệu thông báo Candidate sau khi Recruiter cập nhật trạng thái.

### Quy tắc chuyển trạng thái

Backend chấp nhận mọi giá trị thuộc `Applied`, `Screening`, `Interview`, `Offer`, `Hired`, `Rejected` và chỉ khóa hồ sơ `Withdrawn`. Nếu nghiệp vụ yêu cầu chuyển tuần tự hoặc giới hạn từng bước, backend cần công bố và kiểm tra quy tắc đó.

## Yêu cầu chung

- Các endpoint Recruiter tiếp tục yêu cầu role `Employer` và kiểm tra quyền sở hữu Company/Job.
- Response và lỗi giữ cùng quy ước với controller hiện có.
- Frontend không tự đặt endpoint, payload hoặc số liệu thay cho backend.
