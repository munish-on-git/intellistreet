# Security Policy

## Project status

IntelliStreet is an early-stage project. It has **not** had a security audit and should not be deployed with real citizen data until the items under "Known limitations" are resolved.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately using either:

- GitHub's [private vulnerability reporting](../../security/advisories/new) (preferred), or
- Email **[YOUR SECURITY CONTACT EMAIL]** with the subject "IntelliStreet security".

Please include a description, steps to reproduce, affected files/endpoints, and the potential impact. You can expect an acknowledgement within 7 days and we'll keep you updated as we investigate and fix. We're happy to credit you in the release notes if you'd like.

## Supported versions

Only the latest commit on `main` is supported.

## Deploying safely

- Set a strong, random `SECRET_KEY`. Never rely on a default.
- Keep `GEMINI_API_KEY` and any other keys in environment variables, never in the repo.
- Restrict CORS on the Python sidecar to your own origin; don't expose port 8000 publicly.
- Replace the JSON file database and demo accounts before handling real users.

## Known limitations

Contributions fixing these are very welcome:

- Demo-grade authentication (no real password verification/hashing yet).
- JSON file storage with no access isolation or backups.
- Permissive CORS on the Python sidecar.
- No rate limiting on API routes.
