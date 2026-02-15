# Đặc tả dự án Kodi-Caster

## 1. Tổng quan

**Kodi-Caster** là Chrome Extension cho phép người dùng:

1. Tự động bắt các request HLS streaming (`index.m3u8` hoặc `*.m3u8`) khi duyệt web
2. Hiển thị danh sách stream đã bắt với nút Play
3. Phát stream trực tiếp lên Kodi server khi nhấn Play

Extension hoạt động hoàn toàn thụ động: không block hay redirect request, chỉ observe và ghi nhận URL để người dùng chọn phát lên Kodi.

---

## 2. User Stories

| ID | User Story | Chấp nhận khi |
|----|------------|---------------|
| US1 | Là người dùng, tôi muốn extension tự động ghi nhận mọi request m3u8 trên trang web đang xem | Mở trang có video HLS, extension bắt được URL m3u8 và thêm vào danh sách |
| US2 | Là người dùng, tôi muốn xem danh sách các stream đã bắt được | Mở popup extension thấy danh sách URL m3u8 kèm nút Play |
| US3 | Là người dùng, tôi muốn cấu hình thông tin Kodi server (host, port, username, password) | Có trang Options để nhập và lưu cấu hình |
| US4 | Là người dùng, tôi muốn nhấn Play để phát stream lên Kodi | Kodi nhận request và bắt đầu phát stream |
| US5 | Là người dùng, tôi muốn biết kết quả khi phát thành công hoặc thất bại | Popup hiển thị thông báo success/error sau khi gọi Kodi |

---

## 3. Yêu cầu chức năng

### FC1: Bắt request m3u8

- **Mô tả**: Intercept và ghi nhận các request có URL chứa `index.m3u8` hoặc kết thúc bằng `.m3u8`
- **Kỹ thuật**: Sử dụng `chrome.webRequest.onBeforeRequest` với filter URL pattern
- **Pattern gợi ý**: `*://*/*index.m3u8*`, `*://*/*.m3u8`
- **Không blocking**: Request vẫn thực hiện bình thường, trang web không bị ảnh hưởng

### FC2: Lưu danh sách stream đã bắt

- **Mô tả**: Lưu URL m3u8 kèm metadata (tabId, timestamp, initiator, pageTitle, pageUrl) vào storage
- **Metadata từ tab**: Khi capture, gọi `chrome.tabs.get(tabId)` để lấy `pageTitle` và `pageUrl` (cần permission `tabs`)
- **Storage**: `chrome.storage.session` (theo session) hoặc `chrome.storage.local` (persistent)
- **Deduplication**: Loại bỏ trùng lặp theo URL + tabId trong khoảng thời gian ngắn (HLS có thể request nhiều lần)

### FC3: Hiển thị danh sách kèm nút Play và quản lý

- **Mô tả**: Popup hiển thị danh sách stream đã bắt với thông tin chi tiết, mỗi item có nút Play và nút Xóa
- **Sắp xếp**: Cũ nhất trước, mới nhất ở cuối
- **Thông tin hiển thị**: Số thứ tự (1, 2, 3, …), tiêu đề trang tại thời điểm phát hiện, link stream (URL m3u8 dạng link clickable)
- **Nút Xóa**: Xóa từng item khỏi danh sách
- **Nút "Xóa tất cả"**: Xóa toàn bộ danh sách (chỉ hiện khi có stream)

### FC4: Cấu hình Kodi server

- **Mô tả**: Trang Options cho phép cấu hình:
  - Host (domain hoặc IP)
  - Port (mặc định 8080)
  - Username (tùy chọn)
  - Password (tùy chọn)
- **Lưu trữ**: `chrome.storage.local`
- **Validation**: Kiểm tra host và port hợp lệ trước khi lưu

### FC5: Gửi Player.Open tới Kodi khi nhấn Play

- **Mô tả**: Khi nhấn Play, gửi POST request tới Kodi JSON-RPC API
- **Endpoint**: `http://{host}:{port}/jsonrpc`, credentials gửi qua header `Authorization: Basic` (Fetch API không cho phép credentials trong URL)
- **Body**: JSON-RPC 2.0 với method `Player.Open`, params `{ item: { file: "<m3u8_url>" } }`
- **Headers**: `Content-Type: application/json`
- **Xử lý lỗi**: Hiển thị thông báo nếu Kodi không phản hồi hoặc trả lỗi

---

## 4. Yêu cầu phi chức năng

### NFR1: Tương thích Chrome Manifest V3

- Sử dụng `manifest_version: 3`
- Service Worker thay cho Background Page
- Không dùng `webRequestBlocking` (chỉ dùng webRequest để observe)

### NFR2: Không can thiệp vào request

- Extension chỉ observe, không block, redirect hay modify request
- Video trên trang web phát bình thường

### NFR3: UI đơn giản, responsive

- Popup nhỏ gọn, dễ đọc danh sách
- Options page form rõ ràng
- Có thể mở rộng cho dark/light theme (tùy chọn)

### NFR4: Bảo mật

- Mật khẩu Kodi lưu trong `chrome.storage.local` (local only, không sync)
- Không gửi dữ liệu ra bên ngoài ngoài Kodi server do user cấu hình

---

## 5. Use Cases chi tiết

### UC1: Người dùng xem video HLS trên web và muốn cast lên Kodi

**Precondition**: Extension đã cài, Kodi đã cấu hình, Kodi đang chạy và có Web Server bật.

**Flow**:
1. User mở trang web có video HLS (ví dụ: streaming site)
2. Video bắt đầu load, trình duyệt request `index.m3u8` hoặc `*.m3u8`
3. Extension bắt request qua webRequest, lưu URL vào storage
4. User click icon extension, popup mở ra
5. User thấy danh sách stream đã bắt
6. User click nút Play bên cạnh URL muốn phát
7. Extension gửi POST tới Kodi JSON-RPC
8. Kodi nhận và bắt đầu phát stream
9. Popup hiển thị "Đã gửi tới Kodi" hoặc thông báo lỗi nếu thất bại

**Postcondition**: Kodi đang phát stream từ URL đã chọn.

### UC2: Người dùng cấu hình Kodi lần đầu

**Precondition**: Extension đã cài, chưa cấu hình Kodi.

**Flow**:
1. User click icon extension → popup mở
2. Popup hiển thị thông báo "Chưa cấu hình Kodi" và link "Cài đặt"
3. User click "Cài đặt" → mở Options page
4. User nhập host (ví dụ: 192.168.1.51), port (8080), username, password
5. User click "Lưu" hoặc "Test connection"
6. Nếu Test: extension gửi request thử, hiển thị kết quả
7. Cấu hình được lưu vào storage

**Postcondition**: Kodi config đã sẵn sàng cho lần Play tiếp theo.

### UC3: Không có stream nào được bắt

**Flow**:
1. User mở popup khi chưa truy cập trang nào có HLS
2. Popup hiển thị "Chưa có stream nào. Hãy mở trang có video HLS trước."
3. Có thể có nút hoặc link mở trang web thường dùng để test (tùy chọn)

---

## 6. Ngoài phạm vi (Out of Scope)

- Hỗ trợ DASH, Smooth Streaming hay format khác ngoài HLS (.m3u8)
- Tự động phát stream khi bắt được (luôn cần user click Play)
- Điều khiển Kodi ngoài Player.Open (pause, stop, volume...)
- Phát trên nhiều Kodi server đồng thời
- Extension cho trình duyệt khác (Firefox, Edge...) trong phiên bản đầu
