# Docker Setup for Griphook

This guide covers running, configuring, and deploying Griphook with Docker.

---

## Quick Start

### Pull from GitHub Container Registry (recommended)

```bash
docker run -d --name griphook -p 3000:3000 ghcr.io/yafflez/griphook:latest
```

Open **http://localhost:3000**, sign in with Azure, done.

### Build locally

```bash
git clone https://github.com/YaffleZ/Griphook.git
cd Griphook
docker build -t griphook:latest .
docker run -d --name griphook -p 3000:3000 griphook:latest
```

### Docker Compose

```bash
docker compose up -d
```

The `docker-compose.yml` starts Griphook on port 3000. An optional `nginx` profile is included for reverse-proxy setups:

```bash
docker compose --profile production up -d
```

---

## Configuration

### Environment variables

No variables are required for standard use. All Azure configuration happens at sign-in time through the browser OAuth flow.

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_AZURE_CLIENT_ID` | Azure CLI public client | Override with a custom app registration |
| `NEXT_PUBLIC_AZURE_TENANT_ID` | `common` | Lock to a specific Azure tenant |
| `APP_NAME` | `Griphook` | Application display name |
| `NODE_EXTRA_CA_CERTS` | — | Path to additional CA certificate (for TLS inspection) |

### Corporate networks

If your network performs TLS inspection with a self-signed certificate, the container must trust it:

```bash
docker run -d --name griphook -p 3000:3000 \
  -v /path/to/corporate-ca.pem:/etc/ssl/certs/corporate-ca.pem \
  -e NODE_EXTRA_CA_CERTS=/etc/ssl/certs/corporate-ca.pem \
  ghcr.io/yafflez/griphook:latest
```

Or add the certificate to `./certs/corporate-ca.pem` before building locally — the Dockerfile copies it automatically and runs `update-ca-certificates`.

---

## Updating

```bash
docker pull ghcr.io/yafflez/griphook:latest
docker stop griphook && docker rm griphook
docker run -d --name griphook -p 3000:3000 ghcr.io/yafflez/griphook:latest
```

---

## Multi-platform builds (maintainers)

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ghcr.io/yafflez/griphook:latest \
  --push .
```

---

## Production deployment

### Resource limits

```bash
docker run -d --name griphook \
  --memory=512m --cpus=1.0 \
  -p 3000:3000 \
  ghcr.io/yafflez/griphook:latest
```

### Behind nginx (HTTPS)

Use the included `nginx.conf` and enable the production profile:

```bash
docker compose --profile production up -d
```

Configure SSL certificates by mounting them into the nginx container as shown in `docker-compose.yml`.

### Health check

The container includes a built-in health check:

```bash
docker inspect griphook --format='{{.State.Health.Status}}'
# View logs
docker logs griphook
# Manual check
docker exec griphook node healthcheck.js
```

---

## Troubleshooting

**Port already in use**
```bash
docker run -d --name griphook -p 8080:3000 ghcr.io/yafflez/griphook:latest
```

**Authentication fails after redirect**

Ensure the browser returns to the same origin the app is running on (`http://localhost:3000`). If you expose Griphook behind a reverse proxy at a different address, the OAuth redirect URI must match — you will need a custom app registration with that redirect URI registered.

**Container won't start**
```bash
docker logs griphook
```

**TLS / certificate errors**

Mount your corporate CA as described in the [Corporate networks](#corporate-networks) section above.

**Image vulnerabilities scan**
```bash
docker scout cves ghcr.io/yafflez/griphook:latest
```
