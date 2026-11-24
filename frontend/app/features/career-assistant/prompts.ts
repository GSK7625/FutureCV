export interface MvpSamplePrompt {
  id: "match" | "skills" | "summary" | "cover-letter" | "roadmap";
  badge: string;
  title: string;
  description: string;
  prompt: string;
  alternatePrompt?: {
    label: string;
    prompt: string;
  };
}

export const MVP_SAMPLE_PROMPTS: readonly MvpSamplePrompt[] = [
  {
    id: "match",
    badge: "Đánh giá độ phù hợp",
    title: "Phân tích mức độ phù hợp CV & Job",
    description: "Đối chiếu điểm mạnh thực tế, kinh nghiệm và khoảng trống với yêu cầu tuyển dụng.",
    prompt: "Hãy đánh giá mức độ phù hợp giữa CV của tôi và công việc đang chọn, nêu rõ điểm mạnh thực tế và những điểm cần lưu ý.",
  },
  {
    id: "skills",
    badge: "Kỹ năng còn thiếu",
    title: "Phân tích kỹ năng thiếu & cách bù đắp",
    description: "Xác định kỹ năng còn thiếu theo JD và gợi ý cách bổ sung sát thực tế.",
    prompt: "Phân tích các kỹ năng tôi còn thiếu so với yêu cầu công việc và gợi ý cách cải thiện thực tế nhất.",
  },
  {
    id: "summary",
    badge: "Career Summary",
    title: "Viết lại Career Summary cho CV",
    description: "Tối ưu phần giới thiệu bản thân dựa trên kinh nghiệm và dự án có thật trong CV.",
    prompt: "Hãy viết lại phần Career Summary trong CV của tôi dựa trên kinh nghiệm và kỹ năng thực tế để thu hút nhà tuyển dụng hơn.",
  },
  {
    id: "cover-letter",
    badge: "Cover Letter",
    title: "Viết Cover Letter cá nhân hóa",
    description: "Soạn thư ứng tuyển chuyên nghiệp gắn với CV và JD (hỗ trợ tiếng Việt & tiếng Anh).",
    prompt: "Viết giúp tôi một Cover Letter cá nhân hóa theo CV hiện tại và mô tả công việc đang chọn bằng tiếng Việt.",
    alternatePrompt: {
      label: "Bản tiếng Anh",
      prompt: "Write a personalized, concise Cover Letter in English tailored to my CV and this target job.",
    },
  },
  {
    id: "roadmap",
    badge: "Lộ trình phát triển",
    title: "Xây dựng lộ trình học tập & nghề nghiệp",
    description: "Lập kế hoạch nâng cấp kỹ năng và dự án theo từng mốc thời gian rõ ràng.",
    prompt: "Xây dựng lộ trình học tập và phát triển nghề nghiệp theo từng giai đoạn để tôi đáp ứng tốt hơn vị trí mục tiêu.",
  },
];
