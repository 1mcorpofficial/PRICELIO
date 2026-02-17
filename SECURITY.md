# Security Policy

## Do Not Commit Secrets
- Never commit `.env` or `.env.*` files.
- Use `.env.example` files with placeholders only.
- Scan for secrets before pushing.

## Rotate Secrets
- Rotate any credentials that have been shared or committed in the past.
- Regenerate API keys on provider dashboards.
- Use unique secrets per environment (dev/stage/prod).

## Strong Passwords
- Use strong, unique passwords for all services.
- Store only hashed passwords (bcrypt recommended).
- Avoid default or example passwords in documentation.

## Least Privilege
- Grant the minimum required permissions to services and users.
- Separate credentials per service.
- Restrict database roles and network access.

## Transport & Storage
- Use HTTPS in production.
- Use encrypted storage for sensitive data.
- Protect admin endpoints with authentication and auditing.

## Incident Response
- If a secret leak is suspected, rotate immediately and audit access logs.
