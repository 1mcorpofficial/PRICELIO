# PRICELIO Web V2

React + Vite + TypeScript rewrite of PRICELIO web frontend.

## Commands

- `npm -w apps/web run dev`
- `npm -w apps/web run build`
- `npm -w apps/web run test`
- `npm -w apps/web run e2e`
- `npm run cutover:web` (builds V2 and replaces legacy root static shell)
- `npm run rollback:web` (restores latest legacy backup)

## Core architecture

- Public routes: `/`, `/demo`, `/auth`
- Protected routes: `/app/*`
- Stores: `authStore`, `demoStore`, `uiStore`, `gamificationStore`, `missionsStore`
- Realtime: SSE via `/events/user/stream`
- Funnel analytics: `/events/ui`
- PWA: `vite-plugin-pwa`

## Production cutover (legacy static root)

If production currently serves root files (`index.html`, `styles.css`, `app.js`) instead of `apps/web`, use:

1. `git pull`
2. `npm ci`
3. `npm run cutover:web`

This creates a backup in `.legacy-web-backup/<timestamp>` and copies `apps/web/dist` output to root so existing static hosting immediately serves Web V2.
