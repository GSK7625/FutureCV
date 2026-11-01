# FutureCV — triển khai Jenkins CI/CD

Cập nhật: 26/10/2026. Đây là hướng dẫn cho bộ khung CI hiện tại. `JENKINS_CICD_PLAN.md` giữ bản thiết kế nhiều giai đoạn; các mô tả trạng thái cũ trong tài liệu đó cần đối chiếu với file này.

## 1. Dự án hoạt động như thế nào

- `frontend/`: React 19, React Router 8, TypeScript, Vite, Tailwind; SPA (`ssr: false`). Các nhóm tính năng chính là auth, candidate, HR và admin. Zustand giữ trạng thái client, TanStack Query quản lý truy vấn. `app/lib/fetcher.ts` gọi API .NET, sử dụng `VITE_API_URL` lúc build và các đường dẫn `/api/...`.
- `backend/`: ASP.NET Core 8 theo Clean Architecture. `Domain` chứa thực thể/quy tắc; `Application` chứa use case, DTO, validator; `Infrastructure` chứa EF Core/PostgreSQL, Identity/JWT, email, Cloudinary và HTTP client AI; `Api` là composition root và controller. Package NuGet quản lý tập trung qua `Directory.Packages.props`.
- `backend-ai/`: FastAPI, Pydantic v2, kiến trúc hexagonal. API gọi application service, domain xử lý CV/matching/ranking, các adapter gọi Gemini/OpenAI/mock và đọc PDF. Service không lưu DB. .NET gọi AI bằng `X-Internal-API-Key`; frontend không gọi AI trực tiếp.
- `backend/tests/`: các test domain/contract và integration ở mức application hiện dùng EF InMemory, HTTP giả và JSON fixture lấy từ `backend-ai/tests/fixtures/contracts/`. Đổi fixture AI phải chạy lại cả test .NET.
- `backend-ai/tests/`: unit, contract, integration và kiểm tra kiến trúc; cấu hình test cô lập `.env`. `evaluation/matching/` là các CLI benchmark riêng, không phải bộ pytest để chạy bằng `pytest evaluation/`.
- `frontend/Docs/` chứa tài liệu UI/luồng và mẫu thiết kế. Các file kết luận ở root là tài liệu đồ án. `package.json` root chỉ có dependency Tesseract, không phải npm workspace hay lệnh build chung.
- `backend/aspire/` mới có placeholder, chưa phải hệ thống orchestration có thể chạy.
- `.jenkins-setup/` có cấu hình controller và script bootstrap cũ. Sự tồn tại của file và ghi chú “đã xong” không xác nhận container, credential hoặc cluster hiện đang chạy.

Luồng runtime: browser → frontend/Nginx → .NET API → PostgreSQL; .NET API → FastAPI → provider AI. Hai service sau cùng dùng cùng internal key.

## 2. Phần đã chuẩn bị trong repo

- `Jenkinsfile` root: checkout sạch → chọn service thay đổi → CI song song → build image → push tùy chọn. Lần đầu, thiếu lịch sử commit hoặc bật `FULL_BUILD` sẽ chạy cả ba.
- `jenkins/ci.groovy`: logic dùng chung ngay trong repo, chưa cần tạo repo Shared Library hoặc cấu hình Global Pipeline Library.
- Ba Jenkinsfile ở thư mục service dùng lại helper này; chỉ cần tạo job root cho cách chạy thông thường. Không bật cả job root và ba job service trên cùng webhook để tránh chạy trùng.
- CI dùng container Node 24, SDK .NET 8 và Python 3.11, chạy trên một Linux agent có label `docker`. Chưa cần xây ba agent SDK riêng.
- Frontend cài cả devDependencies; typecheck, test Node xuất JUnit và build SPA. .NET restore/build/test/coverage/publish, đọc TRX bằng plugin `mstest`. AI compile/Ruff/format/mypy/pytest, dùng provider mock và không cần credential AI thật.
- Image .NET multi-stage, non-root, cổng 8080; image frontend phục vụ `build/client` bằng Nginx non-root cổng 8080; AI giữ Dockerfile Python non-root cổng 8000. Dockerignore loại local secrets và build output khỏi context.
- .NET có `/health` (process) và `/ready` (kết nối DB); AI đã có `/health` và `/ready`; web có `/health`. API chỉ mở endpoint sau khi hoàn tất startup seeding.
- Tag image là 12 ký tự Git SHA. Chọn push sẽ bắt buộc CI/build cả ba image cùng tag; không gán `latest`.

Các stage kiểm tra là bắt buộc: nếu mã ứng dụng lỗi lint/typecheck/test, build dừng và chưa push. Phần tự động triển khai Kubernetes, migration DB, scan bảo mật và promotion production thuộc đợt tiếp theo, chưa được nối vào pipeline này.

## 3. Điều kiện chạy Jenkins lần đầu

1. Khởi động Docker Desktop, đợi `docker version` hiển thị cả Client và Server. Nếu dùng controller Compose hiện có, các network external `kind` và `jenkins` phải tồn tại. Không xoá volume `jenkins_home` để sửa lỗi khởi động.
2. Đăng nhập Jenkins và bảo đảm các plugin trong `jenkins/plugins.txt` đã cài. `mstest` là plugin cần thêm nếu trước đây chỉ cài JUnit; file TRX không phải JUnit XML. `docker-workflow` cung cấp Docker Pipeline, `timestamper` cung cấp `timestamps()`.
3. Trong **Manage Jenkins → Nodes → New Node**, tạo permanent node `futurecv-docker`: remote root `/home/jenkins/agent`, label `docker`, một executor, launch bằng inbound agent và WebSocket. Controller nên có 0 executor. Pipeline chạy ba container tool song song trên executor này; cần đủ RAM cho cả ba.
4. Lấy secret từ trang inbound node, đặt vào biến môi trường PowerShell trong phiên làm việc, không lưu vào Git:

   ```powershell
   $env:JENKINS_AGENT_SECRET = '<secret từ trang inbound node>'
   docker compose -f .jenkins-setup/docker-compose.yml -f .jenkins-setup/docker-compose.agent.yml up -d --build ci-agent
   Remove-Item Env:\JENKINS_AGENT_SECRET
   ```

   Compose agent dùng Docker socket và workspace volume riêng. `DOCKER_GID` mặc định 0 cho Docker Desktop Linux engine; trên Linux đặt đúng group ID của socket. Agent phải dùng cùng Docker daemon với các container tool, và plugin Docker Pipeline phải nhận diện agent container để chia sẻ workspace qua `--volumes-from`.

5. Tạo **Multibranch Pipeline**, cấu hình Git URL/credential của team, **Script Path = `Jenkinsfile`**. Checkout là toàn bộ monorepo. Với PR từ fork, cấu hình trust trong branch source; credential publish chỉ dành cho build nhánh tin cậy.
6. Chạy lần đầu với `FULL_BUILD=true`, `BUILD_IMAGES=false`, `PUSH_IMAGES=false`. Đợi CI xanh và đọc test report. Sau đó bật `BUILD_IMAGES=true` để kiểm tra Docker build.
7. Bật webhook từ Git host đến Jenkins khi Jenkins có URL truy cập được từ host đó. Jenkins chỉ ở `localhost:8080` chưa đủ để GitHub/GitLab cloud gửi webhook.

Agent có Docker socket cần dành cho source tin cậy của team. Cấu hình agent là file chuẩn bị; việc tạo node/job và chạy pipeline thật phải xác nhận riêng trên Jenkins đang hoạt động.

## 4. Cách kiểm tra bằng CLI

Chạy từ root repo, với SDK/dependency tương ứng:

```powershell
Push-Location frontend
npm ci --include=dev
npm run typecheck
npm run test:ci
npm run build
Pop-Location

Push-Location backend
dotnet restore FutureCV.sln
dotnet build FutureCV.sln -c Release --no-restore
dotnet test FutureCV.sln -c Release --no-build --logger 'trx;LogFileName=test-results.trx' --results-directory test-results --collect 'XPlat Code Coverage'
dotnet publish src/FutureCV.Api/FutureCV.Api.csproj -c Release --no-build -o publish
Pop-Location

Push-Location backend-ai
py -3.11 -m venv .venv-ci
.\.venv-ci\Scripts\python.exe -m pip install -r requirements-dev.txt
$env:ENV = 'test'
$env:LLM_PROVIDER = 'mock'
$env:EMBEDDING_PROVIDER = 'mock'
.\.venv-ci\Scripts\python.exe -m compileall -q app tests
.\.venv-ci\Scripts\python.exe -m ruff check app tests
.\.venv-ci\Scripts\python.exe -m ruff format --check app tests
.\.venv-ci\Scripts\python.exe -m mypy app
.\.venv-ci\Scripts\python.exe -m pytest tests --junitxml=test-results.xml -q
Pop-Location

docker build -t futurecv/frontend:local frontend
docker build -t futurecv/backend:local backend
docker build -t futurecv/backend-ai:local backend-ai
```

Không dùng `npm test -- --reporter=junit`: Node test runner dùng `--test-reporter`; script `test:ci` đã đặt đúng vị trí flag. Báo cáo frontend/Python là JUnit; báo cáo .NET vẫn là TRX, được `mstest` chuyển khi publish vào Jenkins.

## 5. Cấu hình image và publish

Mặc định `PUSH_IMAGES=false`; CI chưa cần credential registry hoặc DB/AI production. Muốn publish trên `develop` hoặc `master`:

1. Cập nhật Jenkins credential `dockerhub-creds` bằng username/token có quyền push đúng namespace. Trạng thái placeholder trong tài liệu cũ phải kiểm chứng, không coi là credential hợp lệ.
2. Đặt `IMAGE_PREFIX=docker.io/<namespace-thật>` hoặc host/namespace registry của team, `BUILD_IMAGES=true`, `PUSH_IMAGES=true`.
3. Kết quả là `<prefix>/frontend:<sha>`, `<prefix>/backend:<sha>`, `<prefix>/backend-ai:<sha>`. Credential chỉ được bind ở stage push, không đưa vào Dockerfile hay build args.
4. Lưu tag từ build đã qua kiểm tra làm đầu vào cho bước deploy sau này.

`VITE_API_URL` mặc định rỗng để browser gọi `/api/...` cùng origin. Nginx chuyển tiếp đến DNS `backend:8080`, giữ nguyên `/api`. Môi trường deploy cần có Service/container alias `backend`. Nếu dùng API public riêng, đặt URL trước build; thay biến runtime không đổi bundle Vite. Container web vẫn cần DNS `backend` để Nginx nạp cấu hình proxy, kể cả khi build với API public riêng.

## 6. Việc phải hoàn tất trước khi nối CD

1. Chốt registry namespace và dev target thật. Xác minh Docker Engine, Jenkins agent/job, Kubernetes context và namespaces; kubeconfig/secrets đã được ignore, không commit.
2. Chuẩn bị PostgreSQL và bước **EF migration riêng trước khi start API**. API đang seed Roles/Admin/reference/demo ngay startup và chưa tự migrate. `dotnet test` hiện không kiểm chứng migration PostgreSQL; bổ sung bài test migration thật ở giai đoạn này, không gọi test InMemory là DB integration test.
3. Chốt chính sách demo seeding trước staging/prod: `DatabaseSeeder` hiện gọi `DemoDataSeeder` vô điều kiện; kiểm tra credential bootstrap Admin và tài khoản demo trước khi mở Internet.
4. Cấp runtime secrets qua Kubernetes Secret/secret manager: connection string, JWT, cùng internal key ở API/AI và key provider đang chọn; thêm Cloudinary/SMTP/Google nếu chức năng đó được bật. Không yêu cầu toàn bộ provider key nếu chỉ dùng một provider.
5. Dùng `AiService__BaseUrl=http://backend-ai:8000`, `AiService__ApiKey` khớp `INTERNAL_API_KEY`; JWT issuer/audience và frontend URL đúng domain. Không dùng localhost cho service bên trong cluster.
6. Thêm manifests dev/staging/prod và job migration, probe/startup timeout, tài nguyên và ingress/TLS. K8s không tự dùng Dockerfile `HEALTHCHECK`; phải khai báo liveness/readiness trong Pod spec.
7. Deploy cả bộ ba image từ cùng một build/tag: develop → dev; master → staging; release tag đã qua staging + xác nhận thủ công → prod. Không dùng `set image` trên Deployment chưa được tạo, không tự deploy prod sau mỗi push master.
8. Smoke test HTTP phải trả lỗi thật nếu hết retry: API `/health` và `/ready`, AI `/health` và `/ready`, web `/` và một route sâu như `/jobs`. Kiểm thử matching phải dùng request fixture đúng input contract; `match_result_v1_*.json` là response mẫu, không dùng làm POST body. Không gọi `/docs` trên AI production.
9. Thêm image scan, rollback/promotion và backup/restore Jenkins khi đường CI và dev deployment đã hoạt động. Không cấu hình hai controller ghi đồng thời vào cùng `JENKINS_HOME`.

## 7. Kết quả xác minh ngày 26/10/2026

- Frontend: cài sạch theo lockfile; typecheck thành công; 29/29 test và báo cáo JUnit; build production thành công, tạo `build/client/index.html`. Vẫn có cảnh báo bundle lớn ở CV builder. Trên máy này, Vite chạy trong sandbox Windows báo lỗi nạp CommonJS; chạy ngoài sandbox đã qua mà không cần sửa dependency hoặc route.
- .NET: build toàn solution thành công; 73/73 test; đã tạo TRX và Cobertura coverage. Các analyzer warning sẵn có không làm build thất bại. Endpoint health mới đã được kiểm tra bằng build, chưa smoke test HTTP vì chưa có DB/container hoạt động.
- AI: compile, Ruff lint/format và mypy đều qua; 594/594 test, có một deprecation warning của Starlette/httpx. Đã sửa hai vấn đề chú thích kiểu trong adapter Gemini và format năm file để vượt quality gate, giữ nguyên logic. Xác minh local dùng Python 3.12.14; pipeline được cấu hình Python 3.11, còn cần chạy trên agent thật để xác minh đúng runtime đó.
- Docker Compose controller + agent đã qua `config --quiet` với secret giả chỉ dùng khi kiểm tra cú pháp.
- `git diff --check` đã qua. Secret/kubeconfig, cache và báo cáo test được ignore.
- **Chưa xác minh Docker build, kết nối agent hoặc Jenkins pipeline end-to-end.** Docker Desktop đang lỗi startup Inference manager ở socket `dockerInference` (“The file cannot be accessed by the system”), Engine không phản hồi. Không reset Docker hay xoá volume Jenkins. Cần xử lý lỗi khởi động này trước khi chạy các bước hạ tầng trong mục 3; sau đó xác minh registry credential để push, rồi triển khai phần CD ở mục 6.

## 8. Nguồn đối chiếu

- [React Router: deploy SPA từ build/client và fallback index.html](https://reactrouter.com/how-to/spa)
- [Node 24: test runner và reporters](https://nodejs.org/docs/latest-v24.x/api/test.html)
- [Jenkins: dùng Docker trong Pipeline](https://www.jenkins.io/doc/book/pipeline/docker/)
- [Jenkins MSTest: publish TRX](https://www.jenkins.io/doc/pipeline/steps/mstest/)
