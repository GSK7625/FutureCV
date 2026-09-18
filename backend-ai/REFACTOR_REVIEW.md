# Backend-AI Refactor Review

> **Tài liệu thẩm định kiến trúc và rà soát mã nguồn (Architecture & Code Review)**  
> **Dự án:** FutureCV  
> **Đối tượng:** Phân hệ Trí tuệ Nhân tạo `backend-ai/`  
> **Người thực hiện:** Senior Software Architect & Code Reviewer  

---

## 1. Thông tin chung

- **Repository:** `https://github.com/GSK7625/FutureCV`
- **Nhánh hiện tại (Current Branch):** `refactor/backend-ai-architecture`
- **Ngày thực hiện review:** 12/09/2026 (Local time: 19:45 ICT)
- **Trạng thái Git Working Tree:** Có các thay đổi chưa staged (`Changes not staged for commit`) và các file mới chưa track (`Untracked files`) nằm hoàn toàn trong phạm vi `backend-ai/`.
- **Phạm vi kiểm tra (Scope reviewed):**
  - **Phạm vi chính (Primary scope):** Toàn bộ thư mục `backend-ai/` (Mã nguồn `app/`, cấu hình `pyproject.toml`, `requirements.txt`, `Dockerfile`, `.env.example`, tài liệu `README.md`, và test suite `tests/`).
  - **Phạm vi đối chiếu đọc (Read-only secondary scope):** Thư mục `backend/` (ASP.NET Core 8 Web API) nhằm xác minh tính tương thích ranh giới dịch vụ giữa .NET và FastAPI.
- **Tồn tại thay đổi chưa commit:** **CÓ.** Toàn bộ mã refactor đang nằm ở working tree của nhánh `refactor/backend-ai-architecture`. Thư mục `backend/` và `frontend/` hoàn toàn sạch, không bị sửa đổi.
- **Mục đích tài liệu:** Tài liệu này đóng vai trò là bản ảnh chụp thẩm định kỹ thuật (Code Review Snapshot) trung thực và chi tiết, giúp Project Owner và Technical Lead đánh giá độc lập trước khi quyết định merge nhánh vào `master`.

---

## 2. Mục tiêu của đợt refactor

Đợt tái cấu trúc này nhằm chuyển đổi `backend-ai/` từ một thư mục khung sườn (scaffolding) rỗng thành một nền tảng tính toán AI hoàn chỉnh, tuân thủ nghiêm ngặt **Kiến trúc Tổng thể của FutureCV** và **Mô hình Kiến trúc Lục giác / Phân tầng Sạch (Hexagonal / Clean Architecture)**.

### Ranh giới hệ thống (System Boundaries):
```text
React Frontend ──(HTTPS/REST)──► ASP.NET Core Backend (Modular Monolith)
                                         │
                                         ▼ (Internal REST / Pre-shared Key)
                                 FastAPI AI Service (Stateless Compute)
```

1. **ASP.NET Core:**
   - Sở hữu toàn bộ trạng thái nghiệp vụ: Candidate, Recruiter, Company, Job, CV, Application, Recruitment Pipeline.
   - Sở hữu cơ sở dữ liệu PostgreSQL (EF Core, Migrations, Persistence).
   - Sở hữu toàn bộ cơ chế Authentication & Authorization (JWT, Role-based).
   - Đóng vai trò điều phối các tác vụ AI và lưu trữ kết quả tính toán của AI.
   - Là đơn vị duy nhất đưa ra quyết định chuyển đổi trạng thái ứng tuyển (AI chỉ mang tính chất hỗ trợ quyết định).

2. **Python FastAPI (`backend-ai`):**
   - Đóng vai trò là dịch vụ tính toán AI hoàn toàn **Stateless**.
   - **Tuyệt đối không kết nối PostgreSQL** (không có SQLAlchemy, psycopg, migrations hay ORM models).
   - **Tuyệt đối không lưu trữ hay biến đổi trạng thái nghiệp vụ** của ứng viên hoặc công việc.
   - Nhận dữ liệu đã được xác thực từ ASP.NET Core và trả về kết quả phân tích/tính điểm.

### Ranh giới phụ thuộc nội bộ (Inward Dependency Rule):
```text
                      API Layer
                         │
                         ▼
                  Application Layer
                  /              \
                 ▼                ▼
            Domain Layer     Ports (Interfaces)
                                  ▲
                                  │ (implements)
                         Infrastructure Layer
```
- **API $\rightarrow$ Application:** Endpoint chỉ gọi use-case service, không chứa business logic hay gọi trực tiếp LLM SDK.
- **Application $\rightarrow$ Domain & Ports:** Application điều phối nghiệp vụ, gọi pure logic ở Domain và gọi interfaces ở Ports.
- **Infrastructure $\rightarrow$ Ports:** Các triển khai kỹ thuật (PyMuPDF, OpenAI, Mock) hiện thực hóa interface đã định nghĩa ở Ports.
- **Domain Layer:** Chứa thuật toán tính điểm thuần túy, chuẩn hóa dữ liệu. **Hoàn toàn độc lập** với FastAPI, Starlette, HTTP clients, và LLM providers.

---

## 3. So sánh cấu trúc trước và sau

### Before (Trước refactor)
Trước khi refactor, `backend-ai` ở commit `785a16c` chỉ gồm các file khung:
- Các file gốc: `.env.example`, `.gitignore`, `Dockerfile`, `pyproject.toml`, `requirements.txt`, `README.md`.
- Toàn bộ thư mục con trong `app/` (`api/v1`, `core/embeddings`, `core/llm`, `core/pdf`, `core/prompts`, `core/security`, `schemas`, `services`, `utils`) và `tests/` (`unit`, `integration`, `contract`) chỉ chứa các file rỗng `.gitkeep`. Không có mã thực thi.

### After (Hiện tại trong mã nguồn)
Cấu trúc cây thư mục thực tế hiện tại:
```text
backend-ai/
├── Dockerfile
├── README.md
├── REFACTOR_REVIEW.md
├── pyproject.toml
├── requirements.txt
├── requirements-dev.txt
├── .env.example
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py
│   │   ├── exception_handlers.py
│   │   ├── middleware/
│   │   │   ├── __init__.py
│   │   │   ├── correlation_id.py
│   │   │   └── internal_auth.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── career.py
│   │       ├── cv_analysis.py
│   │       ├── health.py
│   │       ├── matching.py
│   │       └── router.py
│   ├── application/
│   │   ├── __init__.py
│   │   ├── career_assistant.py
│   │   ├── cv_analyzer.py
│   │   ├── matching_service.py
│   │   └── ranking_service.py
│   ├── contracts/
│   │   ├── __init__.py
│   │   ├── career.py
│   │   ├── common.py
│   │   ├── cv.py
│   │   ├── cv_analysis.py
│   │   ├── errors.py
│   │   ├── job.py
│   │   └── matching.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   └── exceptions.py
│   ├── domain/
│   │   ├── __init__.py
│   │   ├── cv/
│   │   │   ├── __init__.py
│   │   │   ├── normalization.py
│   │   │   └── scoring.py
│   │   └── matching/
│   │       ├── __init__.py
│   │       ├── education_match.py
│   │       ├── experience_match.py
│   │       ├── scoring.py
│   │       └── skill_match.py
│   ├── infrastructure/
│   │   ├── __init__.py
│   │   ├── documents/
│   │   │   ├── __init__.py
│   │   │   └── pdf_parser.py
│   │   └── llm/
│   │       ├── __init__.py
│   │       ├── factory.py
│   │       └── providers/
│   │           ├── __init__.py
│   │           ├── mock_provider.py
│   │           └── openai_provider.py
│   ├── observability/
│   │   ├── __init__.py
│   │   └── logging.py
│   ├── ports/
│   │   ├── __init__.py
│   │   ├── document_parser.py
│   │   └── llm.py
│   └── prompts/
│       ├── __init__.py
│       ├── career_v1.py
│       ├── cv_analysis_v1.py
│       ├── cv_extraction_v1.py
│       └── match_explanation_v1.py
├── evaluation/
│   ├── README.md
│   └── datasets/
│       ├── .gitkeep
│       └── README.md
└── tests/
    ├── __init__.py
    ├── architecture/
    │   ├── __init__.py
    │   └── test_boundaries.py
    ├── contract/
    │   ├── __init__.py
    │   ├── README.md
    │   ├── test_candidate_ranking_contract.py
    │   ├── test_career_assistant_contract.py
    │   ├── test_cv_analyzer_contract.py
    │   └── test_job_matching_contract.py
    ├── integration/
    │   ├── __init__.py
    │   ├── test_ai_endpoints.py
    │   ├── test_exceptions.py
    │   └── test_health.py
    └── unit/
        ├── __init__.py
        ├── test_config.py
        ├── test_correlation_id.py
        ├── test_cv_scoring.py
        ├── test_education_matching.py
        ├── test_experience_matching.py
        ├── test_internal_auth.py
        ├── test_ranking_service.py
        └── test_skill_matching.py
```

### Bảng chuyển đổi cấu trúc (Structural Migration Table):

| Đường dẫn cũ (Scaffold rỗng) | Đường dẫn mới | Mục đích kiến trúc | Trạng thái Review |
| :--- | :--- | :--- | :--- |
| `app/schemas/` | `app/contracts/` | Tách biệt hợp đồng truyền thông (.NET $\leftrightarrow$ Python) khỏi model nội bộ. | **OK** |
| `app/core/pdf/` | `app/infrastructure/documents/pdf_parser.py` | PyMuPDF là chi tiết kỹ thuật của `DocumentParserPort` thuộc Infrastructure. | **OK** |
| `app/core/llm/` | `app/infrastructure/llm/` & `app/ports/llm.py` | Phân tách interface `LlmPort` và các triển khai cụ thể (OpenAI, Mock). | **OK** |
| `app/core/prompts/` | `app/prompts/` | Quản lý Prompts như các production artifacts có phiên bản độc lập (`_v1.py`). | **OK** |
| `app/core/security/` | `app/api/middleware/internal_auth.py` | Bảo mật HTTP Token nội bộ thuộc tầng API Middleware. | **OK** |
| `app/services/` | `app/application/` & `app/domain/` | Tách Use-case Orchestration khỏi Pure Domain Logic. | **OK** |
| `app/utils/` | `app/domain/cv/normalization.py` | Đưa logic chuẩn hóa kỹ năng về đúng Domain. | **OK** |
| `app/core/embeddings/` | *(Không tạo rỗng)* | Không tạo adapter giả khi MVP chưa có yêu cầu vector embeddings cụ thể. | **OK** |

---

## 4. Danh sách tất cả file đã thay đổi

### 4.1. Added Files (Files thêm mới)

| File | Trách nhiệm chính | Chi tiết triển khai | Dependencies nội bộ | Ghi chú của Reviewer |
| :--- | :--- | :--- | :--- | :--- |
| `app/__init__.py` | Package marker | Khởi tạo module package | Không | Chuẩn |
| `app/main.py` | FastAPI Application Entrypoint | Khởi tạo FastAPI app, lifespan, middleware CORS & Correlation ID, router | `core.config`, `api.v1.router`, `observability.logging` | Bật CORS `*` cần xem xét |
| `app/core/__init__.py` | Core package marker | Package initialization | Không | Chuẩn |
| `app/core/config.py` | Cấu hình trung tâm | Pydantic Settings đọc biến môi trường, validate API keys & upload limits | `pydantic_settings`, `pydantic` | Cần rà soát default `MAX_UPLOAD_SIZE_BYTES` |
| `app/core/exceptions.py` | Định nghĩa ngoại lệ | Custom error classes: `FutureCvAiError`, `InternalAuthError`, `DocumentParsingError`, v.v. | Standard library | Đã có backward alias `FutureCvAiException` |
| `app/observability/__init__.py` | Observability package | Package marker | Không | Chuẩn |
| `app/observability/logging.py` | Logging PII-safe | Định dạng log chuẩn, tiêm `correlation_id` qua `contextvars.ContextVar` | Standard library | Lọc PII tốt, không log full payload |
| `app/api/__init__.py` | API package marker | Package initialization | Không | Chuẩn |
| `app/api/deps.py` | Dependency Injection | Cung cấp dependencies cho endpoints (services, ports, settings) | `application.*`, `infrastructure.*`, `ports.*` | Dependency injection sạch |
| `app/api/exception_handlers.py` | Xử lý lỗi toàn cục | Sanitize lỗi 401, 404, 422, 500, trả về cấu trúc `ErrorResponse` chuẩn | `core.exceptions`, `observability.logging` | Bắt cả `StarletteHTTPException` cho 404 |
| `app/api/middleware/__init__.py` | Middleware package | Package initialization | Không | Chuẩn |
| `app/api/middleware/correlation_id.py` | X-Correlation-Id middleware | Kiểm tra, làm sạch mã correlation ID và gắn vào response headers | `observability.logging` | Regex sanitize chống Log Injection |
| `app/api/middleware/internal_auth.py` | Xác thực API nội bộ | Kiểm tra `X-Internal-API-Key` dùng `hmac.compare_digest` | `core.config`, `observability.logging` | Chống timing attack, fail-closed ở prod |
| `app/api/v1/__init__.py` | v1 package marker | Package initialization | Không | Chuẩn |
| `app/api/v1/router.py` | Master Router v1 | Tích hợp health, cv, matching, career routers vào prefix `/api/v1` | `api.v1.*` | Cấu trúc định tuyến rõ ràng |
| `app/api/v1/health.py` | Health & Ready Probes | `GET /health` (liveness) và `GET /ready` (readiness) | `core.config` | Liveness không gọi LLM bên ngoài (đúng spec) |
| `app/api/v1/cv_analysis.py` | CV Analysis endpoints | `POST /cv/analyze`, `POST /cv/analyze-text`, `POST /cv/improve` | `application.cv_analyzer`, `contracts.cv_analysis` | Hỗ trợ cả file PDF và raw text |
| `app/api/v1/matching.py` | Matching endpoints | `POST /job/match`, `POST /candidates/rank` | `application.matching_service`, `application.ranking_service` | Tái sử dụng matching service |
| `app/api/v1/career.py` | Career Chat endpoint | `POST /career/chat` | `application.career_assistant`, `contracts.career` | Giao tiếp hội thoại |
| `app/contracts/__init__.py` | Contracts package | Package marker | Không | Chuẩn |
| `app/contracts/common.py` | Common DTOs | `ResponseMeta` (metadata, version, timing, correlation_id) | `pydantic` | Chuẩn hóa metadata |
| `app/contracts/cv.py` | Structured CV DTOs | `StructuredCv`, `WorkExperienceItem`, `EducationItem`, `ProjectItem` | `pydantic` | Đầy đủ trường dữ liệu CV |
| `app/contracts/job.py` | Structured Job DTOs | `StructuredJob` (kỹ năng yêu cầu/ưu tiên, kinh nghiệm, học vấn) | `pydantic` | Đầy đủ trường JD |
| `app/contracts/cv_analysis.py` | CV Analysis DTOs | `CvAnalysisContentRequest`, `CvAnalysisResponse` | `contracts.common`, `contracts.cv` | Chuẩn hóa kết quả đánh giá CV |
| `app/contracts/matching.py` | Matching DTOs | `MatchRequest`, `MatchResult`, `CandidateRankRequest`, `CandidateRankResponse` | `contracts.common`, `contracts.cv`, `contracts.job` | DTO tái sử dụng cho cả single & rank |
| `app/contracts/career.py` | Career Assistant DTOs | `CareerAssistantRequest`, `CareerAssistantResponse`, `ChatMessage` | `contracts.common`, `contracts.cv`, `contracts.job` | Hội thoại có context |
| `app/contracts/errors.py` | Error DTO | `ErrorResponse` (error_code, message, details, correlation_id) | `pydantic` | Thống nhất lỗi REST API |
| `app/domain/__init__.py` | Domain package | Package marker | Không | Chuẩn |
| `app/domain/cv/__init__.py` | CV domain package | Package marker | Không | Chuẩn |
| `app/domain/cv/normalization.py` | Chuẩn hóa kỹ năng | Hàm `normalize_skill`, `normalize_skills`, từ điển canonical aliases | Standard library (`re`) | Độc lập, không phụ thuộc third-party |
| `app/domain/cv/scoring.py` | Tính điểm chất lượng CV | `evaluate_cv_quality` tính điểm completeness (0-100), sinh strengths/weaknesses | Standard library (`dataclasses`) | Thuật toán deterministic, minh bạch |
| `app/domain/matching/__init__.py` | Matching domain package | Package marker | Không | Chuẩn |
| `app/domain/matching/skill_match.py` | So khớp kỹ năng | `calculate_skill_match` tính tỷ lệ required (80%) + preferred (20%) | `domain.cv.normalization` | Deterministic logic |
| `app/domain/matching/experience_match.py` | So khớp kinh nghiệm | `calculate_experience_match` so sánh số năm thực tế vs yêu cầu | Standard library (`dataclasses`) | Deterministic logic |
| `app/domain/matching/education_match.py` | So khớp học vấn | `calculate_education_match` so sánh bậc học vấn theo thang thứ tự | Standard library (`dataclasses`) | Deterministic logic |
| `app/domain/matching/scoring.py` | Tổng hợp điểm match | `compute_overall_match_score` kết hợp Skill(50%) + Exp(30%) + Edu(20%) | `domain.matching.*` | Trọng số hardcoded cần product review |
| `app/ports/__init__.py` | Ports package | Package marker | Không | Chuẩn |
| `app/ports/document_parser.py` | Interface Parser | `DocumentParserPort(ABC)` với phương thức `parse_pdf` | `abc` | Interface trừu tượng |
| `app/ports/llm.py` | Interface LLM | `LlmPort(ABC)` với `generate_text` và `generate_structured` | `abc`, `pydantic` | Interface trừu tượng |
| `app/infrastructure/__init__.py` | Infrastructure package | Package marker | Không | Chuẩn |
| `app/infrastructure/documents/__init__.py` | Documents infra package | Package marker | Không | Chuẩn |
| `app/infrastructure/documents/pdf_parser.py` | PyMuPDF Parser Adapter | `PyMuPdfDocumentParser` hiện thực `DocumentParserPort`, chạy qua threadpool | `fitz`, `anyio`, `core.config`, `core.exceptions` | Validate magic bytes, page, size |
| `app/infrastructure/llm/__init__.py` | LLM infra package | Package marker | Không | Chuẩn |
| `app/infrastructure/llm/factory.py` | LLM Provider Factory | Hàm `get_llm_provider` sinh `MockLlmProvider` hoặc `OpenAiProvider` | `infrastructure.llm.providers.*`, `core.config` | Fallback thông minh ở dev |
| `app/infrastructure/llm/providers/__init__.py` | Providers package | Package marker | Không | Chuẩn |
| `app/infrastructure/llm/providers/mock_provider.py` | Mock LLM Adapter | `MockLlmProvider` phục vụ test và dev offline | `ports.llm` | Hoạt động 100% không cần key |
| `app/infrastructure/llm/providers/openai_provider.py` | OpenAI Adapter | `OpenAiProvider` gọi OpenAI chat completions bằng `httpx` async | `httpx`, `ports.llm`, `core.config` | Có timeout và retry giới hạn |
| `app/prompts/__init__.py` | Prompts package | Package marker | Không | Chuẩn |
| `app/prompts/cv_extraction_v1.py` | Prompt trích xuất CV | Trích xuất JSON từ text CV, chỉ dẫn chống prompt injection | Không | Phiên bản v1 |
| `app/prompts/cv_analysis_v1.py` | Prompt đánh giá CV | Đánh giá điểm mạnh/yếu định tính và đề xuất cải thiện | Không | Phiên bản v1 |
| `app/prompts/match_explanation_v1.py` | Prompt giải thích Matching | Tổng hợp điểm số thành giải thích văn phong tự nhiên tiếng Việt | Không | Phiên bản v1 |
| `app/prompts/career_v1.py` | Prompt Career Assistant | Tư vấn nghề nghiệp dựa trên context ứng viên | Không | Phiên bản v1 |
| `app/application/__init__.py` | Application package | Package marker | Không | Chuẩn |
| `app/application/cv_analyzer.py` | Use-case CV Analyzer | Điều phối: parse PDF $\rightarrow$ LLM extraction $\rightarrow$ domain score $\rightarrow$ LLM qualitative feedback | `ports.*`, `domain.*`, `contracts.*`, `prompts.*` | Không phụ thuộc FastAPI |
| `app/application/matching_service.py` | Use-case Job Matching | Điều phối: gather skills $\rightarrow$ domain sub-matches $\rightarrow$ score $\rightarrow$ LLM explanation | `ports.llm`, `domain.matching.*`, `contracts.*`, `prompts.*` | Core engine duy nhất |
| `app/application/ranking_service.py` | Use-case Ranking | Điều phối xếp hạng ứng viên, tái sử dụng `MatchingService` với `asyncio.Semaphore` | `application.matching_service`, `contracts.matching` | Bounded concurrency tốt |
| `app/application/career_assistant.py` | Use-case Career Assistant | Xử lý hội thoại nghề nghiệp dựa trên context từ ASP.NET Core | `ports.llm`, `contracts.career`, `prompts.*` | Hoàn toàn stateless |
| `requirements-dev.txt` | File dependency phát triển | Chứa pytest, pytest-asyncio, ruff, mypy | Không | Tách rời môi trường dev/test |
| `tests/__init__.py` | Tests package marker | Package initialization | Không | Chuẩn |
| `tests/architecture/__init__.py` | Architecture tests marker | Package initialization | Không | Chuẩn |
| `tests/architecture/test_boundaries.py` | Kiểm thử kiến trúc bằng AST | Kiểm tra cấm database, cấm domain import FastAPI, cấm API import provider SDK | `ast`, `pathlib` | 4 test kiến trúc rất giá trị |
| `tests/contract/__init__.py` | Contract tests marker | Package initialization | Không | Chuẩn |
| `tests/contract/test_cv_analyzer_contract.py` | Test contract CV Analyzer | Kiểm tra tính hợp lệ DTO `StructuredCv`, `CvAnalysisResponse` | `contracts.*` | Đảm bảo schema |
| `tests/contract/test_job_matching_contract.py` | Test contract Matching | Kiểm tra tính hợp lệ DTO `StructuredJob`, `MatchRequest`, `MatchResult` | `contracts.*` | Đảm bảo schema |
| `tests/contract/test_candidate_ranking_contract.py` | Test contract Ranking | Kiểm tra tính hợp lệ DTO `CandidateRankRequest`, `CandidateRankResponse` | `contracts.*` | Đảm bảo schema |
| `tests/contract/test_career_assistant_contract.py` | Test contract Career & Error | Kiểm tra tính hợp lệ DTO `CareerAssistantRequest/Response`, `ErrorResponse` | `contracts.*` | Đảm bảo schema |
| `tests/integration/__init__.py` | Integration tests marker | Package initialization | Không | Chuẩn |
| `tests/integration/test_health.py` | Test endpoints Health | Kiểm tra `/health`, `/ready`, tiêm `X-Correlation-Id` | `fastapi.testclient`, `app.main` | Liveness & Readiness OK |
| `tests/integration/test_exceptions.py` | Test xử lý lỗi HTTP | Kiểm tra 404 sanitized và exception nội bộ biến đổi thành JSON an toàn | `fastapi.testclient`, `app.main` | Sanitization hoạt động tốt |
| `tests/integration/test_ai_endpoints.py` | Test toàn bộ 5 endpoint AI | Test HTTP cho analyze, improve, match, rank, chat | `fastapi.testclient`, `app.main` | Kiểm thử luồng tích hợp |
| `tests/unit/__init__.py` | Unit tests marker | Package initialization | Không | Chuẩn |
| `tests/unit/test_config.py` | Test Settings | Kiểm tra nạp biến môi trường, flags dev/prod, strip whitespace | `core.config` | Settings OK |
| `tests/unit/test_correlation_id.py` | Test Correlation ID | Kiểm tra sanitize ID, lọc ký tự độc hại, sinh UUID4 | `api.middleware.correlation_id` | Chống log injection OK |
| `tests/unit/test_internal_auth.py` | Test Internal API Key | Kiểm tra xác thực token, timing attack protection, fail-closed ở prod | `api.middleware.internal_auth` | Auth an toàn |
| `tests/unit/test_cv_scoring.py` | Test tính điểm CV | Kiểm tra logic tính điểm completeness CV rỗng vs đầy đủ | `domain.cv.scoring` | Điểm số minh bạch |
| `tests/unit/test_skill_matching.py` | Test so khớp kỹ năng | Kiểm tra normalize aliases (React, K8s, C#) và tính điểm skill | `domain.matching.skill_match` | Chuẩn hóa chính xác |
| `tests/unit/test_experience_matching.py` | Test so khớp kinh nghiệm | Kiểm tra trường hợp thừa, thiếu, hoặc không yêu cầu số năm | `domain.matching.experience_match` | Tính toán chính xác |
| `tests/unit/test_education_matching.py` | Test so khớp học vấn | Kiểm tra thang bậc bằng cấp (Đại học, Thạc sĩ, Cử nhân) | `domain.matching.education_match` | Thứ bậc hợp lý |
| `tests/unit/test_ranking_service.py` | Test Ranking Service | Kiểm tra sắp xếp giảm dần theo `match_score` và thứ tự xếp hạng | `application.ranking_service` | Sắp xếp đúng đắn |

### 4.2. Modified Files (Files đã chỉnh sửa)

| File | Trách nhiệm | Thay đổi chính | Ghi chú của Reviewer |
| :--- | :--- | :--- | :--- |
| `backend-ai/.env.example` | Template biến môi trường | Bổ sung `INTERNAL_API_KEY`, các limits upload, provider mặc định `mock` | Cần cập nhật default `MAX_UPLOAD_SIZE_BYTES=5242880` (5MB) |
| `backend-ai/Dockerfile` | Docker build | Bỏ `libmupdf-dev`, chuyển sang user không đặc quyền `appuser`, thêm `HEALTHCHECK` | An toàn hơn bản cũ |
| `backend-ai/README.md` | Tài liệu hệ thống | Viết lại toàn diện: chuẩn hóa ranh giới .NET $\leftrightarrow$ FastAPI, Hexagonal Architecture, 3 capabilities | Phản ánh chính xác code |
| `backend-ai/pyproject.toml` | Cấu hình linter / type-check | Bỏ các rule Ruff lỗi thời (`ANN101`, `ANN102`), cấu hình path `tests` | Đảm bảo Ruff/MyPy pass |
| `backend-ai/requirements.txt` | Runtime dependencies | Tách các thư viện dev/test sang `requirements-dev.txt`, chỉ giữ runtime sạch | Tối ưu kích thước container |

### 4.3. Deleted Files (Files đã xóa)

| File | Lý do xóa |
| :--- | :--- |
| `backend-ai/app/.gitkeep` | Thư mục đã có file thực tế `main.py` và `__init__.py`. |
| `backend-ai/app/api/.gitkeep` | Thư mục đã có mã nguồn API. |
| `backend-ai/app/api/v1/.gitkeep` | Thư mục đã có routers v1. |
| `backend-ai/app/core/.gitkeep` | Thư mục đã có `config.py` và `exceptions.py`. |
| `backend-ai/app/core/embeddings/.gitkeep` | Dọn dẹp thư mục scaffold rỗng (chưa dùng trong MVP). |
| `backend-ai/app/core/llm/.gitkeep` | Dọn dẹp thư mục scaffold rỗng (đã chuyển sang `infrastructure/llm/`). |
| `backend-ai/app/core/pdf/.gitkeep` | Dọn dẹp thư mục scaffold rỗng (đã chuyển sang `infrastructure/documents/`). |
| `backend-ai/app/core/prompts/.gitkeep` | Dọn dẹp thư mục scaffold rỗng (đã chuyển sang `prompts/`). |
| `backend-ai/app/core/security/.gitkeep` | Dọn dẹp thư mục scaffold rỗng (đã chuyển sang `api/middleware/`). |
| `backend-ai/app/schemas/.gitkeep` | Dọn dẹp thư mục scaffold rỗng (đã chuyển sang `contracts/`). |
| `backend-ai/app/services/.gitkeep` | Dọn dẹp thư mục scaffold rỗng (đã chuyển sang `application/`). |
| `backend-ai/app/utils/.gitkeep` | Dọn dẹp thư mục scaffold rỗng (đã chuyển sang `domain/cv/normalization.py`). |
| `backend-ai/tests/contract/.gitkeep` | Thư mục tests đã có code test contract thực tế. |
| `backend-ai/tests/integration/.gitkeep` | Thư mục tests đã có code test integration thực tế. |
| `backend-ai/tests/unit/.gitkeep` | Thư mục tests đã có code test unit thực tế. |

### 4.4. Renamed/Moved Files (Files đã đổi tên / di chuyển)
Không có file mã nguồn nào bị di chuyển trực tiếp từ commit cũ vì commit cũ vốn chỉ có file rỗng `.gitkeep`. Toàn bộ các thư mục rỗng đã được xóa bỏ sạch sẽ và thay bằng cấu trúc phân tầng mới.

---

## 5. Review từng Layer

### 5.1. API Layer (`app/api/`)

- **Router Composition:** File `app/api/v1/router.py` tập hợp toàn bộ các sub-router (`health_router`, `cv_router`, `matching_router`, `career_router`) dưới prefix `/api/v1`. Ngoài ra, `app/main.py` gắn thêm `health_router` ở root `/` để hỗ trợ các container orchestrator probe trực tiếp `/health`.
- **Middleware:**
  1. `CORSMiddleware`: Cho phép tất cả origins `*`. *(Xem mục 7 & 20 về đánh giá an ninh).*
  2. `CorrelationIdMiddleware` (`app/api/middleware/correlation_id.py`): Đọc header `X-Correlation-Id`, dùng regex `^[a-zA-Z0-9_\-\.]{1,128}$` để làm sạch. Nếu không hợp lệ hoặc thiếu thì tự sinh UUID4, lưu vào `correlation_id_ctx` (ContextVar) và trả về trong header response.
- **Dependencies:** `app/api/deps.py` quản lý Dependency Injection thông qua `fastapi.Depends`. Đảm bảo các route nhận service instance mà không cần tự khởi tạo đối tượng trực tiếp.
- **Authentication:** `verify_internal_api_key` (`app/api/middleware/internal_auth.py`) kiểm tra header `X-Internal-API-Key` với `settings.internal_api_key`. Sử dụng `hmac.compare_digest` chống Timing Attack. Endpoint `/health` và `/ready` được miễn xác thực. Ở môi trường development/test, nếu chưa cấu hình key thì bỏ qua; ở production bắt buộc phải có key (fail-closed).
- **Health / Readiness:**
  - `GET /health`: Kiểm tra liveness, trả về ngay `{"status": "ok"}` (200), **không gọi LLM hay external service**.
  - `GET /ready`: Kiểm tra readiness, xác minh cấu hình runtime và API key theo provider được chọn. Không thực hiện suy luận AI trực tiếp.
- **Exception Handling:** `app/api/exception_handlers.py` đăng ký xử lý cho `FutureCvAiError`, `HTTPException`, `StarletteHTTPException` (xử lý 404 cho route không tồn tại), `RequestValidationError` (422) và `Exception` (500). Mọi response lỗi đều được đưa về cấu trúc chuẩn `ErrorResponse` và kèm `correlation_id`.

#### Bảng chi tiết Endpoints:

| Method | Path | Authentication | Request Contract | Response Contract | Implementation Service |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | Không (Public) | None | `{"status": "ok"}` | `app/api/v1/health.py` |
| `GET` | `/ready` | Không (Public) | None | `{"status": "ready/not_ready", "checks": {...}}` | `app/api/v1/health.py` |
| `GET` | `/api/v1/health` | Không (Public) | None | `{"status": "ok"}` | `app/api/v1/health.py` |
| `GET` | `/api/v1/ready` | Không (Public) | None | `{"status": "ready/not_ready", "checks": {...}}` | `app/api/v1/health.py` |
| `POST` | `/api/v1/cv/analyze` | `X-Internal-API-Key` | `UploadFile` (multipart/form-data) | `CvAnalysisResponse` | `CvAnalyzerService.analyze_pdf` |
| `POST` | `/api/v1/cv/analyze-text` | `X-Internal-API-Key` | `CvAnalysisContentRequest` (JSON) | `CvAnalysisResponse` | `CvAnalyzerService.analyze_text` |
| `POST` | `/api/v1/cv/improve` | `X-Internal-API-Key` | `CvAnalysisContentRequest` (JSON) | `CvAnalysisResponse` | `CvAnalyzerService.analyze_text` |
| `POST` | `/api/v1/job/match` | `X-Internal-API-Key` | `MatchRequest` (JSON) | `MatchResult` | `MatchingService.match` |
| `POST` | `/api/v1/candidates/rank` | `X-Internal-API-Key` | `CandidateRankRequest` (JSON) | `CandidateRankResponse` | `RankingService.rank_candidates` |
| `POST` | `/api/v1/career/chat` | `X-Internal-API-Key` | `CareerAssistantRequest` (JSON) | `CareerAssistantResponse` | `CareerAssistantService.chat` |

---

### 5.2. Contracts (`app/contracts/`)

Toàn bộ Contracts được định nghĩa bằng **Pydantic v2**, sử dụng `snake_case` chuẩn của Python.

1. **`StructuredCv` (`app/contracts/cv.py`):**
   - Các trường: `full_name` (str \| None), `email` (str \| None), `phone` (str \| None), `career_summary` (str \| None), `skills` (list[str]), `work_experience` (list[WorkExperienceItem]), `education` (list[EducationItem]), `certificates` (list[str]), `projects` (list[ProjectItem]), `technologies` (list[str]).
   - Casing: `snake_case`.
2. **`StructuredJob` (`app/contracts/job.py`):**
   - Các trường: `title` (str, required), `description` (str), `required_skills` (list[str]), `preferred_skills` (list[str]), `minimum_experience_years` (float \| None), `education_requirement` (str \| None), `location` (str \| None), `salary` (str \| None), `employment_type` (str \| None).
3. **`CvAnalysisResponse` (`app/contracts/cv_analysis.py`):**
   - Các trường: `structured_cv` (`StructuredCv`), `cv_score` (int, ge=0, le=100), `strengths` (list[str]), `weaknesses` (list[str]), `improvement_suggestions` (list[str]), `meta` (`ResponseMeta`).
4. **`MatchRequest` & `MatchResult` (`app/contracts/matching.py`):**
   - `MatchRequest`: chứa `cv: StructuredCv` và `job: StructuredJob`.
   - `MatchResult`: chứa `match_score` (int, 0-100), `matched_skills` (list[str]), `missing_skills` (list[str]), `experience_comparison` (str), `education_comparison` (str), `project_domain_relevance` (str), `match_explanation` (str), `meta` (`ResponseMeta`).
5. **`CandidateRankRequest` & `CandidateRankResponse` (`app/contracts/matching.py`):**
   - `CandidateRankRequest`: chứa `job: StructuredJob`, `candidates: list[CandidateItem]` (gồm `candidate_id: str`, `cv: StructuredCv`).
   - `CandidateRankResponse`: chứa `job_title: str`, `total_evaluated: int`, `ranked_candidates: list[RankedCandidateItem]` (gồm `rank: int`, `candidate_id: str`, `match_result: MatchResult`), `meta` (`ResponseMeta`).
6. **`CareerAssistantRequest` & `CareerAssistantResponse` (`app/contracts/career.py`):**
   - `CareerAssistantRequest`: chứa `message: str`, `history: list[ChatMessage]`, `context: CareerAssistantContext | None`.
   - `CareerAssistantResponse`: chứa `reply: str`, `suggested_followups: list[str]`, `meta: ResponseMeta`.
7. **`ErrorResponse` (`app/contracts/errors.py`):**
   - Các trường: `error_code` (str), `message` (str), `details` (dict), `correlation_id` (str).
8. **`ResponseMeta` (`app/contracts/common.py`):**
   - Các trường: `algorithm_version`, `prompt_version`, `provider`, `model`, `processing_time_ms`, `correlation_id`.

> [!IMPORTANT]
> **Xác nhận tương thích với .NET Backend:**
> **"Chưa có runtime contract tương ứng phía .NET để xác nhận."**  
> Phía ASP.NET Core hiện chưa tạo lớp DTO hay `HttpClient` gọi sang FastAPI. Vì vậy, các Pydantic contract này thiết lập ranh giới chuẩn (Canonical Contracts). Khi đội ngũ .NET tích hợp, họ chỉ cần tạo các C# Record/Class tương ứng với các trường trên và cấu hình `JsonNamingPolicy.SnakeCaseLower`.

---

### 5.3. Application Layer (`app/application/`)

1. **`CvAnalyzerService` (`app/application/cv_analyzer.py`):**
   - Trách nhiệm: Phối hợp quy trình phân tích CV: trích xuất text PDF $\rightarrow$ LLM trích xuất `StructuredCv` $\rightarrow$ Đánh giá độ hoàn thiện và tính điểm structural CV bằng Domain logic $\rightarrow$ LLM bổ sung nhận xét định tính chuyên sâu $\rightarrow$ Đóng gói `CvAnalysisResponse`.
   - Inputs: File bytes PDF (`analyze_pdf`) hoặc raw text (`analyze_text`).
   - Outputs: `CvAnalysisResponse`.
   - Ports sử dụng: `DocumentParserPort`, `LlmPort`.
   - Domain sử dụng: `app.domain.cv.scoring.evaluate_cv_quality`.
   - Hạ tầng: Không chứa code hạ tầng cụ thể, hoàn toàn gọi qua Ports.

2. **`MatchingService` (`app/application/matching_service.py`):**
   - Trách nhiệm: Tính toán độ phù hợp giữa 1 CV và 1 Job. Tổng hợp kỹ năng ứng viên $\rightarrow$ gọi Domain logic so khớp kỹ năng, kinh nghiệm, học vấn $\rightarrow$ tính điểm tổng hợp có trọng số $\rightarrow$ LLM tổng hợp lời giải thích tự nhiên.
   - Inputs: `cv: StructuredCv`, `job: StructuredJob`.
   - Outputs: `MatchResult`.
   - Ports sử dụng: `LlmPort`.
   - Domain sử dụng: `skill_match`, `experience_match`, `education_match`, `scoring`.

3. **`RankingService` (`app/application/ranking_service.py`):**
   - Trách nhiệm: Xếp hạng danh sách ứng viên cho một Job.
   - **Tái sử dụng Matching Engine:** `RankingService` nhận vào `matching_service: MatchingService`. Mỗi ứng viên trong danh sách đều được gọi qua `self.matching_service.match(cv, req.job)`. **Hoàn toàn không có thuật toán tính điểm độc lập nào khác.**
   - **Bounded Concurrency:** Sử dụng `asyncio.Semaphore(concurrency_limit)` (mặc định giới hạn 5 tác vụ đồng thời) kết hợp `asyncio.gather` để bảo vệ tài nguyên hệ thống, không tạo bão request lên LLM.
   - Sau khi tính xong, kết quả được sắp xếp giảm dần theo `match_score` và gán thứ hạng `rank = 1, 2, ...`.
   - **Kiểm tra Candidate Ranking:** **ĐÃ TRIỂN KHAI (YES).**
   - **Kiểm tra Job Ranking (1 CV - N Jobs):** **CHƯA TRIỂN KHAI (NO).** Hiện tại service chỉ có phương thức `rank_candidates`, chưa có `rank_jobs`.

4. **`CareerAssistantService` (`app/application/career_assistant.py`):**
   - Trách nhiệm: Xử lý hội thoại tư vấn nghề nghiệp.
   - Inputs: `CareerAssistantRequest` (câu hỏi, lịch sử, ngữ cảnh CV/Job/MatchResult).
   - Outputs: `CareerAssistantResponse` (lời khuyên, câu hỏi gợi ý tiếp theo).
   - Ports sử dụng: `LlmPort`.
   - Tính phi trạng thái: Hoàn toàn stateless, không truy vấn database bên ngoài, toàn bộ ngữ cảnh được nạp từ ASP.NET Core qua request payload.

---

### 5.4. Domain Layer (`app/domain/`)

Tầng Domain được triển khai hoàn toàn bằng mã nguồn Python tiêu chuẩn (Standard Library), không import FastAPI, Starlette, HTTP clients hay thư viện bên ngoài.

#### Bảng đánh giá thành phần Domain:

| Thành phần | Đã triển khai? | Thuật toán / Logic chi tiết | Có Deterministic không? | Hạn chế hiện tại |
| :--- | :--- | :--- | :--- | :--- |
| **CV Normalization** (`cv/normalization.py`) | **YES** | Ánh xạ Regex và từ điển canonical aliases (ReactJS $\rightarrow$ react, Node.JS $\rightarrow$ node.js, K8s $\rightarrow$ kubernetes, Dotnet $\rightarrow$ .net). | **Có (100%)** | Danh sách từ điển hiện tại ở mức cơ bản (~30 kỹ năng phổ biến), cần bổ sung thêm từ điển taxonomy đầy đủ trong tương lai. |
| **CV Scoring** (`cv/scoring.py`) | **YES** | Thang điểm độ đầy đủ cấu trúc (100đ): Liên hệ (15đ), Tóm tắt sự nghiệp (10đ), Kỹ năng (20đ), Kinh nghiệm (25đ), Học vấn (15đ), Dự án & Chứng chỉ (15đ). | **Có (100%)** | Đánh giá độ hoàn thiện cấu trúc và định lượng, không đánh giá chất lượng chuyên môn sâu của từng câu chữ (phần này do LLM bổ trợ). |
| **Skill Matching** (`matching/skill_match.py`) | **YES** | So khớp kỹ năng ứng viên với JD: Kỹ năng bắt buộc (tối đa 80% điểm skill), Kỹ năng ưu tiên/bonus (tối đa 20% điểm skill). | **Có (100%)** | Dựa trên từ khóa chuẩn hóa. Chưa xử lý phân cấp quan hệ kỹ năng (ví dụ: biết PyTorch thì mặc định biết Python). |
| **Experience Matching** (`matching/experience_match.py`) | **YES** | So sánh tổng số năm kinh nghiệm ứng viên với `minimum_experience_years`. Đạt/vượt = 100đ; thiếu = tỷ lệ `actual / required * 100`. | **Có (100%)** | Tính theo tổng số năm, chưa phân loại riêng số năm của từng công nghệ cụ thể. |
| **Education Matching** (`matching/education_match.py`) | **YES** | Thang bậc học vấn có thứ tự: Cấp 3 (1) < Cao đẳng (2) < Cử nhân/Kỹ sư (3) < Thạc sĩ (4) < Tiến sĩ (5). Đạt/vượt = 100đ; kém 1 bậc = 75đ; thấp hơn = 50đ. | **Có (100%)** | Dựa trên phân loại bậc học tiếng Việt/tiếng Anh cơ bản. |
| **Project / Domain Relevance** | **PARTIAL** | Hiện tại trong `matching_service.py` chỉ đếm số dự án thực tế liên quan đến công nghệ yêu cầu (`len(cv.projects)`). | **Có** | **Chưa có thuật toán domain matching chuyên sâu**, chỉ là nhận xét heuristic đơn giản. |
| **Semantic Similarity** | **NO** | Chưa triển khai module tính khoảng cách vector cosine bằng embedding model. | N/A | Hoãn lại theo nguyên tắc không thêm Vector DB / LangChain ở giai đoạn MVP. |
| **Overall Match Score** (`matching/scoring.py`) | **YES** | Trọng số tổng hợp: `SkillScore * 0.50 + ExperienceScore * 0.30 + EducationScore * 0.20`. | **Có (100%)** | **Trọng số được hardcode trong code** (`SKILL_WEIGHT=0.50`, `EXPERIENCE_WEIGHT=0.30`, `EDUCATION_WEIGHT=0.20`). |

> [!WARNING]
> **LƯU Ý QUAN TRỌNG VỀ TRỌNG SỐ MATCHING:**  
> Bộ trọng số hiện tại (**Kỹ năng 50%, Kinh nghiệm 30%, Học vấn 20%**) là **giả định thiết kế ban đầu của kỹ sư (Implementation Assumption)**, hoàn toàn **CHƯA ĐƯỢC XÁC NHẬN** bởi tài liệu đặc tả sản phẩm FutureCV và **CHƯA ĐƯỢC ĐÁNH GIÁ** qua tập dữ liệu benchmark kiểm thử (Evaluation benchmark).

---

### 5.5. Ports (`app/ports/`)

1. **`DocumentParserPort` (`app/ports/document_parser.py`):**
   - Định nghĩa phương thức trừu tượng `async def parse_pdf(self, file_bytes: bytes) -> str`.
   - Triển khai cụ thể: `PyMuPdfDocumentParser`.
   - Tính hợp lý: Rất cao. Cho phép dễ dàng thay thế PyMuPDF bằng giải pháp khác (PDFMiner, OCR engine, hoặc Cloud Document AI) mà không cần sửa đổi `CvAnalyzerService`. Được inject qua `app/api/deps.py`.
2. **`LlmPort` (`app/ports/llm.py`):**
   - Định nghĩa `generate_text(prompt, system_prompt, temperature)` và `generate_structured(prompt, response_model, system_prompt, temperature)`.
   - Triển khai cụ thể: `MockLlmProvider` và `OpenAiProvider`.
   - Tính hợp lý: Rất cao. Cách ly hoàn toàn vendor lock-in với OpenAI / Gemini / Anthropic. Ứng dụng và test suite chỉ phụ thuộc vào `LlmPort`. Được inject thông qua factory `get_llm_provider` tại `app/api/deps.py`.

---

### 5.6. Infrastructure (`app/infrastructure/`)

#### Document Parsing (`app/infrastructure/documents/pdf_parser.py`)
- **Triển khai:** `PyMuPdfDocumentParser` dựa trên thư viện PyMuPDF (`fitz`).
- **File Validation & Magic Bytes:** Kiểm tra `file_bytes.startswith(b"%PDF-")`. Nếu không khớp, ném `DocumentParsingError("Invalid PDF format: file does not have valid %PDF- magic bytes header")`.
- **Page Limit Check:** Giới hạn `doc.page_count <= settings.max_pdf_pages` (mặc định 20 trang). Nếu vượt quá, ném `DocumentPageLimitExceededError`.
- **Text Length Ceiling:** Giới hạn văn bản trích xuất tối đa `settings.max_extracted_text_chars` (mặc định 50,000 ký tự).
- **Non-blocking Threadpool:** Phương thức `_sync_parse` thực hiện CPU-bound, được bọc và chạy trong worker threadpool qua `anyio.to_thread.run_sync(self._sync_parse, file_bytes)` để không chặn FastAPI Event Loop.

> [!CAUTION]
> **POTENTIAL SPEC MISMATCH (CẢNH BÁO LỆCH ĐẶC TẢ DUNG LƯỢNG PDF):**  
> Trong file `app/core/config.py` dòng 59 và `.env.example` dòng 32, giới hạn dung lượng tải lên đang được cấu hình mặc định là:  
> `MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024` (**10 MB**).  
> Trong khi đó, **yêu cầu của FutureCV MVP chỉ cho phép tối đa 5 MB**.  
> **Khuyến nghị:** Cần sửa giá trị default trong `config.py` và `.env.example` thành `5 * 1024 * 1024` (5,242,880 bytes).

#### LLM Provider (`app/infrastructure/llm/`)
- **Mock Provider (`mock_provider.py`):** Triển khai `LlmPort` trả về dữ liệu mẫu có nghĩa (realistic deterministic responses) cho text và tự động khởi tạo model hợp lệ cho Pydantic model. Chạy cực nhanh, không gọi mạng.
- **Production Provider (`openai_provider.py`):** Triển khai `LlmPort` cho OpenAI thông qua `httpx.AsyncClient`. Có cấu hình `timeout` (`LLM_TIMEOUT_SECONDS=60`), bounded retries (`LLM_MAX_RETRIES=2`), và sử dụng OpenAI JSON mode (`response_format={"type": "json_object"}`) kết hợp `response_model.model_validate(parsed_json)`.
- **Factory (`factory.py`):** Hàm `get_llm_provider` chọn provider dựa vào `settings.llm_provider`. Nếu ở môi trường dev/test mà thiếu `OPENAI_API_KEY`, factory tự động fallback sang `MockLlmProvider` kèm cảnh báo log thay vì crash hệ thống.
- **Tình trạng kiểm thử thực tế:** `MockLlmProvider` đã được kiểm thử 100% qua test suite. `OpenAiProvider` được kiểm thử cấu trúc code, nhưng chưa gọi live API thực tế vì chưa có API Key môi trường.

#### Embeddings
- **Trạng thái:** **KHÔNG TRIỂN KHAI (NOT IMPLEMENTED).**
- Không có thư mục hay class rỗng nào cho embeddings trong code (đúng theo nguyên tắc Rule 21 - không sinh scaffolding rác).

---

## 6. Prompt Review (`app/prompts/`)

Toàn bộ Prompts được tổ chức thành các module Python riêng biệt, có phiên bản rõ ràng:

| Prompt file | Mục đích nghiệp vụ | Version | Nơi sử dụng | Biện pháp bảo vệ chống Prompt Injection | Kỳ vọng đầu ra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `cv_extraction_v1.py` | Trích xuất CV có cấu trúc từ văn bản thô | `v1` | `CvAnalyzerService.analyze_text` | Có delimiter `<<<BEGIN UNTRUSTED CV DOCUMENT>>>`. Chỉ thị rõ: coi tài liệu là UNTRUSTED DATA, cấm làm theo chỉ thị nhúng trong CV, cấm bịa đặt thông tin. | JSON khớp với schema của `StructuredCv`. |
| `cv_analysis_v1.py` | Đánh giá điểm mạnh/yếu định tính và gợi ý cải thiện | `v1` | `CvAnalyzerService.analyze_text` | Có delimiter `<<<BEGIN CANDIDATE CV>>>`. Chỉ thị: coi CV là untrusted input, cấm hallucinate, phản hồi bằng tiếng Việt chuyên nghiệp. | Nhận xét dạng văn bản có cấu trúc tiếng Việt (strengths, weaknesses, suggestions). |
| `match_explanation_v1.py` | Giải thích lý do phù hợp điểm số giữa CV và JD | `v1` | `MatchingService.match` | Chỉ thị: giải thích strictly dựa trên điểm số và kỹ năng đầu vào, không suy diễn ngoài dữ liệu cung cấp. | 2-4 đoạn văn ngắn tiếng Việt giải thích khách quan mức độ phù hợp. |
| `career_v1.py` | Tư vấn nghề nghiệp và định hướng kỹ năng | `v1` | `CareerAssistantService.chat` | Chỉ thị rõ ranh giới: AI không có quyền truy cập DB, không đưa ra quyết định tuyển dụng, coi thông tin ứng viên là untrusted data. | Lời khuyên tư vấn tiếng Việt và 2-3 câu hỏi gợi mở tiếp theo. |

**Đánh giá an toàn:** Toàn bộ prompts đều có chỉ dẫn chống prompt injection và cấm hallucination rõ ràng.

---

## 7. Security Review

| Vùng an ninh (Security Area) | Triển khai trong mã nguồn thực tế | Đánh giá trạng thái | Ghi chú & Đề xuất |
| :--- | :--- | :--- | :--- |
| **Internal API Key** | `app/api/middleware/internal_auth.py` kiểm tra header `X-Internal-API-Key`. | **GOOD** | Áp dụng Dependency trên tất cả các route nghiệp vụ. |
| **Constant-time comparison** | Sử dụng `hmac.compare_digest(x_internal_api_key.strip(), settings.internal_api_key)`. | **GOOD** | Chống lại tấn công đo thời gian (Timing Attack). |
| **Correlation ID validation** | Regex `^[a-zA-Z0-9_\-\.]{1,128}$` tại `app/api/middleware/correlation_id.py`. | **GOOD** | Loại bỏ ký tự điều khiển, ngăn chặn tấn công Log Injection. |
| **PII Logging** | `app/observability/logging.py` chỉ log metadata (số ký tự, điểm, duration, status), tuyệt đối không in raw text CV hay SĐT/Email. | **GOOD** | Bảo vệ dữ liệu cá nhân của ứng viên theo chuẩn an toàn. |
| **Error Sanitization** | `app/api/exception_handlers.py` bắt mọi lỗi unhandled (500) và trả về thông báo chung, che giấu toàn bộ stack trace và internal paths. | **GOOD** | Không rò rỉ cấu trúc thư mục hay khóa API trong HTTP response. |
| **PDF Validation** | `app/infrastructure/documents/pdf_parser.py` kiểm tra magic bytes `%PDF-`, giới hạn số trang (20 trang), giới hạn ký tự (50k chars). | **GOOD** | Ngăn chặn file giả mạo và tấn công cạn kiệt tài nguyên (DoS). |
| **Prompt Injection Controls** | Dùng delimiters và strict system instructions trong toàn bộ prompts. | **GOOD** | Ngăn chặn nội dung CV/JD chiếm quyền điều khiển LLM. |
| **Secrets / Config** | Không có hardcoded secret trong code, đọc qua `.env` được cấu hình trong `.gitignore`. | **GOOD** | Đảm bảo an toàn mã nguồn Git. |
| **CORS Middleware** | `app/main.py:53` cấu hình `allow_origins=["*"]`. | **NEEDS IMPROVEMENT** | Vì React không gọi trực tiếp FastAPI, việc bật CORS toàn bộ là không cần thiết và tiềm ẩn rủi ro nếu service bị lộ port ra ngoài. |

---

## 8. Configuration Review

Nguồn cấu hình: `app/core/config.py` và `backend-ai/.env.example`.

| Biến môi trường | Bắt buộc? | Giá trị mặc định | Mục đích sử dụng | Có nhạy cảm bảo mật? |
| :--- | :--- | :--- | :--- | :--- |
| `APP_NAME` | Không | `"FutureCV Backend AI"` | Tên định danh ứng dụng | Không |
| `ENV` | Không | `"development"` | Môi trường (`development`, `test`, `staging`, `production`) | Không |
| `HOST` | Không | `"127.0.0.1"` | Host bind của Uvicorn | Không |
| `PORT` | Không | `8000` | Port lắng nghe | Không |
| `LLM_PROVIDER` | Không | `"mock"` (ở `.env.example`) / `"openai"` (ở `config.py`) | Chọn nhà cung cấp LLM (`mock`, `openai`, `gemini`, `anthropic`) | Không |
| `LLM_MODEL` | Không | `"gpt-4o-mini"` | Model LLM sử dụng | Không |
| `OPENAI_API_KEY` | Chỉ khi dùng OpenAI ở prod | `None` | Khóa API của OpenAI | **CÓ (Secret)** |
| `GEMINI_API_KEY` | Chỉ khi dùng Gemini | `None` | Khóa API của Google Gemini | **CÓ (Secret)** |
| `ANTHROPIC_API_KEY` | Chỉ khi dùng Anthropic | `None` | Khóa API của Anthropic | **CÓ (Secret)** |
| `INTERNAL_API_KEY` | Bắt buộc ở production | `""` | Khóa xác thực nội bộ ASP.NET Core $\rightarrow$ FastAPI | **CÓ (Secret)** |
| `LLM_TIMEOUT_SECONDS` | Không | `60` (giới hạn 5 - 300) | Timeout tối đa cho 1 request gọi LLM | Không |
| `LLM_MAX_RETRIES` | Không | `2` (giới hạn 0 - 5) | Số lần thử lại tối đa khi lỗi mạng | Không |
| `LOG_LEVEL` | Không | `"INFO"` | Mức độ chi tiết log (`DEBUG`, `INFO`, `WARNING`, `ERROR`) | Không |
| `MAX_UPLOAD_SIZE_BYTES` | Không | `10485760` (10 MB) | Dung lượng file PDF tối đa | Không (Cần sửa thành 5MB) |
| `MAX_PDF_PAGES` | Không | `20` (giới hạn 1 - 100) | Số trang PDF tối đa cho phép | Không |
| `MAX_EXTRACTED_TEXT_CHARS` | Không | `50000` | Giới hạn số ký tự trích xuất từ tài liệu | Không |

---

## 9. API Authentication Matrix

Kiểm tra trực tiếp từ router và middleware trong mã nguồn:

| Endpoint | Cần `X-Internal-API-Key`? | Lý do kỹ thuật trong mã nguồn |
| :--- | :--- | :--- |
| `GET /health` | **KHÔNG** | Được khai báo không kèm dependency xác thực, phục vụ container liveness probe. |
| `GET /ready` | **KHÔNG** | Được khai báo không kèm dependency xác thực, phục vụ container readiness probe. |
| `GET /api/v1/health` | **KHÔNG** | Alias của health check trong v1 router. |
| `GET /api/v1/ready` | **KHÔNG** | Alias của readiness probe trong v1 router. |
| `POST /api/v1/cv/analyze` | **CÓ** | Router `cv_analysis.py` khai báo `dependencies=[Depends(verify_internal_api_key)]`. |
| `POST /api/v1/cv/analyze-text` | **CÓ** | Thuộc router `cv_analysis.py`, yêu cầu khóa nội bộ. |
| `POST /api/v1/cv/improve` | **CÓ** | Thuộc router `cv_analysis.py`, yêu cầu khóa nội bộ. |
| `POST /api/v1/job/match` | **CÓ** | Router `matching.py` khai báo `dependencies=[Depends(verify_internal_api_key)]`. |
| `POST /api/v1/candidates/rank` | **CÓ** | Thuộc router `matching.py`, yêu cầu khóa nội bộ. |
| `POST /api/v1/career/chat` | **CÓ** | Router `career.py` khai báo `dependencies=[Depends(verify_internal_api_key)]`. |

---

## 10. Matching Engine Deep Review

### Luồng xử lý Matching Engine thực tế trong code:
```text
StructuredCv ────────────────┐
                             ▼
             ┌───────────────────────────────┐
             │   MatchingService.match()     │
             └───────────────┬───────────────┘
                             ▲
StructuredJob ───────────────┘
                             │
     ┌───────────────────────┼───────────────────────┐
     ▼                       ▼                       ▼
Skill Match             Experience Match        Education Match
(calculate_skill_match) (calculate_exp_match)   (calculate_edu_match)
• Required: max 80%     • Actual vs Req years   • Degree level rank
• Preferred: max 20%    • Score: 0 - 100%       • Score: 50/75/100%
     │                       │                       │
     └───────────────────────┼───────────────────────┘
                             ▼
             ┌───────────────────────────────┐
             │  compute_overall_match_score  │
             │  Skill * 0.50 + Exp * 0.30 +  │
             │  Edu * 0.20                   │
             └───────────────┬───────────────┘
                             ▼
                     Final MatchScore (0-100)
                             │
                             ▼
             ┌───────────────────────────────┐
             │       LlmPort.generate_text   │
             │  (Synthesize match_explanation│
             │   in Vietnamese from scores)  │
             └───────────────┬───────────────┘
                             ▼
                        MatchResult
```

### Bảng đối chiếu năng lực Matching (Matching Capability Matrix):

| Năng lực Matching | Yêu cầu của FutureCV | Triển khai thực tế trong code | Khoảng cách (Gap) |
| :--- | :--- | :--- | :--- |
| **Required Skill Matching** | Bắt buộc | `skill_match.py`: Tính tỷ lệ kỹ năng bắt buộc, chiếm tối đa 80% điểm skill. | Đạt yêu cầu. |
| **Preferred Skill Matching** | Bắt buộc | `skill_match.py`: Tính điểm cộng thêm tối đa 20% cho kỹ năng ưu tiên. | Đạt yêu cầu. |
| **Experience Comparison** | Bắt buộc | `experience_match.py`: So sánh số năm kinh nghiệm thực tế với JD, sinh text so sánh chi tiết. | Đạt yêu cầu. |
| **Education Comparison** | Bắt buộc | `education_match.py`: So sánh bậc bằng cấp theo thang phân cấp thứ bậc. | Đạt yêu cầu. |
| **Project / Domain Relevance** | Bắt buộc | `matching_service.py`: Hiện chỉ đếm số dự án thực tế liên quan (`len(cv.projects)`). | **Chưa có thuật toán domain relevance sâu.** |
| **Semantic Similarity** | Đề xuất tương lai | Chưa triển khai vector similarity. | Không bắt buộc ở MVP; tuân thủ Rule 21. |
| **Match Explanation** | Bắt buộc | `match_explanation_v1.py`: LLM tạo 2-4 đoạn văn giải thích khách quan bằng tiếng Việt. | Đạt yêu cầu. |
| **Algorithm Version** | Bắt buộc | Gán `"1.0.0"` trong `ResponseMeta`. | Đạt yêu cầu. |
| **Prompt Version** | Bắt buộc | Gán `"v1"` trong `ResponseMeta`. | Đạt yêu cầu. |

---

## 11. CV Analyzer Deep Review

### Pipeline CV Analyzer thực tế trong mã nguồn:
```text
PDF File Bytes ──► PyMuPdfDocumentParser ──► Raw Text (đã validate & clean)
                                                  │
                                                  ▼
                                      LlmPort.generate_structured
                                      (app/prompts/cv_extraction_v1.py)
                                                  │
                                                  ▼
                                            StructuredCv
                                                  │
                                                  ▼
                                      evaluate_cv_quality (Domain)
                                      • Tính cv_score (0-100)
                                      • Phát hiện strengths cấu trúc
                                      • Phát hiện weaknesses cấu trúc
                                      • Sinh improvement_suggestions ban đầu
                                                  │
                                                  ▼
                                      LlmPort.generate_text (Qualitative)
                                      (app/prompts/cv_analysis_v1.py)
                                      • Thêm nhận xét chuyên sâu từ chuyên gia AI
                                                  │
                                                  ▼
                                          CvAnalysisResponse
```

- **Phần Deterministic:** Khâu kiểm tra định dạng PDF, giới hạn trang/kích thước, và tính toán điểm số cấu trúc `cv_score` (100 điểm) hoàn toàn deterministic thông qua hàm `evaluate_cv_quality`.
- **Phần LLM-generated:** Trích xuất thực thể có cấu trúc (`StructuredCv`) và nhận xét định tính bổ trợ (`qualitative feedback`).
- **Phần Mock behavior:** Khi chạy ở chế độ dev/test không có API key, `MockLlmProvider` sinh dữ liệu giả lập hợp lệ tức thì.
- **Quan hệ với `/cv/improve`:** Endpoint `POST /api/v1/cv/improve` trong `app/api/v1/cv_analysis.py` gọi trực tiếp `service.analyze_text(req.raw_text)`. **Đúng theo thiết kế: CV Improvement là một phần của CV Analysis chứ không phải engine độc lập.**

---

## 12. Ranking Review

### 12.1. Candidate Ranking
- **Trạng thái:** **YES (ĐÃ TRIỂN KHAI).**
- **Cơ chế:** `RankingService.rank_candidates` (`app/application/ranking_service.py`) nhận vào `CandidateRankRequest`. Service sử dụng `self.matching_service.match(cv, job)` để đánh giá từng ứng viên. **Đảm bảo tính nhất quán 100% với Matching Engine đơn lẻ.**
- **Kiểm soát đồng thời (Bounded Concurrency):** Khởi tạo `asyncio.Semaphore(concurrency_limit)` (mặc định 5). Đảm bảo khi xử lý danh sách hàng chục ứng viên, hệ thống không tạo ra hàng loạt tác vụ đồng thời gây quá tải bộ nhớ hoặc rate limit của LLM.
- **Sắp xếp:** Sắp xếp giảm dần theo `item.match_score` và đánh số thứ tự `rank = 1, 2, ...`.

### 12.2. Job Ranking / Job Suggestion
- **Trạng thái:** **NO (CHƯA TRIỂN KHAI).**
- **Thực tế trong code:** Hiện tại `RankingService` mới chỉ có phương thức `rank_candidates(CandidateRankRequest)` và API mới chỉ có `POST /api/v1/candidates/rank`. Chưa có phương thức `rank_jobs` (đưa vào 1 CV + N Jobs để xếp hạng công việc phù hợp nhất cho ứng viên).
- **Đánh giá:** Đây là một khoảng trống chức năng (MVP gap) cần bổ sung trong tương lai.

---

## 13. Career Assistant Review

- **Ngữ cảnh đầu vào:** Nhận vào `CareerAssistantRequest` gồm câu hỏi hiện tại (`message`), lịch sử chat (`history`), và ngữ cảnh nghiệp vụ do .NET cung cấp (`context: CareerAssistantContext` gồm `candidate_id`, `cv: StructuredCv`, `job: StructuredJob`, `match_result: MatchResult`).
- **Hành vi thực tế:** Trong `CareerAssistantService.chat`, service trích xuất thông tin kỹ năng, kinh nghiệm, điểm số phù hợp và các kỹ năng còn thiếu để tạo thành chuỗi context, đưa vào prompt `career_v1.py` để LLM trả lời bằng tiếng Việt và đề xuất 3 câu hỏi gợi ý tiếp theo (`suggested_followups`).
- **Ranh giới an ninh:** Service hoàn toàn **không truy cập database**, không truy xuất dữ liệu ngoài payload được gửi đến, và **không làm thay đổi trạng thái tuyển dụng**.
- **Đánh giá:** Đã hình thành một skeleton/foundation hoàn chỉnh và an toàn, sẵn sàng phục vụ khi giao diện chatbot được kích hoạt.

---

## 14. Test Review

Toàn bộ các bài kiểm thử đã được chạy bằng lệnh `pytest tests -v` và **đạt 100% (48/48 tests passed)**.

### 14.1. Unit Tests (25 tests)
- **Bao phủ tốt:**
  - `test_config.py`: Nạp cấu hình, cờ môi trường, validate API key.
  - `test_correlation_id.py`: Làm sạch ID, chống tấn công script/XSS/log injection, sinh UUID4 khi thiếu.
  - `test_internal_auth.py`: Xác thực token hợp lệ, token sai, thiếu token, bỏ qua ở dev, fail-closed ở prod.
  - `test_cv_scoring.py`: Tính điểm CV rỗng (điểm thấp, liệt kê thiếu sót) vs CV đầy đủ (điểm cao >90).
  - `test_skill_matching.py`: Chuẩn hóa aliases, so khớp đủ kỹ năng (100đ), trừ điểm khi thiếu kỹ năng bắt buộc.
  - `test_experience_matching.py`: So khớp số năm kinh nghiệm (thừa, thiếu, không yêu cầu).
  - `test_education_matching.py`: So khớp bậc học vấn theo phân cấp.
  - `test_ranking_service.py`: Xếp hạng 3 ứng viên, kiểm tra sắp xếp giảm dần và thứ hạng 1-based.
- **Chưa bao phủ:** Chưa có test riêng cho độ trễ khi timeout của `OpenAiProvider` (do không gọi mạng thực tế).

### 14.2. Integration Tests (11 tests)
- **Bao phủ tốt:**
  - `test_health.py`: Liveness probe `/health` trả về 200, `/ready` trả về 200/503, header `X-Correlation-Id` được gắn vào response.
  - `test_exceptions.py`: Kiểm tra route 404 trả về JSON có cấu trúc an toàn, bắt exception domain tự định nghĩa và chuyển thành mã 422.
  - `test_ai_endpoints.py`: Gọi HTTP trực tiếp kiểm tra 5 endpoint nghiệp vụ: `/cv/analyze-text`, `/cv/improve`, `/job/match`, `/candidates/rank`, `/career/chat`.

### 14.3. Contract Tests (8 tests)
- **Bao phủ tốt:**
  - `test_cv_analyzer_contract.py`: Kiểm tra cấu trúc trường và kiểu dữ liệu của `StructuredCv` và `CvAnalysisResponse`.
  - `test_job_matching_contract.py`: Kiểm tra `StructuredJob`, `MatchRequest`, `MatchResult`.
  - `test_candidate_ranking_contract.py`: Kiểm tra `CandidateRankRequest` và `CandidateRankResponse`.
  - `test_career_assistant_contract.py`: Kiểm tra `CareerAssistantRequest`, `CareerAssistantResponse`, và `ErrorResponse`.

### 14.4. Architecture Tests (4 tests)
- **Bao phủ tốt (`test_boundaries.py`):**
  - `test_no_database_libraries_in_entire_backend_ai`: Quét AST toàn bộ file trong `app/`, đảm bảo không có SQLAlchemy, psycopg, asyncpg, tortoise, peewee, sqlmodel.
  - `test_domain_layer_dependencies`: Đảm bảo `app/domain/` không import FastAPI, Starlette, httpx, fitz, openai, hay infrastructure.
  - `test_application_layer_dependencies`: Đảm bảo `app/application/` không import FastAPI hay concrete provider implementations.
  - `test_api_routes_do_not_import_concrete_providers_directly`: Đảm bảo API route không import trực tiếp OpenAI SDK.

#### Bảng tổng hợp kiểm thử:

| Nhóm yêu cầu kiểm thử | Đã có test? | Tên file test |
| :--- | :--- | :--- |
| Không import database / ORM | **CÓ** | `tests/architecture/test_boundaries.py` |
| Ranh giới phụ thuộc Domain thuần | **CÓ** | `tests/architecture/test_boundaries.py` |
| Xác thực Token nội bộ Timing-safe | **CÓ** | `tests/unit/test_internal_auth.py` |
| Làm sạch Correlation ID | **CÓ** | `tests/unit/test_correlation_id.py` |
| Tính điểm CV Completeness | **CÓ** | `tests/unit/test_cv_scoring.py` |
| Chuẩn hóa kỹ năng và Matching | **CÓ** | `tests/unit/test_skill_matching.py` |
| So khớp Kinh nghiệm & Học vấn | **CÓ** | `tests/unit/test_experience_matching.py`, `test_education_matching.py` |
| Bounded Concurrency Candidate Ranking | **CÓ** | `tests/unit/test_ranking_service.py` |
| Hợp đồng dữ liệu DTO (.NET - Python) | **CÓ** | `tests/contract/test_*.py` |
| HTTP Health & Ready Probes | **CÓ** | `tests/integration/test_health.py` |
| Toàn bộ HTTP Endpoints AI | **CÓ** | `tests/integration/test_ai_endpoints.py` |

---

## 15. Architecture Boundary Verification

Kiểm tra trực tiếp thông qua các bài test kiến trúc AST và rà soát imports mã nguồn:

- `[PASS]` **Domain does not import FastAPI:** Xác nhận qua AST analysis trong `tests/architecture/test_boundaries.py`.
- `[PASS]` **Domain does not import Infrastructure:** Xác nhận trong `app/domain/` chỉ import standard library (`re`, `dataclasses`).
- `[PASS]` **Application does not import FastAPI:** Các file trong `app/application/` hoàn toàn không import `fastapi` hay `starlette`.
- `[PASS]` **API does not directly instantiate concrete LLM SDKs:** Các route trong `app/api/v1/` chỉ nhận Application Service thông qua `Depends(get_..._service)` từ `app/api/deps.py`.
- `[PASS]` **backend-ai has no SQLAlchemy:** Quét AST toàn bộ codebase không phát hiện bất kỳ import `sqlalchemy`.
- `[PASS]` **backend-ai has no psycopg / psycopg2:** Quét AST không phát hiện bất kỳ import driver postgres nào.
- `[PASS]` **backend-ai has no PostgreSQL access:** Không có database connection string, session, repository hay migration nào trong `backend-ai`.
- `[PASS]` **Ranking reuses MatchingService:** File `app/application/ranking_service.py:24` nhận `matching_service: MatchingService` và gọi trực tiếp `self.matching_service.match(cv=candidate.cv, job=req.job)`.
- `[PASS]` **FastAPI does not mutate Application state:** Không có bất kỳ logic nào thay đổi trạng thái ứng tuyển (Application status) hay can thiệp vào vòng đời ứng viên.

---

## 16. .NET Integration Readiness

Khảo sát mã nguồn thư mục `backend/` (ASP.NET Core 8):

1. **HttpClient & DTOs:**
   - Trong `backend/src/FutureCV.Infrastructure/` và `FutureCV.Application/`, hiện **chưa có `HttpClient` nào được đăng ký để gọi sang FastAPI**.
   - Chưa có các class DTO C# tương ứng với `StructuredCv`, `MatchRequest`, `MatchResult`.
2. **Tiêu thụ Endpoint:**
   - Các API của Python hiện **chưa được tiêu thụ (NOT YET CONSUMED)** bởi .NET backend.
   - Logic tính match score trong `ApplicationService.cs` dòng 646 vẫn đang chạy bằng thuật toán heuristic tạm thời trong C#.
3. **Quy ước đặt tên (Casing):**
   - Python trả về JSON định dạng `snake_case` (ví dụ `match_score`, `cv_score`).
   - C# sử dụng `PascalCase` (`MatchScore`, `CvScore`).
   - Phía .NET khi tạo `HttpClient` cần cấu hình `JsonSerializerOptions` có `PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower`.
4. **Headers & Authentication:**
   - Phía .NET cần thêm cấu hình `AiServiceOptions` trong `appsettings.json` gồm `BaseUrl` và `InternalApiKey` để gửi kèm header `X-Internal-API-Key` và `X-Correlation-Id`.

### Đánh giá trạng thái tích hợp hiện tại:
**`NOT INTEGRATED` (CHƯA TÍCH HỢP RUNTIME).**  
Phía Python đã sẵn sàng 100% về mặt API contract, nhưng chưa có kết nối runtime từ phía .NET.

---

## 17. Docker Review

Khảo sát file `backend-ai/Dockerfile`:

- **Base image:** `python:3.11-slim AS base`.
- **Runtime user:** Tạo user không có đặc quyền `appuser` (`RUN adduser --disabled-password --gecos "" appuser`) và chuyển ngữ cảnh chạy bằng `USER appuser`. Đảm bảo an toàn container.
- **Dependency installation:** `COPY requirements.txt .` và chạy `pip install --no-cache-dir -r requirements.txt`. Chỉ cài runtime dependencies sạch.
- **Exposed port:** `EXPOSE 8000`.
- **Startup command:** `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`.
- **Healthcheck:** Tích hợp sẵn `HEALTHCHECK` thăm dò `http://localhost:8000/health` bằng thư viện chuẩn Python `urllib.request` mà không cần cài thêm `curl`.
- **Gói không cần thiết:** Đã loại bỏ gói hệ thống nặng `libmupdf-dev` của bản cũ vì bánh xe pre-built wheel của PyMuPDF trên Linux x86_64 đã tích hợp sẵn thư viện MuPDF tĩnh.

### Kết quả thẩm định thực thi:
- **Docker build:** **`NOT VERIFIED`** (Lệnh `docker build -t futurecv-ai-refactor .` đã được chạy thử, nhưng Docker Desktop daemon trên máy host đang tắt: `failed to connect to the docker API at npipe...`).
- **Container smoke test:** **`NOT VERIFIED`** (Do daemon chưa chạy).
- **Đánh giá cú pháp Dockerfile:** Cấu trúc Dockerfile hoàn toàn hợp lệ, chuẩn best-practices cho Python container.

---

## 18. Quality Gates

Kết quả thực thi thực tế của toàn bộ các lệnh kiểm tra chất lượng mã nguồn:

| Công cụ / Lệnh kiểm tra | Kết quả thực tế | Chi tiết kết quả |
| :--- | :--- | :--- |
| `python -m compileall app tests` | **PASSED** | Biên dịch bytecode 100% thành công, không có lỗi cú pháp. |
| `python -m ruff check app tests` | **PASSED** | `All checks passed!` (Đã xử lý sạch các cảnh báo import, naming, line length). |
| `python -m ruff format --check app tests` | **PASSED** | `79 files already formatted` (Toàn bộ codebase đạt chuẩn format). |
| `python -m mypy app` | **PASSED** | `Success: no issues found in 57 source files` (Strict type checking vượt qua 100%). |
| `python -m pytest tests -v` | **PASSED** | `48 passed in 0.94s` (Toàn bộ 48 test unit, integration, contract, architecture đều pass). |

---

## 19. Những điểm đã làm tốt

1. **Ranh giới kiến trúc Lục giác chuẩn xác (Hexagonal Boundaries):** Phân chia rõ ràng API $\rightarrow$ Application $\rightarrow$ Domain / Ports $\leftarrow$ Infrastructure. Tầng Domain hoàn toàn là pure Python logic, không phụ thuộc vào bất kỳ framework web hay AI vendor SDK nào.
2. **Không phụ thuộc Database:** Loại bỏ hoàn toàn nguy cơ biến `backend-ai` thành microservice cồng kềnh. Không có SQLAlchemy, psycopg hay PostgreSQL persistence.
3. **Mô hình 3 Năng lực AI Cốt lõi rõ ràng:** Gom nhóm chính xác thành CV Analyzer, Matching Engine và Career Assistant. CV Improvement được gom về đúng bản chất là nhận xét của CV Analysis; Candidate Ranking tái sử dụng trực tiếp Matching Engine.
4. **Kiểm soát đồng thời an toàn (Bounded Concurrency):** `RankingService` dùng `asyncio.Semaphore` để giới hạn số lượng tác vụ AI song song, ngăn chặn cạn kiệt tài nguyên hệ thống hoặc bị nhà cung cấp LLM rate-limit.
5. **Kiểm thử kiến trúc tự động bằng AST (`test_boundaries.py`):** Viết test phân tích cú pháp AST để tự động chặn các lập trình viên khác vô tình import database hoặc vi phạm quy tắc phân tầng trong tương lai.
6. **Bảo mật dịch vụ nội bộ vững chắc:** Triển khai `X-Internal-API-Key` với cơ chế so sánh hằng số thời gian `hmac.compare_digest`, làm sạch Correlation ID chống Log Injection, lọc PII trong logs và xử lý sanitized error response.
7. **Bảo mật xử lý PDF đa lớp:** Kiểm tra magic bytes `%PDF-`, giới hạn dung lượng, giới hạn số trang, và chạy trên worker threadpool tránh block Event Loop.
8. **Container hóa an toàn:** Dockerfile chạy dưới quyền user không đặc quyền `appuser`, có probe healthcheck bằng stdlib, tối ưu dependencies runtime sạch.

---

## 20. Những điểm cần sửa trước khi merge

### Phân loại mức độ nghiêm trọng:

#### 1. BLOCKER (Bắt buộc phải sửa trước khi merge)
| Mức độ | Vấn đề phát hiện | Bằng chứng mã nguồn | Đề xuất khắc phục |
| :--- | :--- | :--- | :--- |
| **BLOCKER** | **Dung lượng file upload mặc định là 10MB, sai lệch với yêu cầu MVP 5MB của FutureCV** | File `app/core/config.py` dòng 59 (`default=10 * 1024 * 1024`) và file `.env.example` dòng 32 (`MAX_UPLOAD_SIZE_BYTES=10485760`). | Đổi giá trị mặc định của `MAX_UPLOAD_SIZE_BYTES` thành `5 * 1024 * 1024` (tương đương `5242880` bytes) trong cả `config.py` và `.env.example`. |

#### 2. HIGH (Khuyến nghị khắc phục trước khi merge)
| Mức độ | Vấn đề phát hiện | Bằng chứng mã nguồn | Đề xuất khắc phục |
| :--- | :--- | :--- | :--- |
| **HIGH** | **Chưa triển khai Job Ranking (1 CV + N Jobs)** | File `app/application/ranking_service.py` mới chỉ có hàm `rank_candidates(CandidateRankRequest)`, chưa có hàm `rank_jobs` hay endpoint `/jobs/rank`. | Thêm hàm `rank_jobs` vào `RankingService` và router `/jobs/rank` tái sử dụng chung `MatchingService` tương tự như `rank_candidates`. |
| **HIGH** | **Trọng số Matching Engine chưa được Product Owner phê duyệt** | File `app/domain/matching/scoring.py` dòng 10-12: `SKILL_WEIGHT=0.50`, `EXPERIENCE_WEIGHT=0.30`, `EDUCATION_WEIGHT=0.20`. | Cần Product Owner / Lead xác nhận bộ trọng số này hoặc chuyển thành các biến cấu hình trong `Settings` để điều chỉnh linh hoạt. |
| **HIGH** | **CORS đang mở toàn bộ (`*`) cho một dịch vụ nội bộ** | File `app/main.py` dòng 53: `allow_origins=["*"]`. | Vì FastAPI chỉ phục vụ gọi nội bộ từ .NET (Server-to-Server), nên giới hạn origin hoặc bỏ CORS để tăng cường bảo mật mạng nội bộ. |

#### 3. MEDIUM (Có thể giải quyết sau khi merge)
| Mức độ | Vấn đề phát hiện | Bằng chứng mã nguồn | Đề xuất khắc phục |
| :--- | :--- | :--- | :--- |
| **MEDIUM** | **Project/Domain Relevance chỉ ở mức đếm số lượng dự án** | File `app/application/matching_service.py` dòng 108: `len(cv.projects)`. | Nâng cấp thuật toán so khớp từ khóa công nghệ của dự án với JD trong các sprint tiếp theo. |
| **MEDIUM** | **Chưa có Semantic Vector Similarity** | Thư mục `app/domain/matching/` chưa có module tính cosine similarity qua embeddings. | Triển khai thêm mô hình embedding nhẹ khi hệ thống bước vào giai đoạn đánh giá AI evaluation. |
| **MEDIUM** | **Docker build chưa được verify do engine máy local tắt** | Lệnh `docker build` báo lỗi daemon pipe không tìm thấy. | Bật Docker Desktop trên máy build / CI để chạy thử lệnh `docker build -t futurecv-ai .` trước khi deploy. |
| **MEDIUM** | **Khác biệt quy ước đặt tên JSON Casing giữa Python và .NET** | Python dùng `snake_case`, C# dùng `PascalCase`. | Đảm bảo tài liệu tích hợp ghi rõ phía .NET cần bật `JsonNamingPolicy.SnakeCaseLower`. |

#### 4. LOW (Dọn dẹp và cải tiến tương lai)
| Mức độ | Vấn đề phát hiện | Bằng chứng mã nguồn | Đề xuất khắc phục |
| :--- | :--- | :--- | :--- |
| **LOW** | **Thư mục `evaluation/` mới chỉ có tài liệu hướng dẫn, chưa có tập dữ liệu test thực tế** | Thư mục `evaluation/datasets/` chỉ có `.gitkeep` và `README.md`. | Bổ sung các file JSON test case mẫu trong thư mục `evaluation/datasets/` phục vụ benchmark. |
| **LOW** | **Chưa đo lường token usage chi tiết từ OpenAI provider** | `app/infrastructure/llm/providers/openai_provider.py` chưa trích xuất trường `usage` từ response. | Lưu thêm `prompt_tokens` và `completion_tokens` vào `ResponseMeta` để theo dõi chi phí gọi API. |

---

## 21. MVP Requirement Coverage Matrix

| Yêu cầu AI của FutureCV MVP | Trạng thái | Vị trí triển khai trong mã nguồn | Công việc còn thiếu / Ghi chú |
| :--- | :--- | :--- | :--- |
| **CV PDF Parsing** | **DONE** | `app/infrastructure/documents/pdf_parser.py` | Hoàn chỉnh, an toàn, non-blocking. |
| **Structured CV Extraction** | **DONE** | `app/application/cv_analyzer.py` + `prompts/cv_extraction_v1.py` | Trích xuất thành `StructuredCv` qua LLM. |
| **CV Score** | **DONE** | `app/domain/cv/scoring.py` | Tính điểm độ hoàn thiện cấu trúc (0-100). |
| **Strengths Identification** | **DONE** | `app/domain/cv/scoring.py` + `prompts/cv_analysis_v1.py` | Kết hợp phân tích cấu trúc và nhận xét LLM. |
| **Weaknesses Identification** | **DONE** | `app/domain/cv/scoring.py` + `prompts/cv_analysis_v1.py` | Phát hiện phần thông tin bị thiếu hoặc yếu. |
| **Improvement Suggestions** | **DONE** | `app/domain/cv/scoring.py` + `prompts/cv_analysis_v1.py` | Đưa ra gợi ý cải thiện hành động cụ thể. |
| **CV $\leftrightarrow$ Job Match** | **DONE** | `app/application/matching_service.py` | Đánh giá so khớp toàn diện 1 CV và 1 Job. |
| **Matched Skills** | **DONE** | `app/domain/matching/skill_match.py` | Chuẩn hóa canonical aliases và so khớp. |
| **Missing Skills** | **DONE** | `app/domain/matching/skill_match.py` | Liệt kê các kỹ năng bắt buộc còn thiếu. |
| **Experience Comparison** | **DONE** | `app/domain/matching/experience_match.py` | So sánh số năm kinh nghiệm thực tế với yêu cầu. |
| **Education Comparison** | **DONE** | `app/domain/matching/education_match.py` | So sánh bậc bằng cấp theo thang thứ bậc. |
| **Project / Domain Relevance** | **PARTIAL** | `app/application/matching_service.py` | Mới dừng ở mức đếm số lượng dự án có công nghệ liên quan. |
| **Semantic Similarity** | **NOT IMPLEMENTED** | Chưa triển khai | Hoãn lại sang giai đoạn sau MVP theo Rule 21. |
| **Match Explanation** | **DONE** | `app/prompts/match_explanation_v1.py` | Sinh giải thích văn phong tự nhiên tiếng Việt. |
| **Job Ranking (1 CV $\rightarrow$ N Jobs)** | **NOT IMPLEMENTED** | Chưa có trong `RankingService` | Cần bổ sung phương thức `rank_jobs`. |
| **Candidate Ranking (1 Job $\rightarrow$ N CVs)**| **DONE** | `app/application/ranking_service.py` | Tái sử dụng Matching Engine với Bounded Concurrency. |
| **Career Assistant** | **DONE** | `app/application/career_assistant.py` | Xử lý hội thoại nghề nghiệp stateless có context. |
| **Internal REST Security** | **DONE** | `app/api/middleware/internal_auth.py` | Xác thực `X-Internal-API-Key` timing-safe. |
| **Correlation ID Tracing** | **DONE** | `app/api/middleware/correlation_id.py` | Validate và tiêm `X-Correlation-Id`. |
| **Prompt Versioning** | **DONE** | `app/prompts/*_v1.py` | Quản lý version độc lập từng prompt. |
| **Model Versioning** | **DONE** | Gắn trong `ResponseMeta` và `Settings.llm_model` | Ghi nhận metadata trong response. |
| **Evaluation Framework** | **PARTIAL** | `evaluation/README.md` | Có cấu trúc tài liệu, chưa có bộ test case JSON cụ thể. |

---

## 22. Review Checklist cho Project Owner

Bảng kiểm tra trước khi bấm nút Merge nhánh vào `master`:

- [ ] Tôi đã kiểm tra danh sách API paths và xác nhận các route cần thiết đã có mặt (`/health`, `/ready`, `/cv/analyze`, `/cv/improve`, `/job/match`, `/candidates/rank`, `/career/chat`).
- [ ] Tôi hiểu rằng `POST /api/v1/cv/improve` là alias tương thích và CV Improvement nằm trong kết quả phân tích của CV Analysis.
- [ ] Tôi đồng ý với việc sử dụng chuẩn đặt tên JSON `snake_case` từ FastAPI và sẽ thông báo cho đội ngũ .NET cấu hình `JsonNamingPolicy.SnakeCaseLower`.
- [ ] Tôi đã nắm được bộ trọng số Matching Engine hiện tại (Kỹ năng 50%, Kinh nghiệm 30%, Học vấn 20%) là giả định ban đầu và chấp thuận dùng làm baseline cho MVP.
- [ ] Tôi yêu cầu điều chỉnh cấu hình `MAX_UPLOAD_SIZE_BYTES` từ 10MB về 5MB trước khi đưa lên production.
- [ ] Tôi ghi nhận việc tính năng Job Ranking (1 CV - N Jobs) chưa có trong bản này và sẽ bổ sung ở sprint kế tiếp (hoặc trước khi merge).
- [ ] Tôi đã kiểm tra cơ chế bảo mật nội bộ `X-Internal-API-Key` và hiểu rằng cần cấu hình biến môi trường này ở cả hai phía .NET và Python khi deploy.
- [ ] Tôi xác nhận rằng toàn bộ 48 bài kiểm thử (Unit, Integration, Contract, Architecture) đều đã pass 100%.
- [ ] Tôi xác nhận rằng không có bất kỳ file mã nguồn nào bên ngoài thư mục `backend-ai/` bị sửa đổi trong đợt refactor này.
- [ ] Tôi xác nhận không có bất kỳ API key hay bí mật nào bị commit vào kho lưu trữ Git.

---

## 23. Kết luận Review

### Khuyến nghị tổng thể:
> **`READY TO MERGE AFTER MINOR FIXES`**  
> **(Sẵn sàng Merge sau khi xử lý các chỉnh sửa nhỏ)**

### Các lý do cốt lõi:
1. **Kiến trúc phân tầng xuất sắc:** Đợt refactor đã chuyển hóa thành công một thư mục rỗng thành một hệ thống tuân thủ nghiêm ngặt mô hình Lục giác (Hexagonal / Clean Architecture). Ranh giới giữa ASP.NET Core (chủ quyền state/database) và FastAPI (tính toán AI stateless) được thiết lập hoàn hảo, không có bất kỳ vi phạm nào liên quan đến SQLAlchemy hay truy cập database trái phép.
2. **Chất lượng kiểm thử tự động tuyệt đối:** Toàn bộ các Quality Gates bắt buộc (`compileall`, `ruff check`, `ruff format`, `mypy strict`, `pytest`) đều vượt qua 100% với 48/48 test cases, đặc biệt có 4 bài test phân tích cú pháp AST kiểm soát nghiêm ngặt ranh giới phụ thuộc giữa các tầng.
3. **Tính tái sử dụng cao trong Matching Engine:** Candidate Ranking tái sử dụng trực tiếp Matching Engine đơn lẻ kết hợp kiểm soát đồng thời (Bounded Concurrency), loại bỏ hoàn toàn nguy cơ phân mảnh công thức tính điểm.
4. **Vấn đề duy nhất cần xử lý ngay:** Cần chỉnh sửa giá trị mặc định của `MAX_UPLOAD_SIZE_BYTES` từ 10MB về 5MB trong `config.py` và `.env.example` để đúng với đặc tả MVP của FutureCV, sau đó có thể an tâm merge nhánh vào `master`.

