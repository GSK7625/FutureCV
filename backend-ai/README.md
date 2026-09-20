# 🤖 FutureCV — Backend AI Service

Stateless AI computation subsystem for the FutureCV platform built with **Python 3.11** and **FastAPI**.

---

## 🏛️ System Architecture & Responsibility Boundaries

FutureCV follows a **Modular Monolith** architecture where ASP.NET Core serves as the central application authority:

```text
               ┌───────────────────────┐
               │    React Frontend     │
               └──────────┬────────────┘
                          │ HTTPS / REST
                          ▼
               ┌───────────────────────┐
               │  ASP.NET Core Backend │
               │   (Modular Monolith)  │
               └──────┬──────────┬─────┘
                      │          │
         PostgreSQL ──┘          │ Internal REST (X-Internal-API-Key)
                                 ▼
                      ┌───────────────────────┐
                      │    Python FastAPI     │
                      │      AI Service       │
                      │  (Stateless Compute)  │
                      └──────────┬────────────┘
                                 │
                                 ▼
                     LLM / Document Providers
```

### System Responsibility Split:

- **ASP.NET Core owns:**
  - Authentication & Authorization
  - Candidate, Recruiter, Company, Job, CV, Application lifecycle states
  - PostgreSQL database persistence & migrations
  - Orchestration of AI requests & persisting AI computation results
  - All business state transitions & hiring decisions

- **FastAPI owns ONLY stateless AI computation:**
  - CV PDF document parsing & text extraction
  - Structured entity extraction (`StructuredCv`)
  - Deterministic CV quality analysis & scoring (`CvAnalysis`)
  - Hybrid Job Matching (`MatchResult` with skills, experience, and education breakdown)
  - Candidate Ranking (reusing the Matching Engine under bounded concurrency)
  - Career Assistant conversational guidance over context supplied by ASP.NET Core

### Strict System Invariants:
1. React **NEVER** calls FastAPI directly.
2. FastAPI **NEVER** connects to PostgreSQL or uses any ORM (no SQLAlchemy, no psycopg).
3. FastAPI is completely **stateless** and does not own application or user state.
4. AI outputs are **decision-support information only**; AI never makes autonomous hiring decisions.

---

## 🎯 Logical AI Capability Model

The AI Service provides **three core capabilities**:

### 1. CV Analyzer
- **Input:** CV PDF document bytes or pre-extracted text.
- **Pipeline:** `PDF Bytes` → `Document Parser` → `Structured Extraction` → `StructuredCv` → `Quality Scoring` → `CvAnalysis`.
- **Output:** `CvAnalysis` containing:
  - `cv_score`: Deterministic, explainable quality score (0–100).
  - `strengths`: Verified structural & content strengths.
  - `weaknesses`: Gaps in information or presentation.
  - `improvement_suggestions`: Actionable recommendations.
- *(Note: CV Improvement is part of CV Analysis, not an independent engine).*

### 2. Matching Engine
- **Input:** `StructuredCv` + `StructuredJob`.
- **Computation:** Multi-criteria deterministic comparison:
  - Skills match (80% required + 20% preferred with canonical normalization).
  - Experience comparison (years required vs. total candidate experience).
  - Education comparison (academic qualification level).
  - LLM synthesized natural-language explanation.
- **Output:** `MatchResult` with `match_score` (0–100), skill lists, and breakdown text.
- **Reuse:** The **exact same Matching Engine** is reused for:
  - **Single Match:** 1 CV + 1 Job → `MatchResult`.
  - **Candidate Ranking:** 1 Job + N Candidate CVs → Reuses Matching Engine N times (with bounded concurrency) → sorted descending by `match_score`.

### 3. Career Assistant
- **Input:** User inquiry + authorized context supplied by ASP.NET Core (candidate profile, CV, target Job, MatchResult).
- **Function:** Conversational guidance on overcoming skill gaps, tailoring CVs, and career progression advice.

---

## 📐 Internal Architecture (Hexagonal / Clean Architecture)

Dependencies flow strictly inward:

```text
                     API Layer (FastAPI routes, middleware, auth)
                                      │
                                      ▼
                   Application Layer (Use-case orchestration)
                                  /       \
                                 ▼         ▼
                            Domain       Ports (Abstract interfaces)
                            (Pure)         ▲
                                           │ implements
                                 Infrastructure Layer (PyMuPDF, OpenAI, Mock)
```

- **Domain (`app/domain/`):** Pure Python standard library logic. Deterministic scoring, canonical skill normalization, experience matching, education matching. **Zero dependencies on FastAPI, HTTP, or external providers.**
- **Contracts (`app/contracts/`):** Pure Pydantic v2 transport models defining the REST boundary with ASP.NET Core.
- **Ports (`app/ports/`):** Abstract interfaces (`LlmPort`, `DocumentParserPort`).
- **Application (`app/application/`):** Orchestrates use cases (`CvAnalyzerService`, `MatchingService`, `RankingService`, `CareerAssistantService`).
- **Infrastructure (`app/infrastructure/`):** Adapters implementing ports (`PyMuPdfDocumentParser`, `OpenAiProvider`, `MockLlmProvider`).
- **API (`app/api/`):** Routers, dependency injection, timing-safe authentication, correlation ID propagation, and sanitized exception handlers.
- **Observability (`app/observability/`):** PII-safe, structured logging with distributed correlation tracking.

---

## 📁 Directory Structure

```text
backend-ai/
├── app/
│   ├── main.py                     # Application entry point & lifespan
│   ├── core/
│   │   ├── config.py               # Pydantic Settings
│   │   └── exceptions.py           # Domain & application errors
│   ├── contracts/                  # Transport DTOs (.NET <-> FastAPI)
│   │   ├── common.py
│   │   ├── cv.py
│   │   ├── job.py
│   │   ├── cv_analysis.py
│   │   ├── matching.py
│   │   ├── career.py
│   │   └── errors.py
│   ├── domain/                     # Pure business logic (Zero external deps)
│   │   ├── cv/
│   │   │   ├── normalization.py    # Canonical skill resolution
│   │   │   └── scoring.py          # Deterministic CV quality scoring
│   │   └── matching/
│   │       ├── skill_match.py      # Skill overlap computation
│   │       ├── experience_match.py # Work history comparison
│   │       ├── education_match.py  # Degree level ranking
│   │       └── scoring.py          # Centralized scoring weights
│   ├── ports/                      # Capability interfaces
│   │   ├── document_parser.py
│   │   └── llm.py
│   ├── infrastructure/             # Technical implementations
│   │   ├── documents/
│   │   │   └── pdf_parser.py       # Thread-safe PyMuPDF parser
│   │   └── llm/
│   │       ├── factory.py          # Provider factory
│   │       └── providers/
│   │           ├── mock_provider.py    # Offline/test provider
│   │           └── openai_provider.py  # Resilient OpenAI adapter
│   ├── prompts/                    # Versioned prompt artifacts
│   │   ├── cv_extraction_v1.py
│   │   ├── cv_analysis_v1.py
│   │   ├── match_explanation_v1.py
│   │   └── career_v1.py
│   ├── application/                # Use-case services
│   │   ├── cv_analyzer.py
│   │   ├── matching_service.py
│   │   ├── ranking_service.py      # Bounded concurrency candidate ranking
│   │   └── career_assistant.py
│   ├── observability/
│   │   └── logging.py              # PII-safe correlation logger
│   └── api/
│       ├── deps.py                 # Dependency injection
│       ├── exception_handlers.py   # Sanitized error responses
│       ├── middleware/
│       │   ├── correlation_id.py   # X-Correlation-Id tracing
│       │   └── internal_auth.py    # Timing-safe internal API key
│       └── v1/
│           ├── router.py           # Master v1 router
│           ├── health.py           # Liveness (/health) & Readiness (/ready)
│           ├── cv_analysis.py      # /cv/analyze, /cv/improve
│           ├── matching.py         # /job/match, /candidates/rank
│           └── career.py           # /career/chat
├── tests/
│   ├── unit/                       # Pure domain & utility tests
│   ├── integration/                # FastAPI HTTP endpoint tests
│   ├── contract/                   # .NET <-> Python schema contract tests
│   └── architecture/               # AST-based hexagonal boundary tests
├── Dockerfile                      # Production slim image with non-root user
├── requirements.txt                # Runtime dependencies
├── requirements-dev.txt            # Development & testing dependencies
├── pyproject.toml                  # Ruff, MyPy, and Pytest configuration
└── .env.example                    # Environment variable template
```

---

## 🔒 Security & Privacy Features

1. **Internal Service Authentication:** Protected endpoints require header `X-Internal-API-Key` validated with constant-time comparison (`hmac.compare_digest`).
2. **Distributed Tracing:** Every request accepts or generates a validated `X-Correlation-Id`, which is logged and returned in response headers.
3. **PII Protection:** Strict logging rules prevent logging raw CV text, candidate phone numbers, personal emails, or provider secrets.
4. **Document Defense:**
   - Magic bytes validation (`%PDF-`).
   - Maximum upload size enforcement (default 10 MB).
   - Maximum page count enforcement (default 20 pages).
   - Maximum extracted text ceiling.
   - Non-blocking execution offloaded to background worker threads via `anyio.to_thread`.
5. **Prompt Injection Hardening:** Prompts treat all CV and Job contents as **untrusted data**, delimited with explicit boundary markers and strict instructions prohibiting instruction overrides.
6. **Error Sanitization:** Stack traces, internal file paths, and external provider error bodies are suppressed from HTTP responses and logged internally.

---

## 🚀 Getting Started

### 1. Setup Environment
```bash
cd backend-ai
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
# Runtime dependencies:
pip install -r requirements.txt

# Development / Testing dependencies:
pip install -r requirements-dev.txt
```

### 3. Configure `.env`
```bash
cp .env.example .env
```
*(By default, `LLM_PROVIDER=mock` works immediately for local testing without external API keys).*

### 4. Run Server
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- **Health probe:** `GET http://127.0.0.1:8000/health`
- **Readiness probe:** `GET http://127.0.0.1:8000/ready`
- **Swagger Docs:** `http://127.0.0.1:8000/docs` (available in non-production environments)

---

## 🧪 Quality Gates & Testing

To execute all automated quality checks:

```bash
# 1. Bytecode compilation
python -m compileall app tests

# 2. Lint check
ruff check app tests

# 3. Format check
ruff format --check app tests

# 4. Static type check
mypy app

# 5. Automated test suite (Unit, Integration, Contract, Architecture)
pytest tests -v
```
