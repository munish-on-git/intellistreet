# Contributing to IntelliStreet

Thanks for your interest in improving IntelliStreet! This guide explains how to get set up and how to get a change merged.

By participating you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md). By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).

## Ways to contribute

- Report bugs or suggest features via [issues](../../issues/new/choose).
- Improve documentation or fix typos.
- Pick up an issue labelled `good first issue` or `help wanted`.
- Review open pull requests.

**Security problems:** please don't open a public issue. See [SECURITY.md](SECURITY.md).

## Development setup

1. Fork the repo and clone your fork.
2. Install and configure:
   ```bash
   cp .env.example .env     # set GEMINI_API_KEY and a random SECRET_KEY
   npm install
   npm run dev              # http://localhost:3000
   ```
3. (Optional) Python sidecar, from the repo root:
   ```bash
   python3 -m venv venv && source venv/bin/activate
   pip install -r backend_python/requirements.txt
   python3 -m uvicorn backend_python.main:app --port 8000 --reload
   ```

The app works without a Gemini key (AI features fall back to defaults) and without a Mappls key (Leaflet is used).

## Making a change

1. Create a branch from `main`: `git checkout -b fix/short-description`.
2. Keep the change focused. One logical change per pull request.
3. Before pushing, make sure these pass:
   ```bash
   npm run lint
   npx tsc --noEmit
   npm run build
   ```
4. Commit with clear messages. We loosely follow [Conventional Commits](https://www.conventionalcommits.org/) (`fix: ...`, `feat: ...`, `docs: ...`).
5. Open a pull request against `main` and fill in the template. Link the issue it closes (`Closes #123`).

For anything large (new feature, refactor, schema change), **open an issue first** so we can agree on the approach before you invest the time.

## Code style

- **TypeScript/React:** follow the existing ESLint config; prefer typed code over `any`; keep components small.
- **Python:** PEP 8, type hints on public functions.
- **API routes:** validate input, check the auth token and role, and return consistent `{ error: "..." }` JSON on failure.
- Don't commit secrets, `.env` files, personal data, or large binaries. Uploaded images and seed data must be fake or properly licensed.

## Pull request checklist

- [ ] Lint, type-check and build pass locally
- [ ] Docs/README updated if behaviour or configuration changed
- [ ] No secrets or real personal data included
- [ ] Screenshots attached for UI changes

## Review process

A maintainer will review your PR, usually within a week. We may ask for changes; please respond in the PR thread. Once approved, a maintainer will merge it.

## Questions?

Open a [discussion](../../discussions) or an issue labelled `question`.
