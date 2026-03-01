# B2C Redesign Workbench

Prepared: 2026-02-22
Scope: prepare implementation workspace for B2C UI/UX redesign on existing PRICELIO engine.

## 1) Active Frontend System (Source of Truth)

- Main B2C PWA is in repo root:
- `index.html`
- `styles.css`
- `app.js`
- `apps/web/` is currently only a placeholder and is not active runtime UI.
- `apps/admin/` is separate admin panel and should stay untouched for B2C redesign.

## 2) Baseline Health Check

- Root tests executed before design changes:
- `npm test` -> 14/14 passing.

## 3) Current UI Architecture Map

### Navigation

- View switching is handled in `app.js` (`bindNavigation()`, `setView()`).
- Desktop app nav is `.view-nav` (horizontal top tabs).
- Mobile app nav is `.mobile-bottom-nav` (active under `@media (max-width: 660px)`).
- Both desktop and mobile nav buttons use `.nav-btn` and `data-view`.

### Mission Flow (technical wires currently visible)

- Mission UI currently exposes technical fields in `index.html`:
- `#missionLat`, `#missionLon`, `#missionMediaHash`, manual mission submit/verify IDs.
- Mission actions in `app.js`:
- `loadNearbyMissions()` reads lat/lon from inputs.
- `submitMission()` sends `product_canonical_name`, `barcode`, optional `location_lat/location_lon`, optional `media_hash`.
- Backend supports optional lat/lon on `/missions/nearby` and `/missions/:id/submit` payload.

### Gamification

- Overview gamification uses KPI text only (`#kpiRank`, `#kpiLevel`, `#kpiXp`, `#kpiPoints`).
- `renderGamification()` currently does not render progress bars or milestone visuals.
- Existing endpoints available for progress calculation:
- `/me/gamification` (lifetime XP, rank)
- `/ranks` (level/min_xp thresholds)

### Error and Feedback UX

- Core error plumbing already exists:
- `toApiErrorLabel(error)` converts API errors.
- `renderError()` renders inline error state.
- `showToast()` handles global notifications.
- This gives a direct place to replace technical wording with user-friendly copy.

## 4) Gap Analysis Against Planned 4 Blocks

### Block A: UI Foundations

- Good base already exists: design tokens, glass cards, gradients, rounded corners.
- Missing: dedicated gamification accent tokens (XP gold, timer neon, reward highlights), clearer visual hierarchy for B2C emotional tone.

### Block B: UX Structure / Navigation

- Mobile bottom nav already exists (good baseline).
- Desktop still uses horizontal tab strip; no left sidebar structure yet.
- Need structural shift to sidebar on desktop while preserving mobile bottom nav.

### Block C: Hide Technical Wires

- Major gap: mission submit view currently reveals implementation-level inputs (lat/lon/media hash/ids).
- Need to replace with guided mission cards, location capture in background, and simple user actions.

### Block D: Gamification Visual Revamp

- Major gap: no XP progress bar to next level, no reward animations, no visual progression states.
- Leaderboard exists but lacks high-energy B2C visual treatment.

## 5) Prepared Implementation Sequence (recommended)

1. Foundation pass
- Extend token system in `styles.css` for gamification accents and semantic surfaces.
- Normalize card elevation/radius patterns for all primary panels.

2. Navigation transform pass
- Desktop: convert app shell to sidebar + content grid.
- Mobile: keep bottom nav, introduce central scan CTA priority.

3. Mission UX cleanup pass
- Remove technical mission fields from visible form.
- Auto-resolve location via existing geolocation helper.
- Keep only user-understandable mission actions.

4. Gamification pass
- Add XP progress bar and next-level delta.
- Add lightweight XP gain animation hook on successful events (receipt scan, mission submit).

5. Error language pass
- Map common API error codes to friendly human messages and illustrations/empty states.

## 6) File-Level Edit Map for Upcoming Prompts

- `index.html`
- Restructure desktop nav markup and mission section UI content.
- Add containers for XP progress and reward animation.

- `styles.css`
- Add/adjust design tokens for gamification accents.
- Add sidebar layout, mobile CTA emphasis, mission card visual layer, progress/animation styles.

- `app.js`
- Update nav interaction for sidebar + bottom nav parity.
- Replace mission-input dependency with background geolocation and guided interactions.
- Implement XP progress computation using `/me/gamification` + `/ranks`.
- Add friendly error-message mapping layer on top of `toApiErrorLabel`.

## 7) Constraints and Non-Goals for Safety

- Do not move runtime UI to `apps/web` during redesign phase.
- Do not change admin panel (`apps/admin`) unless explicitly requested.
- Keep current backend contracts; prefer frontend-only upgrades first.
- Keep language key system (`data-i18n`) intact and extend it when adding new labels.

## 8) Ready State

Workspace is mapped and prepared for prompt-by-prompt execution.
No blockers found for starting either:
- Dashboard-first redesign, or
- Gamification-first redesign.
