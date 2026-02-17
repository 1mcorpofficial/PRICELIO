# Admin Panel

Data quality and operations dashboard for ReceiptRadar.

## Features

- **Dashboard Stats**: Real-time overview of receipts, offers, and matching status
- **Low Confidence Review**: Review and confirm receipts with low extraction confidence
- **Unmatched Products**: View and map frequently unmatched product names
- **Connector Health**: Monitor flyer ingest connector status
- **Product Mapping**: Create manual aliases for better matching

## Admin Credentials

Set credentials via environment variables (do not commit `.env`):

```
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=CHANGEME_STRONG
```

Generate a bcrypt hash, for example:

```
node -e "const bcrypt=require('bcrypt'); console.log(bcrypt.hashSync('CHANGEME_STRONG', 10))"
```

## Setup

```bash
cd apps/admin
npm install
cp ../../services/api/.env.example .env
# Add ADMIN_EMAIL and ADMIN_PASSWORD_HASH in apps/admin/.env
npm run dev
```

Then open http://localhost:3003

## API Endpoints

### Authentication
- `POST /login` - Admin login (sets httpOnly session cookie)
- `POST /logout` - Admin logout (clears session cookie)

### Dashboard
- `GET /api/dashboard/stats` - Key metrics
- `GET /api/receipts/low-confidence` - Receipts needing review
- `GET /api/receipts/:id` - Receipt detail with items
- `POST /api/receipts/:id/items/:itemId/confirm` - Confirm item match

### Products
- `GET /api/products/unmatched` - Unmatched product names
- `POST /api/products/create-mapping` - Create product alias

### Connectors
- `GET /api/connectors/health` - Connector status

## Security

In production:
1. Use strong, unique admin password hashes
2. Use DB-backed admin users (`admin_users`) with bcrypt hashes
3. Add rate limiting
4. Enable HTTPS only
5. Add audit logging
6. Implement RBAC (role-based access control)

## Future Enhancements

- Receipt image viewer
- Bulk product mapping
- Extraction quality trends
- Price anomaly alerts
- Manual offer entry
- Store management UI
