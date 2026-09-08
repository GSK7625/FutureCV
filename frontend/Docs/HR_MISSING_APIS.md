# API còn thiếu cho giao diện Nhà tuyển dụng

Tài liệu này đối chiếu giao diện HR với backend trên nhánh `master`, Jira FCV-83, FCV-91, FCV-92 và tài liệu use case FutureCV. Frontend không tự đặt tên endpoint hoặc payload cho các nghiệp vụ chưa được backend công bố.

## Application theo Job

- Lấy danh sách Application thuộc một Job của Company hiện tại.
- Lấy danh sách toàn bộ Application mà Recruiter có quyền xem.
- Hỗ trợ phân trang, tìm theo tên hoặc email và lọc theo trạng thái.
- Lấy chi tiết Application gồm Candidate, CV được dùng lúc Apply, Job, ngày Apply và lịch sử trạng thái.
- Cung cấp quyền xem hoặc tải file CV đã nộp.

## Trạng thái Application

- Cập nhật trạng thái theo luồng `APPLIED → SCREENING → INTERVIEW → OFFER → HIRED`.
- Hỗ trợ `REJECTED` tại các giai đoạn hợp lệ và khóa cập nhật khi Application đã `WITHDRAWN`.
- Nhận lý do thay đổi, người thao tác, thời điểm và tùy chọn gửi thông báo nếu backend giữ yêu cầu này.

## MatchResult và Candidate Ranking

- Trả MatchResult của đúng cặp CV đã Apply và Job.
- Trả Match Score, matched skills, missing skills, experience comparison, education comparison, project relevance và Match Explanation.
- Xếp danh sách Candidate theo Match Score giảm dần cho từng Job.
- Nếu rating, nhận xét, tag hoặc ghi chú riêng vẫn thuộc MVP, backend cần DTO và endpoint ghi/đọc tương ứng.

## Recruitment Pipeline

- Trả dữ liệu Pipeline theo từng Job, gồm Candidate tại mỗi stage và tổng số lượng.
- Chuyển Candidate sang stage hợp lệ và trả lại trạng thái Application mới.
- Cung cấp lịch sử chuyển stage để giao diện hiển thị timeline.
- Cung cấp thống kê Pipeline nếu Dashboard cần conversion rate, time to hire hoặc bottleneck; frontend không tự suy ra các số liệu này từ dữ liệu thiếu.

## Dashboard HR

- Tổng Application và Application mới.
- Số Candidate ở từng stage.
- Số MatchResult đã hoàn tất hoặc lỗi.
- Số lịch phỏng vấn sắp tới.

Hiện Dashboard chỉ hiển thị thống kê Job có thể lấy chính xác từ `GET /api/employer/jobs`.

## Interview

Nếu Interview được giữ trong MVP, backend cần xác nhận hợp đồng cho:

- Danh sách lịch theo Recruiter, Job và khoảng thời gian.
- Tạo lịch từ Application.
- Cập nhật lịch.
- Hủy lịch.
- Thông tin thời gian, múi giờ, hình thức, địa điểm hoặc liên kết họp và người tham gia.

## Yêu cầu chung cho hợp đồng backend

- Mọi endpoint Recruiter phải yêu cầu role `Employer` và kiểm tra quyền theo Company/Job.
- Response và lỗi giữ cùng quy ước với các controller hiện có.
- Tên endpoint, method, DTO và quy tắc chuyển trạng thái cần được backend xác nhận trước khi frontend tích hợp.
- Không trả toàn bộ nội dung CV hoặc dữ liệu cá nhân nhạy cảm nếu màn hình không cần sử dụng.
