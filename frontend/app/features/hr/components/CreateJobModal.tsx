import { useState } from 'react';
import { useCreateJob } from '~/hooks/useJobs';
import type { CreateJobRequest } from '~/types/job';

interface CreateJobModalProps {
  onClose: () => void;
}

export function CreateJobModal({ onClose }: CreateJobModalProps) {
  const createJob = useCreateJob();
  const [formData, setFormData] = useState<CreateJobRequest>({
    title: '',
    description: '',
    requirements: '',
    benefits: '',
    salaryMin: 0,
    salaryMax: 0,
    salaryCurrency: 'USD',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof CreateJobRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Tiêu đề không được để trống';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Mô tả không được để trống';
    }
    if (!formData.requirements.trim()) {
      newErrors.requirements = 'Yêu cầu không được để trống';
    }
    if (formData.salaryMin <= 0) {
      newErrors.salaryMin = 'Lương tối thiểu phải lớn hơn 0';
    }
    if (formData.salaryMax <= 0) {
      newErrors.salaryMax = 'Lương tối đa phải lớn hơn 0';
    }
    if (formData.salaryMax < formData.salaryMin) {
      newErrors.salaryMax = 'Lương tối đa phải lớn hơn lương tối thiểu';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    try {
      await createJob.mutateAsync(formData);
      onClose();
    } catch (error) {
      console.error('Failed to create job:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-50">Đăng tin tuyển dụng mới</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tiêu đề công việc <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={`w-full px-4 py-3 bg-slate-800 border ${errors.title ? 'border-red-500' : 'border-slate-700'} rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500`}
              placeholder="Ví dụ: Senior Frontend Developer"
            />
            {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Mô tả công việc <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              className={`w-full px-4 py-3 bg-slate-800 border ${errors.description ? 'border-red-500' : 'border-slate-700'} rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none`}
              placeholder="Mô tả chi tiết về công việc..."
            />
            {errors.description && <p className="mt-1 text-sm text-red-400">{errors.description}</p>}
          </div>

          {/* Requirements */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Yêu cầu công việc <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.requirements}
              onChange={(e) => handleChange('requirements', e.target.value)}
              rows={4}
              className={`w-full px-4 py-3 bg-slate-800 border ${errors.requirements ? 'border-red-500' : 'border-slate-700'} rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none`}
              placeholder="Yêu cầu về kỹ năng, kinh nghiệm..."
            />
            {errors.requirements && <p className="mt-1 text-sm text-red-400">{errors.requirements}</p>}
          </div>

          {/* Benefits */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Quyền lợi
            </label>
            <textarea
              value={formData.benefits}
              onChange={(e) => handleChange('benefits', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
              placeholder="Các quyền lợi cho ứng viên..."
            />
          </div>

          {/* Salary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Lương tối thiểu <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={formData.salaryMin}
                onChange={(e) => handleChange('salaryMin', parseInt(e.target.value) || 0)}
                className={`w-full px-4 py-3 bg-slate-800 border ${errors.salaryMin ? 'border-red-500' : 'border-slate-700'} rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500`}
                placeholder="1000"
              />
              {errors.salaryMin && <p className="mt-1 text-sm text-red-400">{errors.salaryMin}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Lương tối đa <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={formData.salaryMax}
                onChange={(e) => handleChange('salaryMax', parseInt(e.target.value) || 0)}
                className={`w-full px-4 py-3 bg-slate-800 border ${errors.salaryMax ? 'border-red-500' : 'border-slate-700'} rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500`}
                placeholder="2000"
              />
              {errors.salaryMax && <p className="mt-1 text-sm text-red-400">{errors.salaryMax}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Đơn vị tiền tệ
              </label>
              <select
                value={formData.salaryCurrency}
                onChange={(e) => handleChange('salaryCurrency', e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="USD">USD</option>
                <option value="VND">VND</option>
              </select>
            </div>
          </div>

          {/* Location (optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Địa điểm
            </label>
            <input
              type="text"
              value={formData.location || ''}
              onChange={(e) => handleChange('location', e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              placeholder="Hồ Chí Minh, Hà Nội..."
            />
          </div>

          {/* Experience Level (optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Cấp độ kinh nghiệm
            </label>
            <select
              value={formData.experienceLevel || ''}
              onChange={(e) => handleChange('experienceLevel', e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="">Chọn cấp độ</option>
              <option value="Intern">Intern</option>
              <option value="Fresher">Fresher</option>
              <option value="Junior">Junior</option>
              <option value="Middle">Middle</option>
              <option value="Senior">Senior</option>
              <option value="Lead">Lead</option>
            </select>
          </div>

          {/* Employment Type (optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Loại hình công việc
            </label>
            <select
              value={formData.employmentType || ''}
              onChange={(e) => handleChange('employmentType', e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="">Chọn loại hình</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Freelance">Freelance</option>
            </select>
          </div>

          {/* Closing Date (optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Ngày hết hạn
            </label>
            <input
              type="date"
              value={formData.closingDate || ''}
              onChange={(e) => handleChange('closingDate', e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-slate-800 text-slate-100 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={createJob.isPending}
              className="px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createJob.isPending ? 'Đang xử lý...' : 'Đăng tin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
