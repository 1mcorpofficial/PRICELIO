# PRICELIO Production Checklist

## Mobile (Flutter)

- [x] `flutter analyze` – no issues
- [x] Android platform configured (`app.pricelio.app`)
- [x] minSdk 21 (mobile_scanner)
- [x] Camera, Internet permissions
- [x] iOS Face ID usage description (warranty vault)
- [x] API base URL: `https://api.pricelio.app` (override via `--dart-define=API_BASE_URL=...`)
- [ ] Release signing: configure `android/app/build.gradle.kts` with production keystore
- [ ] iOS: configure signing in Xcode for distribution

## Web (React/Vite)

- [x] `npm run build` – succeeds
- [x] PWA manifest, service worker
- [x] `VITE_API_BASE` – use `/api` when proxied, or `https://api.pricelio.app` for CORS
- [ ] Set `VITE_API_BASE` in production `.env`

## API (Node.js)

- [x] `JWT_SECRET` – required (throws on missing)
- [x] `RABBITMQ_URL` – required in production (no dev fallback)
- [x] `COOKIE_SECURE=true` in production
- [x] CORS allowlist: `https://pricelio.app`, `https://www.pricelio.app`
- [ ] Set `PGPASSWORD`, `JWT_SECRET`, `RABBITMQ_URL`, `CORS_ALLOWLIST` in production `.env`
- [ ] `NODE_ENV=production`

## Environment Variables (Production)

| Variable | Required | Example |
|----------|----------|---------|
| `JWT_SECRET` | Yes | Strong random string |
| `PGPASSWORD` | Yes | DB password |
| `RABBITMQ_URL` | Yes | `amqp://user:pass@host:5672` |
| `CORS_ALLOWLIST` | Yes | `https://pricelio.app,https://www.pricelio.app` |
| `COOKIE_SECURE` | Yes | `true` |
| `VITE_API_BASE` (web) | Yes | `/api` or `https://api.pricelio.app` |
