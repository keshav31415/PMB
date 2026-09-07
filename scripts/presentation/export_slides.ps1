$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path "$scriptDir\..\.."
$pptxPath = Join-Path $repoRoot "PMB_Architecture_Pitch.pptx"
$docsDir = Join-Path $repoRoot "docs"

$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = [Microsoft.Office.Core.MsoTriState]::msoTrue
try {
    $pres = $ppt.Presentations.Open($pptxPath)
    $slideCount = $pres.Slides.Count
    Write-Host "Total Slides to Export: $slideCount"

    for ($i = 1; $i -le $slideCount; $i++) {
        $outFile = Join-Path $docsDir "deck_slide_$i.png"
        $pres.Slides.Item($i).Export($outFile, "PNG", 1920, 1080)
    }
    $pres.Close()
    Write-Host "SUCCESS: Exported all $slideCount slides to docs/deck_slide_*.png"
} finally {
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
}
