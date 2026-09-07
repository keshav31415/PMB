$edgePath = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$docsDir = Resolve-Path "$scriptDir\..\..\docs"

$svgFiles = @(
    @{ Svg = "slide1_topology.svg"; Png = "slide1_topology.png"; W = 1100; H = 600 },
    @{ Svg = "slide2_problem.svg"; Png = "slide2_problem.png"; W = 1100; H = 360 },
    @{ Svg = "slide3_solution.svg"; Png = "slide3_solution.png"; W = 1100; H = 380 },
    @{ Svg = "slide4_atomic_stack.svg"; Png = "slide4_atomic_stack.png"; W = 1100; H = 360 },
    @{ Svg = "slide5_group_commit.svg"; Png = "slide5_group_commit.png"; W = 1100; H = 360 },
    @{ Svg = "slide6_router_delivery.svg"; Png = "slide6_router_delivery.png"; W = 1100; H = 360 },
    @{ Svg = "slide7_compaction.svg"; Png = "slide7_compaction.png"; W = 1100; H = 360 },
    @{ Svg = "slide8_wire_protocol.svg"; Png = "slide8_wire_protocol.png"; W = 1100; H = 360 }
)

Write-Host "Rasterizing SVGs to universal PNGs using headless Microsoft Edge..."

foreach ($item in $svgFiles) {
    $svgAbs = Join-Path $docsDir $item.Svg
    $pngAbs = Join-Path $docsDir $item.Png
    $uri = "file:///$($svgAbs.Replace('\', '/'))"
    $w = $item.W * 2
    $h = $item.H * 2

    $proc = Start-Process -FilePath $edgePath -ArgumentList @(
        "--headless",
        "--disable-gpu",
        "--screenshot=$pngAbs",
        "--window-size=$w,$h",
        "--default-background-color=00000000",
        $uri
    ) -NoNewWindow -PassThru -Wait

    if (Test-Path $pngAbs) {
        $f = Get-Item $pngAbs
        Write-Host "Rendered $($item.Png) ($($f.Length) bytes)"
    } else {
        Write-Error "Failed to render $($item.Png)"
    }
}

Write-Host "All SVGs rasterized to high-res PNG successfully!"
