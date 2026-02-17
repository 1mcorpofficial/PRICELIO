#!/usr/bin/env bash
set -euo pipefail

section() {
  echo "\n== $1 =="
}

section "Tooling"
if command -v node >/dev/null 2>&1; then
  echo "node: $(node -v)"
else
  echo "node: MISSING"
fi

if command -v npm >/dev/null 2>&1; then
  echo "npm: $(npm -v)"
else
  echo "npm: MISSING"
fi

if command -v docker >/dev/null 2>&1; then
  echo "docker: $(docker --version)"
else
  echo "docker: MISSING"
fi

if docker compose version >/dev/null 2>&1; then
  echo "docker compose: $(docker compose version)"
else
  echo "docker compose: MISSING"
fi

section "Ports"
if ss -lntp 2>/dev/null | grep -q ':5432'; then
  echo "port 5432: IN USE (set POSTGRES_PORT=55432 in infra/.env)"
else
  echo "port 5432: free"
fi

section "Env files (presence only)"
required_envs=(
  "infra/.env"
  "apps/admin/.env"
  "services/api/.env"
  "services/ai-gateway/.env"
  "services/receipts/.env"
  "services/ingest/.env"
  "services/analytics/.env"
)

for f in "${required_envs[@]}"; do
  if [ -f "$f" ]; then
    echo "$f: OK"
  else
    echo "$f: MISSING"
  fi
done
