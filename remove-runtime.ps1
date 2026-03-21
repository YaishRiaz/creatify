Get-ChildItem 'D:\creatify\creatify-web\src\app' -Recurse -Filter '*.tsx' | Where-Object { $_.FullName -notmatch '\\api\\' } | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  if ($content -match "export const runtime = 'edge'") {
    $new = $content -replace "export const runtime = 'edge'\r?\n", ''
    Set-Content $_.FullName $new -NoNewline
    Write-Host "Cleaned: $($_.Name)"
  }
}
