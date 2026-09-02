/**
 * @file PersonalInfoForm.tsx
 * @description Form nhập và cập nhật thông tin cá nhân của ứng viên (Họ tên, chức danh, liên hệ, ảnh đại diện, mục tiêu nghề nghiệp).
 * @architecture Tuân thủ SRP (Chỉ quản lý form Cá nhân) & ISP (Chỉ nhận slice state personalInfo).
 */

import type { CvPersonalInfo } from "~/stores/useCvStore";


interface PersonalInfoFormProps {
  personalInfo: CvPersonalInfo;
  onUpdate: (data: Partial<CvPersonalInfo>) => void;
}

export function PersonalInfoForm({ personalInfo, onUpdate }: PersonalInfoFormProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-white p-6 shadow-sm">
      <h3 className="border-b border-border-subtle pb-3 text-label font-bold text-navy">
        Thông tin cá nhân & Mục tiêu
      </h3>

      <div>
        <label className="mb-1 block text-label-sm font-semibold text-ink">Họ và tên</label>
        <input
          type="text"
          value={personalInfo.fullName}
          onChange={(e) => onUpdate({ fullName: e.target.value })}
          className="w-full rounded-xl border border-border-subtle px-3.5 py-2 text-body text-ink outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
          placeholder="VD: Lê Quang Dũng"
        />
      </div>

      <div>
        <label className="mb-1 block text-label-sm font-semibold text-ink">Vị trí ứng tuyển</label>
        <input
          type="text"
          value={personalInfo.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="w-full rounded-xl border border-border-subtle px-3.5 py-2 text-body text-ink outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
          placeholder="VD: Business Development Manager"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-label-sm font-semibold text-ink">Email</label>
          <input
            type="email"
            value={personalInfo.email}
            onChange={(e) => onUpdate({ email: e.target.value })}
            className="w-full rounded-xl border border-border-subtle px-3.5 py-2 text-body text-ink outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-label-sm font-semibold text-ink">Số điện thoại</label>
          <input
            type="text"
            value={personalInfo.phone}
            onChange={(e) => onUpdate({ phone: e.target.value })}
            className="w-full rounded-xl border border-border-subtle px-3.5 py-2 text-body text-ink outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-label-sm font-semibold text-ink">Địa chỉ / Khu vực</label>
          <input
            type="text"
            value={personalInfo.location}
            onChange={(e) => onUpdate({ location: e.target.value })}
            className="w-full rounded-xl border border-border-subtle px-3.5 py-2 text-body text-ink outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-label-sm font-semibold text-ink">Website / LinkedIn</label>
          <input
            type="text"
            value={personalInfo.website}
            onChange={(e) => onUpdate({ website: e.target.value })}
            className="w-full rounded-xl border border-border-subtle px-3.5 py-2 text-body text-ink outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-label-sm font-semibold text-ink">Ảnh đại diện (URL)</label>
        <input
          type="text"
          value={personalInfo.avatar}
          onChange={(e) => onUpdate({ avatar: e.target.value })}
          className="w-full rounded-xl border border-border-subtle px-3.5 py-2 text-body text-ink outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
          placeholder="Link ảnh chân dung..."
        />
      </div>

      <div>
        <label className="mb-1 block text-label-sm font-semibold text-ink">Mục tiêu nghề nghiệp</label>
        <textarea
          rows={4}
          value={personalInfo.summary}
          onChange={(e) => onUpdate({ summary: e.target.value })}
          className="w-full rounded-xl border border-border-subtle px-3.5 py-2.5 text-body text-ink outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
          placeholder="Tóm tắt kinh nghiệm và định hướng phát triển..."
        />
      </div>
    </div>
  );
}
