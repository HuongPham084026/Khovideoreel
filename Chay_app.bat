@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Kho Reel Mau
where python >nul 2>nul || (echo Chua co Python. Hay chay Cai_dat.bat truoc. & pause & exit /b 1)
python -m server.app
if errorlevel 1 pause
