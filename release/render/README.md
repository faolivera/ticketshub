# Render beta – single image (Caddy + backend)

This folder contains everything to build and publish the TicketsHub Docker image for Render: Caddy serves the frontend and reverse-proxies to the Node backend.

## Plan and layout

- **Full plan**: [PLAN.md](./PLAN.md) – backend changes, Docker design, migrations, seeds, env vars, and scripts.
- **Artifacts**: `Dockerfile`, `Caddyfile`, `entrypoint.sh`, `build.sh`, `publish.sh`. The `.dockerignore` used by the build is at the **repo root** (context is the repo root when building).

## Environment variables (set on Render)

| Variable | Required | Purpose |
|----------|----------|---------|
| `ENVIRONMENT` | Yes | `prod` |
| `DATABASE_URL` | Yes | Postgres URL |
| `JWT_SECRET` | Yes | JWT signing |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Yes | S3 |
| `S3_PRIVATE_BUCKET`, `S3_PUBLIC_BUCKET` | Yes | Bucket names |
| `PORT` | Set by Render | Backend must read it |

Optional: `JWT_EXPIRES_IN`, `S3_ENDPOINT`, and payment gateway vars if used.

## Build and publish (from repo root)

- **Build image**: `npm run render:build` or `./release/render/build.sh [tag]`.  
  Builds the backend on the host first, then runs `docker build`. By default the image is for your host arch (good for `./release/render/run-local.sh`).
- **Build for Render (linux/amd64)**: Install [Docker Buildx](https://docs.docker.com/go/buildx/), then run `BUILD_PLATFORM=linux/amd64 npm run render:build`. Or on Render: use "Docker" and set the Dockerfile path to `release/render/Dockerfile` so Render builds from the repo on their amd64 servers.
- **Publish to GitHub Container Registry**: `npm run render:publish` or `./release/render/publish.sh [tag]` (after `docker login ghcr.io`).

See [PLAN.md](./PLAN.md) for details and implementation checklist.
