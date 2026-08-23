# ─────────────────────────────────────────────────────────
# FutureCV — Backend AI Service
# Minimal Docker build for Python 3.11 / FastAPI
# ─────────────────────────────────────────────────────────

FROM python:3.11-slim AS base

WORKDIR /app

# System dependencies for PyMuPDF
RUN apt-get update && \
    apt-get install -y --no-install-recommends libmupdf-dev && \
    rm -rf /var/lib/apt/lists/*

# ── Install Python deps ────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Copy application ───────────────────────────────────
COPY . .

# ── Runtime ─────────────────────────────────────────────
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
