# PRICELIO Web V2

React + Vite + TypeScript rewrite of PRICELIO web frontend.

## Commands

- `npm -w apps/web run dev`
- `npm -w apps/web run build`
- `npm -w apps/web run test`
- `npm -w apps/web run e2e`

## Core architecture

- Public routes: `/`, `/demo`, `/auth`
- Protected routes: `/app/*`
- Stores: `authStore`, `demoStore`, `uiStore`, `gamificationStore`, `missionsStore`
- Realtime: SSE via `/events/user/stream`
- Funnel analytics: `/events/ui`
- PWA: `vite-plugin-pwa`
