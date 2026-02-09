@echo off
chcp 65001 >nul
cd /d "%~dp0"
cscript //Nologo create_tistory_shortcut_utf8.vbs
pause
