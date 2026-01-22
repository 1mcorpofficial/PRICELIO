# Security and privacy

## Personal data definition
- Email (registered users) and device identifiers if used for limits.
- Receipt images may include loyalty IDs or names and must be masked.
- Location: city is default; precise location only with opt-in.

## Data minimization
- Store only what features need: item, price, date, store, city.
- Receipt images can be deleted after processing unless vault is enabled.
- Analytics is aggregated unless personalization is enabled.

## Security controls
- JWT sessions with refresh rotation.
- Rate limiting on public endpoints and uploads.
- Basic malware scan on uploads.
- Encrypt at rest and TLS in transit.
- Least privilege between services.

## GDPR features
- Download my data.
- Delete my data.
- Consent log for personalization, location, marketing.
