# Render beta deployment – “set env and run the image”

Single Docker image: Caddy serves the frontend and reverse-proxies `/api` and `/socket.io` to the Node backend. One entrypoint runs migrations, optional terms seed, then starts backend + Caddy. All build and publish assets live under **repository root: `release/render/`**.

---

## 1. Directory layout (all under `release/render/`)

```
release/render/
├── PLAN.md                 # This plan
├── README.md               # How to build, run, and set env vars (for Render)
├── Dockerfile              # Multi-stage: frontend build, backend build, runtime
├── Caddyfile               # Serve static + reverse proxy to backend
├── entrypoint.sh           # Migrate, seed terms, start backend, exec Caddy
├── build.sh                # Build image (e.g. docker build -t ticketshub:latest .)
├── publish.sh              # Tag and push to GitHub Container Registry (ghcr.io)
└── .dockerignore           # Reduce context (node_modules, .git, etc.)
```

- **Build/publish**: Run from repo root; scripts in `release/render/` invoke `docker` with context at repo root and Dockerfile at `release/render/Dockerfile` (e.g. `docker build -f release/render/Dockerfile -t ticketshub:latest .`).

---

## 2. Backend code changes (in main repo, not under `release/`)

### 2.1 Listen on `PORT` (required for Render)

- **File**: `backend/src/main.ts`
- **Change**: Use `process.env.PORT` when present so Render can assign the port.
  - Example: `const port = process.env.PORT ?? 3000; await app.listen(port);`
- **Default**: Keep `3000` for local and for Caddy proxy inside the container.

### 2.2 CORS for production

- **File**: `backend/src/main.ts`
- **Current**: `origin: 'http://localhost:5173'`.
- **Change**: In production (e.g. when `ENVIRONMENT === 'prod'` or when `NODE_ENV === 'production'`), allow the request origin (or a fixed list including the Render URL) so the browser accepts responses when the frontend is served from the same host (Caddy). Options:
  - **Option A**: Allow any origin when in production (simplest for beta): e.g. `origin: true` or a function that returns the request’s `Origin` when in prod.
  - **Option B**: Set `CORS_ORIGIN` (or similar) in env and use that as the allowed origin(s) so you can pin the Render URL.

No other backend config changes are required for “set env and run”; HOCON already uses `${?VAR}` for all needed variables.

---

## 3. Terms and conditions seed at container startup

- **Goal**: Run terms seed automatically so no manual command is needed.
- **Current**: `backend/scripts/seed-terms.ts` is run with `ts-node`; it uses `loadHoconConfig` and Prisma (with pg adapter).
- **Approach**: Make the seed runnable from the **built** backend so the image does not need `ts-node` or full backend `src/` at runtime.

**Option A (recommended)**  
- Add a small **compiled** entry point that runs the same logic as `seed-terms.ts` and can be executed with `node dist/...`.
  - Move the seed logic into something that Nest/build compiles (e.g. `backend/src/scripts/seed-terms-runner.ts` that uses `loadHoconConfig` and Prisma, and is invoked by a thin CLI).
  - Or keep the current script but add a build step that compiles `scripts/seed-terms.ts` (and its dependencies) into `dist/scripts/seed-terms.js` (e.g. a separate `tsconfig.scripts.json` that includes `scripts/**/*.ts` and outputs to `dist/scripts`).
- In the Docker **entrypoint**, after `prisma migrate deploy`, run:  
  `node dist/src/scripts/seed-terms.js` from the backend directory (Nest outputs under `dist/src/`).  
- The script must run with `process.cwd()` equal to the backend root so `config/` and `.env` resolution work (same as today).

**Option B**  
- Keep running the existing script with `ts-node` in the image. That requires installing `ts-node` (and `tsconfig-paths`) in the **production** image and copying backend `src/` (or at least `config/` + `scripts/` + `src/config/`). Simpler to add but larger image and dev deps in prod.

**Recommendation**: Implement Option A (compiled seed) and call it from the entrypoint so the image stays minimal and “set env and run” does not depend on extra tools.

---

## 4. Migrations

- **When**: Before the backend process starts, once per container start (or per release on Render).
- **Where**: In the same **entrypoint** that later starts the backend.
- **Command**: From the backend directory (in the image), run:  
  `npx prisma migrate deploy`  
  with `DATABASE_URL` (and optionally `ENVIRONMENT`) set.
- **Prisma**: Ensure the image includes `backend/prisma/migrations/` and the generated Prisma client so `prisma migrate deploy` works. The Dockerfile backend stage should copy `prisma/` and run `prisma generate` (and optionally `prisma migrate deploy` at build time is not required; run it at runtime in the entrypoint).

---

## 5. Docker image design

### 5.1 Multi-stage build

1. **Stage: frontend**  
   - Base: `node` (LTS).  
   - Copy `frontend/` (package.json, source, etc.).  
   - `npm ci` and `npm run build`.  
   - Output: `frontend/dist` (Vite default).

2. **Stage: backend**  
   - Base: `node` (LTS).  
   - Copy `backend/` (package.json, prisma schema and migrations, source).  
   - `npm ci` and `npm run build` (Nest), plus Prisma generate (and any script build for Option A).  
   - Output: `backend/dist`, `backend/node_modules`, `backend/prisma`, `backend/config`, and if Option A: compiled seed script under `dist/scripts/`.

3. **Stage: runtime**  
   - Base: minimal image (e.g. `alpine` or `debian-slim`).  
   - Install Caddy (official image or static binary).  
   - Copy from frontend stage: `frontend/dist` → e.g. `/app/frontend/dist`.  
   - Copy from backend stage: backend `dist`, `node_modules`, `prisma`, `config`, and (if needed) `package.json`.  
   - Copy `release/render/Caddyfile` and `release/render/entrypoint.sh`.  
   - Set `WORKDIR` to backend directory (e.g. `/app/backend`) so Prisma and Node run from there.  
   - Expose one port (e.g. `8080` or `80`) for Caddy.  
   - **ENTRYPOINT**: `entrypoint.sh`.

### 5.2 Caddyfile

- Listen on the exposed port (e.g. `:8080`).
- **Root**: serve static files from the frontend build (e.g. `/app/frontend/dist`).
- **Try files**: SPA fallback (e.g. `try_files {path} /index.html`).
- **Reverse proxy**:
  - `/api` → `http://127.0.0.1:3000` (or the port the backend listens on).
  - `/socket.io` → `http://127.0.0.1:3000` (WebSocket + polling).
- Optional: `/health` → backend for liveness.

Backend will listen on `PORT` (or 3000) **inside** the container; Caddy is the only process bound to the external port.

### 5.3 Entrypoint (`entrypoint.sh`)

- Must be executable and use a shell that exists in the runtime image (e.g. `#!/bin/sh`).
- Order of operations:
  1. Export or ensure `DATABASE_URL` (and any required env) is set (Render will inject these).
  2. Run migrations: `npx prisma migrate deploy` (from backend dir).
  3. Run terms seed (Option A): `node dist/scripts/seed-terms.js` (or the chosen path).
  4. Start the backend in the background: `node dist/main.js &` (or `npm run start:prod`). Ensure the process uses `PORT` if set (backend reads `process.env.PORT`).
  5. **Exec** Caddy so it becomes PID 1: `exec caddy run --config /path/to/Caddyfile` (or `exec caddy run` if config is default).
- Backend must listen on the same port that the Caddyfile uses for the reverse proxy (e.g. 3000 inside the container).

---

## 6. Environment variables (for Render and docs)

Document in `release/render/README.md` and in Render’s UI. The container must receive at least:

| Variable           | Required | Purpose |
|--------------------|----------|--------|
| `ENVIRONMENT`      | Yes      | Set to `prod` so `config/prod.conf` is used. |
| `DATABASE_URL`     | Yes      | Postgres connection string. |
| `JWT_SECRET`       | Yes      | JWT signing. |
| `AWS_REGION`       | Yes      | S3 region. |
| `AWS_ACCESS_KEY_ID`| Yes      | S3 access. |
| `AWS_SECRET_ACCESS_KEY` | Yes  | S3 secret. |
| `S3_PRIVATE_BUCKET`| Yes      | Private bucket name. |
| `S3_PUBLIC_BUCKET` | Yes      | Public bucket name. |
| `PORT`             | No       | Set by Render; backend must use it (see §2.1). |
| `JWT_EXPIRES_IN`   | No       | Optional override. |
| `S3_ENDPOINT`      | No       | Optional for S3-compatible endpoints. |

Payment gateway vars (e.g. `MERCADOPAGO_*`, `UALA_BIS_*`) only if those features are used.

---

## 7. Build and publish scripts (in `release/render/`)

### 7.1 `build.sh`

- Run from **repo root**: `./release/render/build.sh` (or `bash release/render/build.sh`).
- Uses Docker context = repo root, Dockerfile = `release/render/Dockerfile`.
- Builds a single image, e.g. tagged as `ticketshub:latest` or `ticketshub:$(git describe --tags --always)`.
- No push; only local build.

### 7.2 `publish.sh`

- Run from repo root: `./release/render/publish.sh`.
- Tags the image for **GitHub Container Registry** (e.g. `ghcr.io/<owner>/ticketshub:latest`).
- Pushes to `ghcr.io` (requires `docker login ghcr.io` or `echo $GITHUB_TOKEN | docker login ghcr.io -u <user> --password-stdin`).
- Script should accept optional version/tag (e.g. `latest`, or a git tag); default `latest`.

### 7.3 `.dockerignore` (at repo root or next to Dockerfile)

- Ignore: `node_modules`, `.git`, `frontend/node_modules`, `backend/node_modules`, `backend/dist`, `frontend/dist`, `.env`, `*.log`, `.cursor`, `docs`, `backend/test`, `frontend/.vite`, etc., so the Docker context is small and build is fast.

---

## 8. Render-specific notes

- **Service type**: Web Service.
- **Image**: Either build from the repo (Dockerfile path `release/render/Dockerfile`, root as context) or use a pre-built image from `ghcr.io` (pushed by `publish.sh`).
- **Env**: Set all variables from §6 in Render’s Environment tab; no `.env` file in the image.
- **Health check**: If you add `/health` in Caddy that proxies to the backend, set Render’s health path to `/health`.
- **Single instance**: For beta, one instance is enough; no need for sticky sessions if you keep one instance.

---

## 9. Implementation checklist

- [x] Backend: add `PORT` support in `backend/src/main.ts`.
- [x] Backend: adjust CORS for production (origin from env or allow same origin).
- [x] Backend: make terms seed runnable as compiled script (Option A); `src/scripts/seed-terms.ts` → `dist/src/scripts/seed-terms.js`.
- [x] Add `release/render/Dockerfile` (multi-stage: frontend, backend, runtime).
- [x] Add `release/render/Caddyfile` (static + reverse proxy).
- [x] Add `release/render/entrypoint.sh` (migrate → seed terms → backend in background → exec Caddy).
- [x] Add `release/render/build.sh` and `release/render/publish.sh`.
- [x] Add root `.dockerignore` (context is repo root when building).
- [x] Add `release/render/README.md` with env list and how to build/run/publish.

No open questions blocking the plan: backend PORT and CORS are defined; migrations and optional terms seed are in the entrypoint; Caddy + Node layout and env vars are specified. If you want to avoid compiling the terms seed (Option B), the plan only changes by keeping `ts-node` in the image and running the existing script from the entrypoint.
