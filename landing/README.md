# Landing (Coming Soon)

Minimal static landing page served by Caddy for **ticketshub.shop**. No logo or app name—just “Coming soon.” Styling matches the main app (Plus Jakarta Sans, light background, dark text).

## Build and publish to ghcr.io (from repo root)

From the repo root, build and push the landing image for Lightsail (amd64) and publish to GitHub Container Registry:

```bash
npm run landing:publish
```

This runs `release/landing/landing-publish.sh`: builds the image for `linux/amd64`, prompts for a version tag (default `latest`), then tags and pushes to `ghcr.io/<GITHUB_OWNER>/ticketshub-landing:<tag>`. Requires `docker login ghcr.io` first. `GITHUB_OWNER` is derived from `git remote origin` or set the env var.

**Build only (no push):**

```bash
npm run landing:build
```

Builds `landing:latest` for amd64. To build for local M2 (arm64), run `./release/landing/build.sh latest linux/arm64` or from `landing/`: `docker build -t landing .`.

## Manual build (from landing dir)

**On M2 Mac (ARM64) — local or same-arch:**

```bash
cd landing && docker build -t landing .
```

**For AWS Lightsail (x86_64/amd64):**

```bash
cd landing && docker build --platform linux/amd64 -t landing .
```

You can build and push from your M2; the image will run on Lightsail.

## Run

**HTTP only (default):**

```bash
docker run -p 80:80 -p 443:443 --rm landing
```

Open http://localhost — Caddy serves the static site on port 80.

**HTTPS with automatic certificates (production at ticketshub.shop):**

Set `DOMAIN=ticketshub.shop` so Caddy can obtain a Let’s Encrypt certificate. Persist `/data` so certs are reused:

```bash
docker run -p 80:80 -p 443:443 \
  -e DOMAIN=ticketshub.shop \
  -v landing_caddy_data:/data \
  --rm landing
```

Caddy will serve HTTPS on 443 and redirect HTTP to HTTPS. Ensure ports 80 and 443 are open and ticketshub.shop DNS A record points to the host.

## Deploy on AWS Lightsail

1. **Instance:** Create a Lightsail instance (Amazon Linux 2 or 2023, x86_64). ARM (Graviton) is available on some plans; use amd64 unless you choose an ARM instance (then build with `--platform linux/arm64`).

2. **Docker:** Install Docker on the instance, then load or pull your image (e.g. from a registry or by building there).

3. **Run the container:**

   - HTTP only:
     ```bash
     docker run -d -p 80:80 -p 443:443 --name landing --restart unless-stopped landing
     ```
   - HTTPS at ticketshub.shop:
     ```bash
     docker run -d -p 80:80 -p 443:443 \
       -e DOMAIN=ticketshub.shop \
       -v landing_caddy_data:/data \
       --name landing --restart unless-stopped ghcr.io/YOUR_GITHUB_OWNER/ticketshub-landing:latest
     ```
     (Replace `YOUR_GITHUB_OWNER` with your GitHub user/org. Build and push the image first with `npm run landing:publish` from repo root.)

4. **Firewall:** In the Lightsail networking tab, allow TCP 80 and 443.

5. **DNS:** Point ticketshub.shop A record to the instance’s static IP.

Using **Amazon Linux 2023** is recommended; it supports both x86_64 and ARM (Graviton). On an M2 Mac, build with `--platform linux/amd64` for standard Lightsail x86 instances, or `--platform linux/arm64` if you use an ARM-based instance.
