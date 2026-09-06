$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path "$scriptDir\..\.."
$pptxPath = Join-Path $repoRoot "PMB_Architecture_Pitch.pptx"
$docsDir = Join-Path $repoRoot "docs"

$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = [Microsoft.Office.Core.MsoTriState]::msoTrue
try {
    $pres = $ppt.Presentations.Open($pptxPath)
    $pres.Slides.Item(1).Export((Join-Path $docsDir "preview_slide_1.png"), "PNG", 1920, 1080)
    $pres.Slides.Item(2).Export((Join-Path $docsDir "preview_slide_2.png"), "PNG", 1920, 1080)
    $pres.Slides.Item(3).Export((Join-Path $docsDir "preview_slide_3.png"), "PNG", 1920, 1080)
    $pres.Close()
    Write-Host "SUCCESS: Exported 3 slides to docs/preview_slide_*.png"
} finally {
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
}
