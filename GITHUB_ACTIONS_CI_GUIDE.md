# Nhật ký và hướng dẫn triển khai CI cho FutureCV

Phần CD bổ sung ngày 01/11/2026 được ghi riêng tại [GITHUB_ACTIONS_CD_GUIDE.md](GITHUB_ACTIONS_CD_GUIDE.md). Các trạng thái “chưa deploy” bên dưới mô tả mốc bàn giao CI ngày 29/10; xem tài liệu CD để biết trạng thái mới.

Ngày thực hiện: 29/10/2026 (Asia/Saigon).

Tài liệu này ghi theo đúng thứ tự thực hiện. Kết quả local và kết quả GitHub được phân biệt rõ; tạo file workflow chưa có nghĩa CI đã chạy thành công trên GitHub.

## 1. Kiểm tra hiện trạng trước khi sửa

- Lệnh: `git status --short`, `git branch --show-current`, tìm `AGENTS.md`, đọc cấu hình từng dịch vụ.
- Kết quả: đang ở `master`, chưa có `.github/workflows`. File `GITHUB_ACTIONS_CICD_PLAN.md` đã có sẵn, được đánh dấu thêm vào Git (intent-to-add), chưa stage nội dung; giữ nguyên file này. Đã xác minh lại bằng `git diff --cached --stat` và `git ls-files --debug` trước bàn giao.
- Đã đọc `backend/AGENTS.md` để tuân thủ quy tắc backend.
- Frontend: Node trên máy là 24.20.0; có package-lock, script typecheck/build/test. Script test chỉ liệt kê 4 trong 6 file test.
- Backend: target .NET 8; SDK local 8.0.424.
- AI: dự án chọn Python 3.11 trong Dockerfile; Python mặc định trên máy là 3.14.7. Cần kiểm tra môi trường test trước khi chọn cách xác minh.

## 2. Tách nhánh làm việc

```powershell
git switch -c codex/github-actions-ci
```

Mục đích: gom thay đổi CI vào nhánh riêng để bạn xem diff và tạo Pull Request vào `master`. Không commit hoặc đẩy file kế hoạch có sẵn cùng với CI một cách tự động.

## 3. Thiết kế CI đầu tiên

- Cấu hình nằm tại `.github/workflows/ci.yml`.
- Chạy khi push vào `master` hoặc `codex/github-actions-ci`, khi tạo/cập nhật Pull Request vào `master`, và cho phép chạy thủ công khi workflow đã có trên nhánh mặc định.
- Runner `ubuntu-24.04` của GitHub chạy các job. Máy Windows của bạn dùng để sửa và kiểm tra local; chưa cài self-hosted runner.
- Ba job: frontend (cài dependency, typecheck, test, build), backend (restore, build, test), AI (cài dependency, pytest).
- Job tổng hợp `ci-required` chỉ đạt khi cả ba job đạt; có thể chọn làm required check sau khi workflow chạy ổn.
- AI dùng `ENV=test`, `LLM_PROVIDER=mock`, `EMBEDDING_PROVIDER=mock`. Không cần lấy khóa API thật từ tài khoản bạn.
- Quyền token chỉ `contents: read`; checkout không giữ thông tin xác thực. Không deploy, không chạy migration, không sửa database.
- Lưu báo cáo test .NET/Python trong 14 ngày kể cả khi test lỗi. Hủy lần CI cũ khi có lần mới trên cùng ref.
- Chưa đưa Ruff/MyPy thành gate ở bản đầu: cần đo và xử lý lỗi nền riêng, không dùng `continue-on-error` để che lỗi kiểm tra bắt buộc.

## 4. Thực hiện và kiểm tra

### 4.1. Tạo file và chỉnh cấu hình

Theo thứ tự:

1. Tạo tài liệu này để theo dõi quá trình.
2. Tạo nhánh `codex/github-actions-ci`. Lần đầu sandbox không cho ghi `.git`; đã xin quyền và tạo nhánh thành công.
3. Xác minh commit của 5 action chính thức bằng `git ls-remote https://github.com/actions/<tên>.git refs/tags/<phiên-bản>`. Mạng sandbox không phân giải được GitHub; lần chạy được cấp quyền truy cập mạng đã thành công.
4. Thêm đủ hai file test còn thiếu vào `frontend/package.json`. Không đổi dependency hoặc package-lock.
5. Tạo `backend/global.json`: chọn SDK dòng 8.0.400, cho phép patch mới trong cùng feature band. `setup-dotnet` cài `8.0.4xx`, `global.json` giúp tránh runner vô tình dùng SDK mới hơn đã cài sẵn.
6. Tạo workflow với Node 24.20.0, .NET SDK 8.0.4xx và Python 3.11, các action cố định theo full commit SHA. Dòng comment ghi version tương ứng để bạn tra cứu; action version và runtime dự án là hai khái niệm khác nhau.
7. Thêm `.ci-cache/` và `.ci-results/` vào `.gitignore`. Công cụ tải về, virtualenv và báo cáo test không vào Git.

### 4.2. Kiểm tra frontend

Chạy trong `frontend/`, tuần tự từng lệnh; nếu lệnh trước lỗi thì xử lý trước khi chạy lệnh sau:

```powershell
npm ci
npm run typecheck
npm test
npm run build
```

- `npm ci`: cài đúng dependency từ `package-lock.json`, có thể tạo lại `node_modules`.
- `typecheck`: tạo type của React Router rồi chạy TypeScript.
- `test`: chạy 6 file test hiện có, **28/28 test đạt**.
- `build`: tạo bản build, **đạt**; Vite có cảnh báo chunk lớn hơn 500 kB.
- Trong lúc xử lý lần cài dependency ban đầu chạy chậm, đã vô tình mở thêm một lần `npm ci`, gây `ENOTEMPTY` do hai tiến trình cùng sửa `node_modules`. Đã kết thúc lần cũ và chạy lại tuần tự `npm ci --prefer-offline --no-audit --no-fund` → typecheck → test → build, thành công. Đây là lỗi thao tác local, không phải lỗi workflow; workflow chỉ cài một lần mỗi job.
- Lần npm audit đi kèm cài đặt báo 8 lỗ hổng dependency (2 moderate, 4 high, 2 critical). Chưa đổi dependency hoặc chạy `npm audit fix`; workflow đầu tiên chưa có security scan và CI xanh không có nghĩa hết lỗ hổng.

### 4.3. Kiểm tra backend và sửa lỗi fixture

Chạy trong `backend/`:

```powershell
dotnet restore FutureCV.sln
dotnet build FutureCV.sln -c Release --no-restore
dotnet test FutureCV.sln -c Release --no-build --logger 'trx;LogFileName=backend.trx' --results-directory ../.ci-results/backend
```

Kết quả lần đầu: restore/build đạt; **60 test đạt, 13 test lỗi**. Các test lỗi do `AiMatchingContractTests.cs` tìm JSON qua số cấp thư mục không đúng và đường dẫn cố định `D:\My Project\CDTH\FutureCV\...` của máy khác.

Đã sửa đúng phần đọc fixture trong file test: dùng `AppContext.BaseDirectory/Fixtures/Contracts/...`. File `.csproj` đã có cấu hình copy các JSON vào vị trí này. Giữ nguyên assertions và dữ liệu test, không bỏ qua test lỗi.

Sau sửa, build lại và chạy toàn bộ test: **73/73 đạt**, không có test bị bỏ qua. Báo cáo: `.ci-results/backend/backend.trx`. Build đầy đủ lần đầu có các cảnh báo analyzer có sẵn; lần build tăng dần sau sửa đạt với 0 lỗi.

### 4.4. Chuẩn bị Python riêng cho CI local

Python hệ thống là 3.14.7, không trùng Python 3.11 dự án sử dụng. Đã dùng Python 3.12.14 đi kèm ứng dụng để tải công cụ `uv` vào `.ci-cache/tools`, sau đó tải Python **3.11.18** và tạo virtualenv `.ci-cache/python`. Không thay Python mặc định của Windows.

Lệnh chuẩn bị đã thực hiện từ thư mục gốc (đường dẫn Python đầu tiên là runtime có sẵn trên máy này):

```powershell
& 'C:\Users\nglic\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m pip install --target .ci-cache/tools uv PyYAML
$env:UV_PYTHON_INSTALL_DIR = "$PWD/.ci-cache/python-runtime"
$env:UV_CACHE_DIR = "$PWD/.ci-cache/uv-cache"
& '.ci-cache/tools/bin/uv.exe' venv --python 3.11 --managed-python .ci-cache/python
& '.ci-cache/tools/bin/uv.exe' pip install --python .ci-cache/python/Scripts/python.exe -r backend-ai/requirements-dev.txt
```

Đã cài dependency thành công. `uv` chỉ là công cụ chuẩn bị local; GitHub dùng `setup-python` và `pip install` nên không cần cài uv.

Chạy test từ `backend-ai/`:

```powershell
$env:ENV = 'test'
$env:LLM_PROVIDER = 'mock'
$env:EMBEDDING_PROVIDER = 'mock'
& '..\.ci-cache\python\Scripts\python.exe' -m pytest tests --tb=short -q --junitxml=../.ci-results/ai/pytest.xml
```

Lần trong sandbox đã thu thập 600 test nhưng dừng tiến triển ở test async; đã ngắt và chạy lại ngoài sandbox sau khi xin quyền. Kết quả cuối được ghi bên dưới.

Kết quả ngoài sandbox: **600/600 test đạt, không bỏ qua**, thời gian pytest báo 2,77 giây, 1 cảnh báo deprecation từ FastAPI/Starlette TestClient. Báo cáo: `.ci-results/ai/pytest.xml`.

### 4.5. Kiểm tra file workflow

- Tải `actionlint` **1.7.12** bản Windows từ release chính thức `rhysd/actionlint` trên GitHub vào `.ci-cache/actionlint`.
- Chạy `.ci-cache/actionlint/actionlint.exe .github/workflows/ci.yml`: exit code 0, không báo lỗi cú pháp/biểu thức.
- `git diff --check`: đạt ở lần kiểm tra sau sửa fixture. Kiểm tra này tìm lỗi whitespace, không thay thế chạy trên runner Linux.

## 5. Đọc workflow để hiểu nó làm gì

Bạn mở `.github/workflows/ci.yml`, đọc từ trên xuống:

1. `name`: tên hiển thị trong tab Actions là **FutureCV CI**.
2. `on`: sự kiện kích hoạt. Push nhánh CI giúp thử trước khi merge; PR vào master giúp kiểm tra thay đổi đề xuất; push master kiểm tra code sau merge. Một thay đổi có thể tạo hai run khi vừa push nhánh CI vừa có PR mở; điều này là chủ ý ở giai đoạn thiết lập.
3. `permissions`: giới hạn quyền token GitHub, chỉ đọc source.
4. `concurrency`: nhóm theo workflow/ref; commit mới hủy lượt cũ cùng nhóm để giảm thời gian runner.
5. `jobs`: ba phần chạy độc lập, GitHub có thể chạy song song. Mỗi job có runner riêng nên đều cần checkout và cài runtime.
6. `defaults.run.working-directory`: lệnh shell chạy trong thư mục service tương ứng. Cấu hình này không đổi đường dẫn của các action như upload-artifact; đường dẫn artifact được tính từ gốc repo.
7. `steps`: chạy từ trên xuống. `uses` gọi action; `run` chạy lệnh. Lệnh lỗi làm job thất bại và ngăn các bước thông thường sau đó.
8. `if: always()` tại upload báo cáo: vẫn cố lưu báo cáo khi test lỗi. Nếu cài dependency hoặc build lỗi trước test thì chưa có báo cáo; action sẽ cảnh báo, job vẫn giữ trạng thái lỗi ban đầu.
9. `needs` ở `ci-required`: chờ cả ba job, đọc kết quả của chúng; chỉ trả thành công khi tất cả đều `success`, kể cả trường hợp job trước bị skipped/cancelled cũng không cho qua.

Cache npm/pip chỉ giúp giảm tải dependency; không lưu secrets và không thay thế chạy test. Báo cáo artifact là file tải xuống để xem kết quả, không phải bản ứng dụng được triển khai.

## 6. Những file đã thay đổi

- `.github/workflows/ci.yml`: workflow CI đầu tiên.
- `GITHUB_ACTIONS_CI_GUIDE.md`: tài liệu bạn đang đọc, gồm nhật ký và hướng dẫn vận hành.
- `frontend/package.json`: thêm 2 file test còn thiếu vào script test hiện có.
- `backend/global.json`: chọn SDK .NET 8 trong đúng feature band.
- `backend/tests/FutureCV.Domain.Tests/ContractTests/AiMatchingContractTests.cs`: sửa đường dẫn fixture để chạy trên máy khác và Linux runner.
- `.gitignore`: bỏ qua công cụ local và kết quả CI.

`GITHUB_ACTIONS_CICD_PLAN.md` đã tồn tại và có đánh dấu intent-to-add trước khi làm việc; nội dung không được sửa trong lần này. Chưa commit hoặc push bất cứ thay đổi nào.

## 7. Đưa CI lên GitHub sau khi bạn xem xong

Các lệnh trong mục này **chưa được thực hiện**. Chạy từ gốc repo FutureCV, lần lượt và kiểm tra kết quả mỗi bước.

### Bước 1: xem nhánh và diff

```powershell
git branch --show-current
git status --short
git diff
```

Nhánh phải là `codex/github-actions-ci`. File mới chưa stage sẽ chưa xuất hiện trong `git diff`; mở trực tiếp workflow và tài liệu này để xem.

### Bước 2: chọn đúng các file CI

```powershell
$ciFiles = @(
  '.github/workflows/ci.yml',
  'GITHUB_ACTIONS_CI_GUIDE.md',
  'frontend/package.json',
  'backend/global.json',
  'backend/tests/FutureCV.Domain.Tests/ContractTests/AiMatchingContractTests.cs',
  '.gitignore'
)
git add -- $ciFiles
git diff --cached -- $ciFiles
```

Đọc diff để xác nhận chỉ có thay đổi đã mô tả. Không dùng `git add .` trong tình trạng hiện tại vì sẽ lấy thêm file kế hoạch có sẵn ngoài phạm vi CI lần này.

### Bước 3: commit riêng các file CI rồi push

```powershell
git commit --only -m "ci: add frontend backend and AI checks" -- $ciFiles
git push -u origin codex/github-actions-ci
```

`--only` kèm danh sách file giúp commit này chỉ lấy các file CI, kể cả khi bạn đã stage thêm file khác trước lúc commit. Nếu có lỗi quyền, kiểm tra tài khoản Git đang dùng và quyền push lên `GSK7625/FutureCV`. Quyền tài khoản trong trình duyệt và thông tin đăng nhập Git trên máy có thể khác nhau. Không cần lấy tài khoản của bạn bè để viết workflow; chủ repo có thể nhận PR nếu bạn không có quyền push trực tiếp.

### Bước 4: xem lần CI đầu tiên

1. Mở https://github.com/GSK7625/FutureCV/actions và chọn **FutureCV CI**.
2. Mở run mới nhất, kiểm tra đúng nhánh/commit vừa push.
3. Chờ `frontend-check`, `backend-check`, `ai-check` và `ci-required` đạt.
4. Nếu đỏ: chọn job đỏ, mở step lỗi và đọc dòng lỗi đầu tiên. Sửa source/cấu hình rồi push lại; không bỏ test hoặc thêm `continue-on-error` để ép xanh.
5. Trong trang run, mục **Artifacts** có báo cáo backend và AI nếu test đã chạy. Frontend hiện xem kết quả test trực tiếp trong log.

Nếu GitHub không tạo run: kiểm tra file nằm đúng `.github/workflows/ci.yml`, push đúng nhánh được khai báo, Actions được chủ repo bật và quyền sử dụng runner/billing của repo. Nút **Run workflow** thủ công thường chỉ xuất hiện khi file workflow đã có trên nhánh mặc định; lần thử đầu dùng push nhánh CI.

### Bước 5: tạo Pull Request và bảo vệ master

Tạo PR từ `codex/github-actions-ci` vào `master`, xem diff và chờ CI. Bạn hoặc người có quyền merge thực hiện merge sau khi kiểm tra đạt.

Sau lần chạy đầu đã có check, chủ repo có thể cấu hình branch protection/ruleset yêu cầu PR và check **ci-required** trước merge nếu loại repo/gói tài khoản hỗ trợ. Việc này cần quyền quản trị; không thay đổi quyền mặc định token sang write chỉ để chạy build/test.

## 8. Trạng thái bàn giao và giới hạn

- Đã dựng CI trong checkout local và kiểm tra bằng actionlint 1.7.12.
- Frontend: typecheck đạt, 28 test đạt, build đạt.
- Backend: restore/build đạt, 73 test đạt sau sửa fixture.
- AI: Python 3.11.18, 600 test đạt với mock providers.
- Chưa có run GitHub được xác nhận; Windows local và runner Ubuntu vẫn có khác biệt hệ điều hành cần kiểm chứng ở run đầu.
- Chưa deploy ứng dụng, cài runner cá nhân, xuất bản image, cấu hình secrets hoặc sửa cài đặt GitHub.
- Python requirements và NuGet chưa có dependency lock trong lần này; phiên bản thực tế có thể đổi trong khoảng đã khai báo. Runtime/action được chọn rõ nhưng chưa đạt tái lập tuyệt đối cho toàn bộ dependency.
- CI này chưa kiểm chứng database PostgreSQL thật, EF migration, Docker image, E2E trình duyệt hoặc provider AI thật. Các test trong thư mục integration của AI chủ yếu là kiểm tra ứng dụng qua test client và mocks, không chứng minh toàn bộ stack đang vận hành.
- Ruff/MyPy và quét bảo mật dependency là phần mở rộng tiếp theo, được để ngoài gate đầu tiên và đã ghi rõ phạm vi.

## 9. Nguồn tham khảo

- GitHub: https://docs.github.com/en/actions/tutorials/create-an-example-workflow
- .NET CI: https://docs.github.com/en/actions/tutorials/build-and-test-code/net
- Action chính thức: https://github.com/actions/checkout, https://github.com/actions/setup-node, https://github.com/actions/setup-dotnet, https://github.com/actions/setup-python, https://github.com/actions/upload-artifact
- Công cụ kiểm tra workflow: https://github.com/rhysd/actionlint

## 10. Đã cài những gì, ở đâu và trong môi trường nào?

Mục này được bổ sung theo yêu cầu của bạn sau khi hoàn tất CI local. Phiên bản công cụ và danh sách Python bên dưới đã được đọc lại từ môi trường thực tế trên máy ngày 29/10/2026.

### 10.1. Môi trường local trên máy Windows của bạn

Thư mục gốc dự án: `C:\Users\nglic\Downloads\Documents\cdth\FutureCV`. Đường dẫn tương đối bên dưới được tính từ thư mục này.

Các công cụ **đã có sẵn, tôi chỉ sử dụng, không cài mới**:

- **Node.js 24.20.0**: chạy npm, test TypeScript trực tiếp và build frontend.
- **npm 11.19.0**: cài dependency frontend từ package-lock.
- **.NET SDK 8.0.424**: restore, build và test backend. Lần này chỉ thêm `backend/global.json` để chọn đúng SDK; không cài hoặc nâng cấp SDK .NET.
- **Python hệ thống 3.14.7**: chỉ kiểm tra phiên bản, không dùng để chạy bộ test AI.
- **Python 3.12.14 đi kèm ứng dụng Codex** tại `C:\Users\nglic\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`: dùng để tải công cụ chuẩn bị môi trường. Không phải Python được chọn cho test AI.
- Git và PowerShell: thao tác nhánh, đọc/sửa file và chạy lệnh.

### 10.2. Công cụ được cài mới trong riêng dự án

1. **uv 0.13.6** tại `.ci-cache/tools/bin/uv.exe`.
   - Công dụng: tải Python 3.11, tạo virtualenv và cài dependency Python.
   - Được cài bằng `pip install --target .ci-cache/tools uv PyYAML` từ Python đi kèm Codex.
   - Không cài uv toàn hệ thống, không thêm uv vào PATH Windows.
2. **PyYAML 6.0.3** tại `.ci-cache/tools/yaml`.
   - Được tải cùng uv để có bộ đọc YAML hỗ trợ kiểm tra nếu cần.
   - Kiểm tra workflow cuối cùng dùng actionlint, không dựa vào việc chỉ parse YAML.
3. **CPython 3.11.18 cho Windows x86-64** trong `.ci-cache/python-runtime/`.
   - uv quản lý runtime này; thư mục thực tế còn có tên theo phiên bản và tên alias `cpython-3.11-windows-x86_64-none`.
   - Dùng để tạo môi trường AI riêng. Không thay Python mặc định hoặc PATH của Windows.
4. **Virtualenv Python AI** tại `.ci-cache/python/`.
   - File chạy: `.ci-cache/python/Scripts/python.exe`.
   - Thư viện: `.ci-cache/python/Lib/site-packages/`.
   - `include-system-site-packages = false`: không dùng chung các gói cài trong Python hệ thống.
   - Môi trường được uv tạo **không có module pip**. Lệnh `python -m pip` trong virtualenv này sẽ báo `No module named pip`; đây là trạng thái đã xác minh. Dùng `uv pip --python ...` để quản lý dependency local như mục 4.4. Trên GitHub, Python do `setup-python` chuẩn bị có pip để chạy lệnh trong workflow.
5. **actionlint 1.7.12** tại `.ci-cache/actionlint/actionlint.exe`.
   - Công dụng: kiểm tra cú pháp workflow và biểu thức GitHub Actions.
   - Tải bản Windows amd64 từ release chính thức; file tải về giữ ở `.ci-cache/actionlint.zip`.
   - Đây là chương trình biên dịch sẵn; không cài Go lên máy dù thông tin phiên bản có ghi trình biên dịch Go.

Cache tải Python/dependency của uv được đặt tại `.ci-cache/uv-cache/`. Các biến `UV_PYTHON_INSTALL_DIR` và `UV_CACHE_DIR` chỉ được đặt trong tiến trình shell dùng để chuẩn bị môi trường, không ghi thành biến hệ thống Windows.

### 10.3. Dependency frontend và backend đã được khôi phục

- **Frontend:** chạy `npm ci` để cài lại dependency vào `frontend/node_modules/`; npm báo thêm 232 package trong lần chạy thành công. Nguồn và phiên bản chi tiết nằm trong `frontend/package-lock.json`; không sửa dependency hoặc lockfile trong công việc CI này. Các gói đó phục vụ React, React Router, TypeScript, Vite, kiểm tra và build frontend.
- **Backend:** chạy `dotnet restore FutureCV.sln` để tải/khôi phục các gói NuGet cần cho solution. Cache global-packages của máy được xác minh tại `C:\Users\nglic\.nuget\packages\`. Danh sách version do dự án khai báo nằm trong `backend/Directory.Packages.props`; kết quả resolve từng project nằm trong `obj/project.assets.json` được sinh ra khi restore. Không cài mới PostgreSQL hoặc chạy migration.
- Build sinh `frontend/build/`, các thư mục `backend/**/bin/`, `backend/**/obj/`. Đây là sản phẩm build, không phải phần mềm cài vào Windows.
- Báo cáo kiểm tra lưu tại `.ci-results/backend/backend.trx` và `.ci-results/ai/pytest.xml`.

### 10.4. Các gói đã cài trong virtualenv AI

Đã cài **50 gói** từ `backend-ai/requirements-dev.txt` (file này kéo theo `requirements.txt`). Gồm thư viện chạy dịch vụ và công cụ test/lint/typecheck. Ruff và MyPy đã được cài do nằm trong requirements-dev, nhưng **chưa được chạy làm gate CI trong lần này**.

Danh sách phiên bản thực tế đọc từ virtualenv:

```text
annotated-doc==0.0.5
annotated-types==0.8.0
anyio==4.15.1
certifi==2026.10.23
cffi==2.1.1
charset-normalizer==3.5.2
click==8.5.0
colorama==0.4.6
cryptography==50.0.2
distro==1.9.0
fastapi==0.162.0
google-auth==2.62.0
google-genai==2.33.0
h11==0.16.0
httpcore==1.0.9
httptools==0.9.0
httpx==0.28.1
idna==3.20
iniconfig==2.3.1
librt==0.16.0
mypy==1.20.2
mypy_extensions==1.1.0
opentelemetry-api==1.45.1
packaging==26.3
pathspec==1.1.1
pluggy==1.7.0
pyasn1==0.6.5
pyasn1_modules==0.4.2
pycparser==3.12
pydantic==2.14.1
pydantic-settings==2.16.2
pydantic_core==2.50.1
Pygments==2.21.0
pymupdf==1.28.2
pytest==8.4.2
pytest-asyncio==0.26.0
python-dotenv==1.2.4
python-multipart==0.0.32
PyYAML==6.0.3
requests==2.34.2
ruff==0.17.3
sniffio==1.3.1
starlette==1.10.0
tenacity==9.1.4
typing-inspection==0.4.4
typing_extensions==4.16.0
urllib3==2.8.0
uvicorn==0.54.0
watchfiles==1.3.0
websockets==17.3
```

Danh sách này là ảnh chụp môi trường local, **không phải lockfile được workflow sử dụng**. Dependency trên runner Ubuntu có thể khác do hệ điều hành và khoảng version khai báo trong requirements.

### 10.5. Môi trường sẽ chạy trên GitHub

Đây là cấu hình đã viết trong workflow, **chưa phải môi trường đã được xác nhận qua một run GitHub**:

- Hệ điều hành runner: **Ubuntu 24.04**, do GitHub cung cấp; không cài Ubuntu lên máy Windows của bạn.
- Job frontend: `setup-node` chuẩn bị **Node 24.20.0**, sau đó `npm ci` cài dependency.
- Job backend: `setup-dotnet` chuẩn bị **SDK 8.0.4xx**; `global.json` chọn bản patch phù hợp trong feature band 8.0.400.
- Job AI: `setup-python` chuẩn bị **Python 3.11**, sau đó `python -m pip install -r requirements-dev.txt` cài dependency.
- Job tổng hợp chỉ kiểm tra trạng thái ba job, không build ứng dụng.
- Mỗi job dùng môi trường runner riêng; không lấy Python hay `node_modules` trên máy Windows của bạn đưa lên runner. Cache npm/pip giúp tái sử dụng các gói tải xuống trên GitHub.
- Biến AI `ENV=test`, `LLM_PROVIDER=mock`, `EMBEDDING_PROVIDER=mock` được khai báo trong job và trong shell khi test local. Không lưu các biến này thành cấu hình production.

Trong công việc này chưa cài self-hosted runner, Jenkins, Docker, Kubernetes, database hay dịch vụ Windows mới. Chưa chỉnh startup, firewall hoặc thiết lập nguồn điện của máy. Những phần mềm đã tồn tại trước đó không thuộc danh sách cài mới cho CI.

### 10.6. Bạn có thể tự kiểm tra môi trường thế nào?

Chạy từ thư mục gốc repo:

```powershell
node --version
npm --version
dotnet --version
& .ci-cache/tools/bin/uv.exe --version
& .ci-cache/python/Scripts/python.exe --version
& .ci-cache/actionlint/actionlint.exe -version
Get-Content .ci-cache/python/pyvenv.cfg
& .ci-cache/tools/bin/uv.exe pip list --python .ci-cache/python/Scripts/python.exe
```

Các thư mục `.ci-cache/`, `.ci-results/`, `node_modules/`, `bin/`, `obj/` và `build/` được Git bỏ qua. Giữ `.ci-cache/` nếu muốn chạy lại test AI ngay; nếu sau này dọn thư mục này thì cần tạo lại môi trường theo mục 4.4 trước khi test. Tài liệu này chỉ hướng dẫn, chưa thực hiện xóa hoặc dọn môi trường.
