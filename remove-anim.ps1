$file = 'c:\Users\user\Desktop\maa park\index.html'
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# Remove all animate-up and animate-fade-in class references
$content = $content -replace 'class="animate-up"', 'class=""'
$content = $content -replace 'class="animate-fade-in"', 'class=""'
$content = $content -replace ' animate-up', ''
$content = $content -replace ' animate-fade-in', ''
$content = $content -replace 'animate-up ', ''
$content = $content -replace 'animate-fade-in ', ''

[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
Write-Host 'SUCCESS: All animate classes removed from HTML'
