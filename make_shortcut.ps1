$WshShell = New-Object -ComObject WScript.Shell
$Desktop = $WshShell.SpecialFolders("Desktop")
$ShortcutPath = Join-Path $Desktop "Tistory_Uploader.lnk"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "pythonw.exe"
$Shortcut.Arguments = "C:\dev\neuro-coach\tistory_uploader.py"
$Shortcut.WorkingDirectory = "C:\dev\neuro-coach"
$Shortcut.IconLocation = "C:\dev\neuro-coach\tistory_uploader.ico"
$Shortcut.Save()

Write-Host "Shortcut created at: $ShortcutPath"
