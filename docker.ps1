# Griphook Docker Management Script (PowerShell)
# Simple script to manage Docker operations for Griphook on Windows

param(
    [Parameter(Mandatory=$false)]
    [string]$Command = "help"
)

# Configuration
$ImageName = "griphook"
$ContainerName = "griphook"
$Port = "3000"

# Functions
function Print-Help {
    Write-Host "Griphook Docker Management Script" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Usage: .\docker.ps1 [command]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  build      - Build the Docker image"
    Write-Host "  run        - Run the container (no Azure config needed - users auth with their own tenant)"
    Write-Host "  stop       - Stop and remove the container"
    Write-Host "  logs       - Show container logs"
    Write-Host "  shell      - Access container shell"
    Write-Host "  health     - Check container health"
    Write-Host "  clean      - Clean up images and containers"
    Write-Host "  compose    - Run with docker-compose"
    Write-Host "  help       - Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\docker.ps1 build"
    Write-Host "  .\docker.ps1 run"
    Write-Host "  .\docker.ps1 compose"
    Write-Host ""
}

function Build-Image {
    Write-Host "Building Docker image..." -ForegroundColor Yellow
    docker build -t "$ImageName`:latest" .
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Image built successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to build image" -ForegroundColor Red
        exit 1
    }
}

function Run-Container {
    # Check if container is already running
    $running = docker ps -q -f "name=$ContainerName"
    if ($running) {
        Write-Host "Container $ContainerName is already running" -ForegroundColor Yellow
        Write-Host "Access it at: http://localhost:$Port"
        return
    }

    Write-Host "Starting container..." -ForegroundColor Yellow
    Write-Host "Note: No Azure configuration needed - users will authenticate with their own Azure tenant" -ForegroundColor Blue
    
    docker run -d `
        --name $ContainerName `
        -p "$Port`:3000" `
        -e "APP_NAME=Griphook" `
        -e "NODE_ENV=production" `
        "$ImageName`:latest"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Container started successfully!" -ForegroundColor Green
        Write-Host "Access the application at: http://localhost:$Port" -ForegroundColor Blue
        Write-Host "Users will be prompted to sign in with their Azure account" -ForegroundColor Blue
    } else {
        Write-Host "❌ Failed to start container" -ForegroundColor Red
        exit 1
    }
}

function Stop-Container {
    Write-Host "Stopping container..." -ForegroundColor Yellow
    $running = docker ps -q -f "name=$ContainerName"
    if ($running) {
        docker stop $ContainerName
        docker rm $ContainerName
        Write-Host "✅ Container stopped and removed" -ForegroundColor Green
    } else {
        Write-Host "Container $ContainerName is not running" -ForegroundColor Yellow
    }
}

function Show-Logs {
    $running = docker ps -q -f "name=$ContainerName"
    if ($running) {
        docker logs -f $ContainerName
    } else {
        Write-Host "❌ Container $ContainerName is not running" -ForegroundColor Red
    }
}

function Access-Shell {
    $running = docker ps -q -f "name=$ContainerName"
    if ($running) {
        docker exec -it $ContainerName /bin/sh
    } else {
        Write-Host "❌ Container $ContainerName is not running" -ForegroundColor Red
    }
}

function Check-Health {
    $running = docker ps -q -f "name=$ContainerName"
    if ($running) {
        Write-Host "Checking health..." -ForegroundColor Yellow
        try {
            $healthStatus = docker inspect $ContainerName --format='{{.State.Health.Status}}' 2>$null
            Write-Host "Health Status: $healthStatus" -ForegroundColor Blue
            
            if ($healthStatus -eq "healthy") {
                Write-Host "✅ Container is healthy" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Container health: $healthStatus" -ForegroundColor Yellow
                Write-Host "Recent health check logs:" -ForegroundColor Blue
                $healthLogs = docker inspect $ContainerName --format='{{range .State.Health.Log}}{{.Output}}{{end}}' 2>$null
                if ($healthLogs) {
                    Write-Host $healthLogs
                } else {
                    Write-Host "No health logs available"
                }
            }
        } catch {
            Write-Host "Unknown health status" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Container $ContainerName is not running" -ForegroundColor Red
    }
}

function Clean-Up {
    Write-Host "Cleaning up Docker resources..." -ForegroundColor Yellow
    
    # Stop and remove container
    $running = docker ps -q -f "name=$ContainerName"
    if ($running) {
        docker stop $ContainerName
        docker rm $ContainerName
    }
    
    # Remove image
    $imageExists = docker images -q $ImageName
    if ($imageExists) {
        docker rmi "$ImageName`:latest"
    }
    
    # Clean up dangling images
    docker image prune -f
    
    Write-Host "✅ Cleanup completed" -ForegroundColor Green
}

function Run-Compose {
    if (-not (Test-Path "docker-compose.yml")) {
        Write-Host "❌ docker-compose.yml not found" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Starting with docker-compose..." -ForegroundColor Yellow
    docker-compose up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Services started with docker-compose" -ForegroundColor Green
        Write-Host "Access the application at: http://localhost:$Port" -ForegroundColor Blue
    } else {
        Write-Host "❌ Failed to start services" -ForegroundColor Red
        exit 1
    }
}

# Main script logic
switch ($Command.ToLower()) {
    "build" { Build-Image }
    "run" { Run-Container }
    "stop" { Stop-Container }
    "logs" { Show-Logs }
    "shell" { Access-Shell }
    "health" { Check-Health }
    "clean" { Clean-Up }
    "compose" { Run-Compose }
    default { Print-Help }
}
