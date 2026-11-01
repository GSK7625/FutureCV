# FutureCV CD — nhật ký và hướng dẫn vận hành local-staging

Ngày bắt đầu: 01/11/2026 (Asia/Saigon). Tiếp nối `GITHUB_ACTIONS_CI_GUIDE.md`.

Bạn xác nhận chưa có quyền quản trị GitHub và yêu cầu làm sẵn phần local trước. Vì vậy công việc này chuẩn bị workflow CD và chạy stack Docker tại máy Windows. Không tự push/merge, đăng ký runner hoặc bật deploy từ GitHub khi chưa có quyền truy cập tương ứng.

## 1. Phạm vi và thứ tự thực hiện

1. Đọc CI, Dockerfile, cấu hình frontend/API/AI và quy tắc `backend/AGENTS.md`.
2. Kiểm tra Docker: Compose có sẵn phiên bản 5.2.0 nhưng engine chưa hoạt động.
3. Khởi động Docker Desktop, gặp lại lỗi Inference Manager/socket như ảnh bạn gửi. Không reset factory defaults.
4. Kiểm tra hai thư mục runtime chỉ chứa endpoint không có dữ liệu; đóng tiến trình Docker, đổi tên thư mục runtime và khởi động lại sau khi được cấp quyền.
5. Docker engine xác nhận chạy Linux, phiên bản 29.6.1. Runtime cũ được giữ tại:
   - `C:\Users\nglic\AppData\Local\Docker\run.before-socket-repair-20261101-133741`
   - `C:\Users\nglic\AppData\Local\docker-secrets-engine.before-socket-repair-20261101-133741`
6. Bổ sung Dockerfile .NET; đổi frontend sang nginx phục vụ SPA và proxy `/api`; bổ sung `.dockerignore` để không đưa cấu hình local/secrets vào image.
7. Thêm chế độ API `--migrate-only` chạy EF migration một lần rồi thoát; thêm `/health/live`, `/health/ready` (kiểm tra DB). Không sửa migration đã có.
8. Seed demo chỉ chạy khi cấu hình `Seed:DemoData=true`. Admin chỉ được tạo khi có email/password cấu hình rõ ràng; bỏ giá trị mật khẩu dự phòng trong code. Cấu hình local-staging không seed dữ liệu demo.
9. Tạo Compose và script khởi tạo/deploy/smoke test, sau đó build và chạy stack thực tế.
10. Thêm workflow CD gọi lại CI trước build/publish; job deploy chờ chủ repo chuẩn bị quyền và runner.

Chi tiết kết quả thực nghiệm được cập nhật ở mục 8.

## 2. Đã thêm/cài gì?

- Không cài lại Docker Desktop, .NET, Node hay Python lên Windows trong lần CD này. Docker và Compose đã có sẵn; đã sửa runtime socket để engine hoạt động.
- Docker tự tải base images khi build: .NET SDK/runtime 8.0, Python 3.11-slim, Node 24.20.0-alpine và nginx 1.28-alpine. PostgreSQL dùng `postgres:16-alpine`.
- Phiên bản runtime đọc trực tiếp từ container sau deploy: **PostgreSQL 16.15**, **Python 3.11.18**, **ASP.NET Core/.NET runtime 8.0.33**, **nginx 1.28.3**. Node chỉ có trong giai đoạn build frontend; container phục vụ giao diện chỉ chạy nginx.
- Các gói được cài **bên trong image**: NuGet của backend, requirements Python của AI, npm dependency frontend; `curl` cùng dependency hệ thống trong image .NET để chạy healthcheck. Không phải cài các gói Linux đó vào Windows.
- Công cụ `actionlint` tiếp tục dùng bản 1.7.12 trong `.ci-cache/` đã chuẩn bị khi làm CI. Cấu hình `.github/actionlint.yaml` khai báo nhãn runner tùy chỉnh `futurecv-deploy`.
- Secrets sinh bằng bộ tạo số ngẫu nhiên của .NET; không cài trình quản lý secrets mới.
- Thư mục vận hành mặc định: `.deploy/local-staging/`, được Git bỏ qua. Có `settings.env` (secrets), `compose.yml`, `release-*.env`, `current.env`, `previous.env` sau deploy tiếp theo, khóa deploy và `backups/*.dump`.
- `settings.env` được hạn chế ACL cho tài khoản Windows tạo file và SYSTEM. Nếu sau này runner chạy tài khoản khác, chủ máy phải cấp quyền đọc file cho đúng tài khoản dịch vụ; không cấp quyền rộng cho mọi người.

## 3. Stack chạy thế nào?

Trình duyệt → `http://127.0.0.1:8080` → nginx/frontend. nginx phục vụ SPA kể cả deep link `/login`; `/api/...` và `/health/...` chuyển tới API .NET. API gọi PostgreSQL và AI trong mạng Compose.

- Chỉ frontend publish cổng loopback Windows. DB, AI và API không publish cổng ra host.
- DB có named volume riêng của project `futurecv-local-staging`, không dùng DB hay volume dev đang có.
- AI chạy `ENV=staging`, LLM/embedding `mock` để kiểm tra local không cần khóa provider thật. Kết quả AI chưa đại diện dịch vụ thật.
- Backend chạy `ASPNETCORE_ENVIRONMENT=Staging`; chỉ local HTTP tắt HTTPS redirect. Chưa cấu hình domain/TLS hoặc truy cập LAN/Internet.
- `VITE_API_URL` rỗng được đóng vào bundle lúc build, cho API đi cùng origin. Đổi biến container sau build không thay nội dung bundle Vite.
- App admin, JWT, DB password và internal API key sinh riêng trong settings.env; không in giá trị ra log hoặc đưa vào Git.
- Log container xoay vòng tối đa 3 file, 10 MB/file. Restart policy `unless-stopped` chỉ hiệu lực khi Docker engine đang hoạt động; không làm Windows tự bật hoặc chống sleep.

Email SMTP, Cloudinary và OAuth chưa được cấu hình; các chức năng phụ thuộc chúng cần thiết lập riêng. Data Protection keys mặc định của API chưa có volume bền vững nên token reset mật khẩu có thể mất hiệu lực khi container bị thay; không dùng môi trường này làm production thật.

## 4. Tự chạy lại local

Mở PowerShell 7 tại gốc repo. Docker Desktop phải dùng Linux containers.

```powershell
# Chỉ chạy lần đầu, script từ chối ghi đè secrets đã có:
./deploy/Initialize-Local.ps1

# Build ba image từ mã nguồn hiện tại, backup DB, migrate, up và smoke test:
./deploy/Deploy-Local.ps1 -BuildLocal
```

Lần build đầu cần mạng để tải base images/dependency. Mỗi lần build tạo tag local theo thời điểm, không ghi đè tag cũ. Đây là build thử local từ working tree (có thể chứa thay đổi chưa commit), không phải release GitHub đã qua CI.

Muốn xem tài khoản admin: tự mở `.deploy/local-staging/settings.env`, tìm `ADMIN_EMAIL` và `ADMIN_PASSWORD`. Không gửi ảnh hoặc nội dung file secrets lên chat/GitHub. Thay password trong file không tự đổi password tài khoản đã tồn tại trong DB; đổi bằng chức năng quản lý tài khoản/quy trình reset thích hợp.

Đổi port trước lần deploy đầu bằng tham số `-Port` của script khởi tạo; với cấu hình đã tồn tại, tự sửa `HTTP_PORT` trong settings.env rồi deploy lại. Không đổi DB password đã tạo volume chỉ bằng cách sửa file — biến POSTGRES_PASSWORD khởi tạo không tự đổi password bên trong database đã tồn tại.

## 5. Quy trình deploy bên trong script

1. Xác nhận settings tồn tại, lấy khóa file chống hai lần deploy cùng lúc.
2. Build local hoặc đọc release file có đúng ba tham chiếu GHCR theo digest `sha256`. Không thực thi nội dung file release như mã PowerShell.
3. Copy Compose vào thư mục vận hành; chạy `docker compose config --quiet` để kiểm tra cấu hình mà không in secrets.
4. Nếu từ registry, pull đúng digest. Khởi động/chờ DB và AI khỏe.
5. Chạy `pg_dump -Fc` trong DB rồi copy file backup ra Windows. Backup lỗi thì dừng trước migration.
6. Dừng frontend/backend để bảo trì ngắn, chạy container backend một lần với `--migrate-only`.
7. `docker compose up -d --wait` chờ healthcheck các service.
8. Tạo lại container frontend sau khi backend sẵn sàng để nginx phân giải lại IP backend, kể cả khi digest frontend không đổi. Kiểm tra trang chủ, deep link, nginx, API readiness, API jobs, đăng nhập/phân quyền admin, AI readiness và kết nối backend → AI. Chỉ khi các kiểm tra này đạt mới cập nhật `current.env`, lưu bản trước vào `previous.env`.

Nếu lỗi sau khi đã dừng app/migrate, script báo lỗi và không tự khôi phục DB hay tự hạ schema. Có thể có downtime và DB đã đổi; đọc log rồi xử lý bằng bản tương thích. Không có triển khai zero-downtime trong cấu hình local này.

## 6. Chủ repo cần làm gì để bật CD GitHub sau này?

Workflow `.github/workflows/cd.yml` chạy trên push `master` hoặc thủ công từ `master`:

1. Gọi workflow CI cùng commit, đợi các job đạt.
2. Build Linux amd64 và push ba image với tag full SHA lên GHCR qua `GITHUB_TOKEN` có quyền packages:write. Không cần PAT để publish từ chính repo khi package/repo đã được cấp quyền phù hợp.
3. Lấy digest của từng image, tạo artifact `release-<SHA>` chứa `release.env`; dùng digest đó để deploy, không build lại và không dùng `latest`.
4. Job `deploy-local` chỉ bật khi repository variable `LOCAL_CD_ENABLED=true`; mặc định bỏ qua nên không xếp hàng chờ một runner chưa đăng ký.

Vì bạn chưa có quyền Admin nên **chưa thực hiện các thiết lập dưới đây**:

- Chủ repo xem/merge các thay đổi CI/CD vào `master`, cấp Actions/Packages quyền cần thiết. Package có sẵn từ nguồn khác có thể phải cấp repo quyền write/read package.
- Chuẩn bị runner Windows x64 **riêng, đáng tin cậy**, có PowerShell 7 và truy cập được Docker Linux engine. Không đăng ký runner máy cá nhân chứa dữ liệu nhạy cảm cho repo public; label không ngăn một workflow độc hại chọn runner. Ưu tiên repo private được kiểm soát hoặc runner group/workflow restriction và máy cô lập phù hợp. Các thiết lập bảo vệ phụ thuộc GitHub plan.
- Đăng ký runner nhãn `futurecv-deploy`. Chỉ nhận deploy từ code đã review trên master; PR và build/test tiếp tục chạy trên GitHub-hosted runners.
- Tạo Environment `local-staging`, giới hạn nhánh master và reviewer nếu gói GitHub hỗ trợ. Đây là lớp kiểm soát, không phải sandbox cho runner.
- Chọn thư mục vận hành cố định **ngoài checkout runner**, ví dụ thư mục riêng do chủ máy quản lý, chạy `Initialize-Local.ps1 -DeployDirectory <đường-dẫn>` trên đúng tài khoản Windows. Không tái sử dụng thư mục sẽ bị checkout clean dọn.
- Đặt repository variables `LOCAL_DEPLOY_ROOT=<đường-dẫn-vừa-khởi-tạo>` và `LOCAL_CD_ENABLED=true` sau khi runner, quyền package và secrets local sẵn sàng. Không đặt secrets DB/AI vào repository variables.
- Runner đăng nhập GHCR tạm thời bằng token job, logout trong finally. Secrets ứng dụng ở settings.env trên host, không tải từ PR artifact.

Máy/Internet/Docker phải hoạt động khi job đến. Kết nối outbound của runner không cung cấp URL public cho ứng dụng. Không tự mở firewall/router hoặc tạo tunnel trong công việc này.

## 7. Xem trạng thái, backup và rollback

Từ gốc repo, dùng các đối số giống script:

```powershell
$root = Join-Path $PWD '.deploy/local-staging'
$dc = @('compose','--project-name','futurecv-local-staging',
  '--env-file',"$root/settings.env",'--env-file',"$root/current.env",'-f',"$root/compose.yml")
docker @dc ps
docker @dc logs --tail 80 backend
./deploy/Test-Deployment.ps1 -ComposeArguments $dc
```

Không chạy `docker compose config` không có `--quiet` vào log chia sẻ vì sẽ hiện biến secrets sau nội suy.

Backup nằm tại `$root/backups/*.dump`. Đây là file trên cùng máy, cần thêm bản ngoài máy để chống mất ổ đĩa. Không tự kiểm tra restore bằng cách ghi đè database đang chạy. Script dưới đây restore vào database tên ngẫu nhiên riêng trên cùng PostgreSQL, kiểm tra schema và users rồi xóa đúng database thử trong finally; database ứng dụng được giữ nguyên:

```powershell
$backup = Get-ChildItem "$root/backups/*.dump" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
./deploy/Test-Backup.ps1 -DeployDirectory $root -BackupFile $backup.FullName
```

Chỉ dùng backup sau khi database đã có migration và admin cho bài kiểm tra này. Bản backup đầu tiên trước migration là database rỗng, không đạt điều kiện kiểm tra schema/users của script.

Rollback ứng dụng GHCR (chỉ sau khi xác minh image cũ tương thích schema/config hiện tại):

```powershell
./deploy/Deploy-Local.ps1 -DeployDirectory $root -ReleaseFile "$root/previous.env" -SkipMigration
```

Với bản local được build trên máy, sau khi xác minh schema tương thích và image cũ còn tồn tại, dùng chế độ riêng:

```powershell
./deploy/Deploy-Local.ps1 -DeployDirectory $root -ReleaseFile "$root/previous.env" -AllowLocalImages -SkipMigration
```

`-AllowLocalImages` chỉ nhận tag mẫu `futurecv-<service>:local-YYYYMMDD-HHMMSS`. Job GitHub không truyền tùy chọn này, nên vẫn chỉ nhận digest GHCR. Không tự chạy down migration hoặc `down -v`.

## 8. Kết quả kiểm tra thực tế

- Build Docker thành công cả ba image: `futurecv-backend`, `futurecv-ai`, `futurecv-frontend`, tag local đầu tiên `local-20261101-133946` (mã thời điểm do shell tạo).
- Deploy đầu áp dụng đủ **13 migration** trên PostgreSQL riêng, frontend/API/AI/DB đều healthy. Chỉ frontend bind `127.0.0.1:8080`.
- Smoke HTTP đạt: `/`, `/login`, `/healthz`, `/health/ready`, `/api/jobs`; `/api/jobs` trả JSON chứ không bị SPA fallback trả HTML.
- Deploy lại cùng bộ image: migration báo **No migrations were applied. The database is already up to date.** Backup tạo thành công trước migration; các kiểm tra đạt.
- Đăng nhập admin bằng secrets đã sinh và gọi API `/api/admin/users` có JWT: đạt. Không ghi mật khẩu hoặc token ra log.
- AI readiness và kết nối từ container backend tới AI: đạt. Chưa kiểm chứng suy luận provider thật hoặc upload CV qua các dịch vụ ngoài.
- Backup trước deploy thứ hai có kích thước **83.956 byte**, restore vào database thử độc lập: đọc được 13 migration và 1 user. Database thử đã xóa sau kiểm tra; database ứng dụng không bị restore ghi đè. Bản dump đầu trước khi tạo schema chỉ 821 byte, được giữ để phân biệt rõ.
- Đã diễn tập nhánh rollback `-AllowLocalImages -SkipMigration`, smoke check đạt. Hai release trong bài diễn tập dùng cùng bộ image nên kết quả xác nhận luồng script, không chứng minh mọi bản ứng dụng cũ tương thích schema mới.
- Kiểm tra bổ sung sau khi sửa refresh nginx: deploy lại tạo lại frontend, chờ healthy, toàn bộ smoke check và đăng nhập admin vẫn đạt. Log `.ci-results/cd-local-nginx-refresh.log`.
- Build/test .NET sau thay đổi: **73/73 test đạt**, không skip; báo cáo `.ci-results/backend-cd/cd.trx`. Build có các cảnh báo analyzer, không có lỗi.
- actionlint 1.7.12 kiểm tra cả `ci.yml` và `cd.yml` đạt sau khi khai báo custom label. PowerShell parser không báo lỗi các script; `git diff --check` đạt.
- Chưa push/commit, chưa chạy build/publish GHCR hoặc deploy job trên GitHub do bạn chọn làm local trước. `LOCAL_CD_ENABLED` chưa bật; chưa đăng ký runner.
- npm trong image vẫn báo 8 lỗ hổng dependency như mốc CI; chưa thực hiện nâng dependency hoặc quét image để tuyên bố production-ready. Các tag base images và PostgreSQL chưa pin digest; ba application images khi publish CD được deploy theo digest.

Các file log local (được Git bỏ qua): `.ci-results/cd-local-redeploy.log`, `.ci-results/cd-local-rollback.log`. Thông tin kiểm tra cấu hình không chứa nội dung settings.env.

## 8.1. Danh sách file để bạn review và đưa lên repo

Phần CD gồm `.github/workflows/cd.yml`, `.github/actionlint.yaml`, thêm `workflow_call` vào CI, thư mục `deploy/`, Dockerfile/.dockerignore/nginx và các thay đổi Program/seeder đã mô tả. Phần CI từ lần trước vẫn chưa commit, nên cần review cả hai trước khi đưa lên GitHub.

Từ PowerShell ở gốc repo, sau khi xem diff:

```powershell
$ciCdFiles = @(
  '.github', '.dockerignore', '.gitignore', 'deploy',
  'GITHUB_ACTIONS_CI_GUIDE.md', 'GITHUB_ACTIONS_CD_GUIDE.md',
  'frontend/Dockerfile', 'frontend/.dockerignore', 'frontend/nginx.conf', 'frontend/package.json',
  'backend/Dockerfile', 'backend/global.json', 'backend-ai/.dockerignore',
  'backend/src/FutureCV.Api/Program.cs',
  'backend/src/FutureCV.Infrastructure/Persistence/Seeders/DatabaseSeeder.cs',
  'backend/src/FutureCV.Infrastructure/Persistence/Seeders/RoleSeeder.cs',
  'backend/tests/FutureCV.Domain.Tests/ContractTests/AiMatchingContractTests.cs'
)
git add -- $ciCdFiles
git diff --cached -- $ciCdFiles
git commit --only -m "ci: add checks and local staging delivery" -- $ciCdFiles
git push -u origin codex/github-actions-ci
```

Các lệnh Git trong mục này chưa được thực hiện. Không stage `.deploy/` hoặc đưa settings.env vào PR. File kế hoạch `GITHUB_ACTIONS_CICD_PLAN.md` có sẵn từ trước tiếp tục giữ nguyên ngoài danh sách commit trên.

## 9. Nguồn tham khảo

- https://docs.docker.com/compose/how-tos/startup-order/
- https://docs.github.com/en/actions/reference/security/secure-use
- https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments
- https://github.com/docker/desktop-feedback/issues/460 (workaround socket đã dùng, lỗi có thể tái phát)

## 10. Tích hợp để push lên giao-dien-admin — 01/11/2026

Theo yêu cầu mới của bạn, đích push là `giao-dien-admin`, thay cho việc chỉ giữ nhánh CI local.

1. Kiểm tra trạng thái và fetch `origin/giao-dien-admin`. Nhánh remote đã có commit mới, đầu nhánh là `91ef920`, gồm Jenkins và các thay đổi AI; không force-push hoặc bỏ các commit này.
2. Tạo commit `5e294c4` cho phần GitHub CI/CD đã làm. File kế hoạch `GITHUB_ACTIONS_CICD_PLAN.md` có sẵn không đưa vào commit; bỏ đánh dấu intent-to-add để Git có thể merge, giữ nguyên nội dung file trên máy.
3. Merge remote vào nhánh làm việc, xử lý xung đột Dockerfile/nginx/healthcheck/npm/gitignore. Giữ mã AI mới từ remote, script `test:ci`, các file Jenkins và các endpoint `/health`, `/ready`; đồng thời giữ `/health/live`, `/health/ready` và `--migrate-only` dùng cho CD.
4. Thống nhất build context backend là `backend/` để cả Jenkins và GitHub Actions dùng cùng Dockerfile. Dockerfile copy `global.json` trước restore để chọn đúng SDK. Giữ frontend chạy bằng image nginx unprivileged của nhánh remote, pin Node build 24.20.0 và giữ healthcheck `/healthz`; nginx cũng hỗ trợ `/health` cho luồng Jenkins. Phiên bản nginx trong mục 2 là bản đã đo ở lần deploy trước, chưa phải runtime đã xác nhận của bản sau merge.
5. Bổ sung `deploy/compose.yml` vào phần commit tích hợp; file này phải có trên repo để script deploy hoạt động. Secrets và `.deploy/` vẫn bị Git bỏ qua.
6. Kiểm tra sau merge: frontend typecheck và **28 test đạt**, backend build và **73 test đạt**, AI **600 test đạt**. Lần frontend trong sandbox lỗi loader Vite; chạy ngoài sandbox đạt. actionlint và kiểm tra whitespace đạt.
7. Lần thử build/deploy Docker sau merge dừng ngay ở kiểm tra engine: pipe `dockerDesktopLinuxEngine` không tồn tại. Chưa chạy lại build/nginx smoke cho source sau merge; không lấy kết quả deploy trước merge làm bằng chứng cho image mới. Log: `.ci-results/push-merge-deploy.log`.
8. Hoàn tất merge commit và đẩy `HEAD:refs/heads/giao-dien-admin` bằng push thông thường. Kết quả push được báo trong chat sau khi GitHub xác nhận. Không tự tạo PR hoặc merge master.

Các hướng dẫn “chưa commit/push” ở mục trước ghi lại trạng thái tại mốc dựng local; khi xem bản đã push cần đọc thêm mục này. Workflow hiện kích hoạt CI khi PR vào master hoặc push các nhánh đã khai báo; chỉ push `giao-dien-admin` không tự chạy CD. CD vẫn chạy từ master và job runner vẫn chờ cấu hình quyền như mục 6.
