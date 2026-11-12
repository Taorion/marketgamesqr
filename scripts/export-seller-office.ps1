$ErrorActionPreference = 'Stop'
$collectionRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../output/seller-collection-1.1'))
$wordApp = $null
try {
 $wordApp = New-Object -ComObject Word.Application
 $wordApp.Visible = $false
 $wordApp.DisplayAlerts = 0
 $wordApp.AutomationSecurity = 3
 $wordApp.Options.UpdateLinksAtOpen = $false
 foreach ($file in Get-ChildItem -LiteralPath $collectionRoot -Recurse -Filter '*.docx') {
  $doc = $null
  try {
   $doc = $wordApp.Documents.Open($file.FullName,$false,$true,$false)
   $target = [System.IO.Path]::ChangeExtension($file.FullName,'.pdf')
   $doc.ExportAsFixedFormat($target,17)
   Write-Output ('Exported ' + $file.Name)
  } finally { if ($null -ne $doc) { $doc.Close(0); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) } }
 }
} finally { if ($null -ne $wordApp) { $wordApp.Quit(); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($wordApp) } }
$powerPointWasRunning = @(Get-Process -Name POWERPNT -ErrorAction SilentlyContinue).Count -gt 0
$powerPointApp = $null
try {
 $powerPointApp = New-Object -ComObject PowerPoint.Application
 $powerPointApp.AutomationSecurity = 3
 foreach ($file in Get-ChildItem -LiteralPath $collectionRoot -Recurse -Filter '*.pptx') {
  $deck = $null
  try {
   $deck = $powerPointApp.Presentations.Open($file.FullName,-1,0,0)
   $target = [System.IO.Path]::ChangeExtension($file.FullName,'.pdf')
   $deck.SaveAs($target,32)
   Write-Output ('Exported ' + $file.Name)
  } finally { if ($null -ne $deck) { $deck.Close(); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($deck) } }
 }
} finally { if ($null -ne $powerPointApp) { if (-not $powerPointWasRunning) { $powerPointApp.Quit() }; [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($powerPointApp) } }
