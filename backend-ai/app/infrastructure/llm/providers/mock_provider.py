"""Mock LLM provider for fast unit/integration testing and offline development."""

import re
from typing import Any, TypeVar

from pydantic import BaseModel

from app.ports.llm import LlmPort

T = TypeVar("T", bound=BaseModel)


class MockLlmProvider(LlmPort):
    """Mock LLM implementation that generates realistic deterministic responses without network calls."""

    @property
    def provider_name(self) -> str:
        """Return provider identifier."""
        return "mock"

    @property
    def model_name(self) -> str:
        """Return mock model identifier."""
        return "mock-deterministic"

    async def aclose(self) -> None:
        """No-op cleanup for mock provider."""
        return

    async def generate_text(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.3,
    ) -> str:
        """Generate mock response text based on prompt context."""
        if "<<<BEGIN UNTRUSTED EVALUATION DATA>>>" in prompt:
            job_title_m = re.search(r"Vị trí công việc:\s*([^\n\r]+)", prompt)
            score_m = re.search(r"Điểm phù hợp tổng thể:\s*(\d+)", prompt)
            matched_m = re.search(r"Kỹ năng khớp:\s*([^\n\r]+)", prompt)
            missing_m = re.search(r"Kỹ năng còn thiếu:\s*([^\n\r]+)", prompt)
            exp_cmp_m = re.search(r"Đánh giá kinh nghiệm:\s*([^\n\r]+)", prompt)

            job_title = job_title_m.group(1).strip() if job_title_m else "vị trí tuyển dụng"
            score = int(score_m.group(1)) if score_m else 50
            matched = matched_m.group(1).strip() if matched_m else "Không có"
            missing = missing_m.group(1).strip() if missing_m else "Không có"
            exp_cmp = exp_cmp_m.group(1).strip() if exp_cmp_m else ""

            if score >= 85:
                return (
                    f"Ứng viên có nền tảng vững chắc và độ tương thích rất cao ({score}%) với vị trí {job_title}. "
                    f"Hồ sơ đáp ứng trọn vẹn các kỹ năng cốt lõi bắt buộc ({matched}). "
                    f"{exp_cmp} "
                    f"Ứng viên hoàn toàn tự tin để ứng tuyển và có triển vọng cao vượt qua vòng sơ loại."
                )

            if score >= 50:
                missing_part = (
                    f"còn thiếu các kỹ năng trọng yếu ({missing})"
                    if missing != "Không có"
                    else "cần củng cố thêm kinh nghiệm chuyên sâu"
                )
                return (
                    f"Ứng viên có tiềm năng với vị trí {job_title} (Độ phù hợp: {score}%). "
                    f"Đã đáp ứng một số kỹ năng yêu cầu ({matched}), tuy nhiên {missing_part}. "
                    f"{exp_cmp} "
                    f"Khuyến nghị ứng viên làm nổi bật thêm các dự án thực tế liên quan để tăng sức cạnh tranh."
                )

            return (
                f"Hồ sơ hiện tại có độ tương thích chưa cao ({score}%) so với yêu cầu của vị trí {job_title}. "
                f"Ứng viên còn thiếu các kỹ năng bắt buộc cốt lõi ({missing}). "
                f"{exp_cmp} "
                f"Khuyến nghị ứng viên bổ sung các dự án thực chiến hoặc trau dồi thêm các kỹ năng "
                f"còn thiếu trước khi nộp hồ sơ."
            )

        if "<<<BEGIN UNTRUSTED CAREER CONTEXT>>>" in prompt:
            return self._generate_career_mock_reply(prompt)

        if "CV Review" in prompt or "phản hồi" in prompt or "đánh giá" in prompt.lower():
            return "Ứng viên có nền tảng vững chắc về kỹ năng công nghệ và dự án thực tế."
        if "giải thích" in prompt.lower() or "phù hợp" in prompt.lower():
            return (
                "Ứng viên đáp ứng tốt các yêu cầu cốt lõi của vị trí tuyển dụng. "
                "Có kinh nghiệm thực tiễn và kỹ năng phù hợp với định hướng công việc."
            )
        return (
            "Chào bạn, tôi là FutureCV Career Assistant. Tôi sẵn sàng hỗ trợ giải đáp mọi thắc mắc sự nghiệp của bạn."
        )

    @staticmethod
    def _generate_career_mock_reply(prompt: str) -> str:
        """Generate grounded, structured mock career counseling across the 5 MVP workflows."""
        import json

        skills_m = re.search(r"Kỹ năng ứng viên:\s*([^\n\r]+)", prompt)
        years_m = re.search(r"Tổng số năm kinh nghiệm:\s*([^\n\r]+)", prompt)
        job_title_m = re.search(r"Vị trí công việc đang quan tâm:\s*([^\n\r]+)", prompt)
        score_m = re.search(r"Điểm phù hợp hiện tại:\s*(\d+)/100", prompt)
        matched_m = re.search(r"Kỹ năng đã khớp:\s*([^\n\r]+)", prompt)
        missing_m = re.search(r"Kỹ năng còn thiếu:\s*([^\n\r]+)", prompt)
        cv_score_m = re.search(r"Điểm đánh giá CV \(AI CV Analyzer\):\s*(\d+)/100", prompt)
        missing_data_m = re.search(r"Thiếu dữ liệu bắt buộc:\s*([^\n\r.]+)", prompt)

        skills = skills_m.group(1).strip() if skills_m else ""
        years = years_m.group(1).strip() if years_m else ""
        job_title = job_title_m.group(1).strip() if job_title_m else "vị trí mục tiêu"

        if missing_data_m:
            missing_desc = missing_data_m.group(1).strip()
            body = (
                f"**Thông tin còn thiếu**\n"
                f"Hiện hệ thống chưa có đủ {missing_desc} để tư vấn chính xác.\n\n"
                f"**Đề xuất của AI**\n"
                f"Vui lòng chọn hoặc bổ sung {missing_desc} để tôi có thể đưa ra phân tích "
                f"và nội dung cá nhân hóa dựa trên dữ liệu thực tế."
            )
            followups = [
                f"Sau khi bổ sung {missing_desc}, bạn muốn đánh giá mức độ phù hợp hay viết Cover Letter?",
                "Bạn có thể chia sẻ kỹ năng và kinh nghiệm chính hiện tại của mình không?",
            ]
            return f"{body}\n\n<<<FOLLOWUPS>>>\n{json.dumps(followups, ensure_ascii=False)}\n<<<END FOLLOWUPS>>>"

        if "Nghiệp vụ 4" in prompt:
            wants_en = "TIẾNG ANH" in prompt
            facts = f"Kỹ năng thực tế: {skills or 'theo CV đã chọn'}; kinh nghiệm: {years or 'theo CV đã chọn'}."
            if wants_en:
                exp_val = years or "as detailed in my CV"
                skill_val = skills or "relevant technologies"
                body = (
                    f"**Dữ liệu thực tế sử dụng**\n- Vị trí: {job_title}\n- {facts}\n\n"
                    f"**Đề xuất của AI (English Cover Letter Draft)**\n"
                    f"Dear Hiring Manager,\n\n"
                    f"I am writing to express my interest in the {job_title} position. "
                    f"With practical experience ({exp_val}) and hands-on skills in {skill_val}, "
                    "I am eager to contribute effectively to your team. "
                    "[Please add specific project metrics if available.]\n\n"
                    "Sincerely,\n[Your Name]"
                )
                followups = [
                    "Bạn có muốn rút gọn bản Cover Letter tiếng Anh này cho email ứng tuyển không?",
                    "Hãy viết lại Career Summary bằng tiếng Anh cho đồng bộ với Cover Letter này.",
                ]
            else:
                exp_val = years or "theo CV"
                skill_val = skills or "đã trình bày trong CV"
                body = (
                    f"**Dữ liệu thực tế sử dụng**\n- Vị trí: {job_title}\n- {facts}\n\n"
                    f"**Đề xuất của AI (Mẫu Cover Letter tiếng Việt)**\n"
                    f"Kính gửi Anh/Chị Tuyển dụng,\n\n"
                    f"Tôi viết thư này để ứng tuyển vị trí {job_title}. "
                    f"Dựa trên kinh nghiệm thực tế ({exp_val}) và các kỹ năng {skill_val}, "
                    "tôi mong muốn đóng góp vào mục tiêu phát triển của quý công ty. "
                    "[Bổ sung số liệu/thành tích thực tế nếu có.]\n\n"
                    "Trân trọng,\n[Họ và tên của bạn]"
                )
                followups = [
                    f"Bạn có muốn tôi chuyển Cover Letter cho vị trí {job_title} sang tiếng Anh không?",
                    "Hãy kiểm tra lại Career Summary trong CV để đồng bộ với thư ứng tuyển này.",
                ]
            return f"{body}\n\n<<<FOLLOWUPS>>>\n{json.dumps(followups, ensure_ascii=False)}\n<<<END FOLLOWUPS>>>"

        if "Nghiệp vụ 3" in prompt:
            skill_txt = skills or "công nghệ thông tin"
            exp_txt = years or "thực tế qua các dự án"
            body = (
                f"**Dữ liệu thực tế từ CV**\n"
                f"- Kỹ năng hiện có: {skills or 'chưa liệt kê'}\n"
                f"- Kinh nghiệm: {years or 'chưa xác định'}\n\n"
                f"**Đề xuất của AI (Career Summary gợi ý)**\n"
                f"Ứng viên có nền tảng về {skill_txt} với kinh nghiệm {exp_txt}, "
                "hướng tới việc đóng góp vào các hệ thống chất lượng cao. "
                "[Tự bổ sung số liệu kết quả thực tế nếu có.]"
            )
            followups = [
                f"Bạn có muốn điều chỉnh Career Summary này hướng tới vị trí {job_title} không?",
                "Hãy viết Cover Letter dựa trên Career Summary vừa cập nhật.",
            ]
            return f"{body}\n\n<<<FOLLOWUPS>>>\n{json.dumps(followups, ensure_ascii=False)}\n<<<END FOLLOWUPS>>>"

        if "Nghiệp vụ 2" in prompt:
            missing_txt = missing_m.group(1).strip() if missing_m else "các kỹ năng còn thiếu theo JD"
            body = (
                f"**Dữ liệu thực tế**\n"
                f"- Kỹ năng đã có: {skills or 'theo CV'}\n"
                f"- Kỹ năng còn thiếu: {missing_txt}\n\n"
                f"**Đề xuất của AI**\n"
                f"Ưu tiên học và thực hành dự án nhỏ với {missing_txt}, sau đó cập nhật mô tả dự án thật trong CV."
            )
            followups = [
                f"Xây dựng lộ trình học tập cụ thể để bổ sung {missing_txt}.",
                "Tôi nên nhấn mạnh kỹ năng đã có nào trong Career Summary?",
            ]
            return f"{body}\n\n<<<FOLLOWUPS>>>\n{json.dumps(followups, ensure_ascii=False)}\n<<<END FOLLOWUPS>>>"

        if "Nghiệp vụ 5" in prompt:
            missing_txt = missing_m.group(1).strip() if missing_m else "kỹ năng mục tiêu theo định hướng"
            body = (
                f"**Dữ liệu thực tế**\n"
                f"- Nền tảng hiện tại: {skills or 'theo CV'} ({years or 'mới bắt đầu'})\n"
                f"- Khoảng trống cần bù đắp: {missing_txt}\n\n"
                f"**Đề xuất của AI (Lộ trình phát triển)**\n"
                f"1. Giai đoạn 1 (1-4 tuần): Củng cố nền tảng và học trọng tâm {missing_txt}.\n"
                f"2. Giai đoạn 2 (4-8 tuần): Xây dựng dự án thực hành gắn với yêu cầu của {job_title}.\n"
                f"3. Giai đoạn 3: Cập nhật CV và luyện phỏng vấn kỹ thuật."
            )
            followups = [
                f"Gợi ý đề tài dự án thực hành cho {job_title}.",
                "Viết lại Career Summary phù hợp với lộ trình phát triển này.",
            ]
            return f"{body}\n\n<<<FOLLOWUPS>>>\n{json.dumps(followups, ensure_ascii=False)}\n<<<END FOLLOWUPS>>>"

        if score_m:
            score = score_m.group(1)
            matched_part = f" Kỹ năng đã khớp: {matched_m.group(1).strip()}." if matched_m else ""
            missing_part = f" Kỹ năng còn thiếu: {missing_m.group(1).strip()}." if missing_m else ""
            body = (
                f"**Dữ liệu thực tế (MatchResult chính thức)**\n"
                f"Theo kết quả Matching hiện tại, điểm phù hợp của bạn là {score}/100.{matched_part}{missing_part}\n\n"
                f"**Đề xuất của AI**\n"
                f"Hãy ưu tiên bổ sung phần còn thiếu và làm nổi bật các kỹ năng khớp trong CV."
            )
            followups = [
                "Phân tích chi tiết các kỹ năng còn thiếu và cách cải thiện.",
                f"Viết Cover Letter cho vị trí {job_title} từ kết quả này.",
            ]
            return f"{body}\n\n<<<FOLLOWUPS>>>\n{json.dumps(followups, ensure_ascii=False)}\n<<<END FOLLOWUPS>>>"

        if "Trạng thái Matching:" in prompt:
            body = (
                "**Lưu ý**\nHiện không có điểm Matching chính thức cho cặp CV và việc làm này.\n\n"
                "**Đề xuất của AI**\nDựa trên thông tin CV và mô tả công việc, bạn nên đối chiếu "
                "các kỹ năng yêu cầu và làm nổi bật kinh nghiệm liên quan."
            )
            followups = [
                "Phân tích kỹ năng còn thiếu giữa CV và mô tả công việc này.",
                "Viết lại Career Summary cho phù hợp hơn với vị trí này.",
            ]
            return f"{body}\n\n<<<FOLLOWUPS>>>\n{json.dumps(followups, ensure_ascii=False)}\n<<<END FOLLOWUPS>>>"

        if cv_score_m:
            body = (
                f"**Dữ liệu thực tế**\nĐiểm đánh giá CV (AI CV Analyzer): {cv_score_m.group(1)}/100.\n\n"
                "**Đề xuất của AI**\nDựa trên đánh giá CV hiện tại cùng kinh nghiệm, học vấn và dự án "
                "của bạn, hãy ưu tiên hoàn thiện các điểm yếu và đề xuất cải thiện đã được ghi nhận."
            )
            followups = [
                "Viết lại Career Summary giúp cải thiện điểm CV.",
                "Xây dựng lộ trình nâng cao hồ sơ nghề nghiệp từ đánh giá này.",
            ]
            return f"{body}\n\n<<<FOLLOWUPS>>>\n{json.dumps(followups, ensure_ascii=False)}\n<<<END FOLLOWUPS>>>"

        default_followups = [
            "Bạn muốn tôi viết lại Career Summary hay đánh giá CV hiện tại?",
            "Bạn có muốn chọn một việc làm để phân tích kỹ năng còn thiếu không?",
        ]
        return (
            "Chào bạn, tôi là FutureCV Career Assistant. "
            "Tôi sẵn sàng tư vấn cải thiện CV và định hướng nghề nghiệp dựa trên thông tin bạn đã chọn.\n\n"
            f"<<<FOLLOWUPS>>>\n{json.dumps(default_followups, ensure_ascii=False)}\n<<<END FOLLOWUPS>>>"
        )

    async def generate_structured(
        self,
        prompt: str,
        response_model: type[T],
        system_prompt: str | None = None,
        temperature: float = 0.1,
    ) -> T:
        """Generate structured response instance conforming to response_model."""
        if response_model.__name__ == "StructuredCv":
            from app.domain.cv.heuristic_extractor import extract_structured_cv_heuristically

            if "<<<BEGIN UNTRUSTED CV DOCUMENT>>>" in prompt:
                start = prompt.find("<<<BEGIN UNTRUSTED CV DOCUMENT>>>") + len("<<<BEGIN UNTRUSTED CV DOCUMENT>>>")
                end = prompt.find("<<<END UNTRUSTED CV DOCUMENT>>>", start)
                raw_cv_text = prompt[start:end].strip() if end != -1 else prompt[start:].strip()
            else:
                raw_cv_text = prompt

            extracted = extract_structured_cv_heuristically(raw_cv_text)
            return response_model.model_validate(extracted.model_dump())

        if response_model.__name__ == "CvQualitativeFeedback":
            return response_model.model_validate(
                {
                    "strengths": [
                        "Hồ sơ trình bày rõ ràng, cấu trúc các phần chuyên nghiệp.",
                        "Kỹ năng chuyên môn cốt lõi phù hợp tốt với định hướng công việc.",
                    ],
                    "weaknesses": [
                        "Cần bổ sung thêm số liệu định lượng (metrics/KPIs) để làm nổi bật tác động của các dự án.",
                    ],
                    "improvement_suggestions": [
                        "Bổ sung các kết quả định lượng cụ thể trong phần mô tả kinh nghiệm và dự án.",
                        "Làm rõ vai trò kỹ thuật chính trong các dự án công nghệ tiêu biểu.",
                    ],
                }
            )

        if response_model.__name__ == "MatchExplanation":
            import re

            m_matched = re.search(r"Matched skills:\s*\n([^\n]+)", prompt)
            m_missing = re.search(r"Missing required skills:\s*\n([^\n]+)", prompt)
            matched_str = m_matched.group(1).strip() if m_matched else ""
            missing_str = m_missing.group(1).strip() if m_missing else ""

            matched_list = [s.strip() for s in matched_str.split(",") if s.strip() and s.strip() != "Không có"]
            missing_list = [s.strip() for s in missing_str.split(",") if s.strip() and s.strip() != "Không có"]

            summary = "Mức độ phù hợp tốt. Ứng viên đáp ứng phần lớn các kỹ năng và yêu cầu của vị trí tuyển dụng."
            if "Mức độ phù hợp thấp" in prompt or "Score band: low" in prompt:
                summary = "Mức độ phù hợp thấp. Ứng viên chưa đáp ứng một số kỹ năng bắt buộc của vị trí."
            elif "Phù hợp một phần" in prompt or "Score band: partial" in prompt:
                summary = (
                    "Phù hợp một phần. Ứng viên đáp ứng một số tiêu chí "
                    "nhưng vẫn còn thiếu hụt các yêu cầu cốt lõi của vị trí."
                )
            elif "Mức độ phù hợp cao" in prompt or "Score band: strong" in prompt:
                summary = (
                    "Mức độ phù hợp cao theo các tiêu chí đã được hệ thống đánh giá. "
                    "Vẫn cần xác minh các yêu cầu chưa có đủ bằng chứng trong CV."
                )

            strengths = []
            for s in matched_list[:3]:
                clean_s = re.sub(r"\s*\((?:preferred|ưu tiên)\)", "", s, flags=re.IGNORECASE).strip()
                strengths.append(
                    {
                        "item": clean_s,
                        "statement": f"CV có đề cập kỹ năng {clean_s}.",
                        "evidence_source": "cv.skills",
                        "evidence_text": clean_s,
                    }
                )
            gaps = []
            for s in missing_list[:3]:
                clean_s = re.sub(r"\s*\((?:preferred|ưu tiên)\)", "", s, flags=re.IGNORECASE).strip()
                gaps.append(
                    {
                        "requirement": clean_s,
                        "statement": f"Chưa đủ bằng chứng về kỹ năng bắt buộc {clean_s}.",
                    }
                )

            return response_model.model_validate(
                {
                    "summary": summary,
                    "strengths": strengths,
                    "gaps": gaps,
                    "recommendations": ["Tiếp tục hoàn thiện các kỹ năng chuyên môn cốt lõi."],
                }
            )

        mock_data: dict[str, Any] = {}
        for field_name, field_info in response_model.model_fields.items():
            annotation = field_info.annotation
            args = getattr(annotation, "__args__", ())
            origin = getattr(annotation, "__origin__", None)

            if annotation is str or (isinstance(annotation, type) and issubclass(annotation, str)):
                mock_data[field_name] = f"Mock {field_name}"
            elif annotation is int:
                mock_data[field_name] = 85
            elif annotation is float:
                mock_data[field_name] = 3.5
            elif origin is list:
                if args and (args[0] is str or (isinstance(args[0], type) and issubclass(args[0], str))):
                    mock_data[field_name] = [f"Mock {field_name} item 1", f"Mock {field_name} item 2"]
                else:
                    mock_data[field_name] = []
            elif origin is dict:
                mock_data[field_name] = {}
            else:
                mock_data[field_name] = None

        return response_model.model_validate(mock_data)

    async def extract_text_from_document(
        self,
        document_bytes: bytes,
        mime_type: str = "application/pdf",
        instruction: str | None = None,
    ) -> str:
        """Mock multimodal document text extraction."""
        return (
            "Nguyễn Văn An\n"
            "Email: nguyenvanan@example.com | Điện thoại: 0912345678\n\n"
            "TÓM TẮT NGHỀ NGHIỆP\n"
            "Kỹ sư phần mềm Fullstack với hơn 3 năm kinh nghiệm phát triển hệ thống web quy mô lớn.\n\n"
            "KINH NGHIỆM LÀM VIỆC\n"
            "Công ty Công nghệ ABC - Senior Backend Developer (2022 - 2024)\n"
            "- Thiết kế và tối ưu kiến trúc Microservices sử dụng Python FastAPI và .NET Core.\n"
            "- Tối ưu hóa cơ sở dữ liệu PostgreSQL và Redis caching giảm 40% độ trễ hệ thống.\n\n"
            "HỌC VẤN\n"
            "Đại học Bách Khoa Hà Nội - Kỹ sư Công nghệ Thông tin (2018 - 2022)\n"
            "- Tốt nghiệp loại Giỏi, GPA 3.6/4.0.\n\n"
            "KỸ NĂNG CHUYÊN MÔN\n"
            "Python, C#, FastAPI, .NET Core, Docker, PostgreSQL, React, TypeScript, Git, Redis."
        )
