param(
    [string]$RootPath = $PSScriptRoot,
    [switch]$Cleanup,
    [switch]$SkipCleanup,
    [switch]$DryRun,
    [int]$TimeoutSeconds = 180
)

$ErrorActionPreference = "Stop"

$authRepo = Join-Path $RootPath "auth-repo"
$serviceRepo = Join-Path $RootPath "service-repo"
$realmBaseUrl = "http://localhost:8081/realms/reusable-realm"
$openidConfigUrl = "$realmBaseUrl/.well-known/openid-configuration"
$tokenUrl = "$realmBaseUrl/protocol/openid-connect/token"
$serviceBaseUrl = "http://localhost:8080"
$serviceLog = Join-Path $serviceRepo "service-e2e.log"

$serviceProc = $null

function Write-Step([string]$message) {
    Write-Host "`n==> $message" -ForegroundColor Cyan
}

function Invoke-Native([scriptblock]$command, [string]$description) {
    if ($DryRun) {
        Write-Host "[DRY-RUN] $description" -ForegroundColor Yellow
        return
    }

    Write-Host $description -ForegroundColor DarkGray
    & $command
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed: $description"
    }
}

function Wait-HttpReady([string]$url, [int]$timeoutSeconds) {
    $start = Get-Date
    while (((Get-Date) - $start).TotalSeconds -lt $timeoutSeconds) {
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -Method Get -TimeoutSec 8
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return
            }
        }
        catch {
            Start-Sleep -Seconds 3
            continue
        }
        Start-Sleep -Seconds 2
    }
    throw "Timeout waiting for endpoint: $url"
}

function Get-AccessToken([string]$username, [string]$password) {
    $body = "client_id=reusable-client&grant_type=password&username=$username&password=$password"
    $tokenResponse = Invoke-RestMethod -Method Post -Uri $tokenUrl -ContentType "application/x-www-form-urlencoded" -Body $body
    if (-not $tokenResponse.access_token) {
        throw "Failed to retrieve access token for user: $username"
    }
    return $tokenResponse.access_token
}

try {
    Write-Step "Validating prerequisites"
    if (-not (Test-Path $authRepo)) { throw "Missing folder: $authRepo" }
    if (-not (Test-Path $serviceRepo)) { throw "Missing folder: $serviceRepo" }

    if (-not $DryRun) {
        if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw "docker is not installed or not in PATH" }
        if (-not (Get-Command mvn -ErrorAction SilentlyContinue)) { throw "mvn is not installed or not in PATH" }
    }

    Write-Step "Starting Keycloak + Keycloak DB from auth-repo"
    Push-Location $authRepo
    Invoke-Native { docker compose up -d } "docker compose up -d"
    Pop-Location

    if (-not $DryRun) {
        Write-Step "Waiting for Keycloak realm endpoint"
        Wait-HttpReady -url $openidConfigUrl -timeoutSeconds $TimeoutSeconds
    }

    Write-Step "Ensuring PostgreSQL for service is running"
    if ($DryRun) {
        Write-Host "[DRY-RUN] docker run/start service-postgres" -ForegroundColor Yellow
    }
    else {
        $existing = (& docker ps -a --format "{{.Names}}") -contains "service-postgres"
        if ($existing) {
            Invoke-Native { docker start service-postgres } "docker start service-postgres"
        }
        else {
            Invoke-Native {
                docker run -d --name service-postgres `
                    -e POSTGRES_DB=service_db `
                    -e POSTGRES_USER=service_user `
                    -e POSTGRES_PASSWORD=service_password `
                    -p 5432:5432 `
                    postgres:16-alpine
            } "docker run service-postgres"
        }
    }

    Write-Step "Starting Spring Boot service with local profile"
    if ($DryRun) {
        Write-Host "[DRY-RUN] mvn spring-boot:run -Dspring-boot.run.profiles=local" -ForegroundColor Yellow
    }
    else {
        if (Test-Path $serviceLog) {
            Remove-Item -Force $serviceLog
        }

        $serviceProc = Start-Process -FilePath "mvn.cmd" `
            -ArgumentList "spring-boot:run", "-Dspring-boot.run.profiles=local" `
            -WorkingDirectory $serviceRepo `
            -RedirectStandardOutput $serviceLog `
            -RedirectStandardError $serviceLog `
            -PassThru

        Write-Step "Waiting for service endpoint"
        Wait-HttpReady -url "$serviceBaseUrl/items" -timeoutSeconds $TimeoutSeconds
    }

    Write-Step "Running API checks with ADMIN and USER roles"
    if ($DryRun) {
        Write-Host "[DRY-RUN] Request tokens and call /categories and /items" -ForegroundColor Yellow
    }
    else {
        $adminToken = Get-AccessToken -username "admin1" -password "admin1pass"

        $category = Invoke-RestMethod -Method Post `
            -Uri "$serviceBaseUrl/categories" `
            -Headers @{ Authorization = "Bearer $adminToken" } `
            -ContentType "application/json" `
            -Body '{"name":"General","description":"Default category"}'

        $item = Invoke-RestMethod -Method Post `
            -Uri "$serviceBaseUrl/items" `
            -Headers @{ Authorization = "Bearer $adminToken" } `
            -ContentType "application/json" `
            -Body ("{`"name`":`"Sample Item`",`"description`":`"E2E check`",`"price`":19.99,`"categoryId`":" + $category.id + "}")

        $userToken = Get-AccessToken -username "user1" -password "user1pass"

        $items = Invoke-RestMethod -Method Get `
            -Uri "$serviceBaseUrl/items" `
            -Headers @{ Authorization = "Bearer $userToken" }

        $isForbidden = $false
        try {
            Invoke-RestMethod -Method Post `
                -Uri "$serviceBaseUrl/categories" `
                -Headers @{ Authorization = "Bearer $userToken" } `
                -ContentType "application/json" `
                -Body '{"name":"ShouldFail","description":"Expected forbidden"}' | Out-Null
        }
        catch {
            $status = $null
            if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
                $status = [int]$_.Exception.Response.StatusCode
            }
            if ($status -eq 403) {
                $isForbidden = $true
            }
            else {
                throw
            }
        }

        if (-not $isForbidden) {
            throw "Expected USER create operation to be forbidden, but request succeeded."
        }

        Write-Host "E2E success: categoryId=$($category.id), itemId=$($item.id), readableItems=$($items.Count)" -ForegroundColor Green
        Write-Host "Service log: $serviceLog" -ForegroundColor DarkGray
    }
}
finally {
    if ($Cleanup -and -not $SkipCleanup -and -not $DryRun) {
        Write-Step "Cleaning up local runtime"

        if ($serviceProc -and -not $serviceProc.HasExited) {
            Start-Process -FilePath "taskkill" -ArgumentList "/PID", $serviceProc.Id, "/T", "/F" -Wait | Out-Null
        }

        Push-Location $authRepo
        Invoke-Native { docker compose down } "docker compose down"
        Pop-Location

        $pgExists = (& docker ps -a --format "{{.Names}}") -contains "service-postgres"
        if ($pgExists) {
            Invoke-Native { docker stop service-postgres } "docker stop service-postgres"
            Invoke-Native { docker rm service-postgres } "docker rm service-postgres"
        }
    }
    elseif (-not $DryRun) {
        Write-Host "Keeping services running. Use -Cleanup to stop/remove containers and terminate the app process." -ForegroundColor Yellow
    }
}

