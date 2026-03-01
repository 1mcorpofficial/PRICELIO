# Web deploy – naujas Deep Space Purple dizainas

## Problema
Production serveris rodė **seną** dizainą (žalias/mėlynas) iš root `index.html` + `styles.css` + `app.js`.

**Naujas** dizainas (Deep Space Purple, Glassmorphism) yra React SPA `apps/web`.

## Sprendimas

### 1. Lokaliai (po kiekvieno frontend pakeitimo)
```bash
npm run cutover:web
```
Tai:
- buildina `apps/web`
- perrašo root `index.html`, `assets/`, `manifest.webmanifest`, `icon.svg`, `sw.js` nauju build

### 2. VPS / production deploy
**Variantas A** – cutover rezultatas jau commit'intas:
```bash
git pull
# Nginx/static serveris rodo root – naujas dizainas jau matomas
```

**Variantas B** – cutover paleidžiamas serveryje:
```bash
git pull
npm install
npm run cutover:web
# Perkrauk nginx: sudo systemctl reload nginx
```

### 3. Cache
Jei vartotojai vis dar mato seną dizainą:
- Hard refresh: Ctrl+Shift+R (arba Cmd+Shift+R)
- PWA service worker gali cache'inti – išvalyk naršyklės cache arba atnaujink PWA

## Failų struktūra po cutover
- `index.html` – React SPA entry (nuorodos į `/assets/`)
- `assets/` – JS, CSS bundle'ai
- `manifest.webmanifest`, `icon.svg`, `sw.js`, `workbox-*.js` – PWA
