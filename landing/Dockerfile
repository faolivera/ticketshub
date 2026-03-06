# Multi-arch: use --platform linux/amd64 for Lightsail, linux/arm64 for M2 Mac local.
FROM caddy:2-alpine

# Copy static site
COPY index.html styles.css /srv/

# Copy Caddyfile (optional override at runtime via volume)
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443

# Caddy runs as non-root by default; /srv and /etc/caddy are writable in image
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
