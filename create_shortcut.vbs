Set WshShell = CreateObject("WScript.Shell")
Set oShellLink = WshShell.CreateShortcut(WshShell.SpecialFolders("Desktop") & "\Tistory Uploader.lnk")
oShellLink.TargetPath = "pythonw.exe"
oShellLink.Arguments = Chr(34) & "C:\Users\iceam\OneDrive\바탕 화면\neuro-coach\tistory_uploader.py" & Chr(34)
oShellLink.WorkingDirectory = "C:\Users\iceam\OneDrive\바탕 화면\neuro-coach"
oShellLink.IconLocation = "shell32.dll,13"
oShellLink.Description = "Tistory Blog Uploader"
oShellLink.Save
