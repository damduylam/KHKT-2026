# Vefiti — Cảnh Giác

Website tuyên truyền nhận diện dấu hiệu lừa đảo tuyển dụng/làm thêm và cờ bạc mạng. Đây là bản dự thi; không thay thế tư vấn của ngân hàng, cơ quan chức năng hoặc chuyên gia pháp lý.

## Chạy website

1. Mở Terminal tại `d:\KHKT-2026\backend`.
2. Cài thư viện (chỉ cần làm một lần):
   ```powershell
   npm.cmd install
   ```
3. Chạy:
   ```powershell
   npm.cmd start
   ```
4. Mở `http://localhost:3000` trong trình duyệt.

Frontend ở `index.html`, backend ở `backend\server.js`.

## Chạy chỉ giao diện

Có thể mở trực tiếp `index.html` để xem nội dung và quiz. Phân tích AI cần backend đang chạy tại `http://localhost:3000`; nếu không kết nối được, trang sẽ báo lỗi thay vì hiển thị kết quả giả.

## Cấu hình Gemini

- Tạo `backend\.env` theo mẫu `backend\.env.example`. Nếu `.env` đã có, chỉ thêm biến còn thiếu, không ghi đè API key hiện tại.
- Điền một đến ba key lần lượt vào `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`. Nên dùng key thuộc các Google project khác nhau vì key cùng project có thể dùng chung quota.
- Chọn model theo từng key bằng `GEMINI_MODEL_1`, `GEMINI_MODEL_2`, `GEMINI_MODEL_3`. Mặc định lần lượt là `gemini-4-argon`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`.
- Có thể giữ biến `GEMINI_API_KEY` cũ; backend dùng nó làm key chính nếu `GEMINI_API_KEY_1` chưa được đặt.
- Khi đưa backend lên host, đặt `ALLOWED_ORIGINS` thành danh sách origin chính xác, phân tách bằng dấu phẩy; ví dụ domain Netlify và domain local. Không nhập đường dẫn hay dấu `/` cuối.
- Backend chạy luật nguy hiểm chắc chắn trước; trường hợp còn lại gọi model/key theo thứ tự. Chuyển sang cấu hình tiếp theo nếu key/model không khả dụng (`401`, `403`, `404`), hết quota (`429`), lỗi máy chủ `5xx` hoặc phản hồi JSON sai cấu trúc.
- Ảnh được gửi trực tiếp tới Gemini vision; backend không lưu ảnh ra ổ đĩa.

## Chỗ bắt buộc thay trước khi nộp

- `[Tên nhóm]`, `[Tên trường]`, `[email@...]` trong phần Về chúng tôi.
- Các mục `[Nguồn: ...]`, `[điền link chính thức đã xác minh]`, số điện thoại/địa chỉ hỗ trợ.
- Ba tin mẫu đầu mảng `TIN_TUC` trong `index.html`; thay bằng bài thật đã kiểm chứng.
- Hotline hiện vẫn là placeholder; chỉ thêm số sau khi xác minh nguồn chính thức.

## Xuất bản

- Netlify chỉ host `index.html`; cần deploy backend Express riêng rồi đổi `API_URL` trong `index.html` thành URL `/api/analyze` công khai của backend.
- Thêm origin Netlify vào `ALLOWED_ORIGINS` trên host backend và cấu hình Gemini keys trong environment variables. Không đưa key lên frontend/GitHub.