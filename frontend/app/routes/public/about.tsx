import { Link } from "react-router";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FC</span>
            </div>
            <h1 className="text-xl font-bold text-slate-50">FutureCV</h1>
          </Link>
          
          <Link
            to="/"
            className="px-4 py-2 text-slate-300 hover:text-white text-sm font-medium transition-colors"
          >
            ← Trang chủ
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16 max-w-4xl">
        <h2 className="text-4xl font-bold text-slate-50 mb-8">Về FutureCV</h2>
        
        <div className="space-y-6 text-slate-300 leading-relaxed">
          <p className="text-lg">
            FutureCV là nền tảng tuyển dụng thông minh, kết nối nhà tuyển dụng với ứng viên tiềm năng 
            một cách nhanh chóng và hiệu quả.
          </p>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 my-8">
            <h3 className="text-2xl font-semibold text-cyan-400 mb-4">Sứ mệnh</h3>
            <p>
              Chúng tôi tin rằng mọi người đều xứng đáng có một công việc phù hợp với kỹ năng và 
              đam mê của mình. FutureCV được xây dựng để làm cho quá trình tuyển dụng trở nên 
              minh bạch, công bằng và hiệu quả hơn cho cả hai bên.
            </p>
          </div>

          <h3 className="text-2xl font-semibold text-slate-50 mt-8 mb-4">Tính năng chính</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-6">
              <h4 className="font-semibold text-slate-50 mb-2">Cho ứng viên</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>• Tìm kiếm công việc phù hợp với kỹ năng</li>
                <li>• Nộp hồ sơ trực tuyến nhanh chóng</li>
                <li>• Theo dõi trạng thái ứng tuyển</li>
                <li>• Quản lý profile chuyên nghiệp</li>
              </ul>
            </div>

            <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-6">
              <h4 className="font-semibold text-slate-50 mb-2">Cho nhà tuyển dụng</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>• Đăng tin tuyển dụng dễ dàng</li>
                <li>• Quản lý hồ sơ ứng viên hiệu quả</li>
                <li>• Lên lịch phỏng vấn tự động</li>
                <li>• Phân tích và báo cáo chi tiết</li>
              </ul>
            </div>
          </div>

          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-8 my-8">
            <h3 className="text-2xl font-semibold text-cyan-400 mb-4">Công nghệ hiện đại</h3>
            <p>
              FutureCV được xây dựng trên nền tảng công nghệ mới nhất: ASP.NET Core, React, 
              PostgreSQL, và nhiều công nghệ tiên tiến khác để đảm bảo hiệu suất cao, bảo mật 
              tối đa và trải nghiệm người dùng mượt mà.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-700/50 bg-slate-900/80 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-6 py-8">
          <p className="text-slate-400 text-sm text-center">
            © 2026 FutureCV. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
