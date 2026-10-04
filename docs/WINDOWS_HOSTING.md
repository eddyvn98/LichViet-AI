# Windows 11 Pro personal hosting

## Runtime profile

- Host: one personal Windows 11 Pro machine.
- Runtime: PowerShell/terminal, no Docker.
- App: Node.js local server.
- AI provider: Gemini CLI only.
- Model: gemini-3.8-flash.
- Authentication: Sign in with Google (OAuth) in Gemini CLI.
- No OpenAI, Claude, OpenRouter, Gemini API key, Vertex API or other AI fallback.

## First setup

Open PowerShell in the repository and run:

    Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
    .\scripts\setup-windows.ps1

Then authenticate once:

    gemini

Choose **Sign in with Google** and complete the browser flow.

## Start

    .\scripts\start-windows.ps1

Open:

    http://localhost:3000

The start script forces AI_ENABLED=true and GEMINI_MODEL=gemini-3.8-flash, and removes GEMINI_API_KEY / GOOGLE_API_KEY from the process environment.

## Autostart after Windows login

Run as the same Windows user that authenticated Gemini:

    .\scripts\register-startup-task.ps1

The OAuth cache belongs to the Windows user profile, so the scheduled task should run under that same user.

## AI execution flow

Browser -> deterministic LichViet engine -> /api/ai/explain or /api/ai/brief -> local Node process -> Gemini CLI headless -> cached Google OAuth -> gemini-3.8-flash -> text response.

The browser never supplies authoritative calendar context. The server rebuilds deterministic context from date/profile before calling Gemini.

## Gemini CLI smoke test

    gemini --version
    gemini -m gemini-3.8-flash -p "Trả lời đúng một chữ: OK" --output-format json

If OAuth expires, run `gemini` again and choose **Sign in with Google**.

## LAN access

Find the Windows IPv4 address with `ipconfig`, then open `http://<WIN11-IP>:3000` from another device on the same LAN.

If Windows Firewall blocks it, allow inbound TCP port 3000. For internet access, use a tunnel/reverse proxy instead of exposing port 3000 directly.

## Security notes

- No AI API key is stored by the app.
- Gemini OAuth stays in Gemini CLI local user storage.
- The child process explicitly strips Gemini/Google API-key environment variables.
- Gemini CLI runs headlessly in an isolated empty runtime directory.
- AI receives engine JSON only and is instructed not to recalculate calendar facts.
- There is no provider fallback.

## Telegram chủ động

Telegram không nhận bản sao mọi câu hỏi trên web.

Nó chỉ nhận bản tin hằng ngày theo các mục đã tích trong tab **Hồ sơ**.

Biến môi trường:

```powershell
setx TELEGRAM_BOT_TOKEN "<bot-token>"
setx TELEGRAM_CHAT_ID "<chat-id>"
```

Nếu chat ID đã được cấu hình trước thì giữ nguyên giá trị hiện tại. Mở PowerShell mới sau khi dùng `setx`.

Node server tự kiểm tra mỗi phút:
1. thông báo có đang bật không,
2. đã đến giờ chưa,
3. hôm nay đã gửi chưa,
4. user đã chọn chủ đề nào.

Nếu máy khởi động sau giờ gửi, app sẽ gửi bù một lần trong ngày.

Các chủ đề hiện có:
- Tổng quan hôm nay,
- Kế hoạch đã lưu,
- Ngày tốt sắp tới,
- Cảnh báo cá nhân.

Gemini chỉ rút gọn deterministic context thành tối đa khoảng 60 từ trước khi gửi Telegram.
