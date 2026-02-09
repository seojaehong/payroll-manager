Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

strDesktop = WshShell.SpecialFolders("Desktop")
strShortcut = strDesktop & "\티스토리 업로더.lnk"

Set oShortcut = WshShell.CreateShortcut(strShortcut)
oShortcut.TargetPath = "pythonw.exe"
oShortcut.Arguments = """C:\dev\neuro-coach\tistory_uploader.py"""
oShortcut.WorkingDirectory = "C:\dev\neuro-coach"
oShortcut.IconLocation = "C:\dev\neuro-coach\tistory_uploader.ico"
oShortcut.Description = "티스토리 블로그 자동 업로더"
oShortcut.Save

WScript.Echo "바탕화면에 '티스토리 업로더' 바로가기가 생성되었습니다."
