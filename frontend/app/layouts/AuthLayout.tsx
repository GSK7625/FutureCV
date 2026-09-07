import { Link, Outlet, useNavigate } from "react-router";
import { IconSparkles, IconFileText, IconChartBar } from "@tabler/icons-react";
import { useAuthStore } from "~/stores/useAuthStore";
import { useEffect } from "react";

const highlights = [
  { icon: IconSparkles, text: "Gợi ý việc làm phù hợp bằng AI" },
  { icon: IconFileText, text: "Tạo CV online chuyên nghiệp trong phút mốt" },
  { icon: IconChartBar, text: "Theo dõi tiến trình ứng tuyển realtime" },
];

export default function AuthLayout() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-2">
      {/* Form bên trái */}
      <div className="flex items-center justify-center px-margin-mobile py-12 md:px-16">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-block">
            <img src="/Logo.png" alt="FutureCV" className="h-11 w-auto object-contain" />
          </Link>
          <Outlet />
        </div>
      </div>

      {/* Panel navy bên phải: brand + visual */}
      <div className="relative hidden items-center justify-center overflow-hidden bg-navy lg:flex">
        <div
          aria-hidden
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(#C8963E 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative z-10 max-w-md px-12 text-white">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gold">
            <IconSparkles size={28} stroke={1.6} className="text-white" />
          </div>
          <h2 className="text-headline leading-snug">
            Chào mừng đến với tương lai sự nghiệp của bạn
          </h2>
          <ul className="mt-10 flex flex-col gap-6">
            {highlights.map((item) => (
              <li key={item.text} className="flex items-center gap-4 text-white/85">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <item.icon size={20} stroke={1.6} className="text-gold" />
                </span>
                {item.text}
              </li>
            ))}
          </ul>
          <div className="mt-12 border-t border-white/15 pt-6 text-label-sm text-white/50">
            Hơn 10.000 nhà tuyển dụng đang chờ đón bạn trên FutureCV.
          </div>
        </div>
      </div>
    </div>
  );
}
