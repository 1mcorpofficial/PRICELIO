# Admin Panel

Data quality and operations dashboard for ReceiptRadar.

## Features

- **Dashboard Stats**: Real-time overview of receipts, offers, and matching status
- **Low Confidence Review**: Review and confirm receipts with low extraction confidence
- **Unmatched Products**: View and map frequently unmatched product names
- **Connector Health**: Monitor flyer ingest connector status
- **Product Mapping**: Create manual aliases for better matching

## Demo Credentials

```
Email: admin@receiptradar.app
Password: admin123
```

⚠️ **Change these in production!**

## Setup

```bash
cd apps/admin
npm install
cp ../../services/api/.env.example .env
npm run dev
```

Then open http://localhost:3003

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login

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
1. Use strong JWT secret (`JWT_SECRET` env var)
2. Implement proper admin user management with bcrypt
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
