Get-ChildItem 'D:\creatify\creatify-web\src\app\api' -Recurse -Filter '*.ts' | ForEach-Object {
  $lines = Get-Content $_.FullName
  # Check if runtime line is already there
  if ($lines -notcontains "export const runtime = 'edge'") {
    # Find the line with 'export const dynamic' and insert runtime before it
    $newLines = @()
    $inserted = $false
    foreach ($line in $lines) {
      if (-not $inserted -and $line -eq "export const dynamic = 'force-dynamic'") {
        $newLines += "export const runtime = 'edge'"
        $inserted = $true
      }
      $newLines += $line
    }
    Set-Content $_.FullName $newLines
    Write-Host "Updated: $($_.Name) ($($_.FullName))"
  } else {
    Write-Host "Already has runtime: $($_.Name)"
  }
}
