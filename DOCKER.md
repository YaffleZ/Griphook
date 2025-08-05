# 🐳 Docker Setup for Griphook

This guide explains how to build, run, and distribute the Griphook Azure Key Vault Advanced Editor using Docker.

## 📋 Prerequisites

- Docker installed on3. **Use secrets** for sensitive environment variables (advanced):
   ```bash
   docker swarm init
   echo "your-app-secret" | docker secret create app_secret -
   ``` system
- Docker Compose (optional, for easier management)

## 🚀 Quick Start

### Option 1: Using Docker Run

1. **Build the image**
   ```bash
   docker build -t griphook:latest .
   ```

2. **Run the container**
   ```bash
   docker run -d \
     --name griphook \
     -p 3000:3000 \
     griphook:latest
   ```

3. **Access the application**
   
   Open [http://localhost:3000](http://localhost:3000) in your browser and sign in with your Azure account

### Option 2: Using Docker Compose (Recommended)

1. **Start the application**
   ```bash
   docker-compose up -d
   ```

2. **Access the application**
   
   Open [http://localhost:3000](http://localhost:3000) in your browser and sign in with your Azure account

## 🏗️ Building for Distribution

### Build Multi-Platform Images

For distributing to different architectures:

```bash
# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t yourusername/griphook:latest \
  --push .
```

### Push to Docker Registry

```bash
# Tag the image
docker tag griphook:latest yourusername/griphook:latest

# Push to Docker Hub
docker push yourusername/griphook:latest
```

### Pull and Run (For End Users)

Others can then pull and run your image:

```bash
# Pull the image
docker pull yourusername/griphook:latest

# Run with no configuration required
docker run -d \
  --name griphook \
  -p 3000:3000 \
  yourusername/griphook:latest
```

Users will be prompted to sign in with their Azure account when they access the application.

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_AZURE_CLIENT_ID` | No | Azure CLI client | Custom Azure AD app client ID (rarely needed) |
| `APP_NAME` | No | "Griphook" | Application branding name |
| `NODE_ENV` | No | "production" | Node.js environment |
| `PORT` | No | 3000 | Application port |

**Note**: No tenant ID configuration is required! Users authenticate with their own Azure tenant through OAuth, and the application automatically discovers their accessible Key Vaults.

### Volume Mounts

For persistent configuration (optional):

```bash
docker run -d \
  --name griphook \
  -p 3000:3000 \
  griphook:latest
```

**Note**: No volume mounts are typically required since users authenticate directly with Azure.

## 🔧 Development

### Development with Docker

For development with hot reloading:

```bash
# Build development image
docker build -f Dockerfile.dev -t griphook:dev .

# Run with source code mounted
docker run -d \
  --name griphook-dev \
  -p 3000:3000 \
  -v $(pwd)/src:/app/src \
  -v $(pwd)/public:/app/public \
  griphook:dev
```

### Debug Container

To debug issues inside the container:

```bash
# Access container shell
docker exec -it griphook /bin/sh

# View logs
docker logs griphook

# Check health
docker exec griphook node healthcheck.js
```

## 🚨 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Use different port
   docker run -p 8080:3000 griphook:latest
   ```

2. **Azure authentication issues**
   ```bash
   # Check if users can access the login page
   curl http://localhost:3000
   
   # Authentication happens in the browser - no server config needed
   ```

3. **Container won't start**
   ```bash
   # Check logs
   docker logs griphook
   
   # Check health status
   docker inspect griphook --format='{{.State.Health.Status}}'
   ```

### Performance Tuning

For production deployment:

```bash
# Increase memory limit
docker run -d \
  --name griphook \
  --memory=1g \
  --cpus=1.0 \
  -p 3000:3000 \
  griphook:latest
```

## 🔒 Security

### Security Best Practices

1. **Use specific tags** instead of `latest` in production
2. **Scan images** for vulnerabilities:
   ```bash
   docker scan griphook:latest
   ```
3. **Run as non-root** (already configured in Dockerfile)
4. **Limit container resources** with `--memory` and `--cpus`
5. **Use secrets** for sensitive environment variables:
   ```bash
   docker swarm init
   echo "your-tenant-id" | docker secret create azure_tenant_id -
   ```

### Network Security

For production, consider using a reverse proxy:

```bash
# Run with nginx proxy (using docker-compose)
docker-compose --profile production up -d
```

## 📊 Monitoring

### Health Checks

The container includes built-in health checks:

```bash
# Check health status
docker inspect griphook --format='{{.State.Health.Status}}'

# View health check logs
docker inspect griphook --format='{{range .State.Health.Log}}{{.Output}}{{end}}'
```

### Resource Monitoring

```bash
# Monitor resource usage
docker stats griphook

# View container details
docker inspect griphook
```

## 🌐 Production Deployment

### Using Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml griphook-stack
```

### Using Kubernetes

Example Kubernetes deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: griphook
spec:
  replicas: 3
  selector:
    matchLabels:
      app: griphook
  template:
    metadata:
      labels:
        app: griphook
    spec:
      containers:
      - name: griphook
        image: yourusername/griphook:latest
        ports:
        - containerPort: 3000
        env:
        - name: APP_NAME
          value: "Griphook"
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: griphook-service
spec:
  selector:
    app: griphook
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## 📝 Notes

- The Docker image is optimized for production with multi-stage builds
- Health checks are included for container orchestration
- The application runs as a non-root user for security
- Environment variables can be passed at runtime for flexibility
- The image supports both AMD64 and ARM64 architectures
