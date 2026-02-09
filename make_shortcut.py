#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""바탕화면에 티스토리 업로더 바로가기 생성"""

import os
import sys

# winshell 없이 COM 직접 사용
try:
    import win32com.client
except ImportError:
    print("pywin32가 필요합니다. 설치 중...")
    os.system("pip install pywin32")
    import win32com.client

def create_shortcut():
    shell = win32com.client.Dispatch("WScript.Shell")
    desktop = shell.SpecialFolders("Desktop")

    shortcut_path = os.path.join(desktop, "티스토리 업로더.lnk")
    script_dir = os.path.dirname(os.path.abspath(__file__))

    shortcut = shell.CreateShortCut(shortcut_path)
    shortcut.TargetPath = "pythonw.exe"
    shortcut.Arguments = f'"{os.path.join(script_dir, "tistory_uploader.py")}"'
    shortcut.WorkingDirectory = script_dir
    shortcut.IconLocation = os.path.join(script_dir, "tistory_uploader.ico")
    shortcut.Description = "티스토리 블로그 자동 업로더"
    shortcut.save()

    print(f"✅ 바로가기 생성 완료: {shortcut_path}")

if __name__ == "__main__":
    create_shortcut()
