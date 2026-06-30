$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Logs = Join-Path $Root "logs"

if (-not (Test-Path $Logs)) {
    New-Item -ItemType Directory -Path $Logs | Out-Null
}

function Stop-ProjectProcessOnPort {
    param(
        [int] $Port
    )

    $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($listener in $listeners) {
        $processId = $listener.OwningProcess
        if ($processId -eq $PID) {
            continue
        }

        $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
        if ($null -eq $processInfo) {
            continue
        }

        $commandLine = [string] $processInfo.CommandLine
        $isThisProject = $commandLine.Contains($Root)
        if (-not $isThisProject) {
            Write-Host "Port $Port is already used by PID $processId. It does not look like this project, so it was not stopped."
            continue
        }

        Write-Host "Stopping existing DOHWA process on port $Port (PID $processId)."
        Stop-Process -Id $processId -Force
    }
}

Stop-ProjectProcessOnPort -Port 8080
Stop-ProjectProcessOnPort -Port 412

Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$Root`" && .\mvnw.cmd spring-boot:run"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$Root\frontend`" && ..\npmw.cmd run dev"

Write-Host ""
Write-Host "DOHWA development servers are starting."
Write-Host "1. Wait until both terminal windows finish loading."
Write-Host "2. Open http://localhost:412/ when the frontend window shows the Local URL."
Write-Host ""
