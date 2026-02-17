#!/usr/bin/env bash
set -euo pipefail

cd infra

docker compose logs --tail=200
