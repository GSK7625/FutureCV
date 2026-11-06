# 🚀 Kế hoạch triển khai CI/CD với Jenkins cho dự án FutureCV

> **Cập nhật triển khai 26/10/2026:** Bộ khung CI đã được bổ sung ở `Jenkinsfile` root và `jenkins/ci.groovy`, có Dockerfile .NET, sửa image frontend theo SPA và tái sử dụng helper cho ba Jenkinsfile service. Xem [runbook hiện tại](docs/runbook-cicd.md) để cấu hình agent/job và phân biệt phần đã viết với phần đã chạy xác minh. Các trạng thái “đã hoàn thành” và ví dụ phía dưới là kế hoạch/lịch sử, không phải bằng chứng hạ tầng hiện đang hoạt động. CD Kubernetes chưa được nối vào pipeline này.

> **Tài liệu triển khai:** Hướng dẫn chi tiết cách dựng pipeline CI/CD bằng **Jenkins** cho 3 service của FutureCV (`frontend`, `backend` .NET, `backend-ai` Python). Mục tiêu: tự động hoá **build → test → scan → đóng gói image → deploy** trên nhiều môi trường `dev`, `staging`, `prod`.
>
> **Phiên bản:** v2 — đã đối chiếu thực tế folder FutureCV ngày 20/10/2026.

---

## 📑 Mục lục

1. [Khảo sát thực tế folder FutureCV](#1-khảo-sát-thực-tế-folder-futurecv)
2. [Kiến trúc Jenkins đề xuất](#2-kiến-trúc-jenkins-đề-xuất)
3. [Cấu trúc file / thư mục cần tạo](#3-cấu-trúc-file--thư-mục-cần-tạo)
4. [Những thứ cần làm theo giai đoạn](#4-những-thứ-cần-làm-theo-giai-đoạn)
   - [GĐ1 — Chuẩn bị hạ tầng Jenkins](#giai-đoạn-1--chuẩn-bị-hạ-tầng-jenkins-tuần-1)
   - [GĐ2 — Chuẩn bị repo & Dockerfiles](#giai-đoạn-2--chuẩn-bị-repo--dockerfiles-tuần-2)
   - [GĐ3 — Viết Jenkinsfile cho từng service](#giai-đoạn-3--viết-jenkinsfile-cho-từng-service-tuần-23)
   - [GĐ4 — Shared Library](#giai-đoạn-4--shared-library-futurecv-pipeline-tuần-3)
   - [GĐ5 — Secrets & Deploy](#giai-đoạn-5--tích-hợp-secrets--environment-tuần-4)
   - [GĐ6 — Hardening & mở rộng](#giai-đoạn-6--hardening--mở-rộng-tuần-5)
5. [Chiến lược trigger & branch](#5-chiến-lược-trigger--branch)
6. [Checklist chuẩn bị môi trường](#6-checklist-chuẩn-bị-môi-trường)
7. [Ước lượng thời gian & nhân lực](#7-ước-lượng-thời-gian--nhân-lực)
8. [Rủi ro & cách giảm thiểu](#8-rủi-ro--cách-giảm-thiểu)
9. [Bước tiếp theo đề xuất](#9-bước-tiếp-theo-đề-xuất)

---

## 1. Khảo sát thực tế folder FutureCV

### 1.1 Bảng tổng hợp 3 service

| Service | Stack | Đường dẫn | Test command đã có | Dockerfile | Lệnh build |
|---|---|---|---|---|---|
| **frontend** | React Router 8 + Vite + TypeScript | `frontend/` | `npm test` (node:test) + `npm run typecheck` | ✅ `frontend/Dockerfile` (4-stage) + `.dockerignore` | `npm ci && npm run build` |
| **backend** (.NET) | ASP.NET Core 8 Clean Architecture + EF Core | `backend/` | `dotnet test FutureCV.sln` | ❌ **Chưa có** | `dotnet publish src/FutureCV.Api -c Release` |
| **backend-ai** (Python) | FastAPI + Pydantic v2 + hexagonal | `backend-ai/` | `pytest` + `ruff` + `mypy` + `compileall` | ✅ `backend-ai/Dockerfile` (root user hardening) + `.env.example` | `uvicorn app.main:app` |

### 1.2 Các phát hiện quan trọng từ repo (đã khảo sát)

| # | Phát hiện | Ảnh hưởng tới CI/CD |
|---|---|---|
| 1 | **Backend .NET — cơ sở dữ liệu chưa chốt:** `backend/DATABASE_SETUP.md` liệt kê 4 tuỳ chọn (LocalDB, SQL Server Express, PostgreSQL, SQLite). `appsettings.Development.json.example` dùng PostgreSQL. `appsettings.json` hiện không có `ConnectionStrings`. | **Pipeline CI phải chốt 1 loại DB** để chạy migration test. Khuyến nghị: **PostgreSQL container** trong job test (dễ nhất), hoặc dùng **SQLite in-memory** cho unit test, riêng DB integration test dùng PostgreSQL. |
| 2 | **`backend/aspire/` chỉ có 2 file `.gitkeep`** — chưa có AppHost thật dù `AGENTS.md` đã nhắc tới Aspire. | **Bỏ qua Aspire trong pipeline**, triển khai service qua Kubernetes manifest / Docker Compose đơn giản. |
| 3 | `backend-ai/app/api/v1/health.py` có **2 endpoint**: `/health` (liveness — không gọi LLM) và `/ready` (readiness — kiểm tra API key). | Smoke test phải gọi **cả 2**: `/health` lúc start, `/ready` lúc deploy. |
| 4 | `backend-ai/tests/conftest.py` có fixture `isolate_test_environment` tự động tắt `.env` khi chạy test → test sandbox sạch. | Không cần làm thêm, **CI chạy được ngay**. |
| 5 | `backend-ai/evaluation/` chứa **benchmark datasets** (skill_alias, experience, education, semantic, matching_sanity) và `README.md`. | Có thể thêm nightly job `evaluation/benchmark` chạy trên nhánh `main` để bắt regression matching. |
| 6 | **`backend/src/FutureCV.Api/appsettings.json`** chỉ có 2 config: `AiMatching` và `AiService` (gọi về `http://localhost:8000` cho backend-ai local). | Trong K8s, **không dùng localhost**, phải đổi URL sang DNS service nội bộ (`http://backend-ai:8000`). |
| 7 | `backend/src/FutureCV.Api/appsettings.Development.json.example` chứa nhiều secret mẫu: `Jwt:Key`, `Cloudinary`, `SmtpSettings` (gmail), `GoogleAuth`, `SuperAdmin`. | Mỗi loại secret phải có **Jenkins Credential tương ứng**; **không hardcode** trong Jenkinsfile. |
| 8 | `backend/Directory.Build.props`: `TargetFramework=net8.0`, `Nullable=enable`, `TreatWarningsAsErrors=false`. Quản lý package tập trung qua `Directory.Packages.props` (Central Package Management). | **CI dotnet restore dùng `dotnet restore FutureCV.sln`** để tôn trọng central versioning. |
| 9 | `frontend/package.json` dòng 10 có **merge conflict** giữa 2 nhánh `<<<<<<< HEAD` / `>>>>>>> bb0e90fe...` — script `test` liệt kê test files khác nhau. | **Pipeline sẽ fail ngay bước `npm test`** nếu không resolve. Cần fix trước khi bật CI. |
| 10 | `frontend/app/lib/errorMapper.test.ts` và nhiều file `.test.ts` cùng cấp — đang dùng `node:test` thuần (không Jest). | `npm test` đang chạy được trên CI Agent image `node:24` (đã có sẵn `npm`). |
| 11 | `frontend/react-router.config.ts` (theo README) dùng SPA Mode `ssr: false` — Dockerfile build ra `build/server/index.js` chạy bằng `react-router-serve`. | Image output phù hợp để serve qua Nginx hoặc Node trực tiếp. |
| 12 | `backend-ai/.env.example` liệt kê 3 biến Gemini (`GEMINI_API_KEY`, `GEMINI_LLM_API_KEY`, `GEMINI_EMBEDDING_API_KEY`) + `OPENAI_API_KEY` + `INTERNAL_API_KEY` (Pre-shared secret). | Phải inject đủ vào container runtime qua **Kubernetes Secret** hoặc **Docker secret**, không commit vào image. |
| 13 | Backend AI endpoint `/api/v1/matching/match` và `/rank-candidates` cần `X-Internal-API-Key` (Constant-time compare theo README). | Khi smoke test giữa `backend` ↔ `backend-ai` phải truyền header này đúng. |
| 14 | `backend-ai/app/main.py`: `docs_url`, `redoc_url`, `openapi_url` **đều `None` khi `is_production==True`** → TẮT Swagger trên prod. | Job smoke test prod chỉ nên gọi `/health` và `/ready`, không gọi `/docs`. |
| 15 | `backend-ai/Dockerfile` có sẵn `HEALTHCHECK` (`interval=30s`, `timeout=5s`, `start-period=5s`, `retries=3`). | Khi `docker run` hoặc K8s pod dùng image này, **Docker tự gọi `/health`** → CI không cần polling. |
| 16 | `backend-ai/requirements.txt` giới hạn phiên bản: `fastapi>=0.115.0,<1.0.0`, `google-genai>=1.0.0,<3.0.0`, v.v. | Khi build Docker image, **không bị bất ngờ về phiên bản**; CI Agent chỉ cần Python 3.11 + pip. |

### 1.3 Trạng thái hiện tại của CI/CD

```text
❌ Không có Jenkinsfile / .github/workflows / .gitlab-ci.yml
❌ Backend .NET chưa có Dockerfile (mặc dù frontend & backend-ai đã có)
❌ frontend/package.json có merge conflict chưa giải
❌ Chưa có agent image cho 3 stack (sẽ do GĐ1 tạo)
❌ Chưa chốt cơ sở dữ liệu cho môi trường CI
```

---

## 2. Kiến trúc Jenkins đề xuất

```text
                        ┌────────────────────────┐
                        │   Git Repository       │
                        │ (GitHub / GitLab)      │
                        └───────────┬────────────┘
                                    │ Webhook
                                    ▼
              ┌─────────────────────────────────────────────┐
              │       JENKINS CONTROLLER (Master)           │
              │                                             │
              │ Plugins: Git, Pipeline, Docker,             │
              │   Kubernetes, Blue Ocean, Credentials       │
              │ Shared Library: futurecv-pipeline           │
              │ Credentials Store:                          │
              │   • git-creds (HTTPS pull)                  │
              │   • dockerhub-creds (registry push)         │
              │   • kubeconfig-{dev,staging,prod}           │
              │   • jwt-signing-key, db-connection-string    │
              │   • internal-api-key, gemini-llm-api-key    │
              │   • openai-api-key, cloudinary, smtp        │
              └──────────────────┬──────────────────────────┘
                                 │
        ┌────────────────────────┼─────────────────────────────┐
        ▼                        ▼                             ▼
 ┌─────────────┐         ┌─────────────┐              ┌─────────────────┐
 │ Agent: dotnet│         │ Agent: node │              │ Agent: python   │
 │ label:dotnet │         │ label:node  │              │ label:python    │
 │ SDK 8.x      │         │ Node 24     │              │ Python 3.11     │
 │ PostgreSQL15  │         │ + npm ci    │              │ + ruff/mypy/    │
 │ (sidecar)    │         └─────────────┘              │   pytest        │
 └─────────────┘                                      └─────────────────┘
                                 │
                                 ▼
              ┌──────────────────────────────────┐
              │ Artifact / Registry              │
              │ Docker Hub / Harbor / ECR        │
              │ Tag: <service>:<git-sha>         │
              └──────────────────────────────────┘
                                 │
                                 ▼
              ┌──────────────────────────────────┐
              │ Deploy Targets                   │
              │ • dev     (auto on develop)      │
              │ • staging (auto on main)         │
              │ • prod    (manual approval)      │
              └──────────────────────────────────┘
```

**Khuyến nghị triển khai Jenkins Controller:**

- Chạy Jenkins như Docker container; volume `/var/jenkins_home` map ra ổ đĩa chung (NFS / PVC) để tránh mất lịch sử khi restart.
- Dùng plugin **Kubernetes** để provisioning agent theo label `dotnet`, `node`, `python` → mỗi build spin-up 1 pod agent, tự huỷ sau khi xong (auto-scale, tiết kiệm tài nguyên).
- Nếu không có K8s cluster: dùng **static agents** (VM/container cố định) gắn label theo stack. Lưu ý: agent `dotnet` cần **PostgreSQL 15 sidecar container** để chạy integration test (hoặc dùng SQLite in-memory).

**Các plugin bắt buộc:**

| Plugin | Vai trò |
|---|---|
| `git` | Pull source code |
| `workflow-aggregator` + `pipeline-stage-view` | Viết Jenkinsfile declarative |
| `docker-workflow` | Build/push Docker image từ pipeline |
| `kubernetes-cli` | Triển khai K8s manifest |
| `credentials-binding` | Inject secret vào pipeline an toàn |
| `ssh-agent` | SSH pull code (nếu dùng SSH key) |
| `blueocean` | UI trực quan cho pipeline |
| `warnings-ng` + `cobertura` | Hiển thị cảnh báo + test coverage |
| `slack-notification` / `mailer` (tuỳ chọn) | Gửi thông báo |
| `github-pr-comment` (tuỳ chọn) | Comment trạng thái CI vào Pull Request |

> ✅ **Trạng thái hiện tại (21/10/2026): Giai đoạn 1.1 và 1.2 ĐÃ HOÀN THÀNH.**
>
> - **Jenkins Controller:** chạy trong Docker — image `jenkins/jenkins:lts-jdk21`, container tên `jenkins`, port `8080:8080` + `50000:50000` (agent TCP), volume `jenkins_home` → `/var/jenkins_home`.
> - **Plugin đã cài thành công** (xác nhận qua `/var/jenkins_home/plugins/*.jpi` và log không có lỗi load):
>   `git`, `git-client`, `workflow-aggregator`, `workflow-multibranch`, `workflow-basic-steps`, `pipeline-stage-view`, `docker-workflow`, `docker-commons`, `kubernetes-cli`, `kubernetes-client-api`, `kubernetes-credentials`, `credentials-binding`, `credentials`, `plain-credentials`, `ssh-agent`, `ssh-slaves`, `ssh-credentials`, `blueocean` (+ toàn bộ dependency), `warnings-ng`, `forensics-api`, `junit`, `slack`, `mailer`, `email-ext`, `github`, `github-branch-source`, `pipeline-github-lib`, `matrix-auth`, `ldap`, `dark-theme`, `ws-cleanup`, `timestamper`, `build-timeout`, `ant`, `gradle`.
> - **Lệnh tái lập** (nếu cần cài lại): `docker exec jenkins jenkins-plugin-cli --plugins <danh sách> --plugin-download-directory /var/jenkins_home/plugins --skip-failed-plugins` → `docker restart jenkins`.
>
> ⚠️ **Lưu ý môi trường Việt Nam:** một số mirror (vd. `sg.mirror.servanamanaged.com`) hay bị `Connection refused`. Nếu plugin tải fail, đổi mirror qua `JENKINS_UC_DOWNLOAD_URL` hoặc thử lại — `jenkins-plugin-cli` đã tự fallback sang mirror khác.
>
> ➡️ **Bước tiếp theo: GĐ1 mục 1.3 — cấu hình Credentials.**

---

## 3. Cấu trúc file / thư mục cần tạo

```text
FutureCV/
├── Jenkinsfile                       # ROOT: định tuyến pipeline theo đường dẫn thay đổi
├── JENKINS_CICD_PLAN.md              # (file này)
│
├── backend/
│   ├── Dockerfile                    # ← CẦN TẠO (chưa có)
│   └── .dockerignore                 # ← CẦN TẠO
│
├── backend-ai/
│   └── .dockerignore                 # ← CẦN TẠO
│
├── frontend/
│   └── package.json                  # ← CẦN FIX merge conflict dòng 10
│
└── jenkins/
    ├── shared-library/               # Shared Library (repo riêng hoặc folder)
    │   └── src/org/futurecv/
    │       ├── DockerBuild.groovy
    │       ├── QualityGate.groovy
    │       ├── Deploy.groovy
    │       └── Notify.groovy
    │
    ├── agents/
    │   ├── Dockerfile.dotnet         # Agent image cho .NET 8 (+ PostgreSQL client)
    │   ├── Dockerfile.node           # Agent image cho Node 24
    │   └── Dockerfile.python         # Agent image cho Python 3.11
    │
    ├── docker-compose.yml            # Chạy Jenkins local cho dev (gồm Jenkins + PostgreSQL + MinIO)
    ├── Jenkinsfile.dotnet            # Pipeline mẫu backend .NET
    ├── Jenkinsfile.node              # Pipeline mẫu frontend
    ├── Jenkinsfile.python            # Pipeline mẫu backend-ai
    └── README.md                     # Hướng dẫn cấu hình Jenkins
```

---

## 4. Những thứ cần làm theo giai đoạn

---

### Giai đoạn 1 — Chuẩn bị hạ tầng Jenkins (Tuần 1)

| # | Công việc | Lý do |
|---|-----------|-------|
| 1.1 | Cài đặt Jenkins LTS (chạy trong Docker) | Cách ly môi trường, dễ backup |
| 1.2 | Cài các plugin bắt buộc ở mục 2 | ✅ **ĐÃ XONG 21/10/2026** |
| 1.3 | Cấu hình **Credentials** trong Jenkins (Global scope):<br>**Git/Scm:** `git-creds` (Username with password — HTTPS pull)<br>**Registry:** `dockerhub-creds` (Username with password — push image)<br>**K8s:** `kubeconfig-dev`, `kubeconfig-staging`, `kubeconfig-prod` (Secret file)<br>**Backend .NET secrets:** `jwt-signing-key`, `db-connection-string`<br>**Backend AI secrets:** `internal-api-key`, `gemini-api-key`<br><br>**✅ ĐÃ XONG 22/10/2026** — 8 credential trong Global store, tự động tạo bởi `.jenkins-setup/create-credentials.groovy` (init.groovy.d, idempotent). Nguồn giá trị: `.jenkins-setup/secrets/*.txt` (đã `.gitignore`, không commit).<br>⛔ `dockerhub-creds` hiện chứa **placeholder** → Docker Hub từ chối (HTTP 401). Cần điền token thật vào `.jenkins-setup/secrets/dockerhub-{username,token}.txt` rồi `FUTURECV_ROTATE_IDS=dockerhub-creds docker compose up -d`. | Bảo mật secret, không hardcode trong Jenkinsfile |
| 1.4 | Tạo **Shared Library** tên `futurecv-pipeline` (Git repo riêng hoặc folder `jenkins/shared-library/`). Cấu hình trong *Manage Jenkins → System → Global Pipeline Libraries*. | Tái sử sử dụng code giữa 3 service |
| 1.5 | Chuẩn bị **3 Agent images** (`Dockerfile.dotnet`, `Dockerfile.node`, `Dockerfile.python`) với SDK sẵn; publish lên registry nội bộ. **Agent dotnet đã cài `dotnet-ef` tool + PostgreSQL client** sẵn. | Build reproducible |
| 1.6 | Tạo **3 Agent templates** (Static node hoặc K8s pod template) với label lần lượt: `dotnet`, `node`, `python`. Agent `dotnet` cần thêm **sidecar container PostgreSQL 15** chạy trong job test (`docker run -d postgres:15-alpine`) | Pipeline chỉ định agent theo label |
| 1.7 | Bật **webhook** từ Git repo → Jenkins (`http://jenkins-url/github-webhook/`) | CI tự động |

---

### 🐳 Kubernetes cluster local đã dựng (21/10/2026)

**Cluster:** Docker Desktop Kubernetes (kind mode) — `v1.36.1`, node `desktop-control-plane` (IP `172.19.0.2`)

**Đã tạo sẵn 3 namespace:**
```
futurecv-dev      → kubeconfig-dev.yaml
futurecv-staging  → kubeconfig-staging.yaml
futurecv-prod     → kubeconfig-prod.yaml
```

**3 file kubeconfig** (đã sẵn sàng để upload lên Jenkins UI):
```
.jenkins-setup/kubeconfig/kubeconfig-dev.yaml
.jenkins-setup/kubeconfig/kubeconfig-staging.yaml
.jenkins-setup/kubeconfig/kubeconfig-prod.yaml
```

> ⚠️ **Điểm quan trọng — `server` phải là `https://172.19.0.2:6443`**, KHÔNG phải `127.0.0.1`.
> - `127.0.0.1` trong container Jenkins = chính container Jenkins, không phải K8s API.
> - `host.docker.internal` cũng **không work** — cert K8s chỉ có SAN: `desktop-control-plane`, `kubernetes`, `kubernetes.default`, `kubernetes.default.svc`, `kubernetes.default.svc.cluster.local`, `localhost`.
> - `172.19.0.2` (IP nội bộ của node `desktop-control-plane`) là địa chỉ **có trong SAN list** → TLS verify thành công.

**Jenkins phải được nối vào network `kind`** để reach được `172.19.0.2`:
```bash
docker network connect kind jenkins
```
> Đã làm ✅ (hiện Jenkins ở network `bridge, kind`).
> Nếu Docker Desktop restart → K8s cluster restart → IP có thể đổi → cần chạy lại lệnh trên + cập nhật `server` trong 3 file kubeconfig.

**kubectl đã cài trong container Jenkins:** `/var/jenkins_home/bin/kubectl` (v1.36.1), tự cài lại qua init script `install-kubectl.groovy`.

**Đã verify kết nối thành công từ trong container Jenkins:**
```
$ kubectl --kubeconfig=/tmp/kubeconfig-dev.yaml get nodes
NAME                    STATUS   ROLES           AGE   VERSION
desktop-control-plane   Ready    control-plane   6m13s  v1.36.1

$ kubectl --kubeconfig=/tmp/kubeconfig-staging.yaml get ns futurecv-staging
NAME               STATUS   AGE
futurecv-staging  Active  3m29s
```

**📋 Cách upload 3 credential lên Jenkins UI (chưa làm tự động vì cần đăng nhập admin):**

1. Mở `http://localhost:8080/manage/credentials/store/system/domain/_/newCredentials`
2. Chọn **Kind: `Secret file`**
3. Lặp lại 3 lần với bảng dưới:

| # | ID | Secret file | Description |
|---|-----|-------------|-------------|
| 1 | `kubeconfig-dev` | `.jenkins-setup/kubeconfig/kubeconfig-dev.yaml` | Kubernetes dev cluster |
| 2 | `kubeconfig-staging` | `.jenkins-setup/kubeconfig/kubeconfig-staging.yaml` | Kubernetes staging cluster |
| 3 | `kubeconfig-prod` | `.jenkins-setup/kubeconfig/kubeconfig-prod.yaml` | Kubernetes prod cluster |

**Test nhanh sau khi upload:**
```bash
docker exec jenkins bash -c "\
  KUBECONFIG=/var/jenkins_home/kubeconfigs/kubeconfig-dev.yaml \
  /var/jenkins_home/bin/kubectl get ns"
```

---

---

### Giai đoạn 2 — Chuẩn bị repo & Dockerfiles (Tuần 2)

| # | Công việc | Lý do | Liên kết phát hiện |
|---|-----------|-------|-------------------|
| 2.1 | **Fix merge conflict** trong `frontend/package.json` dòng 10 — chọn bộ test files thống nhất giữa 2 nhánh. Ví dụ hợp nhất: `"test": "node --test app/lib/requestBody.test.ts app/lib/errorMapper.test.ts app/lib/apiResponse.test.ts app/features/hr/contracts/hrContracts.test.ts app/features/auth/constants.test.ts"` (HEAD thêm `apiResponse.test.ts`). | Tránh pipeline fail ngay bước `npm test` | Phát hiện #9 |
| 2.2 | **Tạo `backend/Dockerfile`** (multi-stage) cho ASP.NET Core 8:<br>• Stage1 `build`: `mcr.microsoft.com/dotnet/sdk:8.0` → `dotnet restore FutureCV.sln` → `dotnet publish src/FutureCV.Api -c Release -o /app/publish`<br>• Stage 2 `runtime`: `mcr.microsoft.com/dotnet/aspnet:8.0` (non-root user) → copy `--from=build /app/publish` → `EXPOSE 8080` → `ENTRYPOINT ["dotnet","FutureCV.Api.dll"]` → `ASPNETCORE_URLS=http://+:8080`<br>• Bổ sung `HEALTHCHECK` gọi `http://localhost:8080/health` | Chuẩn hoá build/deploy | Phát hiện #1 |
| 2.3 | Tạo `backend/.dockerignore` (loại trừ `bin/`, `obj/`, `.vs/`, `*.user`, `appsettings.Development.json`, `appsettings.Local.json`, `wwwroot/uploads/`, `tests/`, `Dockerfile`, `Dockerfile.*`) | Giảm build context, tăng tốc | — |
| 2.4 | Tạo `backend-ai/.dockerignore` (loại trừ `.venv`, `tests`, `.pytest_cache`, `__pycache__`, `.env`, `evaluation`, `.ruff_cache`, `.mypy_cache`, `.coverage`) | Tránh leak secret, giảm context | — |
| 2.5 | Verify `frontend/.dockerignore` đã có `.react-router`, `build`, `node_modules`, `README.md` — bổ sung thêm `coverage`, `*.log`, `.vite/` | Đã đủ cơ bản | — |
| 2.6 | **Tạo `Jenkinsfile` ở root repo** với logic phân luồng: dựa vào đường dẫn thay đổi (`backend/`, `backend-ai/`, `frontend/`) để trigger đúng service. Dùng Multibranch plugin hoặc `when { changeset ... }`. | Tránh build cả 3 service khi chỉ sửa 1 | — |
| 2.7 | **Cấu hình DB cho CI**: chọn **PostgreSQL 15** cho integration test. Hoặc tạo file `appsettings.CI.json` dùng `Host=localhost;Port=5432;Database=futurecv_ci;Username=postgres;Password=postgres` — được inject vào env lúc `dotnet test`. Nếu team muốn DB đơn giản hơn, dùng SQLite in-memory qua `Microsoft.EntityFrameworkCore.Sqlite` chỉ cho unit test. | Pipeline phải chốt DB để test ổn định | Phát hiện #1, #8 |
| 2.8 | Commit `backend/Dockerfile` + `Jenkinsfile` (root + mỗi service) + `.dockerignore` vào repo, đẩy lên nhánh `develop`. | Bắt đầu chạy pipeline | — |

---

### Giai đoạn 3 — Viết Jenkinsfile cho từng service (Tuần 2–3)

**Cấu trúc pipeline chung** (áp dụng cho cả 3 service, khác biệt ở build/test):

```groovy
pipeline {
  agent { label '<dotnet|node|python>' }
  options {
    timestamps()
    ansiColor('xterm')
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 30, unit: 'MINUTES')
  }
  triggers { pollSCM('H/5 * * * *') }   // fallback nếu webhook lỗi

  environment {
    REGISTRY = 'registry.futurecv.local'
    IMAGE    = "<service-name>"
    GIT_SHA  = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
  }

  stages {
    stage('Checkout')     { steps { checkout scm } }
    stage('Lint/Static')  { steps { /* service-specific */ } }
    stage('Unit Test')    {
      steps { /* service-specific */ }
      post { always { junit allowEmptyResults: true, testResults: '**/test-results.xml' } }
    }
    stage('Build Image')  {
      steps { script { futurecv.DockerBuild("${REGISTRY}", "${IMAGE}", "${GIT_SHA}") } }
    }
    stage('Push Image')   {
      when { branch 'main' }
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds',
                     usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh "docker push ${REGISTRY}/${IMAGE}:${GIT_SHA}"
        }
      }
    }
    stage('Deploy Dev')       { when { branch 'develop' }; steps { script { futurecv.Deploy('dev',     "${GIT_SHA}") } } }
    stage('Deploy Staging')   { when { branch 'main'    }; steps { script { futurecv.Deploy('staging', "${GIT_SHA}") } } }
    stage('Deploy Prod')      { when { branch 'main'    }; steps {
                              input 'Approve deploy to PRODUCTION?'
                              script { futurecv.Deploy('prod', "${GIT_SHA}") } } }
  }
  post {
    failure { script { futurecv.Notify('FAIL') } }
    success { script { futurecv.Notify('PASS') } }
  }
}
```

**Chi tiết cho từng service:**

#### a) `frontend/Jenkinsfile` (label `node`)

```groovy
stage('Install')    { sh 'cd frontend && npm ci --prefer-offline' }
stage('Typecheck') { sh 'cd frontend && npm run typecheck' }
stage('Unit Test')  { sh 'cd frontend && npm test -- --reporter=junit --output-file=test-results.xml' }
stage('Build')      { sh 'cd frontend && npm run build' }   // đảm bảo build production OK
// Build image: dùng frontend/Dockerfile hiện có
```

#### b) `backend-ai/Jenkinsfile` (label `python`)

```groovy
stage('Install')        { sh 'cd backend-ai && pip install -r requirements-dev.txt' }
stage('Compile')        { sh 'cd backend-ai && python -m compileall app tests' }
stage('Lint (ruff)')    { sh 'cd backend-ai && ruff check app tests' }
stage('Format check')   { sh 'cd backend-ai && ruff format --check app tests' }
stage('Type (mypy)')    { sh 'cd backend-ai && mypy app' }
stage('Test (pytest)')  { sh 'cd backend-ai && pytest --junitxml=test-results.xml -q' }
// (Tuỳ chọn) Nightly only:
// stage('Eval benchmark') { sh 'cd backend-ai && pytest evaluation/ --junitxml=test-results-bench.xml -q' }
// Build image: dùng backend-ai/Dockerfile hiện có
```

#### c) `backend/Jenkinsfile` (label `dotnet`)

```groovy
stage('Setup DB')      {
  // Khởi PostgreSQL sidecar để test
  sh '''
    docker rm -f pg-test 2>/dev/null || true
    docker run -d --name pg-test -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15-alpine
    sleep 8
  '''
}
stage('Restore')       { sh 'cd backend && dotnet restore FutureCV.sln' }
stage('Build')         { sh 'cd backend && dotnet build FutureCV.sln -c Release --no-restore' }
stage('Test')          {
  // Inject connection string CI qua env
  sh '''
    cd backend
    export ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=futurecv_ci;Username=postgres;Password=postgres"
    dotnet test FutureCV.sln -c Release --no-build \
      --logger "junit;LogFileName=test-results.xml"
  '''
}
stage('Publish')       { sh 'cd backend && dotnet publish src/FutureCV.Api -c Release -o publish/' }
// Build image: dùng backend/Dockerfile (mới tạo)
```

> 💡 **Mẹo:** với Python, cache layer pip trên agent image (bước 1.5). Với .NET, mount `~/.nuget/packages` cache. Với Node, cache `~/.npm`.

---

### Giai đoạn 4 — Shared Library `futurecv-pipeline` (Tuần 3)

Tạo repo Git riêng (hoặc folder trong repo) cho Shared Library:

```groovy
// jenkins/shared-library/src/org/futurecv/DockerBuild.groovy
package org.futurecv

def call(registry, image, tag, dockerfile, context) {
  sh "docker build -t ${registry}/${image}:${tag} -f ${dockerfile} ${context}"
  sh "docker tag  ${registry}/${image}:${tag} ${registry}/${image}:latest"
}

def call(registry, image, tag) {
  // Mặc định cho 3 service hiện tại:
  // frontend  → frontend/Dockerfile + context=./
  // backend-ai → backend-ai/Dockerfile + context=backend-ai/
  // backend  → backend/Dockerfile + context=backend/  (sau khi tạo Dockerfile)
  if (image == 'frontend') {
    call(registry, image, tag, 'frontend/Dockerfile', 'frontend')
  } else if (image == 'backend-ai') {
    call(registry, image, tag, 'backend-ai/Dockerfile', 'backend-ai')
  } else {
    call(registry, image, tag, 'backend/Dockerfile', 'backend')
  }
}
```

```groovy
// jenkins/shared-library/src/org/futurecv/Deploy.groovy
package org.futurecv

def call(String envName, String tag) {
  // Map service → K8s deployment theo env
  withCredentials([file(credentialsId: "kubeconfig-${envName}", variable: 'KUBECONFIG')]) {
    sh """
      kubectl --kubeconfig=\$KUBECONFIG set image deployment/${envName}-api \
        ${envName}-api=registry.futurecv.local/backend:${tag}
      kubectl --kubeconfig=\$KUBECONFIG set image deployment/${envName}-ai \
        ${envName}-ai=registry.futurecv.local/backend-ai:${tag}
      kubectl --kubeconfig=\$KUBECONFIG set image deployment/${envName}-web \
        ${envName}-web=registry.futurecv.local/frontend:${tag}
      kubectl --kubeconfig=\$KUBECONFIG rollout status deployment/${envName}-api --timeout=180s
      kubectl --kubeconfig=\$KUBECONFIG rollout status deployment/${envName}-ai  --timeout=180s
      kubectl --kubeconfig=\$KUBECONFIG rollout status deployment/${envName}-web --timeout=180s
    """
  }
}
```

```groovy
// jenkins/shared-library/src/org/futurecv/Notify.groovy
package org.futurecv

def call(String status) {
  if (status == 'FAIL') {
    slackSend(channel: '#futurecv-ci', color: 'danger',
              message: "❌ ${env.JOB_NAME} #${env.BUILD_NUMBER} failed")
  } else {
    slackSend(channel: '#futurecv-ci', color: 'good',
              message: "✅ ${env.JOB_NAME} #${env.BUILD_NUMBER} passed")
  }
}
```

| Hàm | Vai trò |
|---|---|
| `DockerBuild.groovy` `call(registry, image, tag)` | Auto-detect Dockerfile path theo service |
| `DockerBuild.groovy` `call(registry, image, tag, dockerfile, context)` | Overload cho phép chỉ định đường dẫn tự do |
| `Deploy.groovy` `call(env, tag)` | Roll-out đồng thời 3 service cùng tag → đảm bảo version đồng bộ giữa backend ↔ backend-ai ↔ frontend |
| `Notify.groovy` `call(status)` | Slack notification |

> ⚠️ **Ghi chú triển khai:** vì 3 service có **dependency thời gian chạy** (frontend gọi backend, backend gọi backend-ai), hàm `Deploy` nên roll-out đồng thời 3 deployment với **cùng `<git-sha>`** để đảm bảo version đồng bộ (tránh frontend gọi API version mới trong khi backend-ai cũ chưa cập nhật contract).

---

### Giai đoạn 5 — Tích hợp Secrets & Environment (Tuần 4)

| # | Công việc |
|---|-----------|
| 5.1 | ✅ **ĐÃ XONG 22/10/2026** — Jenkins Credentials đã tạo đủ 8 credential theo mục 1.3 (tự động bằng `.jenkins-setup/create-credentials.groovy`). ⛔ Còn `dockerhub-creds` = placeholder → cần điền token thật |
| 5.2 | Dùng `withCredentials([...])` trong pipeline stage test + build image để inject env (không bake vào image) |
| 5.3 | Khi deploy Kubernetes, dùng **External Secrets Operator** hoặc **Sealed Secrets** để manifest K8s tham chiếu secret từ Vault/SSM |
| 5.4 | Trên môi trường dev/staging/prod: đổi `AiService:BaseUrl` từ `http://localhost:8000` (appsettings.json hiện tại) sang **internal DNS service** (`http://backend-ai.<namespace>.svc.cluster.local:8000`) |
| 5.5 | Smoke test sau deploy (gọi **đúng endpoint** đã phát hiện):<br>• `curl -fs http://api/health` (backend .NET — route `health.py` chung, kiểm tra trong `Program.cs` middleware)<br>• `curl -fs http://ai/health` (backend-ai FastAPI liveness — **không gọi LLM**)<br>• `curl -fs http://ai/ready` (backend-ai FastAPI readiness — kiểm tra API key cấu hình đúng)<br>• `curl -fs http://web/` (frontend React)<br>**Quan trọng:** KHÔNG gọi `/docs` hoặc `/openapi.json` trên prod (đã bị tắt theo `main.py`) |

**Ví dụ pipeline stage smoke test:**

```groovy
stage('Smoke Test') {
  when { branch 'main' }
  steps {
    sh '''
      set -e
      for i in 1 2 3 4 5; do
        curl -fs http://api/health && break || sleep 10
      done
      curl -fs http://ai/health
      curl -fs http://ai/ready
      curl -fs http://web/
    '''
  }
}

stage('E2E: backend-ai → AI matching') {
  when { branch 'main' }
  steps {
    sh '''
      curl -fs -X POST http://api/internal/ai/match \\
        -H "X-Internal-API-Key: \${INTERNAL_API_KEY}" \\
        -H "Content-Type: application/json" \\
        -d @backend-ai/tests/fixtures/contracts/match_result_v1_with_explanation.json
    '''
  }
}
```

---

### Giai đoạn 6 — Hardening & mở rộng (Tuần 5+)

| # | Công việc |
|---|-----------|
| 6.1 | **SAST/SCA**: thêm stage `trivy fs .` (quét CVE trong image) và `sonar-scanner` (nếu dùng SonarQube) |
| 6.2 | **Coverage report**: publish lên SonarQube / Codecov |
| 6.3 | **Notifications**: Slack/Email on failure; hiển thị badge trong README repo |
| 6.4 | **Retention policy**: giữ 20 build gần nhất, xoá image cũ (`docker image prune`) |
| 6.5 | **Backup**: snapshot `/var/jenkins_home` hàng ngày lên S3/NFS |
| 6.6 | **Matrix build**: chạy song song 3 service trong cùng 1 build khi thay đổi nhiều service |
| 6.7 | **Promotion**: dùng **Jenkins Promotion** plugin hoặc **ArgoCD Image Updater** để sync `git-sha` → K8s |
| 6.8 | **Evaluation benchmark** (nightly trên `main`): chạy `backend-ai/evaluation/` bộ dataset để bắt regression matching (skill_alias, experience, education, semantic, matching_sanity) |
| 6.9 | **Disaster Recovery**: tài liệu hoá quy trình restore Jenkins từ backup trong `docs/runbook-cicd.md` |

---

## 5. Chiến lược trigger & branch

| Branch / Event | Hành động |
|---|---|
| `feature/*` push | Build + Test → báo lỗi nếu fail (không push image, không deploy) |
| Pull Request mở / cập nhật | Build + Test + Lint → comment status vào PR (dùng `github-pr-comment` plugin) |
| `develop` push | Build + Test + Push image (tag `develop-<sha>`) → auto deploy **dev** |
| `main` push | Build + Test + Push image (tag `<sha>` + `latest`) → auto deploy **staging** |
| Tag `v*.*.*` (manual) | Build + Test + Push image (tag release) → **manual approval** để deploy **prod** |
| Nightly (cron `H 2 * * *`) | Full test + benchmark `backend-ai/evaluation/` + scan security để bắt regression |

---

## 6. Checklist chuẩn bị môi trường

```text
☐ Server/VM có ≥ 4 vCPU, ≥ 8 GB RAM cho Jenkins Controller
☐ Docker Engine ≥ 24.x (cho cả controller lẫn agents)
☐ (Tuỳ chọn) K8s cluster cho dynamic agents
☐ Docker Registry (Harbor/ECR/Docker Hub) — 1 namespace `futurecv`
☐ PostgreSQL 15 chạy sẵn cho backend API + dùng làm sidecar trong job test .NET
☐ 3 Agent images được publish: jenkins-agent-dotnet:8, jenkins-agent-node:24, jenkins-agent-python:3.11
☐ Git repo đã bật webhook về Jenkins
☐ Reverse-proxy (Nginx/Caddy + TLS) trước Jenkins UI
☐ Tài khoản SSO/LDAP cho team (tuỳ chọn, plugin `reverse-proxy-auth`)
☐ Slack/Teams webhook (tuỳ chọn) cho notification
☐ Merge conflict ở frontend/package.json dòng 10 đã được resolve
```

---

## 7. Ước lượng thời gian & nhân lực

| Giai đoạn | Thời gian | Người phụ trách |
|---|---|---|
| GĐ1 — Hạ tầng Jenkins | 1 tuần | DevOps |
| GĐ2 — Dockerfiles + Jenkinsfile root + fix package.json | 2–3 ngày | Backend + Frontend + DevOps |
| GĐ3 — Pipeline 3 service | 1 tuần | DevOps + 3 dev service |
| GĐ4 — Shared Library | 3 ngày | DevOps |
| GĐ5 — Secrets + Deploy | 3 ngày | DevOps |
| GĐ6 — Hardening + benchmark nightly | 1 tuần | DevOps + Security |
| **Tổng cộng** | **~5 tuần** | 1 DevOps + hỗ trợ từ 3 dev service |

---

## 8. Rủi ro & cách giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Jenkins controller là SPOF | Dùng HA (2 controller + shared storage hoặc K8s deployment) |
| Image build chậm | Cache layer trong CI agent image; dùng BuildKit; mount `~/.nuget`, `~/.npm`, `~/.cache/pip` cache |
| Pipeline phình to, khó bảo trì | Tách thành Shared Library + nhiều file `.groovy` |
| Secret bị lộ | Bắt buộc `withCredentials`; cấm `echo env` trong logs; bật audit log Jenkins |
| Agent hết resource | Dùng K8s agent (auto-scale); giới hạn concurrent build qua *Manage Nodes* |
| Network chậm khi push image | Dùng registry mirror nội bộ; pull-through cache |
| **3 service lệch version khi deploy** (frontend gọi API version chưa sẵn sàng) | Triển khai theo **cùng `<git-sha>`** cho cả 3 service trong 1 stage `Deploy` (xem GĐ4) |
| **DB cho CI chưa chốt** → test integration không chạy được | Chốt sớm ở GĐ2 mục 2.7: **PostgreSQL 15 sidecar** trong agent `dotnet` |

---

## 9. Bước tiếp theo đề xuất

Có thể nhờ tôi triển khai ngay các bước sau:

1. **Viết `backend/Dockerfile`** (multi-stage cho ASP.NET Core 8) — file này đang thiếu.
2. **Tạo `Jenkinsfile` ở root repo** có logic phân luồng thay đổi để build đúng service.
3. **Tạo `Jenkinsfile.python` / `Jenkinsfile.node` / `Jenkinsfile.dotnet`** mẫu đầy đủ.
4. **Tạo Shared Library Groovy** (`DockerBuild.groovy`, `Deploy.groovy`, `Notify.groovy`).
5. **Viết `docker-compose.yml`** cho Jenkins local để thử nghiệm ngay trên máy.
6. **Resolve merge conflict** trong `frontend/package.json` dòng 10 — trước khi bật CI.

> 👉 Gợi ý: bắt đầu với **bước 6 + 1 + 3** là bộ khung tối thiểu để CI/CD chạy được.
