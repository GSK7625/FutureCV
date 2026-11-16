# FutureCV

FutureCV la nen tang tuyen dung va quan ly CV, gom giao dien web, backend nghiep vu va dich vu AI ho tro phan tich CV, so khop viec lam, xep hang ung vien.

## Chuc nang chinh

- Ung vien: tim viec, tao va quan ly CV, nop don, luu viec lam va theo doi ho so.
- Nha tuyen dung: quan ly cong ty, tin tuyen dung, ho so ung tuyen va pipeline tuyen dung.
- Quan tri vien: quan ly nguoi dung, cong ty, tin tuyen dung va nhat ky hoat dong.
- AI: phan tich CV PDF, tinh do phu hop voi cong viec va xep hang ung vien.

Mot so man hinh van dang duoc hoan thien. Xem [cac API HR con thieu](frontend/Docs/HR_MISSING_APIS.md) va doi chieu ma nguon hien tai truoc khi trien khai them.

## Kien truc va thu muc

```text
Trinh duyet -> React -> ASP.NET Core -> PostgreSQL
                                   -> FastAPI -> AI provider hoac mock
```

Frontend chi goi backend ASP.NET Core. Dich vu FastAPI xu ly AI, khong ket noi truc tiep database.

| Thu muc | Noi dung |
| --- | --- |
| `frontend/` | React 19, React Router 8, TypeScript, Tailwind CSS 4 |
| `backend/` | ASP.NET Core .NET 8, Entity Framework Core, PostgreSQL |
| `backend-ai/` | Python, FastAPI, phan tich CV va matching |
| `deploy/` | Script va Docker Compose cho local staging |
| `.github/workflows/` | GitHub Actions CI/CD |
| `docs/` | Tai lieu van hanh |

## Yeu cau moi truong

- Git.
- Node.js 24.x va npm; CI hien dung Node.js 24.20.0.
- .NET SDK 8.0.
- Python 3.11 hoac 3.12; CI hien dung Python 3.11.
- PostgreSQL 15 tro len, dang chay va co tai khoan tao/cap nhat bang.
- Docker chi can neu su dung quy trinh local staging trong tai lieu trien khai.

Cac lenh duoi day dung PowerShell. Mo terminal rieng cho AI, backend va frontend de giu ca ba dich vu cung chay.

## 1. Tai ma nguon

```powershell
git clone https://github.com/GSK7625/FutureCV.git
cd FutureCV
```

Neu da co repo, su dung thu muc hien tai. Cac buoc tiep theo deu bat dau tu thu muc goc `FutureCV`.

## 2. Chay dich vu AI

```powershell
cd backend-ai
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Neu da co `.env`, giu lai va chinh sua file do thay vi sao chep de len.

Trong `backend-ai/.env`, dung cau hinh local sau:

```dotenv
ENV=development
LLM_PROVIDER=mock
EMBEDDING_PROVIDER=mock
MATCHING_ALGORITHM=matching-v0
INTERNAL_API_KEY=THAY_BANG_KHOA_NOI_BO_LOCAL_CUA_BAN
```

Thay gia tri `INTERNAL_API_KEY` bang khoa rieng va dung cung gia tri cho `AiService:ApiKey` cua backend. Che do mock khong can API key cua nha cung cap AI; ket qua mo phong chi phuc vu phat trien/demo, khong dai dien chat luong AI that.

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Kiem tra: [AI readiness](http://127.0.0.1:8000/ready), [AI Swagger](http://127.0.0.1:8000/docs).

## 3. Cau hinh va chay backend

Tao database local rieng ten `future_cv_db` bang pgAdmin hoac cong cu PostgreSQL. Ghi lai host, port, username va password cua ban.

Trong terminal moi, tu thu muc goc:

```powershell
cd backend
Copy-Item src/FutureCV.Api/appsettings.Development.json.example src/FutureCV.Api/appsettings.Development.json
```

Neu file dich da ton tai, chinh sua file hien co. Thay noi dung file local bang cau hinh sau va dien tat ca gia tri `THAY_...`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=future_cv_db;Username=THAY_USER_POSTGRES;Password=THAY_PASSWORD_POSTGRES"
  },
  "Jwt": {
    "Key": "THAY_BANG_CHUOI_NGAU_NHIEN_RIENG_IT_NHAT_32_KY_TU",
    "Issuer": "FutureCV",
    "Audience": "FutureCV",
    "AccessTokenExpiryMinutes": 15,
    "RefreshTokenExpiryDays": 7
  },
  "FrontendUrl": "http://localhost:5173",
  "AiService": {
    "BaseUrl": "http://127.0.0.1:8000",
    "ApiKey": "THAY_BANG_KHOA_NOI_BO_LOCAL_CUA_BAN",
    "TimeoutSeconds": 90
  },
  "SuperAdmin": {
    "Email": "admin@example.test",
    "Password": "THAY_BANG_MAT_KHAU_ADMIN_RIENG"
  },
  "Seed": {
    "DemoData": false
  },
  "Http": {
    "RedirectToHttps": false
  }
}
```

- Mat khau admin phai co chu hoa, chu thuong, chu so va it nhat 6 ky tu theo cau hinh Identity hien tai; nen dung mat khau rieng dai hon.
- Khong dung nguyen cac gia tri mau lam bi mat that.
- Cau hinh tren chi danh cho local HTTP. Moi truong public can cau hinh HTTPS va bi mat rieng.
- SMTP, Google OAuth va Cloudinary can cau hinh rieng neu muon gui email, dang nhap Google hoac upload tep/anh. Xem cac muc tuong ung trong file cau hinh mau; khong mac dinh cac luong nay hoat dong voi cau hinh toi thieu.

Restore, tao/cap nhat schema va chay API:

```powershell
dotnet restore FutureCV.sln
dotnet run --project src/FutureCV.Api --launch-profile http -- --migrate-only
dotnet run --project src/FutureCV.Api --launch-profile http
```

Lenh `--migrate-only` ap dung migration roi thoat. Khi chay API binh thuong, backend seed role, admin da cau hinh va du lieu danh muc.

Kiem tra: [Backend readiness](http://localhost:5000/health/ready), [Backend Swagger](http://localhost:5000/swagger).

## 4. Chay frontend

Trong terminal moi, tu thu muc goc:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
```

Giu lai file `.env` hien co neu da cau hinh. Noi dung can dung:

```dotenv
VITE_API_URL=http://localhost:5000
VITE_USE_MOCK=false
```

`VITE_API_URL` la bien duoc `app/lib/fetcher.ts` doc; khong them `/api` vao cuoi URL vi cac service da khai bao duong dan API.

```powershell
npm run dev -- --host localhost --port 5173 --strictPort
```

Mo [FutureCV](http://localhost:5173). Khoi dong lai frontend sau khi doi bien moi truong.

## 5. Du lieu va tai khoan demo local

Chi thuc hien tren database local rieng khong chua du lieu that. Dung backend dang chay bang `Ctrl+C`, sau do tai thu muc `backend/`:

```powershell
dotnet run --project src/FutureCV.Api --launch-profile http -- --seed-demo-data
dotnet run --project src/FutureCV.Api --launch-profile http
```

Lenh seed ap dung migration, them du lieu demo roi thoat. Du lieu gom cong ty, nha tuyen dung, ung vien, CV, viec lam va ho so ung tuyen. Seeder co the cap nhat du lieu mau da ton tai; khong chay tren database production.

| Vai tro | Tai khoan | Mat khau | Trang dang nhap |
| --- | --- | --- | --- |
| Ung vien demo | `nam.tranduc@gmail.com` | `Candidate@123456` | `/login` |
| Nha tuyen dung demo | `recruiter@fpt.com` | `Recruiter@123456` | `/login-employer` |
| Quan tri local | Email trong `SuperAdmin:Email` | Mat khau rieng trong `SuperAdmin:Password` | `/login-admin` |

Tai khoan ung vien va nha tuyen dung tren la du lieu co san trong `DemoDataSeeder.cs`, chi dung dang nhap vao ung dung local; khong dung de dang nhap dich vu email hay gui thu den cac dia chi nay. Khong cong khai ban demo su dung mat khau mac dinh.

Tai khoan da ton tai khong duoc dam bao dat lai mat khau khi seed lai. Dung database demo moi neu can kiem tra du lieu mau tu dau. Mot so link PDF/anh trong du lieu seed la link mau, khong dam bao tai duoc; upload CV PDF thu nghiem cua ban can cau hinh luu tru tep.

## 6. Kiem tra du an

Chay trong tung thu muc tuong ung:

```powershell
# frontend/
npm run typecheck
npm test
npm run build

# backend/
dotnet build FutureCV.sln
dotnet test FutureCV.sln

# backend-ai/
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest tests --tb=short -q
```

GitHub Actions CI cung kiem tra ca ba thanh phan. Xem [huong dan CI](GITHUB_ACTIONS_CI_GUIDE.md).

## Xu ly loi thuong gap

| Hien tuong | Kiem tra |
| --- | --- |
| Backend khong ket noi database | PostgreSQL da chay, database da tao, connection string dung va user co quyen |
| Loi thieu bang | Chay `--migrate-only` truoc khi khoi dong API |
| Frontend khong goi duoc API | Backend o cong 5000, `VITE_API_URL` dung, khoi dong lai frontend sau khi sua `.env` |
| AI bao loi xac thuc noi bo | `INTERNAL_API_KEY` va `AiService:ApiKey` phai giong nhau |
| Khong dang nhap duoc tai khoan demo | Da seed dung database, dung trang dang nhap va tai khoan chua bi doi mat khau |
| Gui email, Google login hoac upload that bi loi | Dien cau hinh SMTP, GoogleAuth hoac Cloudinary tuong ung |
| Cong 5000, 5173 hoac 8000 da duoc dung | Dung dich vu trung cong hoac doi cong va cap nhat URL lien quan |

## Bao ve cau hinh local

Khong commit `.env`, `appsettings.Development.json`, mat khau, token hay API key. Khong dua bi mat vao bien `VITE_*` vi chung duoc dong goi vao frontend. Khong dung CV va thong tin ca nhan that cho du lieu demo cong khai.

## Tai lieu lien quan

- [Backend .NET](backend/README.md)
- [Backend AI](backend-ai/README.md)
- [Frontend](frontend/README.md)
- [Luong chuc nang giao dien](frontend/Docs/PROJECT_FLOW_MAP.md)
- [Van hanh CI/CD va local staging](docs/runbook-cicd.md)
- [GitHub Actions CD](GITHUB_ACTIONS_CD_GUIDE.md)

README nay tap trung vao chay local tu ma nguon. Quy trinh local staging dung Docker image va file release rieng duoc mo ta trong runbook.
