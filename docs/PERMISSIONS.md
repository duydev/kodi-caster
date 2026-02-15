# Permissions Kodi-Caster

## 1. Tổng quan

Extension Kodi-Caster yêu cầu một số permissions để:

- Quan sát network requests m3u8 trên mọi trang
- Lưu cấu hình Kodi và danh sách stream
- Gửi request tới Kodi server (thường trên mạng local)

---

## 2. Manifest Permissions

### 2.1 Danh sách đầy đủ

```json
{
  "permissions": [
    "webRequest",
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>",
    "http://*/*",
    "https://*/*"
  ]
}
```

### 2.2 Giải thích từng permission

| Permission | Lý do | Ảnh hưởng đến user |
|------------|-------|---------------------|
| `webRequest` | Để đăng ký `chrome.webRequest.onBeforeRequest` và capture các request m3u8 | Chrome hiển thị cảnh báo "Đọc và thay đổi dữ liệu trên tất cả các trang" — nhưng extension chỉ **đọc** (observe), không sửa |
| `storage` | Lưu Kodi config và danh sách stream trong `chrome.storage` | Không cảnh báo đặc biệt |
| `tabs` | Khi capture m3u8, gọi `chrome.tabs.get(tabId)` trong Service Worker để lấy tiêu đề trang và URL trang (`pageTitle`, `pageUrl`) hiển thị trong danh sách stream | Chrome có thể hiển thị "Đọc hoạt động duyệt web của bạn" |
| `host_permissions`: `<all_urls>` | Cần observe request từ **mọi** trang web (streaming sites, video sites...) | Chrome cảnh báo "Đọc và thay đổi dữ liệu trên tất cả các trang" |
| `host_permissions`: `http://*/*`, `https://*/*` | Cho phép gửi `fetch` tới Kodi server (vd: `http://192.168.1.51:8080`) | Cho phép extension gọi API tới bất kỳ host nào |

---

## 3. Chi tiết

### 3.1 webRequest

- **Bắt buộc** để dùng `chrome.webRequest.onBeforeRequest`
- Extension **không** dùng `webRequestBlocking` — chỉ observe, không block/redirect
- Không cần `webRequestAuthProvider` (trừ khi xử lý auth của trang web — không liên quan tới Kodi)

### 3.2 host_permissions

**`<all_urls>`**:

- Cho phép extension "thấy" mọi request từ mọi trang
- `webRequest` chỉ nhận events cho URLs mà extension có host permission
- Để bắt m3u8 từ bất kỳ site nào (YouTube-like, streaming sites...), cần `<all_urls>` hoặc `*://*/*`

**`http://*/*` và `https://*/*`**:

- Cho phép extension gọi `fetch()` tới bất kỳ HTTP/HTTPS endpoint nào
- Cần cho Kodi thường chạy trên `http://192.168.x.x:8080`
- Kodi không dùng HTTPS mặc định

**Tùy chọn thu hẹp** (nếu muốn giảm quyền):

- Chỉ observe: có thể dùng `*://*/*` thay cho `<all_urls>` (tương đương)
- Chỉ Kodi: nếu user luôn dùng IP cố định, có thể bỏ `https://*/*` và chỉ giữ `http://*/*` — nhưng vẫn cần observe từ mọi trang nên `<all_urls>` vẫn cần

---

## 4. Permissions không dùng

| Permission | Lý do không cần |
|------------|-----------------|
| `webRequestBlocking` | Chỉ observe, không block. Blocking cần policy install trong MV3 |
| `activeTab` | Extension dùng `tabs` (full) để Service Worker gọi `chrome.tabs.get(tabId)` khi capture — không chỉ khi popup mở |
| `scripting` | Không inject script vào trang |
| `declarativeNetRequest` | Không block/redirect request |

---

## 5. Cảnh báo khi cài extension

Khi cài Kodi-Caster, Chrome sẽ hiển thị:

- **"Đọc và thay đổi dữ liệu trên tất cả các trang"** — do `webRequest` + `host_permissions`
- User cần chấp nhận để extension hoạt động

**Lưu ý**: Extension không gửi dữ liệu lên server bên thứ ba. Chỉ:

- Đọc URL của các request m3u8
- Lưu trong storage local
- Gửi request tới Kodi server do user tự cấu hình

---

## 6. manifest.json mẫu

```json
{
  "manifest_version": 3,
  "name": "Kodi-Caster",
  "version": "1.0.0",
  "description": "Cast HLS streams (m3u8) to Kodi",
  "permissions": [
    "webRequest",
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>",
    "http://*/*",
    "https://*/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "assets/icons/icon16.png",
      "48": "assets/icons/icon48.png",
      "128": "assets/icons/icon128.png"
    },
    "default_title": "Kodi-Caster"
  },
  "options_page": "options/options.html"
}
```
