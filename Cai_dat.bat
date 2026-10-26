@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Cai dat Kho Reel Mau
echo === Cai dat Kho Reel Mau (chi can chay 1 lan) ===
echo.
where python >nul 2>nul
if errorlevel 1 (
  echo [1/4] Chua co Python - dang cai bang winget...
  winget install -e --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements
  echo Hay DONG cua so nay va chay lai Cai_dat.bat de nhan Python.
  pause & exit /b 0
) else ( echo [1/4] Python: OK )
where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo [2/4] Chua co FFmpeg - dang cai bang winget...
  winget install -e --id Gyan.FFmpeg --accept-package-agreements --accept-source-agreements
  echo Hay DONG cua so nay va chay lai Cai_dat.bat de nhan FFmpeg.
  pause & exit /b 0
) else ( echo [2/4] FFmpeg: OK )
echo [3/4] Cai thu vien Python...
python -m pip install -r requirements.txt
if errorlevel 1 ( echo Loi cai thu vien. & pause & exit /b 1 )
if exist dist\index.html (
  echo [4/4] Giao dien: da co san
) else (
  where npm >nul 2>nul
  if errorlevel 1 (
    echo [4/4] Chua co giao dien (dist) va may chua co Node.js. Hay nhan ban cai dat day du tu nguoi gui.
  ) else (
    echo [4/4] Build giao dien...
    call npm install && call npm run build
  )
)
if not exist config.json (
  echo Chua co config.json - du lieu se luu o thu muc du-lieu canh app. Muon doi, tao config.json: {"data_dir": "D:\Kho Reel Mau"}
)
echo.
echo Xong! Bam Chay_app.bat de mo app.
pause
