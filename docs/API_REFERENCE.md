# Tham chiếu API Kodi-Caster

## 1. Chrome Extension APIs

### 1.1 chrome.webRequest

**Mục đích**: Observe các request m3u8 để capture URL.

**Permission**: `webRequest` + `host_permissions` (xem [PERMISSIONS.md](PERMISSIONS.md))

#### onBeforeRequest

```javascript
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // details.url, details.tabId, details.initiator, ...
    handleM3u8Request(details);
  },
  { urls: ['*://*/*.m3u8*', '*://*/*index.m3u8*'] }
  // Không dùng ['blocking'] - chỉ observe
);
```

**Details object** (phần liên quan):

| Property | Type | Mô tả |
|----------|------|-------|
| url | string | URL đầy đủ của request |
| tabId | number | ID tab (-1 nếu không liên quan tab) |
| initiator | string | Origin trang gửi request |
| requestId | string | ID request |
| type | string | main_frame, sub_frame, xmlhttprequest, media, other... |

**Lưu ý**: Trong MV3, `webRequestBlocking` không dùng được (chỉ policy extensions). Ở đây chỉ observe, không block/redirect.

---

### 1.2 chrome.storage

**Mục đích**: Lưu Kodi config và danh sách stream.

**Permission**: `storage`

#### chrome.storage.local

- Dùng cho `kodiConfig` (persistent)
- Quota: 10MB (mặc định)

#### chrome.storage.session

- Dùng cho `capturedStreams` (theo session)
- Xóa khi đóng browser / disable extension

```javascript
// Get
const data = await chrome.storage.local.get(['kodiConfig']);
const config = data.kodiConfig;

// Set
await chrome.storage.local.set({ kodiConfig: { host: '192.168.1.51', port: 8080 } });

// Listen changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.kodiConfig) {
    console.log('Kodi config updated', changes.kodiConfig.newValue);
  }
});
```

---

### 1.3 chrome.runtime

**Mục đích**: Giao tiếp giữa Popup và Service Worker.

#### sendMessage (từ Popup)

```javascript
chrome.runtime.sendMessage(
  { action: 'playToKodi', url: 'https://example.com/stream/index.m3u8' },
  (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    console.log(response); // { success: true } hoặc { success: false, error: '...' }
  }
);
```

#### onMessage (trong Service Worker)

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'playToKodi') {
    playToKodi(message.url)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Giữ channel mở cho async response
  }
});
```

---

### 1.4 chrome.action

**Mục đích**: Popup và icon extension.

```json
// manifest.json
{
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "assets/icons/icon16.png",
      "48": "assets/icons/icon48.png",
      "128": "assets/icons/icon128.png"
    },
    "default_title": "Kodi-Caster"
  }
}
```

---

### 1.5 chrome.tabs

**Mục đích**: Khi Service Worker capture request m3u8 (trong `webRequest.onBeforeRequest`), gọi `chrome.tabs.get(tabId)` để lấy tiêu đề trang và URL trang tại thời điểm phát hiện stream, lưu vào `pageTitle` và `pageUrl` của mỗi stream (hiển thị trong popup).

```javascript
// Trong Service Worker, khi đã có tabId từ webRequest details
if (tabId > 0) {
  try {
    const tab = await chrome.tabs.get(tabId);
    newStream.pageTitle = tab.title ?? '';
    newStream.pageUrl = tab.url ?? '';
  } catch (_) {
    newStream.pageTitle = '';
    newStream.pageUrl = '';
  }
}
```

**Permission**: `tabs` (cần khai báo trong manifest để Service Worker gọi `chrome.tabs.get` với bất kỳ tabId nào từ webRequest)

---

## 2. Kodi JSON-RPC API

### 2.1 Endpoint

- **URL**: `http://{host}:{port}/jsonrpc` (không đưa credentials vào URL — Fetch API cấm userinfo trong URL).
- **Xác thực**: Nếu Kodi bật HTTP authentication, gửi qua header `Authorization: Basic <base64(username:password)>`.

**Ví dụ**: URL `http://192.168.1.51:8080/jsonrpc`, credentials gửi qua header `Authorization: Basic a29kaTo5OTk5` (base64 của `kodi:9999`).

### 2.2 Method: Player.Open

**Mục đích**: Bắt đầu phát media từ URL.

#### Request

| Method | POST |
|--------|------|
| URL | `http://host:port/jsonrpc` |
| Headers | `Content-Type: application/json`, `Authorization: Basic <base64>` (nếu có auth) |
| Body | JSON-RPC 2.0 |

**Body mẫu** (từ yêu cầu user):

```json
{
  "jsonrpc": "2.0",
  "method": "Player.Open",
  "params": {
    "item": {
      "file": "https://vip.opstream90.com/20260201/23646_2af209a3/index.m3u8"
    }
  },
  "id": 1
}
```

**Params mở rộng** (tùy chọn):

```json
{
  "item": {
    "file": "<m3u8_url>"
  },
  "options": {
    "repeat": "off"
  }
}
```

- `repeat`: `"one"` | `"all"` | `"off"` | `"cycle"`

#### Response thành công

```json
{
  "id": 1,
  "jsonrpc": "2.0",
  "result": "OK"
}
```

#### Response lỗi

```json
{
  "id": 1,
  "jsonrpc": "2.0",
  "error": {
    "code": -32602,
    "message": "Invalid params"
  }
}
```

### 2.3 Ví dụ gọi từ Extension

```javascript
function buildKodiUrl(config) {
  const { host, port } = config;
  return `http://${host}:${port}/jsonrpc`;
}

function getKodiAuthHeaders(config) {
  const { username, password } = config;
  if (!username || !password) return {};
  const cred = username + ':' + password;
  const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(cred)));
  return { 'Authorization': 'Basic ' + encoded };
}

async function playToKodi(m3u8Url, config) {
  const baseUrl = buildKodiUrl(config);
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getKodiAuthHeaders(config) },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'Player.Open',
      params: {
        item: { file: m3u8Url }
      },
      id: 1
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'Kodi error');
  }

  return { success: true };
}
```

### 2.4 Các method hữu ích khác (Test connection)

- **JSONRPC.Ping**: Kiểm tra Kodi online
  ```json
  { "jsonrpc": "2.0", "method": "JSONRPC.Ping", "id": 1 }
  ```
- **Player.GetActivePlayers**: Lấy player đang active
  ```json
  { "jsonrpc": "2.0", "method": "Player.GetActivePlayers", "id": 1 }
  ```

**Tham chiếu**: [Kodi JSON-RPC API](https://kodi.wiki/view/JSON-RPC_API)

---

## 3. CORS và host_permissions

- Extension **không** chịu CORS khi gọi `fetch` tới URL nằm trong `host_permissions`
- Cần khai báo `http://*/*` và `https://*/*` (hoặc `*://*/*`) để gọi tới Kodi trên mạng local (vd: `http://192.168.1.51:8080`)
- Kodi Web Server mặc định chạy HTTP (không HTTPS)
