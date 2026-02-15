# Kodi Caster

Chrome Extension giúp bắt các request HLS streaming (`.m3u8`) khi duyệt web và phát trực tiếp lên Kodi.

## Tính năng

- **Tự động bắt m3u8**: Intercept network requests chứa `index.m3u8` hoặc `*.m3u8` trên mọi trang web
- **Danh sách stream**: Hiển thị danh sách có số thứ tự, tiêu đề trang tại thời điểm phát hiện, link stream (mở tab mới), nút Play và nút Xóa từng item; nút "Xóa tất cả". Sắp xếp mới nhất ở cuối.
- **Cast lên Kodi**: Nhấn Play để gửi stream tới Kodi qua JSON-RPC API `Player.Open`
- **Cấu hình Kodi**: Host, port, username, password — lưu trong Options

## Yêu cầu

- Chrome (Manifest V3)
- Kodi với Web Server bật (Settings > Services > Control)

## Cài đặt

1. Clone hoặc tải source
2. Mở `chrome://extensions`, bật **Developer mode**
3. Click **Load unpacked** và chọn thư mục dự án
4. Mở Options (right-click icon) để cấu hình Kodi

## Cấu hình Kodi

- **Host**: IP hoặc domain của máy chạy Kodi (vd: `192.168.1.51`)
- **Port**: Cổng Web Server (mặc định `8080`)
- **Username / Password**: Nếu Kodi bật HTTP authentication

## Sử dụng

1. Mở trang web có video HLS
2. Khi video load, extension tự động ghi nhận URL m3u8
3. Click icon extension → chọn stream → nhấn **Play**
4. Kodi nhận và bắt đầu phát

## Tài liệu

| Tài liệu | Mô tả |
|----------|-------|
| [PROJECT_SPECIFICATION](docs/PROJECT_SPECIFICATION.md) | Đặc tả chức năng, user stories, use cases |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Kiến trúc extension, cấu trúc thư mục, data flow |
| [DATA_MODEL](docs/DATA_MODEL.md) | Interfaces KodiConfig, CapturedStream |
| [API_REFERENCE](docs/API_REFERENCE.md) | Chrome APIs, Kodi JSON-RPC |
| [PERMISSIONS](docs/PERMISSIONS.md) | Giải thích permissions |
| [UI_SPECIFICATION](docs/UI_SPECIFICATION.md) | Popup, Options page layout |
| [DEVELOPMENT_GUIDE](docs/DEVELOPMENT_GUIDE.md) | Setup, debug, checklist |

## API Kodi

Extension gửi request tới Kodi: URL `http://host:port/jsonrpc`, xác thực (nếu có) qua header `Authorization: Basic`.

```bash
POST http://host:port/jsonrpc
Content-Type: application/json
Authorization: Basic <base64(username:password)>   # nếu Kodi bật HTTP auth

{
  "jsonrpc": "2.0",
  "method": "Player.Open",
  "params": {
    "item": {
      "file": "https://example.com/stream/index.m3u8"
    }
  },
  "id": 1
}
```

## License

Dự án được phát hành dưới **MIT License**. Tác giả: **Trần Nhật Duy** (duytn.hcm@gmail.com). Chi tiết xem file [LICENSE](LICENSE).
