# Astram Web — Next.js dashboard

Operator-facing web UI for the **Astram Event-Driven Congestion Forecaster**. Renders a Bengaluru basemap (Mappls vector tiles when keyed, OSM dark fallback otherwise) and drives the FastAPI microservice for:

- **Composing** a candidate event (planned/unplanned, cause, priority, corridor, vehicle type, start time)
- **Forecasting** severity, duration, road-closure probability
- **Recommending** manpower, barricading, diversion plan
- **Browsing historical hotspots** for any hour of day, filterable by corridor

```
web/
├── app/
│   ├── globals.css        dark theme, leaflet overrides
│   ├── layout.tsx         root layout, Inter / JetBrains Mono
│   └── page.tsx           main dashboard (3-column grid)
├── components/
│   ├── MapPanel.tsx       Mappls + Leaflet/OSM fallback, hotspot circles
│   ├── PredictForm.tsx    form bound to FastAPI /predict
│   ├── ResultPanel.tsx    severity / duration / closure / resource plan
│   └── HotspotsPanel.tsx  hour scrubber, top-N risk list
├── lib/
│   ├── api.ts             typed fetcher for the FastAPI service
│   ├── types.ts           response types matching pydantic schemas
│   └── ui.ts              severity tone palette + helpers
├── next.config.js
├── tailwind.config.js
├── package.json
└── .env.local.example
```

## Setup

```bash
cd /Users/jarvis/train/web
npm install

# Mappls key is optional. Without it, the map falls back to OSM dark tiles.
cp .env.local.example .env.local
# edit .env.local and set NEXT_PUBLIC_MAPPLS_KEY if you have one
```

## Run

**Terminal 1** — FastAPI:

```bash
cd /Users/jarvis/train
source .venv/bin/activate
uvicorn src.api:app --host 0.0.0.0 --port 8000
```

**Terminal 2** — Next.js:

```bash
cd /Users/jarvis/train/web
npm run dev
# open http://localhost:3000
```

CORS is already wildcard-open in `src/api.py`; the browser preflight is verified.

## Page tour

1. **Left column** — *Compose event* form, then *Result panel* after submitting.
2. **Centre** — interactive map. Click anywhere to drop the candidate location. Hotspot circles are sized by event count, coloured by risk profile (green = routine, orange = long-running, red = closure-heavy).
3. **Right column** — *Historical hotspots* with an hour scrubber (0–23). Hovering a row highlights its circle on the map; clicking re-centres the map there.

The header strip shows model metrics from the latest training run (severity accuracy, closure AUC, median duration error) and a live API-status dot.

## Build

```bash
npm run build
npm start    # production on :3000
```

Build is fully static-prerenderable (the page hydrates and calls the API client-side).

## Mappls vs OSM fallback

The map component first tries to load the Mappls Web SDK:

```
https://apis.mappls.com/advancedmaps/api/<KEY>/map_sdk?layer=vector&v=3.0
```

If `NEXT_PUBLIC_MAPPLS_KEY` is empty or the SDK fails to load within 12 s, it falls back to Leaflet 1.9 + CartoDB dark tiles over OSM. The click + marker + popup API surface is the same in both modes — only the underlying tile / marker library changes.

## Configuration

| Env var                     | Purpose                                | Default                  |
| --------------------------- | -------------------------------------- | ------------------------ |
| `NEXT_PUBLIC_API_BASE`      | FastAPI base URL                       | `http://localhost:8000`  |
| `NEXT_PUBLIC_MAPPLS_KEY`    | Mappls Web SDK key (optional)          | empty → OSM fallback     |

Sign up for a Mappls key at <https://about.mappls.com/api/>.
