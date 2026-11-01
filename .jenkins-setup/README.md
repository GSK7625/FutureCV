# Jenkins Setup — FutureCV CI/CD

Thư mục này chứa toàn bộ cấu hình hạ tầng Jenkins cho dự án FutureCV.

> Cập nhật 26/10/2026: Pipeline hiện tại dùng một Linux agent label `docker`; file `docker-compose.agent.yml` bổ sung agent vào controller hiện có. Xem [runbook CI/CD](../docs/runbook-cicd.md) để tạo node/job và chạy lần đầu. Các trạng thái credential bên dưới là ghi chú từ đợt thiết lập trước, cần xác minh lại trên Jenkins. `secrets/` và `kubeconfig/` đều đã được ignore; CI mock không cần các credential runtime này.

## Thành phần

| File | Vai trò |
|---|---|
| `docker-compose.yml` | Dựng Jenkins controller (LTS) + network `kind`/`jenkins` |
| `create-credentials.groovy` | **Init script** tạo credential tự động (idempotent) |
| `install-kubectl.groovy` | Cài `kubectl` vào `/var/jenkins_home/bin` |
| `connect-kind.ps1` | Nối container Jenkins vào network `kind` của Docker Desktop K8s |
| `dd-api.ps1` | Helper gọi Docker Desktop API qua named pipe |
| `check-dockerhub.groovy` | Verify `dockerhub-creds` có hợp lệ không (chỉ in HTTP status) |
| `kubeconfig/*.yaml` | Kubeconfig 3 môi trường (dev/staging/prod) |
| `secrets/*.txt` | **KHÔNG commit** — nguồn giá trị cho credential |

## Credential store (Global scope)

| ID | Kind | Sinh từ file | Trạng thái |
|---|---|---|---|
| `git-creds` | Username with password | (tạo tay qua UI) | ✅ |
| `dockerhub-creds` | Username with password | `secrets/dockerhub-{username,token}.txt` | ⛔ **placeholder — cần điền thật** |
| `kubeconfig-dev` | Secret file | `kubeconfig/kubeconfig-dev.yaml` | ✅ |
| `kubeconfig-staging` | Secret file | `kubeconfig/kubeconfig-staging.yaml` | ✅ |
| `kubeconfig-prod` | Secret file | `kubeconfig/kubeconfig-prod.yaml` | ✅ |
| `jwt-signing-key` | Secret text | `secrets/jwt-signing-key.txt` | ✅ |
| `internal-api-key` | Secret text | `secrets/internal-api-key.txt` | ✅ (đã rotate) |
| `db-connection-string` | Secret text | `secrets/db-connection-string.txt` | ✅ |
| `gemini-api-key` | Secret text | `secrets/gemini-api-key.txt` | ⛔ **placeholder — cần điền thật** |

## Quy trình thay đổi giá trị secret

1. Sửa file trong `secrets/` (hoặc `kubeconfig/`)
2. Copy sang container:

```powershell
docker cp .jenkins-setup/secrets/. jenkins:/var/jenkins_home/futurecv-secrets/
```

3. Restart Jenkins — init script tự động cập nhật:

```powershell
cd .jenkins-setup
$env:FUTURECV_ROTATE_IDS = "internal-api-key"   # danh sách ID cần ghi đè
docker compose up -d
Remove-Item Env:\FUTURECV_ROTATE_IDS
```

Nếu **không** đặt `FUTURECV_ROTATE_IDS`, init script giữ nguyên giá trị cũ (không ghi đè credential đang tồn tại) → an toàn khi restart nhiều lần.

> Với `docker compose up -d`, các file trong `secrets/` và `kubeconfig/` được mount read-only
> trực tiếp → không cần `docker cp` nữa. `docker cp` chỉ cần khi chạy Jenkins bằng `docker run` thủ công.

## Kiểm tra nhanh

```bash
# Credential đã tạo (chỉ in ID + kind, không lộ giá trị)
docker exec jenkins ls /var/jenkins_home/init.groovy.d/
docker logs jenkins 2>&1 | grep futurecv-creds

# Kết nối K8s
docker exec jenkins bash -c "/var/jenkins_home/bin/kubectl --kubeconfig=/var/jenkins_home/futurecv-kubeconfig/kubeconfig-dev.yaml get ns"
```

## Lưu ý bảo mật

- `secrets/` đã được `.gitignore` — **không** commit giá trị thật.
- `internal-api-key` phải khớp giữa `AiService__ApiKey` (backend .NET) và `INTERNAL_API_KEY` (backend-ai),
  nếu không mọi request matching sẽ trả 401.
- Giá trị cũ `futurecv-demo-local-2026` từng nằm trong git (public repo) → **đã rotate** sang giá trị random 64 ký tự.
- `dockerhub-creds` hiện bị registry từ chối (HTTP 401) → mọi stage `docker push` sẽ fail cho tới khi điền token thật.
