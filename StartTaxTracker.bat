@echo off
echo Tax Tracker uygulaması başlatılıyor...
cd /d "%~dp0\release\win-unpacked"
start "" "Tax Tracker.exe"
exit 