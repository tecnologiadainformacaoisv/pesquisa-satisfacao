$node  = "C:\Program Files\nodejs\node.exe"
$clasp = "C:\Users\usuario\AppData\Roaming\npm\node_modules\@google\clasp\build\src\index.js"
$depId = "AKfycbwK--quEUwdbc2tvEBiC3UfazOcX0pu9wWGep-0oM3T-s0yZaJ2PYAs9-jv7UpN6Y9O3Q"
$dir   = Split-Path -Parent $PSScriptRoot
$log   = "$dir\appscript\deploy.log"

Set-Location $dir

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content $log "`n[$timestamp] PUSH"
& $node $clasp push --force 2>&1 | Tee-Object -Append -FilePath $log

Add-Content $log "[$timestamp] DEPLOY"
& $node $clasp deploy --deploymentId $depId 2>&1 | Tee-Object -Append -FilePath $log
