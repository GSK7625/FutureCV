# 🤖 FutureCV — Backend AI Service

Microservice Python (FastAPI) cung cấp **5 tính năng AI** cho hệ thống FutureCV.

---

## 🎯 Tính năng

| #   | Feature               | Endpoint                       | Mô tả                                                      |
| --- | --------------------- | ------------------------------ | ---------------------------------------------------------- |
| 1   | **CV Analyzer**       | `POST /api/v1/cv/analyze`      | Upload PDF CV → trích xuất dữ liệu có cấu trúc + chấm điểm |
| 2   | **Job Matching**      | `POST /api/v1/job/match`       | So khớp CV với JD → match score (structured + semantic)    |
| 3   | **CV Improvement**    | `POST /api/v1/cv/improve`      | Đánh giá CV + gợi ý cải thiện cụ thể                       |
| 4   | **Career Assistant**  | `POST /api/v1/career/chat`     | Chatbot tư vấn nghề nghiệp                                 |
| 5   | **Candidate Ranking** | `POST /api/v1/candidates/rank` | Xếp hạng nhiều ứng viên cho 1 JD                           |

---

## 📐 Kiến trúc

```
Client → .NET Backend (FutureCV.Api) → Backend AI (FastAP I) → LLM Provider
```

- **.NET Backend** xử lý Auth, CRUD, database.
- **Backend AI** chỉ xử lý AI/ML, giao tiếp qua REST API nội bộ.
- **LLM Provider** là abstraction — chọn OpenAI, Google Gemini, hoặc Anthropic qua biến môi trường.

---

## 🛠️ Yêu cầu

- **Python** ≥ 3.11
- **pip** (hoặc uv / poetry)
- **API Key** từ ít nhất 1 LLM provider (OpenAI / Gemini / Anthropic)

---

## 🚀 Hướng dẫn chạy

### Bước 1: Tạo virtual environment

```bash
cd backend-ai
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

### Bước 2: Cài đặt dependencies

```bash
pip install -r requirements.txt
```

### Bước 3: Cấu hình môi trường

```bash
cp .env.example .env
```

Mở file `.env` và điền API key của LLM provider bạn chọn:

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
LLM_MODEL=gpt-4o-mini
```

### Bước 4: Chạy server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Bước 5: Truy cập Swagger UI

👉 **http://localhost:8000/docs** — Interactive API documentation  
👉 **http://localhost:8000/health** — Health check

---

## 🧪 Chạy Tests

```bash
pytest tests/ -v
```

---

## 📁 Cấu trúc thư mục

```
backend-ai/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── config.py             # Pydantic Settings
│   ├── api/v1/               # Endpoint handlers
│   ├── schemas/              # Pydantic request/response DTOs
│   ├── services/             # Business logic
│   ├── core/                 # LLM client, embeddings, PDF parser, prompts
│   └── utils/                # Text processing helpers
├── tests/                    # Unit tests
├── .env.example              # Template biến môi trường
├── requirements.txt          # Python dependencies
├── Dockerfile                # Container build
└── README.md                 # (bạn đang đọc file này)
```

---

## ⚙️ Cấu hình LLM Provider

Service hỗ trợ **3 provider** — chọn qua biến môi trường, không cần sửa code:

| Provider      | `LLM_PROVIDER` | Model mẫu                            | Env var cần set     |
| ------------- | -------------- | ------------------------------------ | ------------------- |
| OpenAI        | `openai`       | `gpt-4o-mini`, `gpt-4o`              | `OPENAI_API_KEY`    |
| Google Gemini | `gemini`       | `gemini-2.0-flash`, `gemini-2.5-pro` | `GEMINI_API_KEY`    |
| Anthropic     | `anthropic`    | `claude-sonnet-4-20250514`           | `ANTHROPIC_API_KEY` |

---

## 🐳 Docker

```bash
docker build -t futurecv-ai .
docker run -p 8000:8000 --env-file .env futurecv-ai
```

---

## ⚙️ Quy định phát triển dành cho thành viên Team

### 📦 1. Quản lý thư viện (`requirements.txt`)

- **KHÔNG** cài thêm package bằng `pip install <pkg>` rồi quên ghi vào `requirements.txt`.
- Mọi dependency mới **phải** được thêm vào `requirements.txt` với version range rõ ràng:

  ```
  # ✅ Đúng — có version constraint
  httpx>=0.27.0,<1.0.0

  # ❌ Sai — không có version
  httpx
  ```

- Sau khi thêm package, chạy lại:
  ```bash
  pip install -r requirements.txt
  ```

---

### ✒️ 2. Quy chuẩn viết Code (`pyproject.toml` — Ruff + MyPy)

Toàn bộ quy chuẩn code được enforce tự động qua **Ruff** (linter + formatter) và **MyPy** (type checker), cấu hình trong `pyproject.toml`.

#### 2.1. Type Hints (bắt buộc)

Tương đương `<Nullable>enable</Nullable>` của .NET. **Mọi function/method phải có type annotation đầy đủ.**

```python
# ✅ Đúng
async def analyze(self, file_bytes: bytes) -> CvAnalysisResponse:
    ...

# ❌ Sai — thiếu type hint
async def analyze(self, file_bytes):
    ...
```

Sử dụng `|` thay cho `Optional` (Python 3.10+):

```python
# ✅ Đúng (modern syntax)
def process(name: str, age: int | None = None) -> dict[str, str]:
    ...

# ❌ Sai (legacy syntax)
from typing import Optional, Dict
def process(name: str, age: Optional[int] = None) -> Dict[str, str]:
    ...
```

#### 2.2. Naming Conventions

| Loại              | Quy tắc            | Ví dụ                     |
| ----------------- | ------------------ | ------------------------- |
| File / module     | `snake_case`       | `cv_analyzer_service.py`  |
| Class             | `PascalCase`       | `CvAnalyzerService`       |
| Function / method | `snake_case`       | `analyze_cv()`            |
| Constant          | `UPPER_SNAKE_CASE` | `MAX_UPLOAD_SIZE_MB`      |
| Private           | Prefix `_`         | `_build_candidate_text()` |
| Pydantic model    | `PascalCase`       | `JobMatchResponse`        |

#### 2.3. Import Ordering

Tự động enforce bởi Ruff (rule `I`). Thứ tự:

```python
# 1. Standard library
import json
import logging
from typing import Any

# 2. Third-party packages
from fastapi import APIRouter, Depends
from pydantic import BaseModel

# 3. Local (first-party) — package "app"
from app.core.llm_client import BaseLlmClient
from app.schemas.cv_analyzer import CvAnalysisResponse
```

> ⚠️ **KHÔNG** dùng relative import (`from ..core import ...`). Luôn dùng absolute import từ `app.`.

#### 2.4. Docstrings

Mọi module, class, và public function **phải có docstring**:

```python
"""
FutureCV AI — CV Analyzer Service.

Pipeline: PDF bytes → extract text → LLM structured extraction.
"""

class CvAnalyzerService:
    """Analyse a CV document and extract structured data."""

    async def analyze(self, file_bytes: bytes) -> CvAnalysisResponse:
        """
        Full pipeline:
        1. Extract text from PDF
        2. Send to LLM for structured extraction
        3. Parse response into Pydantic model
        """
```

#### 2.5. String Quotes

Dùng **double quotes** (`"`) cho strings. Tự động enforce bởi Ruff formatter:

```python
name = "Nguyễn Văn A"      # ✅
name = 'Nguyễn Văn A'      # ❌ (sẽ bị auto-fix)
```

---

### 🏗️ 3. Quy tắc kiến trúc (Layer Rules)

Codebase tuân theo kiến trúc phân tầng. **Các tầng chỉ được phụ thuộc theo hướng mũi tên:**

```
API (endpoints) → Services (logic) → Core (LLM, PDF, prompts)
       ↓                ↓
   Schemas          Schemas
```

| Rule | Mô tả                                                                                 |
| ---- | ------------------------------------------------------------------------------------- |
| ①    | **`api/`** chỉ gọi **`services/`** — KHÔNG chứa business logic                        |
| ②    | **`services/`** chỉ dùng **`core/`** và **`schemas/`** — KHÔNG import FastAPI         |
| ③    | **`core/`** KHÔNG import từ `services/` hay `api/`                                    |
| ④    | **`schemas/`** là pure Pydantic models — KHÔNG import từ `services/`, `api/`, `core/` |

```python
# ✅ Đúng — endpoint gọi service
# File: app/api/v1/cv_analyzer.py
from app.services.cv_analyzer_service import CvAnalyzerService

# ❌ Sai — endpoint gọi trực tiếp LLM
# File: app/api/v1/cv_analyzer.py
from app.core.llm_client import BaseLlmClient  # Vi phạm!
```

---

### 🧩 4. Quy tắc thêm tính năng AI mới

Khi thêm feature AI mới, **phải tạo đủ 4 file** theo pattern:

```
1. app/schemas/ten_feature.py        ← Request/Response DTOs
2. app/services/ten_feature_service.py  ← Business logic
3. app/api/v1/ten_feature.py         ← Endpoint handler
4. tests/test_ten_feature.py         ← Unit test
```

Thêm vào:

- `app/core/prompts.py` — Prompt template cho feature mới
- `app/api/v1/router.py` — Include router mới
- `app/api/deps.py` — Service factory function

---

### 🔒 5. Quy tắc bảo mật

| Rule | Mô tả                                                                               |
| ---- | ----------------------------------------------------------------------------------- |
| ①    | **KHÔNG** commit API key vào git. Luôn dùng `.env` (đã có trong `.gitignore`)       |
| ②    | **KHÔNG** log toàn bộ nội dung CV/JD (chứa PII). Chỉ log metadata (số chars, score) |
| ③    | Validate file upload: kiểm tra content type + file size trước khi xử lý             |
| ④    | Dùng **Pydantic** validate mọi input — KHÔNG trust raw JSON                         |

---

### 🧪 6. Quy tắc viết Test

- Mỗi service **phải có** ít nhất 1 unit test.
- Dùng `MockLlmClient` (trong `tests/conftest.py`) thay vì gọi LLM thật.
- Test file đặt tên: `test_<tên_feature>.py`.
- Chạy test trước khi push:
  ```bash
  pytest tests/ -v
  ```

---

### 🔧 7. Lệnh kiểm tra chất lượng code

Chạy trước khi commit / push:

```bash
# Lint — kiểm tra lỗi code style
ruff check app/ tests/

# Auto-fix lint errors
ruff check app/ tests/ --fix

# Format — tự động format code
ruff format app/ tests/

# Type check — kiểm tra type annotations
mypy app/

# Test — chạy unit tests
pytest tests/ -v
```

> 💡 **Tip**: Cài extension **Ruff** trong VS Code / Rider để auto-lint khi save.

---

## 🤝 Liên hệ

Nếu gặp khó khăn, liên hệ trưởng nhóm hoặc tạo issue trên repository.
