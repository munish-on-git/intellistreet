
# IntelliStreet

**AI-assisted civic engagement and GIS platform.** Citizens report municipal issues (potholes, broken streetlights, flooding, waste collection), neighbours verify them, and authorities get a map-based dispatch dashboard.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)

> **Status: early-stage.** IntelliStreet is a working prototype, not production-ready. Authentication is demo-grade and the database is a local JSON file. See [SECURITY.md](SECURITY.md) and the open issues before deploying anywhere public.

## Features

- **AI photo categorisation:** upload a photo and Gemini suggests the issue category.
- **Live GIS map:** all reports on one map (Mappls with an OpenStreetMap/Leaflet fallback), with a "space-to-street" zoom for inspecting a location.
- **Peer verification:** citizens confirm or deny reports; consensus marks a report as verified.
- **Community discussion:** comments on each report.
- **Admin command centre:** filter by status, priority and category, track SLAs, dispatch crews.
- **Swachh Connect:** role-based door-to-door waste-collection flow for citizens, admins, zonal officers and field crews (OTP-confirmed pickups).
- **Pattern learning:** a Python sidecar clusters complaints to highlight problem zones.

## Architecture

```
Browser ──► Next.js 15 / React 19 (port 3000)
              ├─ API routes + JSON file DB (data/intellistreet_db.json)
              └─ proxies to ──► FastAPI sidecar (port 8000)
                                 ├─ Gemini vision sensing
                                 ├─ pattern learning
                                 └─ agent workflows
```

The Next.js server starts the Python sidecar automatically on first use (`lib/pythonSidecar.ts`), so you normally only need to run one command.

## Getting started

**Prerequisites:** Node.js 20+, Python 3.10+ (for the AI sidecar).

```bash
git clone https://github.com/OWNER/REPO.git
cd REPO
cp .env.example .env      # then fill in your keys
npm install
npm run dev               # http://localhost:3000
```

To run the Python sidecar manually (optional, from the **repository root**):

```bash
python3 -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r backend_python/requirements.txt
python3 -m uvicorn backend_python.main:app --host 127.0.0.1 --port 8000 --reload
# API docs: http://127.0.0.1:8000/docs
```

### Configuration

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | For AI features | Google Gemini API key ([get one](https://aistudio.google.com/apikey)). Without it, AI categorisation falls back to defaults. |
| `SECRET_KEY` | **Yes, always set your own** | Secret used to sign login tokens. Use a long random string. |
| `NEXT_PUBLIC_MAPPLS_API_KEY` | No | Mappls (MapmyIndia) key. Without it the map uses Leaflet + OpenStreetMap. |
| `PYTHON_PORT` | No | Port for the Python sidecar (default `8000`). |
| `APP_URL` | No | Public URL of the deployment. |

Never commit `.env`. It is already in `.gitignore`.

## Project layout

```
app/              Next.js app router: pages and API routes (app/api/*)
components/       React components (map, PWA registration)
lib/              DB access, token signing, Python sidecar launcher
backend_python/   FastAPI service: sensing, learning, agent
data/             Seed JSON database (demo data only)
public/           Static assets, service worker
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md) first. To report a security issue, follow [SECURITY.md](SECURITY.md) and **do not** open a public issue.

## License

[MIT](LICENSE) © 2026 MUNISH PATHANIA