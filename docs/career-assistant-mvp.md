# Career Assistant MVP

## Pham vi ban dau

Ung vien dang nhap gui cau hoi, toi da 20 tin nhan truoc do, CV cua minh va Job cong khai tuy chon. Backend lay ngu canh tu database; trinh duyet khong gui truc tiep du lieu CV/Job sang Python. Cau tra loi la van ban, khong render HTML.

## Kien truc

API controller mong -> Application/Features/CareerAssistant (DTO, validator, service, port) -> Infrastructure HTTP adapter -> FastAPI career/chat da co. Application truy cap du lieu qua IApplicationDbContext va tai su dung AiMatchingMapper. Khong them repository, MediatR, database chat hay dich vu trien khai moi.

## Cac moc trien khai

1. Pham vi va kien truc.
2. Hop dong chat va kiem tra serialization.
3. Gioi han cau hoi, lich su va role.
4. HTTP adapter cho Python.
5. Xu ly loi, timeout va cancellation.
6. Use case voi CV thuoc ung vien.
7. Ngu canh Job cong khai.
8. Dang ky DI va endpoint chi danh cho Candidate.
9. Frontend service va gioi han lich su.
10. Trang chat voi trang thai gui/loi.
11. Dieu huong va cau hoi goi y.
12. Tai lieu su dung va kiem tra tong the.

Moi moc co kiem tra tuong ung. Commit dung ngay tac gia theo lich duoc yeu cau (27/8-13/11/2026), ngay committer cung duoc dat theo lich yeu cau. Ca hai moc la metadata duoc dat lai, khong phai thoi diem thuc te tao va day code len GitHub. Cac moc nay duoc trien khai trong cung mot dot; khong phai bang chung cong viec da dien ra vao cac ngay tac gia.

## Kiem tra

- Request rong, qua dai, role system va history qua 20 bi tu choi.
- CV cua nguoi khac, CV da xoa, CV chua phan tich khong duoc gui sang AI.
- Job an, chua duyet, bi cam, het han khong duoc dung lam ngu canh.
- AI loi/timeout tra loi van hanh, khong gia lap cau tra loi thanh cong.
- Dotnet build/test; frontend typecheck/test/build.

## Chua thuoc ban dau

Chua luu chat tren server, streaming, tao tep cover letter, chinh sua CV tu dong, quota theo nguoi dung. Can bo sung quota truoc khi mo tinh nang dung AI tra phi cho cong dong. Nguoi dung tu kiem tra noi dung tu van truoc khi su dung.
