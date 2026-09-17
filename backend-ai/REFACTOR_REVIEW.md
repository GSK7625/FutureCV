# Backend-AI Refactor Review

> **Tài liệu thẩm định kiến trúc và rà soát mã nguồn (Architecture & Code Review)**  
> **Dự án:** FutureCV  
> **Đối tượng:** Phân hệ Trí tuệ Nhân tạo `backend-ai/`  
> **Người thực hiện:** Principal AI Backend Architect & Review Lead  
> **Phiên bản tài liệu:** 2.0 (Post-Hardening Final Documentation Consistency Pass)

---

## 1. Thông tin chung

- **Repository:** `https://github.com/GSK7625/FutureCV`
- **Nhánh hiện tại (Current Branch):** `refactor/backend-ai-architecture`
- **Ngày thực hiện review:** 12/09/2026
- **Trạng thái Git Working Tree:** Toàn bộ thay đổi nằm trọn vẹn trong phân hệ `backend-ai/`. Thư mục `backend/` (ASP.NET Core) và `frontend/` (React) hoàn toàn sạch, không bị sửa đổi.
- **Phạm vi kiểm tra (Scope reviewed):**
  - **Phạm vi chính (Primary scope):** Toàn bộ thư mục `backend-ai/` (Mã nguồn `app/`, cấu hình `pyproject.toml`, `requirements.txt`, `requirements-dev.txt`, `Dockerfile`, `.env.example`, tài liệu `README.md`, và test suite `tests/`).
  - **Phạm vi đối chiếu đọc (Read-only secondary scope):** Thư mục `backend/` (ASP.NET Core 8 Web API) nhằm xác minh tính tương thích ranh giới dịch vụ giữa .NET và FastAPI.
- **Mục đích tài liệu:** Tài liệu này phản ánh trung thực, chính xác và duy nhất trạng thái mã nguồn **hiện tại** của phân hệ `backend-ai` sau khi đã hoàn tất toàn bộ các bước refactor và hardening pass, loại bỏ triệt để các phát biểu cũ lỗi thời.

---

## 2. Mục tiêu của đợt refactor & Ranh giới kiến trúc

Đợt tái cấu trúc này chuyển đổi `backend-ai/` thành một nền tảng tính toán AI hoàn chỉnh, tuân thủ nghiêm ngặt **Kiến trúc Tổng thể của FutureCV** và **Mô hình Kiến trúc Lục giác / Phân tầng Sạch (Hexagonal / Clean Architecture)**.

### 2.1. Ranh giới hệ thống (System Boundaries)
```text
React Frontend ──(HTTPS/REST)──► ASP.NET Core Backend (Modular Monolith)
                                         │
                                         ▼ (Internal REST / X-Internal-API-Key)
                                 FastAPI AI Service (Stateless Compute)
```

1. **ASP.NET Core (Central Authority):**
   - Sở hữu toàn bộ trạng thái nghiệp vụ: Candidate, Recruiter, Company, Job, CV, Application, Recruitment Pipeline.
   - Sở hữu cơ sở dữ liệu PostgreSQL (EF Core, Migrations, Persistence).
   - Sở hữu toàn bộ cơ chế Authentication & Authorization (JWT, Role-based).
   - Điều phối các tác vụ AI và lưu trữ kết quả tính toán của AI.
   - Là đơn vị duy nhất đưa ra quyết định chuyển đổi trạng thái ứng tuyển (AI chỉ mang tính chất hỗ trợ quyết định).

2. **Python FastAPI (`backend-ai`):**
   - Đóng vai trò là dịch vụ tính toán AI hoàn toàn **Stateless**.
   - **Tuyệt đối không kết nối PostgreSQL** (không có SQLAlchemy, psycopg, migrations hay ORM models).
   - **Tuyệt đối không lưu trữ hay biến đổi trạng thái nghiệp vụ** của ứng viên hoặc công việc.
   - **Browser CORS: disabled** — Không cấu hình CORS middleware; chỉ nhận request server-to-server từ ASP.NET Core qua mạng nội bộ.
   - Nhận dữ liệu đã được xác thực từ ASP.NET Core và trả về kết quả phân tích/tính điểm.

### 2.2. Ranh giới phụ thuộc nội bộ (Inward Dependency Rule)
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
- **Infrastructure $\rightarrow$ Ports:** Các adapter kỹ thuật (PyMuPDF, OpenAI, Mock) hiện thực hóa interface đã định nghĩa ở Ports.
- **Ranh giới Infrastructure $\not\to$ Application:** Tầng Infrastructure tuyệt đối không import tầng Application (được kiểm chứng tự động bằng AST test).
- **Domain Layer:** Chứa thuật toán tính điểm thuần túy, chuẩn hóa dữ liệu. **Hoàn toàn độc lập** với FastAPI, Starlette, HTTP clients, và LLM providers.

---

## 3. Cấu trúc cây thư mục hiện tại trong mã nguồn

Cấu trúc cây thư mục thực tế hiện tại của `backend-ai/`:
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
│   │       ├── project_match.py
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
    │   ├── test_health.py
    │   └── test_pdf_upload_hardening.py
    └── unit/
        ├── __init__.py
        ├── test_career_assistant_hardening.py
        ├── test_config.py
        ├── test_contracts_hardening.py
        ├── test_correlation_id.py
        ├── test_cv_analyzer_hardening.py
        ├── test_cv_scoring.py
        ├── test_education_matching.py
        ├── test_experience_matching.py
        ├── test_internal_auth.py
        ├── test_llm_provider_hardening.py
        ├── test_pdf_hardening.py
        ├── test_project_matching.py
        ├── test_ranking_service.py
        └── test_skill_matching.py
```

### Bảng chuyển đổi cấu trúc (Structural Migration Table):

| Đường dẫn cũ (Scaffold rỗng) | Đường dẫn mới | Mục đích kiến trúc | Trạng thái |
| :--- | :--- | :--- | :--- |
| `app/schemas/` | `app/contracts/` | Tách biệt hợp đồng truyền thông khỏi model nội bộ. | **HOÀN TẤT** |
| `app/core/pdf/` | `app/infrastructure/documents/pdf_parser.py` | PyMuPDF là chi tiết kỹ thuật của `DocumentParserPort` thuộc Infrastructure. | **HOÀN TẤT** |
| `app/core/llm/` | `app/infrastructure/llm/` & `app/ports/llm.py` | Phân tách interface `LlmPort` và các triển khai cụ thể (OpenAI, Mock). | **HOÀN TẤT** |
| `app/core/prompts/` | `app/prompts/` | Quản lý Prompts như các production artifacts có phiên bản độc lập (`_v1.py`). | **HOÀN TẤT** |
| `app/core/security/` | `app/api/middleware/internal_auth.py` | Bảo mật HTTP Token nội bộ thuộc tầng API Middleware. | **HOÀN TẤT** |
| `app/services/` | `app/application/` & `app/domain/` | Tách Use-case Orchestration khỏi Pure Domain Logic. | **HOÀN TẤT** |
| `app/utils/` | `app/domain/cv/normalization.py` | Đưa logic chuẩn hóa kỹ năng về đúng Domain. | **HOÀN TẤT** |
| `app/core/embeddings/` | *(Không tạo rỗng)* | Không tạo adapter giả khi chưa triển khai vector embeddings. | **HOÀN TẤT** |

---

## 4. Danh sách các file và trách nhiệm hiện tại

### 4.1. Core & Application Entrypoint
- `app/main.py`: Khởi tạo ứng dụng FastAPI, lifespan logging, middleware `CorrelationIdMiddleware`, mount các routers v1. **Browser CORS: disabled** (không có `CORSMiddleware`).
- `app/core/config.py`: Quản lý cấu hình bằng Pydantic v2 Settings.
  - `LLM_PROVIDER: Literal["mock", "openai"] = "mock"` (Mặc định `mock`; chỉ hỗ trợ `mock` và `openai`).
  - `MAX_UPLOAD_SIZE_BYTES: int = 5 * 1024 * 1024` (Giới hạn PDF chuẩn 5 MB = 5,242,880 bytes).
  - Production validators: Ngăn chặn chạy `production` với provider `mock` hoặc khi thiếu `INTERNAL_API_KEY`.
- `app/core/exceptions.py`: Định nghĩa hệ thống ngoại lệ phân cấp (`FutureCvAiError`, `InternalAuthError`, `DocumentParsingError`, `DocumentSizeLimitExceededError`, `DocumentPageLimitExceededError`, `LlmProviderError`, v.v.).
- `app/observability/logging.py`: Cấu hình logging PII-safe, tích hợp `correlation_id` qua `contextvars.ContextVar`.

### 4.2. API Layer
- `app/api/middleware/correlation_id.py`: Kiểm tra, làm sạch mã `X-Correlation-Id` bằng regex `^[a-zA-Z0-9_\-\.]{1,128}$` chống log injection, gắn vào response headers.
- `app/api/middleware/internal_auth.py`: Xác thực khóa `X-Internal-API-Key` với `hmac.compare_digest` chống timing attack, fail-closed ở môi trường production.
- `app/api/deps.py`: Dependency injection. `get_llm` là async generator quản lý chu kỳ sống, đảm bảo gọi `await provider.aclose()` giải phóng tài nguyên mạng.
- `app/api/exception_handlers.py`: Bắt các ngoại lệ domain và HTTP, chuẩn hóa response lỗi theo schema `ErrorResponse`, che giấu stack trace nhạy cảm.
- `app/api/v1/health.py`: Liveness probe (`/health`, 200 tức thì không gọi phụ thuộc) và readiness probe (`/ready`).
- `app/api/v1/cv_analysis.py`: Đọc upload theo từng chunk 64KB có giới hạn (ngắt ngay và trả về HTTP 413 nếu vượt 5 MB), các endpoint phân tích text và cải thiện CV.
- `app/api/v1/matching.py`: Endpoint tính toán độ phù hợp Job Matching và Candidate Ranking.
- `app/api/v1/career.py`: Endpoint hỗ trợ hội thoại tư vấn nghề nghiệp Career Assistant.

### 4.3. Contracts Layer (`app/contracts/`)
- Định nghĩa bằng Pydantic v2:
  - `WorkExperienceItem.years_of_experience`: Giới hạn `0.0 <= val <= 60.0`.
  - `StructuredJob.minimum_experience_years`: Giới hạn `0.0 <= val <= 60.0`.
  - `CvAnalysisContentRequest.raw_text`: Chuỗi không rỗng, tối đa 50,000 ký tự.
  - `CandidateItem.candidate_id`: Tối đa 256 ký tự, tự động strip khoảng trắng, không cho phép rỗng.
  - `CandidateRankRequest`: Giới hạn từ 1 đến 100 ứng viên, cấm trùng lặp `candidate_id` qua model validator.
  - `ChatMessage`: Nội dung 1-4,000 ký tự, `role: Literal["user", "assistant"]` (chặn role `"system"`).
  - `CareerAssistantRequest.message`: 1-4,000 ký tự không rỗng, `history`: tối đa 20 tin nhắn.
  - `ResponseMeta`: Chứa `algorithm_version` (`matching-v0`), `prompt_version`, `provider`, `model`, `processing_time_ms`, `correlation_id`.

### 4.4. Domain Layer (`app/domain/`)
- Hoàn toàn thuần túy Standard Library Python (không phụ thuộc FastAPI, Starlette, HTTP clients hay thư viện bên ngoài).
- `cv/normalization.py`: Chuẩn hóa kỹ năng và từ điển canonical aliases.
- `cv/scoring.py`: Tính điểm hoàn thiện cấu trúc CV theo thang điểm 100.
- `matching/skill_match.py`: So khớp kỹ năng phân định 4 trường hợp (Case A: 80% req + 20% pref, Case B: 100% req tuyến tính, Case C: 100% pref, Case D: 100% neutral).
- `matching/experience_match.py`: So sánh số năm kinh nghiệm thực tế với yêu cầu.
- `matching/education_match.py`: So sánh bậc bằng cấp theo thang phân cấp thứ bậc.
- `matching/project_match.py`: Tính độ liên quan dự án qua phép giao thoa công nghệ đã chuẩn hóa alias (`deterministic informational baseline`).
- `matching/scoring.py`: Khởi tạo hằng số `MATCHING_ALGORITHM_VERSION = "matching-v0"`, tổng hợp điểm heuristic theo tỷ lệ Kỹ năng 50%, Kinh nghiệm 30%, Học vấn 20% (kèm tuyên bố uncalibrated baseline).

### 4.5. Application Layer (`app/application/`)
- `cv_analyzer.py`: Trích xuất PDF $\rightarrow$ gọi LLM trích xuất `StructuredCv` $\rightarrow$ chấm điểm cấu trúc Domain $\rightarrow$ làm sạch PII (họ tên, email, SĐT) $\rightarrow$ gọi LLM nhận xét định tính `CvQualitativeFeedback` (strengths, weaknesses, improvement_suggestions) $\rightarrow$ gộp độc lập và khử trùng lặp có thứ tự.
- `matching_service.py`: Tính toán độ phù hợp đơn lẻ giữa 1 CV và 1 Job. Hỗ trợ cờ `generate_explanation: bool = True`. Nếu `False`, sinh tóm tắt tất định mà không gọi LLM.
- `ranking_service.py`: Xếp hạng $N$ ứng viên với 1 Job dưới cơ chế kiểm soát đồng thời `asyncio.Semaphore`. Gọi `matching_service.match(..., generate_explanation=False)` dẫn đến **zero LLM explanation calls**, tiết kiệm 100% chi phí và độ trễ LLM trong xếp hạng ứng viên.
- `career_assistant.py`: Xử lý hội thoại tư vấn nghề nghiệp. Lược bỏ `candidate_id` và thông tin định danh cá nhân khỏi prompt context gửi LLM.

### 4.6. Ports & Infrastructure Layer
- `ports/document_parser.py`: Định nghĩa interface trừu tượng `DocumentParserPort`.
- `ports/llm.py`: Định nghĩa interface trừu tượng `LlmPort` với thuộc tính `provider_name`, `model_name` và phương thức `async def aclose()`.
- `infrastructure/documents/pdf_parser.py`: Hiện thực PyMuPDF. Kiểm tra header `%PDF-` trong prefix 1024 bytes, giới hạn trang (`max_pdf_pages = 20`), và kiểm tra độ dài ký tự tích lũy theo từng trang, ném `DocumentParsingError` khi vượt ngưỡng thay vì cắt chuỗi âm thầm.
- `infrastructure/llm/providers/mock_provider.py`: Mock deterministic cho dev/test, triển khai metadata và `aclose()`.
- `infrastructure/llm/providers/openai_provider.py`: Triển khai cho OpenAI. Tái sử dụng một `httpx.AsyncClient` duy nhất trong suốt vòng đời và đóng qua `aclose()`. Cơ chế exponential backoff có jitter cho các mã lỗi tạm thời (408, 429, 500, 502, 503, 504) tuân thủ `Retry-After`. Thất bại nhanh (fail-fast) đối với lỗi 400, 401, 403, 404 mà không retry vô ích.

### 4.7. Prompts (`app/prompts/`)
- `cv_extraction_v1.py`, `cv_analysis_v1.py`, `match_explanation_v1.py`, `career_v1.py`: Tất cả dữ liệu đầu vào người dùng được bao bọc trong thẻ phân cách rõ ràng (`<<<BEGIN UNTRUSTED DATA>>> ... <<<END UNTRUSTED DATA>>>`) kèm chỉ thị hệ thống cấm tuyệt đối việc ghi đè prompt (anti-override).

---

## 5. Review chi tiết từng Layer

### 5.1. API Layer
- **Browser CORS: disabled.** Vì toàn bộ traffic đến từ ASP.NET Core qua mạng nội bộ, CORS middleware được gỡ bỏ hoàn toàn nhằm triệt tiêu bề mặt tấn công từ trình duyệt.
- **Xác thực API nội bộ:** Áp dụng trên toàn bộ các endpoint nghiệp vụ qua header `X-Internal-API-Key`.
- **Giới hạn Streaming Upload:** Đọc file upload theo từng khối 64KB, kiểm soát ngưỡng 5 MB trong lúc đọc, lập tức hủy xử lý và trả về HTTP 413 nếu vượt quá.

#### Bảng chi tiết Endpoints:

| Method | Path | Authentication | Request Contract | Response Contract | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | Không (Public) | None | `{"status": "ok"}` | Liveness probe, 200 tức thì |
| `GET` | `/ready` | Không (Public) | None | `{"status": "ready/not_ready", ...}` | Readiness probe kiểm tra config/keys |
| `GET` | `/api/v1/health` | Không (Public) | None | `{"status": "ok"}` | Alias v1 liveness |
| `GET` | `/api/v1/ready` | Không (Public) | None | `{"status": "ready/not_ready", ...}` | Alias v1 readiness |
| `POST` | `/api/v1/cv/analyze` | `X-Internal-API-Key` | `UploadFile` (multipart/form-data) | `CvAnalysisResponse` | Bounded streaming, 5 MB limit |
| `POST` | `/api/v1/cv/analyze-text`| `X-Internal-API-Key` | `CvAnalysisContentRequest` (JSON) | `CvAnalysisResponse` | Text thô $\le$ 50k ký tự |
| `POST` | `/api/v1/cv/improve` | `X-Internal-API-Key` | `CvAnalysisContentRequest` (JSON) | `CvAnalysisResponse` | Gợi ý cải thiện CV |
| `POST` | `/api/v1/job/match` | `X-Internal-API-Key` | `MatchRequest` (JSON) | `MatchResult` | Đánh giá 1 CV với 1 Job (`matching-v0`) |
| `POST` | `/api/v1/candidates/rank`| `X-Internal-API-Key`| `CandidateRankRequest` (JSON) | `CandidateRankResponse` | Zero LLM calls, 1-100 candidates |
| `POST` | `/api/v1/career/chat` | `X-Internal-API-Key` | `CareerAssistantRequest` (JSON) | `CareerAssistantResponse` | Tư vấn nghề nghiệp, PII-stripped |

### 5.2. Contracts Layer
- Toàn bộ contract được định nghĩa bằng Pydantic v2 theo chuẩn `snake_case`.
- **Ranh giới thực tế:** Python API contracts are defined, but cross-language runtime compatibility has not yet been verified because the .NET AI client/DTO integration is not implemented.

### 5.3. Application Layer
- Giữ vai trò điều phối thuần túy, không chứa logic cơ sở dữ liệu, không import FastAPI framework.
- Candidate Ranking tái sử dụng trực tiếp Matching Engine đơn lẻ, đảm bảo tính nhất quán tuyệt đối về công thức tính điểm và tận dụng cờ `generate_explanation=False` để đạt mức chi phí 0 token LLM cho phần giải thích.

### 5.4. Domain Layer
- Đạt độ độc lập 100%, được cô lập hoàn toàn khỏi thế giới bên ngoài.
- Thuật toán tính điểm hoàn toàn tất định (deterministic), minh bạch và giải thích được.

---

## 6. Đánh giá Matching Engine (`matching-v0`)

### Luồng xử lý Matching Engine:
```text
StructuredCv ────────────────┐
                             ▼
             ┌───────────────────────────────┐
             │   MatchingService.match()     │
             └───────────────┬───────────────┘
                             ▲
StructuredJob ───────────────┘
                             │
     ┌───────────────────────┼───────────────────────┬───────────────────────┐
     ▼                       ▼                       ▼                       ▼
Skill Match             Experience Match        Education Match         Project Match
(calculate_skill_match) (calculate_exp_match)   (calculate_edu_match)   (calculate_project_relevance)
• Case A: 80/20%        • Actual vs Req years   • Hierarchy rank        • Canonical technology
• Case B: 100% req      • 0 - 100%              • 50 / 75 / 100%          intersection
• Case C: 100% pref                                                     • Informational baseline
• Case D: 100% neutral
     │                       │                       │                       │
     └───────────────────────┼───────────────────────┘                       │
                             ▼                                               │
             ┌───────────────────────────────┐                               │
             │  compute_overall_match_score  │                               │
             │  Skill * 0.50 + Exp * 0.30 +  │                               │
             │  Edu * 0.20                   │                               │
             │  (matching-v0 baseline)       │                               │
             └───────────────┬───────────────┘                               │
                             ▼                                               │
                     Final MatchScore (0-100)                                │
                             │                                               │
                             ├───────────────────────────────────────────────┘
                             ▼
             ┌───────────────────────────────┐
             │    Generate Explanation?      │
             │  - If True: LLM synthesis     │
             │  - If False: Deterministic    │
             │    summary (zero LLM calls)   │
             └───────────────┬───────────────┘
                             ▼
                        MatchResult
```

### Bảng trạng thái các năng lực Matching:

| Năng lực Matching | Trạng thái kỹ thuật | Mô tả chi tiết trong mã nguồn hiện tại |
| :--- | :--- | :--- |
| **Required & Preferred Skills** | **IMPLEMENTED** | `skill_match.py`: 4 ca A/B/C/D xử lý liên tục tuyến tính, hỗ trợ canonical aliases. |
| **Experience Comparison** | **IMPLEMENTED** | `experience_match.py`: So sánh số năm kinh nghiệm thực tế với yêu cầu. |
| **Education Comparison** | **IMPLEMENTED** | `education_match.py`: So sánh bậc bằng cấp theo thang phân cấp thứ bậc. |
| **Project Relevance** | **INFORMATIONAL BASELINE** | `project_match.py`: Đối chiếu tập công nghệ dự án với kỹ năng yêu cầu/ưu tiên, đưa ra giải thích trung thực. |
| **Matching Algorithm Version** | **matching-v0 BASELINE** | Hằng số `MATCHING_ALGORITHM_VERSION = "matching-v0"`, trọng số heuristic 50/30/20 (uncalibrated baseline). |
| **Candidate Ranking** | **IMPLEMENTED** | `ranking_service.py`: Đánh giá song song với `asyncio.Semaphore`, zero LLM explanation calls. |
| **Semantic Similarity** | **NOT IMPLEMENTED** | Chưa triển khai trong `matching-v0`. |
| **Job Ranking (1 CV $\rightarrow$ N Jobs)** | **NOT IMPLEMENTED** | Chưa triển khai trong phạm vi hiện tại. |
| **AI Evaluation / Calibration** | **NOT IMPLEMENTED** | Chưa có bộ dữ liệu benchmark thực nghiệm cho trọng số matching. |

---

## 7. Đánh giá An ninh (Security Review)

| Vùng an ninh | Triển khai trong mã nguồn hiện tại | Đánh giá |
| :--- | :--- | :--- |
| **Internal API Key** | `app/api/middleware/internal_auth.py` xác thực token qua `hmac.compare_digest`. Bắt buộc ở production (fail-closed). | **GOOD** |
| **Browser CORS** | **Browser CORS: disabled.** Không có `CORSMiddleware`, ngăn chặn hoàn toàn truy cập trực tiếp từ trình duyệt. | **GOOD** |
| **Upload Memory Protection** | `app/api/v1/cv_analysis.py` đọc stream từng khối 64KB, ngắt tức thì nếu vượt quá giới hạn 5 MB (HTTP 413). | **GOOD** |
| **PDF Extraction Ceiling** | `app/infrastructure/documents/pdf_parser.py` kiểm tra số ký tự tích lũy theo từng trang, ném lỗi có kiểm soát khi vượt 50,000 ký tự. | **GOOD** |
| **Prompt Injection Defense** | Dùng thẻ phân cách `<<<BEGIN UNTRUSTED ...>>>` và chỉ thị cấm ghi đè hệ thống trong toàn bộ prompts. | **GOOD** |
| **PII Minimization** | Làm sạch họ tên, email, số điện thoại, candidate ID trước khi đưa vào context gửi LLM. | **GOOD** |
| **Correlation ID Sanitization** | Regex `^[a-zA-Z0-9_\-\.]{1,128}$` ngăn chặn tấn công log injection. | **GOOD** |
| **Error Sanitization** | Che giấu toàn bộ internal stack trace và đường dẫn hệ thống trong responses lỗi (HTTP 500). | **GOOD** |

---

## 8. Đánh giá Cấu hình (Configuration Review)

Nguồn cấu hình: `app/core/config.py` và `backend-ai/.env.example`.

| Biến môi trường | Kiểu dữ liệu | Giá trị mặc định | Quy tắc xác thực |
| :--- | :--- | :--- | :--- |
| `APP_NAME` | `str` | `"FutureCV Backend AI"` | Tên dịch vụ |
| `ENV` | `Literal` | `"development"` | `development`, `test`, `staging`, `production` |
| `HOST` | `str` | `"127.0.0.1"` | Host bind |
| `PORT` | `int` | `8000` | Port bind |
| `LLM_PROVIDER` | `Literal` | `"mock"` | Chỉ hỗ trợ `mock` và `openai`. Ở production cấm dùng `mock`. |
| `LLM_MODEL` | `str` | `"gpt-4o-mini"` | Model ID |
| `OPENAI_API_KEY` | `str \| None` | `None` | Bắt buộc khi dùng provider `openai` |
| `INTERNAL_API_KEY` | `str` | `""` | Bắt buộc phải có giá trị không rỗng ở `production` |
| `MAX_UPLOAD_SIZE_BYTES` | `int` | `5242880` (5 MB) | Dung lượng file upload tối đa |
| `MAX_PDF_PAGES` | `int` | `20` | Giới hạn số trang PDF (1 - 100) |
| `MAX_EXTRACTED_TEXT_CHARS` | `int` | `50000` | Giới hạn ký tự trích xuất tài liệu |
| `LLM_TIMEOUT_SECONDS` | `int` | `60` | Timeout gọi LLM (5 - 300) |
| `LLM_MAX_RETRIES` | `int` | `2` | Số lần thử lại tối đa (0 - 5) |

---

## 9. Báo cáo Kiểm thử (Test Suite Review)

### 9.1. Lịch sử số lượng bài kiểm thử
- **Số lượng kiểm thử trước Hardening (Pre-hardening count từ Git commit `6edd28c`):** **48 passed**
  - Unit: 25
  - Integration: 11
  - FastAPI/Pydantic API contract validation: 8
  - Architecture: 4
- **Số lượng kiểm thử hiện tại (Current post-hardening count):** **106 passed in 1.64s**
  - Unit: 80
  - Integration: 13
  - FastAPI/Pydantic API contract validation: 8
  - Architecture: 5

### 9.2. Chi tiết phân bổ 106 bài kiểm thử hiện tại:

1. **Architecture Tests (5 tests in `tests/architecture/test_boundaries.py`):**
   - `test_no_database_libraries_in_entire_backend_ai`: Quét AST toàn bộ mã nguồn, bảo đảm không chứa SQLAlchemy, psycopg, asyncpg, tortoise, peewee, sqlmodel.
   - `test_domain_layer_dependencies`: Đảm bảo `app/domain/` chỉ dùng thư viện chuẩn, không import FastAPI, Starlette, httpx, fitz, openai, hay infrastructure.
   - `test_application_layer_dependencies`: Đảm bảo `app/application/` không import FastAPI hay concrete providers.
   - `test_infrastructure_layer_dependencies`: Đảm bảo `app/infrastructure/` không import tầng `application`.
   - `test_api_routes_do_not_import_concrete_providers_directly`: Đảm bảo API route không import trực tiếp OpenAI SDK.

2. **FastAPI/Pydantic API contract validation (8 tests in `tests/contract/`):**
   - Xác thực schema của `StructuredCv`, `CvAnalysisResponse`, `StructuredJob`, `MatchRequest`, `MatchResult`, `CandidateRankRequest`, `CandidateRankResponse`, `CareerAssistantRequest`, `ErrorResponse`.

3. **Integration Tests (13 tests in `tests/integration/`):**
   - Kiểm tra liveness và readiness probes, header `X-Correlation-Id`.
   - Kiểm tra xử lý lỗi 404 và domain exceptions an toàn.
   - Kiểm tra các HTTP endpoints: `/cv/analyze-text`, `/cv/improve`, `/job/match`, `/candidates/rank`, `/career/chat`.
   - Kiểm tra upload PDF thành công và chặn upload quá khổ 5 MB ngay từ khâu đọc stream.

4. **Unit Tests (80 tests in `tests/unit/`):**
   - `test_config.py` (8 tests): Cấu hình môi trường, xác thực provider, validator production.
   - `test_contracts_hardening.py` (24 tests): Ràng buộc Pydantic v2 (năm kinh nghiệm, độ dài text, ID ứng viên, chat roles).
   - `test_pdf_hardening.py` (5 tests): Magic bytes, giới hạn trang, giới hạn ký tự tích lũy không cắt chuỗi âm thầm.
   - `test_skill_matching.py` (7 tests): Chuẩn hóa aliases, tính liên tục tuyến tính của 4 ca A/B/C/D.
   - `test_experience_matching.py` (3 tests): So khớp thừa, thiếu, hoặc không yêu cầu số năm kinh nghiệm.
   - `test_education_matching.py` (3 tests): So khớp bậc học vấn theo phân cấp.
   - `test_project_matching.py` (5 tests): Đánh giá độ liên quan dự án và kiểm tra phiên bản `matching-v0`.
   - `test_ranking_service.py` (2 tests): Sắp xếp giảm dần và kiểm chứng **zero LLM explanation calls**.
   - `test_cv_scoring.py` (2 tests): Điểm completeness cấu trúc CV.
   - `test_cv_analyzer_hardening.py` (3 tests): Lọc sạch PII trước khi gửi prompt, gộp và khử trùng lặp feedback có thứ tự.
   - `test_career_assistant_hardening.py` (1 test): Lược bỏ PII và `candidate_id` khỏi context gửi LLM.
   - `test_llm_provider_hardening.py` (8 tests): Tái sử dụng client, lifecycle `aclose()`, exponential backoff retry cho transient 429/5xx, fail-fast cho lỗi 4xx cố định.
   - `test_internal_auth.py` (5 tests): Xác thực token nội bộ timing-safe.
   - `test_correlation_id.py` (4 tests): Làm sạch Correlation ID chống log injection.

---

## 10. Tình trạng tích hợp với .NET (.NET Integration Readiness)

- **Trạng thái:** **NOT IMPLEMENTED.**
- **Khảo sát thực tế:** Python API contracts are defined, but cross-language runtime compatibility has not yet been verified because the .NET AI client/DTO integration is not implemented.
- **Yêu cầu đối với đội ngũ .NET khi tích hợp:**
  1. Đăng ký typed `HttpClient` gọi sang FastAPI base URL.
  2. Cấu hình JSON serialization với `JsonNamingPolicy.SnakeCaseLower`.
  3. Gửi kèm header `X-Internal-API-Key` khớp với cấu hình của FastAPI.
  4. Truyền header `X-Correlation-Id` để đảm bảo truy vết phân tán xuyên suốt hệ thống.

---

## 11. Đánh giá Container Docker

- **Dockerfile:** Cấu trúc đa tầng dựa trên `python:3.11-slim`, chạy dưới quyền user không đặc quyền `appuser`, tích hợp `HEALTHCHECK` thăm dò `/health` bằng `urllib.request`.
- **Trạng thái thẩm định:** **`Docker verification: NOT VERIFIED`**
  - **Lý do thực tế:** Docker Desktop daemon trên máy trạm Windows hiện tại đang ở trạng thái tắt / chưa chạy service pipe (`failed to connect to npipe:////./pipe/dockerDesktopLinuxEngine`). Cú pháp Dockerfile đã đạt chuẩn production.

---

## 12. Báo cáo Quality Gates

Kết quả thực thi thực tế của toàn bộ các lệnh kiểm tra chất lượng mã nguồn:

| Công cụ / Lệnh kiểm tra | Kết quả thực tế | Chi tiết kết quả |
| :--- | :---: | :--- |
| `python -m compileall app tests` | **PASSED** | Biên dịch bytecode 100% thành công, không có lỗi cú pháp. |
| `python -m ruff check app tests` | **PASSED** | `All checks passed!` (0 cảnh báo linter). |
| `python -m ruff format --check app tests` | **PASSED** | `87 files already formatted` (Chuẩn định dạng mã nguồn). |
| `python -m mypy app` | **PASSED** | `Success: no issues found in 58 source files` (Strict type-checking đạt 100%). |
| `python -m pytest tests -v` | **PASSED** | `106 passed in 1.64s` (100% test cases thành công). |
| OpenAPI Schema Generation | **PASSED** | 10 routes hợp lệ, schema sinh hoàn chỉnh không lỗi import. |

---

## 13. Giới hạn kỹ thuật còn lại (Technical Limitations)

Cần ghi nhận rõ ràng các giới hạn kỹ thuật trong phạm vi hiện tại:
1. **Semantic Similarity:** **NOT IMPLEMENTED** trong `matching-v0`.
2. **Job Ranking (1 CV $\rightarrow$ N Jobs):** **NOT IMPLEMENTED** (Hiện tại chỉ có Candidate Ranking 1 Job $\rightarrow$ N CVs).
3. **AI Calibration:** **NOT IMPLEMENTED** (Bộ trọng số 50/30/20 là baseline heuristic kỹ thuật, chưa được hiệu chỉnh qua tập dữ liệu benchmark).
4. **.NET Runtime Integration:** **NOT IMPLEMENTED** (Chưa có mã nguồn C# `HttpClient` trong ASP.NET Core kết nối với FastAPI).
5. **Docker Build:** **NOT VERIFIED** do Docker daemon cục bộ không hoạt động.

---

## 14. Bảng trạng thái triển khai cuối cùng (Final Implementation Status)

```text
Architecture baseline: READY
Python quality gates: PASSED
Docker verification: NOT VERIFIED
Matching Engine: matching-v0 BASELINE
Candidate Ranking: IMPLEMENTED
Project relevance: INFORMATIONAL BASELINE
Career Assistant: FOUNDATION IMPLEMENTED
Semantic Similarity: NOT IMPLEMENTED
Job Ranking: NOT IMPLEMENTED
AI calibration: NOT IMPLEMENTED
.NET runtime integration: NOT IMPLEMENTED
```

---

## 15. Kết luận & Khuyến nghị thẩm định cuối cùng

### Khuyến nghị:
> ### 🚀 **`READY TO MERGE AFTER FINAL DIFF REVIEW`**

Phân hệ `backend-ai` trên nhánh `refactor/backend-ai-architecture` đã đạt đầy đủ các tiêu chuẩn kỹ thuật khắt khe nhất: bảo vệ ranh giới kiến trúc Lục giác bằng kiểm thử AST tự động, loại bỏ hoàn toàn browser CORS cho dịch vụ nội bộ, chặn cạn kiệt tài nguyên bộ nhớ upload, tối ưu hóa triệt để chi phí LLM trong xếp hạng ứng viên, bảo vệ dữ liệu PII và vượt qua 100% Quality Gates nghiêm ngặt với 106 bài kiểm thử tự động.
