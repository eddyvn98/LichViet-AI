$ErrorActionPreference = "Stop"

Write-Host "== LichViet AI - Windows 11 setup ==" -ForegroundColor Cyan

$nodeVersion = node --version
Write-Host "Node: $nodeVersion"

Write-Host "Installing project dependencies..."
npm install

Write-Host "Installing/updating official Gemini CLI..."
npm install -g @google/gemini-cli@latest

Write-Host ""
Write-Host "Gemini CLI installed." -ForegroundColor Green
Write-Host "Next, run: gemini"
Write-Host "Choose: Sign in with Google"
Write-Host "After browser login succeeds, run:"
Write-Host "  .\scripts\start-windows.ps1"
Write-Host ""
Write-Host "No GEMINI_API_KEY is required or supported by LichViet AI."
