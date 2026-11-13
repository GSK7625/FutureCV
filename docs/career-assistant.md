# Career Assistant ban dau

## Su dung

1. Chay PostgreSQL, backend .NET, backend-ai va frontend theo tai lieu tung thanh phan.
2. Dat `AiService:BaseUrl` cua backend toi Python, vi du `http://127.0.0.1:8000`.
3. Dat `AiService:ApiKey` trung voi `INTERNAL_API_KEY` trong backend-ai. Khong dua khoa noi bo vao frontend.
4. Dang nhap bang tai khoan Candidate, mo menu ca nhan -> Tro ly nghe nghiep AI, hoac `/candidate/career-assistant`.
5. Chon CV da phan tich, Job tuy chon, nhap cau hoi. Co the hoi tu van chung khi khong chon CV.
6. Tu trang chi tiet Job, chon lien ket hoi tro ly AI de mang Job do sang trang chat.

`LLM_PROVIDER=mock` chi tao phan hoi mo phong de thu luong tich hop. Muon tu van bang mo hinh that, cau hinh provider va API key o backend-ai theo huong dan cua dich vu; chi phi phat sinh theo provider. Chua xac minh tu van bang provider tra phi trong dot trien khai nay.

## Hop dong API

`POST /api/candidate/career-assistant/chat`, JWT role `Candidate`.

```json
{
  "message": "Toi nen cai thien CV nhu the nao?",
  "history": [],
  "cvId": null,
  "jobId": null
}
```

Phan hoi thanh cong:

```json
{
  "reply": "Noi dung tu van",
  "suggestedFollowups": ["Toi nen bo sung ky nang gi?"]
}
```

- Cau hoi va moi tin nhan toi da 4000 ky tu; history toi da 20 tin nhan, role chi `user` hoac `assistant`.
- Frontend gui 20 tin gan nhat; noi dung moi tin trong history duoc gioi han 4000 ky tu. Python career hien chi dua 10 tin gan nhat vao prompt.
- Frontend giu toi da 40 tin hien thi trong bo nho trang; doi CV/Job se xoa cuoc tro chuyen. Cau hoi loi duoc giu lai de gui lai. Tai lai trang se mat lich su.
- `cvId` phai thuoc ung vien hien tai, chua bi xoa, co trang thai `Parsed` va du lieu parser hop le. Ten, email va so dien thoai o cac truong danh tinh duoc bo truoc khi gui ngu canh CV sang Python.
- Ngu canh CV chi gom summary, skills va dates/years kinh nghiem theo dung cac truong Python career su dung. Khong gui toan bo PDF, thong tin lien he hay ho so ung vien khac.
- Job phai cong khai, da duyet, dang mo, chua het han va khong bi cam/xoa. Noi dung CV/Job vuot gioi han Python bi tu choi voi thong bao de nguoi dung doi ngu canh.
- History la noi dung client cung cap, khong duoc dung lam chung cu hay cap quyen. Quyen CV/Job luon duoc backend kiem tra lai.
- Loi input tra 400, ngu canh khong ton tai tra 404, CV chua san sang tra 409; loi AI duoc map theo `ServiceResult` hien tai thanh 500. Khong tra noi dung loi noi bo cua upstream.

## Kien truc

```text
React route -> CareerAssistantPage -> careerAssistantService -> fetcher
ASP.NET controller -> ICareerAssistantService -> IApplicationDbContext
                                            -> ICareerAssistantClient
Infrastructure HTTP adapter -> FastAPI /api/v1/career/chat
```

Module nam trong Application/Features/CareerAssistant. Controller chi lay danh tinh tu JWT va map ket qua; Application dieu phoi use case va kiem tra quyen; Infrastructure giu HTTP/configuration. Domain khong them dependency. Python AI la dich vu tinh toan da co cua he thong; khong tach them microservice nghiep vu. Khong thay doi schema hay tao migration.

## Pham vi con lai

- Chua luu/quan ly lich su tren server, streaming, quota theo nguoi dung.
- Chua co thao tac ap dung goi y vao CV, xuat cover letter thanh tep hoac tu dong gui thu.
- Lua chon Job tren trang chat hien gioi han 20 tin moi nhat; co the mang Job khac vao bang lien ket tu trang chi tiet. Chua co tim kiem Job rieng trong chat.
- Chua gui MatchResult vao chat; chat dung CV va JD, khong tu nhan da co diem matching.
- Ket qua AI la tu van, can kiem tra lai; khong tu dong sua CV hoac ra quyet dinh tuyen dung.
- Can bo sung quota/gioi han chi phi truoc khi mo provider tra phi cho cong dong. Ban dau phuc vu local va review tren nhanh rieng.

## Kiem tra da chay

- Backend build va toan bo 109 test: dat (32 test moi so voi baseline 77).
- Frontend typecheck, 30 test va production build: dat.
- Browser voi API mo phong: gui chat, history, cau hoi goi y, doi CV xoa ngu canh, giu cau hoi khi loi, render van ban khong thuc thi HTML, man hinh mobile 390px: dat.
- Ra soat rieng ve kien truc va quyen truy cap: da sua truong hop Candidate bi xoa va ngu canh vuot gioi han Python.

Chua chay luong that qua PostgreSQL -> .NET -> Python -> provider tra phi. Cac test browser dung phan hoi API mo phong, khong chung minh chat that hoat dong voi cau hinh cua moi may.

## Ngay commit

14 commit tren nhanh nay duoc tao trong dot lam viec hien tai. Ngay tac gia va ngay committer deu duoc dat theo lich yeu cau tu 27/8 den 13/11/2026, moi tuan 1-2 commit. Day la ngay metadata duoc dat lai, khong phai thoi diem thuc te tao va day code len GitHub. Nhanh bat dau tu master hien tai, khong phai snapshot cua repo vao ngay 27/8. Khong viet lai lich su master.
