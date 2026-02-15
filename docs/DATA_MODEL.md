# Mô hình dữ liệu Kodi-Caster

## 1. Tổng quan

Extension sử dụng `chrome.storage` để lưu:

- **Kodi Config**: Cấu hình server Kodi (host, port, username, password) — lưu persistent
- **Captured Streams**: Danh sách URL m3u8 đã bắt — lưu session hoặc local

---

## 2. KodiConfig

**Storage**: `chrome.storage.local`  
**Key**: `kodiConfig`

### Interface

```typescript
interface KodiConfig {
  host: string;       // Domain hoặc IP (vd: "192.168.1.51", "kodi.local")
  port: number;       // Cổng Web Server (mặc định 8080)
  username?: string;  // Tùy chọn - dùng khi Kodi bật HTTP auth
  password?: string;  // Tùy chọn
}
```

### Giá trị mặc định

```typescript
const DEFAULT_KODI_CONFIG: KodiConfig = {
  host: '',
  port: 8080,
  username: '',
  password: ''
};
```

### Validation

| Field | Ràng buộc |
|-------|-----------|
| host | Không rỗng, hợp lệ (IP hoặc hostname) |
| port | Số nguyên 1-65535 |
| username | Chuỗi, tùy chọn |
| password | Chuỗi, tùy chọn |

### Ví dụ

```json
{
  "host": "192.168.1.51",
  "port": 8080,
  "username": "kodi",
  "password": "9999"
}
```

---

## 3. CapturedStream

**Storage**: `chrome.storage.session` (theo session) hoặc `chrome.storage.local`  
**Key**: `capturedStreams`

### Interface

```typescript
interface CapturedStream {
  id: string;           // Unique ID (vd: uuid hoặc url hash)
  url: string;          // URL đầy đủ của file m3u8
  tabId: number;        // ID tab phát sinh request
  timestamp: number;     // Unix timestamp (ms) khi bắt được
  initiator?: string;   // Trang gốc (initiator từ webRequest details)
  pageUrl?: string;     // URL trang tại thời điểm bắt (từ chrome.tabs.get(tabId))
  pageTitle?: string;   // Tiêu đề trang tại thời điểm bắt (từ chrome.tabs.get(tabId))
}
```

**Lưu ý**: `pageTitle` và `pageUrl` được lấy khi capture bằng `chrome.tabs.get(tabId)` trong Service Worker (cần permission `tabs`). Nếu tab đã đóng hoặc không truy cập được, các field này có thể rỗng.

### Deduplication

Để tránh trùng lặp khi HLS request nhiều lần:

- Cùng `url` + `tabId` trong vòng **60 giây** → chỉ lưu 1 lần
- Hoặc dùng Set/Map theo `url` để loại duplicate trước khi thêm vào mảng

### Giới hạn danh sách

- Giữ tối đa **50–100** items để tránh storage quá lớn
- Khi vượt: xóa items cũ nhất (theo timestamp)

### Ví dụ

```json
[
  {
    "id": "abc123",
    "url": "https://vip.opstream90.com/20260201/23646_2af209a3/index.m3u8",
    "tabId": 12345,
    "timestamp": 1708012345678,
    "initiator": "https://example.com",
    "pageUrl": "https://example.com/watch/123",
    "pageTitle": "Video Title - Example.com"
  }
]
```

---

## 4. Storage Keys tổng hợp

| Key | Type | Storage | Mô tả |
|-----|------|---------|-------|
| `kodiConfig` | `KodiConfig` | local | Cấu hình Kodi server |
| `capturedStreams` | `CapturedStream[]` | session hoặc local | Danh sách stream đã bắt |

---

## 5. Đọc / Ghi

### Đọc Kodi config

```javascript
const { kodiConfig } = await chrome.storage.local.get('kodiConfig');
const config = kodiConfig ?? DEFAULT_KODI_CONFIG;
```

### Ghi Kodi config

```javascript
await chrome.storage.local.set({
  kodiConfig: {
    host: '192.168.1.51',
    port: 8080,
    username: 'kodi',
    password: '9999'
  }
});
```

### Đọc danh sách stream

```javascript
const { capturedStreams } = await chrome.storage.session.get('capturedStreams');
const streams = capturedStreams ?? [];
// Sắp xếp cũ nhất trước (mới nhất ở cuối danh sách)
streams.sort((a, b) => a.timestamp - b.timestamp);
```

### Thêm stream mới (với dedup)

```javascript
async function addCapturedStream(stream) {
  const { capturedStreams = [] } = await chrome.storage.session.get('capturedStreams');
  const now = Date.now();
  const DEDUP_MS = 60000; // 60 giây

  const exists = capturedStreams.some(
    s => s.url === stream.url && s.tabId === stream.tabId && (now - s.timestamp) < DEDUP_MS
  );
  if (exists) return;

  const newStream = {
    ...stream,
    id: crypto.randomUUID(),
    timestamp: now
  };

  const updated = [newStream, ...capturedStreams].slice(0, 100);
  await chrome.storage.session.set({ capturedStreams: updated });
}
```

---

## 6. Lựa chọn storage session vs local

| Tiêu chí | session | local |
|----------|---------|-------|
| Persist khi đóng browser | Không | Có |
| Giới hạn | ~10MB | ~10MB (có thể unlimitedStorage) |
| Use case | Danh sách stream theo phiên | Lưu lâu, xem lại sau |

**Đề xuất**: Dùng `chrome.storage.session` cho `capturedStreams` — mỗi phiên trình duyệt có danh sách riêng, không tích lũy lâu dài.
