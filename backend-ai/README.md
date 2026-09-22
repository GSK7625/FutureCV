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
  - Hybrid Job Matching (`matching-v0` baseline with skills, experience, and education breakdown)
  - Candidate Ranking (reusing the Matching Engine under bounded concurrency without LLM overhead)
  - Career Assistant conversational guidance over sanitized context supplied by ASP.NET Core

### Strict System Invariants:
1. React **NEVER** calls FastAPI directly (Browser CORS is disabled).
2. FastAPI **NEVER** connects to PostgreSQL or uses any ORM (no SQLAlchemy, no psycopg).
3. FastAPI is completely **stateless** and does not own application or user state.
4. AI outputs are **decision-support information only**; AI never makes autonomous hiring decisions.

---

## 🎯 Implementation Status Matrix

| Component / Subsystem | Status | Description |
| :--- | :--- | :--- |
| **Architecture baseline** | **READY** | Clean Hexagonal architecture with strict AST dependency gates. |
| **Python quality gates** | **PASSED** | 100% compileall, ruff, mypy strict, and pytest pass (106 tests). |
| **Docker verification** | **NOT VERIFIED** | Local Docker daemon unavailable during automated checks. |
| **Security hardening** | **READY** | Browser CORS disabled, internal API key validation, sanitized error outputs. |
| **Input validation** | **READY** | Strict Pydantic v2 contracts (ranges, uniqueness, length limits). |
| **PDF protection** | **READY** | 5 MB upload limit, 64KB bounded streaming, incremental char checks. |
| **CV Analyzer baseline** | **IMPLEMENTED** | Entity extraction, structural scoring, PII redaction, qualitative merge. |
| **Matching Engine** | **matching-v0 BASELINE** | 50/30/20 heuristic weights (engineering baseline, uncalibrated). |
| **Candidate Ranking** | **IMPLEMENTED** | Concurrently evaluates candidates; sorts descending with zero LLM explanation calls. |
| **Project relevance** | **INFORMATIONAL BASELINE** | Deterministic canonical technology intersection; informational baseline in `matching-v0`. |
| **Career Assistant** | **FOUNDATION IMPLEMENTED** | PII-minimized context, strict user/assistant roles, untrusted delimiters. |
| **Semantic Similarity** | **NOT IMPLEMENTED** | Not implemented in `matching-v0`. |
| **Job Ranking** | **NOT IMPLEMENTED** | Not implemented in current scope. |
| **AI calibration** | **NOT IMPLEMENTED** | Empirical tuning against labeled recruitment datasets pending. |
| **.NET runtime integration** | **NOT IMPLEMENTED** | Python API contracts are defined, but cross-language runtime compatibility has not yet been verified because the .NET AI client/DTO integration is not implemented. |

*(Note: Backend-AI is an engineering baseline foundation, not a fully completed MVP).*

---

## 📐 Logical AI Capability Model

### 1. CV Analyzer
- **Input:** CV PDF document bytes or pre-extracted text.
- **Pipeline:** `PDF Bytes` → `Bounded Chunk Reader` → `Document Parser` → `Structured Extraction` → `StructuredCv` → `Quality Scoring` → `PII Redaction` → `Qualitative LLM Critique` → `Independent Merge & Dedup` → `CvAnalysis`.
- **Output:** `CvAnalysisResponse` containing:
  - `cv_score`: Deterministic, explainable quality score (0–100).
  - `strengths`: Structural completeness & qualitative strengths.
  - `weaknesses`: Structural gaps & specific weaknesses.
  - `improvement_suggestions`: Actionable recommendations.

### 2. Matching Engine (`matching-v0`)
- **Input:** `StructuredCv` + `StructuredJob`.
- **Computation:** Multi-criteria deterministic comparison:
  - Skills match: Case A (80% req + 20% pref), Case B (100% req), Case C (100% pref), Case D (100% neutral).
  - Experience comparison: years required vs. candidate experience.
  - Education comparison: qualification level matching.
  - Informational Project Relevance: normalized technology overlap.
  - Optional LLM synthesized explanation (`generate_explanation=True`).
- **Output:** `MatchResult` with `match_score` (0–100), skill lists, breakdown text, and `algorithm_version="matching-v0"`.
- **Candidate Ranking:** Evaluates N candidate CVs against 1 Job using `generate_explanation=False` (zero LLM calls) under bounded semaphore concurrency, returning ranked candidates sorted descending by match score.

### 3. Career Assistant
- **Input:** User message + conversation history + minimized profile context.
- **Security:** All user messages, history, and context are marked as `UNTRUSTED DATA` with explicit boundary delimiters. Sensitive PII (candidate ID, full name, email, phone) is stripped from LLM prompts.

---

## 🔒 Security & Resilience Protections

1. **Authentication:** Internal pre-shared key (`X-Internal-API-Key`) verified with constant-time comparison (`hmac.compare_digest`). Enforced strictly in production.
2. **Internal-Only Service:** Zero browser CORS middleware configured. Traffic flows exclusively through ASP.NET Core.
3. **Upload Memory DoS Prevention:** Uploaded PDF files are read in bounded 64 KB chunks up to the 5 MB limit. Exceeding chunks immediately abort reading and raise `413 Payload Too Large`.
4. **Incremental Text Extraction Safety:** PDF pages are parsed page-by-page. Extracted character count is evaluated after each page against `max_extracted_text_chars` (50,000 chars), raising controlled errors rather than silently truncating.
5. **OpenAI Client Lifecycle & Resilience:** Single reusable `httpx.AsyncClient` per provider instance closed via `aclose()`. Exponential backoff retries for transient status codes (408, 429, 500, 502, 503, 504) honoring `Retry-After`. Non-transient 4xx errors fail immediately.
6. **Prompt Injection Hardening:** Prompts treat all CV, Job, and history content as **untrusted data**, delimited with explicit boundary markers and strict instructions prohibiting prompt overrides.
7. **Error Sanitization:** Stack traces and provider error bodies are suppressed from HTTP responses and logged internally with correlation IDs.

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
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### 3. Configure `.env`
```bash
cp .env.example .env
```
*(Supported providers: `mock`, `openai`. By default, `LLM_PROVIDER=mock` works immediately for local development and test execution without external API keys).*

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
python -m ruff check app tests

# 3. Format check
python -m ruff format --check app tests

# 4. Static type check
python -m mypy app

# 5. Automated test suite (Unit, Integration, FastAPI/Pydantic API contract validation, Architecture: 106 passed)
python -m pytest tests -v
```
