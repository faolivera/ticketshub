# TicketsHub – AWS Lightsail deployment

Docker image and scripts to run the full app (frontend + backend + Caddy) on an AWS Lightsail instance with TLS for **ticketshub.shop**, **ticketshub.com.ar**, and **ticketshub.ar**.

## Prerequisites

- DNS: A (and optionally AAAA) records for the three domains pointing to your Lightsail instance public IP.
- Docker on the instance.
- Backend env (e.g. `DATABASE_URL`) available via file or environment.

## Build image (CI)

1. In GitHub: **Actions → "Docker image – Lightsail (linux/amd64)" → Run workflow**.
2. Image is pushed as `ghcr.io/<owner>/ticketshub-lightsail:latest` (and `:sha-<sha>`).

## Deploy on the instance

1. Log in to GHCR if the image is private:  
   `docker login ghcr.io` (use a PAT with `read:packages` or use the same token as in the workflow).
2. Optional: create an env file with `DATABASE_URL` and other backend vars.
3. Run from the repo or copy the script onto the server:

   ```bash
   GITHUB_OWNER=yourgithubuser ./release/lightsail/deploy-on-server.sh
   # With env file:
   ENV_FILE=/path/to/.env GITHUB_OWNER=yourgithubuser ./release/lightsail/deploy-on-server.sh
   ```

Caddy inside the container obtains and renews Let's Encrypt certificates automatically. Certificates are stored in the `lightsail_caddy_data` volume so they persist across restarts.

## Build locally

From repo root:

```bash
./release/lightsail/build.sh ticketshub-lightsail:latest
```

For Lightsail x86 use `BUILD_PLATFORM=linux/amd64` (requires Docker Buildx).
