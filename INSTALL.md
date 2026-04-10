# How to Use Griphook

Griphook runs as a local web application inside Docker. There is nothing to install — just pull the image and open your browser.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS / Linux)
- An Azure account with access to at least one Key Vault

---

## Step 1 — Run the container

```bash
docker run -d --name griphook -p 3000:3000 ghcr.io/yafflez/griphook:latest
```

Or with Docker Compose:

```bash
docker compose up -d
```

## Step 2 — Open the app

Navigate to **http://localhost:3000** in your browser.

## Step 3 — Sign in with Azure

Click **Sign in with Azure** and complete the Microsoft login flow using your corporate or personal Azure account. The app uses standard OAuth 2.0 PKCE — no app registration or admin consent is required.

## Step 4 — Select subscriptions

After sign-in, Griphook discovers all Azure subscriptions your account has access to. Select the subscriptions you want to load Key Vaults from, then click **Continue**.

## Step 5 — Select a Key Vault

Choose a Key Vault from the list to start managing its secrets.

---

## Managing Secrets

| Action | How |
|--------|-----|
| View a secret value | Click the eye icon on any row |
| Show / hide all values | Click **Show All Values** / **Hide All Values** in the toolbar |
| Search | Type in the search box — searches both names and loaded values |
| Add a secret | Click **Add Secret** |
| Edit a secret | Click the pencil icon on any row |
| Batch edit | Click **Batch Edit** to edit multiple secrets in one view |
| Delete secrets | Tick the checkboxes, then click **Delete** |
| Switch Key Vault | Click **← Back to Key Vaults** in the header |
| Sign out | Click **Sign Out** in the top-right corner |

---

## Corporate Networks (TLS inspection)

If your company intercepts HTTPS traffic with a self-signed CA, the container needs to trust it:

```bash
docker run -d --name griphook -p 3000:3000 \
  -v /path/to/corporate-ca.pem:/etc/ssl/certs/corporate-ca.pem \
  -e NODE_EXTRA_CA_CERTS=/etc/ssl/certs/corporate-ca.pem \
  ghcr.io/yafflez/griphook:latest
```

---

## Updating

```bash
docker pull ghcr.io/yafflez/griphook:latest
docker stop griphook && docker rm griphook
docker run -d --name griphook -p 3000:3000 ghcr.io/yafflez/griphook:latest
```

---

## Azure Permissions

Griphook uses your signed-in identity — it can only access Key Vaults you already have RBAC access to.

| Role | What it enables |
|------|----------------|
| **Key Vault Secrets User** | List and read secret values |
| **Key Vault Secrets Officer** | Create, update, and delete secrets |

Assign roles in the Azure Portal under your Key Vault → **Access control (IAM)**.

---

## Troubleshooting

**Container exits immediately**
```bash
docker logs griphook
```

**Port 3000 already in use**
```bash
docker run -d --name griphook -p 8080:3000 ghcr.io/yafflez/griphook:latest
# then open http://localhost:8080
```

**No Key Vaults found after sign-in**
- Confirm your account has RBAC roles on the Key Vault
- Check the subscription selection screen — make sure the right subscriptions are ticked
- Try entering the vault URL manually if discovery fails

**Authentication error after sign-in redirect**
- Ensure the redirect lands back on `http://localhost:3000` (not a different address)
- Sign out and try again

For more detail see [DOCKER.md](DOCKER.md).
