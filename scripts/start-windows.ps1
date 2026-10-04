$ErrorActionPreference = "Stop"

$env:NODE_ENV = "production"
if (-not $env:PORT) { $env:PORT = "3000" }
$env:AI_ENABLED = "true"
$env:GEMINI_MODEL = "gemini-3.8-flash"

Remove-Item Env:\GEMINI_API_KEY -ErrorAction SilentlyContinue
Remove-Item Env:\GOOGLE_API_KEY -ErrorAction SilentlyContinue
Remove-Item Env:\GOOGLE_GENAI_USE_VERTEXAI -ErrorAction SilentlyContinue

Write-Host "LichViet AI" -ForegroundColor Cyan
Write-Host "Web: http://localhost:$env:PORT"
Write-Host "AI: Gemini CLI / $env:GEMINI_MODEL / Google OAuth"
if ($env:TELEGRAM_BOT_TOKEN -and $env:TELEGRAM_CHAT_ID) {
  Write-Host "Telegram: connected" -ForegroundColor Green
} else {
  Write-Host "Telegram: not configured" -ForegroundColor Yellow
}
Write-Host "Press Ctrl+C to stop."
Write-Host ""

npm start
