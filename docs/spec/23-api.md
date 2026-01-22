# API surface (logical)

## Auth
- POST /auth/guest
- POST /auth/register
- POST /auth/login
- POST /auth/logout
- GET /me

## Map and city
- GET /map/stores?city=...&filters=...
- GET /stores/{id}
- GET /city/{city}/feed

## Search and products
- GET /search?q=...&city=...
- GET /products/{id}

## Basket
- POST /baskets
- POST /baskets/{id}/items
- POST /baskets/{id}/optimize

## Receipts
- POST /receipts/upload
- GET /receipts/{id}/status
- GET /receipts/{id}/report
- POST /receipts/{id}/confirm
