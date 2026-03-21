Get-ChildItem 'D:\creatify\creatify-web\src\app\api' -Recurse -Filter '*.ts' | ForEach-Object {
  $lines = Get-Content $_.FullName
  $newLines = $lines | Where-Object { $_ -ne "export const runtime = 'edge'" }
  if ($lines.Count -ne $newLines.Count) {
    Set-Content $_.FullName $newLines
    Write-Host "Cleaned: $($_.Name) ($($_.FullName))"
  }
}
