# Hướng dẫn phát triển Kodi-Caster

## 1. Yêu cầu môi trường

### 1.1 Chrome

- Chrome 88+ (Manifest V3)
- Khuyến nghị: Chrome mới nhất

### 1.2 Công cụ phát triển

- Trình soạn thảo (VS Code, Cursor, ...)
- Không bắt buộc Node.js/npm cho phiên bản vanilla JS
- Nếu dùng TypeScript/React: cần Node.js, npm/pnpm

### 1.3 Kodi (để test)

- Kodi với Web Server bật
- Settings > Services > Control > Allow remote control via HTTP
- Port mặc định: 8080
- Có thể set username/password (Web interface)

---

## 2. Cấu trúc dự án

Tham khảo [ARCHITECTURE.md](ARCHITECTURE.md) để biết cấu trúc thư mục và vai trò từng file.

---

## 3. Load extension trong Chrome

### 3.1 Chế độ developer

1. Mở Chrome, vào `chrome://extensions`
2. Bật **Developer mode** (góc trên bên phải)
3. Click **Load unpacked**
4. Chọn thư mục `kodi-caster` (chứa `manifest.json`)

### 3.2 Reload sau khi sửa code

- Click nút **Reload** trên card extension trong `chrome://extensions`
- Hoặc dùng shortcut khi focus vào trang extensions

### 3.3 Pin extension

- Click icon puzzle (Extensions) trên toolbar
- Pin Kodi-Caster để truy cập nhanh popup

---

## 4. Debug

### 4.1 Service Worker

1. Vào `chrome://extensions`
2. Tìm Kodi-Caster, click **Service worker** (link "service worker" hoặc "Inspect views: service worker")
3. DevTools mở → tab Console, Network, v.v.
4. Đặt breakpoint trong `service-worker.js`

**Lưu ý**: Service worker có thể bị terminate khi idle. Reload extension hoặc trigger event (vd: mở popup) để wake.

### 4.2 Popup

1. Click icon extension để mở popup
2. Right-click trong popup → **Inspect**
3. DevTools gắn với popup — có thể mất khi đóng popup
4. Có thể dùng **Inspect views: popup.html** trong trang extensions (mở popup trước rồi vào extensions)

### 4.3 Options Page

1. Right-click icon extension → Options (hoặc mở `chrome-extension://<id>/options/options.html`)
2. Right-click trong trang → **Inspect**

### 4.4 Storage

- DevTools > Application (hoặc Storage) > Extension storage
- Xem `chrome.storage.local` và `chrome.storage.session`
- Có thể sửa/xóa trực tiếp để test

### 4.5 Network

- Trong DevTools của Service Worker: tab Network xem các request tới Kodi
- Kiểm tra request POST `/jsonrpc`, response status và body

---

## 5. Checklist phát triển

### Phase 1: Cơ bản

- [ ] Tạo `manifest.json` (Manifest V3)
- [ ] Tạo Service Worker với webRequest listener
- [ ] Filter URL `*://*/*.m3u8*`, `*://*/*index.m3u8*`
- [ ] Lưu stream vào `chrome.storage.session`
- [ ] Deduplication theo URL + tabId
- [ ] Tạo Popup HTML/CSS/JS cơ bản
- [ ] Hiển thị danh sách stream từ storage
- [ ] Nút Play gửi message tới Service Worker

### Phase 2: Kodi integration

- [ ] Tạo Options page
- [ ] Form host, port, username, password
- [ ] Lưu Kodi config vào `chrome.storage.local`
- [ ] Service Worker xử lý `playToKodi` message
- [ ] Hàm `playToKodi(url, config)` gọi Kodi JSON-RPC
- [ ] Xây URL `http://host:port/jsonrpc` và gửi auth qua header `Authorization: Basic`
- [ ] POST body: `Player.Open` với `item.file`
- [ ] Popup hiển thị success/error

### Phase 3: Polish

- [ ] Empty state khi chưa có stream
- [ ] Thông báo khi chưa cấu hình Kodi
- [ ] Test connection trong Options
- [ ] Validation form Options
- [ ] Icons 16, 48, 128
- [ ] Loading state khi đang Play

### Phase 4: Testing

- [ ] Test trên trang có HLS (vd: demo HLS, streaming site)
- [ ] Test Play tới Kodi thật
- [ ] Test với/sans username, password
- [ ] Test khi Kodi offline → hiển thị lỗi

---

## 6. Test trang HLS mẫu

Một số nguồn để test capture m3u8:

- [HLS.js demo](https://hls-js.netlify.app/demo/) — có stream mẫu
- [Bitmovin HLS test](https://bitmovin.com/demos/stream-test/)
- Bất kỳ trang streaming nào dùng HLS (`.m3u8`)

**Lưu ý**: Một số trang có CORS, DRM — extension chỉ capture URL, không phát. Kodi sẽ fetch trực tiếp từ URL (Kodi cần có thể truy cập URL đó từ mạng của nó).

---

## 7. Build (tùy chọn)

Nếu dùng TypeScript, bundler (webpack, vite):

1. Cài dependencies: `npm install`
2. Build: `npm run build`
3. Output vào thư mục `dist/` hoặc `build/`
4. Load extension từ thư mục output

Cấu trúc build nên giữ nguyên cấu trúc manifest (manifest.json, popup, options, background).

---

## 8. Đóng gói (Publish)

- Zip thư mục extension (không cần `node_modules`, `.git`, `docs` tùy chọn)
- Lên [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) để upload
- Điền metadata, screenshots, mô tả
- Chờ review
