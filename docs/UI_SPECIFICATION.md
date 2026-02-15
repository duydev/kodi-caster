# Đặc tả giao diện Kodi-Caster

## 1. Tổng quan

Extension có 2 màn hình chính:

1. **Popup** — Hiển thị danh sách stream và nút Play
2. **Options Page** — Cấu hình Kodi server

---

## 2. Popup

### 2.1 Kích thước và layout

- Kích thước mặc định: khoảng **400 x 500 px** (có thể scroll nếu nhiều item)
- Layout: Dọc, đơn giản

### 2.2 Wireframe

```
+------------------------------------------+
|  Kodi-Caster                        [⚙]  |
+------------------------------------------+
|  [Xóa tất cả]                             |
|  +------------------------------------+  |
|  | 1.  Tiêu đề trang tại thời điểm bắt  |  |
|  |     [Play] [Xóa]                    |  |
|  |     https://example.com/.../index.m3u8 |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  | 2.  (Không có tiêu đề)  [Play] [Xóa] |  |
|  |     https://cdn.xyz.com/.../index.m3u8 |
|  +------------------------------------+  |
|  ... (mới nhất ở cuối)                   |
+------------------------------------------+
|  [Cài đặt Kodi]                          |
+------------------------------------------+
```

### 2.3 Thành phần

| Thành phần | Mô tả |
|------------|-------|
| Header | Tiêu đề "Kodi-Caster", link Settings (mở Options) |
| Toolbar danh sách | Nút "Xóa tất cả" (chỉ hiện khi có stream) |
| Danh sách stream | Mỗi item: số thứ tự, tiêu đề trang, link stream (click mở tab mới), nút Play, nút Xóa. Sắp xếp cũ nhất trước (mới nhất ở cuối). |
| Empty state | Khi chưa có stream: "Chưa có stream. Mở trang có video HLS trước." |
| Config missing | Khi chưa cấu hình Kodi: "Cần cấu hình Kodi" + link "Cài đặt" |
| Thông báo | Toast khi Play thành công hoặc lỗi |
| Footer | Link "Cài đặt Kodi" (mở Options) |

### 2.4 Chi tiết mỗi stream item

- **Số thứ tự**: 1, 2, 3, … (theo thứ tự cũ → mới, mới nhất ở cuối)
- **Tiêu đề trang**: Tiêu đề trang tại thời điểm phát hiện stream (`pageTitle`). Nếu không có: "(Không có tiêu đề)" hoặc domain từ `pageUrl`
- **Link stream**: URL m3u8 dạng link clickable (rút gọn nếu dài), `target="_blank"`, `title` = full URL
- **Nút Play**: Click để gửi stream tới Kodi
- **Nút Xóa**: Xóa item khỏi danh sách (ghi lại `chrome.storage.session`)

### 2.5 Trạng thái và tương tác

| Trạng thái | Hiển thị |
|------------|----------|
| Đang load | "Đang tải..." |
| Đã load, có stream | Danh sách items + toolbar "Xóa tất cả" |
| Đã load, không có stream | Empty state |
| Play đang gửi | Nút Play disable |
| Play thành công | Toast "Đã gửi tới Kodi" |
| Play lỗi | Toast lỗi (vd: "Không kết nối được Kodi") |
| Xóa một item | Item biến mất, danh sách cập nhật |
| Xóa tất cả | Danh sách trống, hiện empty state |

---

## 3. Options Page

### 3.1 Wireframe

```
+------------------------------------------+
|  Cài đặt Kodi-Caster                     |
+------------------------------------------+
|                                          |
|  Kodi Server                             |
|                                          |
|  Host (IP hoặc domain)                   |
|  +------------------------------------+  |
|  | 192.168.1.51                       |  |
|  +------------------------------------+  |
|                                          |
|  Port                                    |
|  +------------------------------------+  |
|  | 8080                               |  |
|  +------------------------------------+  |
|                                          |
|  Username (tùy chọn)                     |
|  +------------------------------------+  |
|  | kodi                               |  |
|  +------------------------------------+  |
|                                          |
|  Password (tùy chọn)                     |
|  +------------------------------------+  |
|  | ••••••••                           |  |
|  +------------------------------------+  |
|                                          |
|  [Test connection]  [Lưu]                |
|                                          |
|  ℹ Kodi cần bật Web Server trong        |
|    Settings > Services > Control         |
+------------------------------------------+
```

### 3.2 Form fields

| Field | Type | Validation | Default |
|-------|------|------------|---------|
| Host | text | Required, hợp lệ IP/hostname | '' |
| Port | number | 1-65535 | 8080 |
| Username | text | Optional | '' |
| Password | password | Optional | '' |

### 3.3 Buttons

| Button | Hành vi |
|--------|---------|
| **Test connection** | Gửi JSONRPC.Ping (hoặc request đơn giản) tới Kodi, hiển thị thành công/thất bại |
| **Lưu** | Validate → lưu vào storage → thông báo "Đã lưu" |

### 3.4 Helper text

- Giải thích ngắn: Kodi cần bật Web Server (Settings > Services > Control)
- Link tới tài liệu Kodi (tùy chọn)

---

## 4. Styling gợi ý

### 4.1 Popup

- Font: system font stack (Arial, sans-serif)
- Màu chữ: #333
- Nút Play: màu nổi (vd: #1a73e8 hoặc green)
- URL: monospace hoặc font nhỏ, màu #666
- Padding: 12–16px
- Border giữa items: 1px solid #eee

### 4.2 Options

- Form: label trên input, spacing rõ ràng
- Input: border, padding, width 100% (max 400px)
- Buttons: primary (Lưu), secondary (Test)
- Responsive: có thể co giãn theo kích thước trang

### 4.3 Dark mode (tùy chọn)

- Dùng `prefers-color-scheme: dark` để điều chỉnh màu nền và chữ

---

## 5. Accessibility

- Label cho mọi input
- Nút có text rõ ràng hoặc `aria-label`
- Contrast màu đủ để đọc
- Focus visible cho keyboard navigation
