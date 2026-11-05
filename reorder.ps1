$file = 'c:\Users\user\Desktop\maa park\index.html'
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

$aboutMarker = '    <!-- App Overview -->'
$missionMarker = '    <!-- Mission'
$teamMarker = '    <!-- Team Section -->'
$privacyMarker = '    <!-- Privacy Policy Section -->'

$aboutStart = $content.IndexOf($aboutMarker)
$aboutEnd   = $content.IndexOf($missionMarker)
$teamStart  = $content.IndexOf($teamMarker)
$teamEnd    = $content.IndexOf($privacyMarker)

if ($aboutStart -lt 0 -or $aboutEnd -lt 0 -or $teamStart -lt 0 -or $teamEnd -lt 0) {
    Write-Host "ERROR: Could not find one or more markers."
    Write-Host "aboutStart=$aboutStart, aboutEnd=$aboutEnd, teamStart=$teamStart, teamEnd=$teamEnd"
    exit 1
}

$beforeAbout          = $content.Substring(0, $aboutStart)
$aboutBlock           = $content.Substring($aboutStart, $aboutEnd - $aboutStart)
$betweenAboutAndTeam  = $content.Substring($aboutEnd, $teamStart - $aboutEnd)
$teamBlock            = $content.Substring($teamStart, $teamEnd - $teamStart)
$afterTeam            = $content.Substring($teamEnd)

# Remove the placeholder comment we inserted earlier
$beforeAbout = $beforeAbout -replace '(?s)\s*<!-- Team Section \(moved to 2nd position\) -->\s*<!-- Team section content is rendered here via anchor for nav -->\s*', "`r`n`r`n"

# Remove order:-1 style that was added
$teamBlock = $teamBlock -replace ' style="order:-1;"', ''

# Build new content: team section comes right after hero, before about
$newContent = $beforeAbout + $teamBlock + "`r`n" + $aboutBlock + $betweenAboutAndTeam + $afterTeam

[System.IO.File]::WriteAllText($file, $newContent, [System.Text.Encoding]::UTF8)
Write-Host "SUCCESS: Team section moved before About section."
