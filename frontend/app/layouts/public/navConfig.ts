/**
 * @file navConfig.ts
 * @description File cấu hình dữ liệu tĩnh cho toàn bộ Navigation: Mega Menu Việc làm, Menu CV, Menu Công ty và Footer.
 * @architecture Tuân thủ Open/Closed Principle (OCP): Dễ dàng thêm bớt danh mục mà không phải sửa đổi JSX của Header/Footer.
 */

export interface NavItem {

  label: string;
  href: string;
  iconName?: string;
  badge?: string;
}

export const JOB_MENU_ACTIONS: NavItem[] = [
  { label: "Tìm việc làm", href: "/", iconName: "search" },
  { label: "Việc làm đã lưu", href: "/", iconName: "bookmark" },
  { label: "Việc làm đã ứng tuyển", href: "/", iconName: "file-text" },
  { label: "Việc làm phù hợp", href: "/", iconName: "thumb-up" },
];

export const COMPANY_MENU_ACTIONS: NavItem[] = [
  { label: "Danh sách công ty", href: "/#companies", iconName: "building" },
  { label: "Công ty", href: "/#companies", iconName: "sparkles", badge: "Pro" },
];

export const JOB_POSITION_LINKS: { label: string; href: string }[] = [
  { label: "Việc làm Nhân viên kinh doanh", href: "/" },
  { label: "Việc làm Lao động phổ thông", href: "/" },
  { label: "Việc làm Kế toán", href: "/" },
  { label: "Việc làm Senior", href: "/" },
  { label: "Việc làm Marketing", href: "/" },
  { label: "Việc làm Kỹ sư xây dựng", href: "/" },
  { label: "Việc làm Hành chính nhân sự", href: "/" },
  { label: "Việc làm Thiết kế đồ họa", href: "/" },
  { label: "Việc làm Chăm sóc khách hàng", href: "/" },
  { label: "Việc làm Bất động sản", href: "/" },
  { label: "Việc làm Ngân hàng", href: "/" },
  { label: "Việc làm Giáo dục", href: "/" },
  { label: "Việc làm IT", href: "/" },
  { label: "Việc làm Telesales", href: "/" },
];

export const JOB_FIELD_LINKS: { label: string; href: string }[] = [
  { label: "Việc làm Sản xuất", href: "/" },
  { label: "Việc làm Bán lẻ - Hàng tiêu dùng - FMCG", href: "/" },
  { label: "Việc làm IT - Phần mềm", href: "/" },
  { label: "Việc làm Xây dựng", href: "/" },
  { label: "Việc làm Giáo dục/Đào tạo", href: "/" },
];

export const CV_STYLE_LINKS: NavItem[] = [
  { label: "Mẫu CV Đơn giản", href: "/cv/templates?category=simple", iconName: "box" },
  { label: "Mẫu CV Ấn tượng", href: "/cv/templates?category=impressive", iconName: "compass" },
  { label: "Mẫu CV Chuyên nghiệp", href: "/cv/templates?category=professional", iconName: "star" },
  { label: "Mẫu CV Harvard", href: "/cv/templates?category=harvard", iconName: "writing" },
];

export const CV_ROLE_LINKS: NavItem[] = [
  { label: "Nhân viên kinh doanh", href: "/cv/templates", iconName: "briefcase" },
  { label: "Lập trình viên", href: "/cv/templates", iconName: "briefcase" },
  { label: "Nhân viên kế toán", href: "/cv/templates", iconName: "briefcase" },
  { label: "Chuyên viên marketing", href: "/cv/templates", iconName: "briefcase" },
];

export const CV_TOOL_LINKS: NavItem[] = [
  { label: "Quản lý CV", href: "/cv/templates", iconName: "file-text" },
  { label: "Tải CV lên", href: "/cv/templates", iconName: "cloud-upload" },
  { label: "Hướng dẫn viết CV", href: "/cv/templates", iconName: "file-description" },
];

export const FOOTER_SECTIONS = [
  {
    title: "Dành cho ứng viên",
    links: [
      { label: "Tìm việc làm mới nhất", href: "/" },
      { label: "Tạo CV chuyên nghiệp", href: "/cv/templates" },
      { label: "Phân tích CV bằng AI", href: "/" },
    ],
  },
  {
    title: "Dành cho nhà tuyển dụng",
    links: [
      { label: "Đăng tin tuyển dụng", href: "/register" },
      { label: "Tìm kiếm hồ sơ ứng viên", href: "/register" },
      { label: "Giải pháp AI ATS", href: "/register" },
    ],
  },
  {
    title: "Liên hệ hỗ trợ",
    items: [
      "Hotline: 024 6680 5588",
      "Email: hotro@futurecv.vn",
      "Địa chỉ: Hà Nội & TP. Hồ Chí Minh",
    ],
  },
];
