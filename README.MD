# NPIP Backend

Express API and ingestion worker for NPIP. It owns authentication, project setup, data ingestion,
alerting, and reporting.

## Responsibilities

- REST API for figures, projects, mentions, alerts, and reports
- Scheduled ingestion from connectors (news + social)
- Data enrichment (sentiment, language, reach, dedupe)
- Realtime notifications via Socket.IO
- PDF report generation

## Local Development

```bash
cp ai.env.example ai.env
npm install
npm run dev
```

API: http://localhost:8000

## Environment Variables

Required:
- `MONGODB_URL`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`

Common:
- `PORT` (default 8000)
- `FRONTEND_URL` (for CORS and Socket.IO)

Optional integrations:
- `GNEWS_API_KEY`
- `YOUTUBE_API_KEY`
- `TWITTER_BEARER_TOKEN`
- `META_ACCESS_TOKEN`
- `ALERT_EMAIL_ENABLED` + `SMTP_*`

Tuning:
- `WIKI_LIMIT`, `NEWS_LIMIT`, `YOUTUBE_LIMIT`, `CACHE_TTL_MS`

## API Surface (Key Routes)

- Health: `GET /health`
- Figures: `GET /api/v1/figures/identity|news|videos|search`
- Auth: `POST /api/v1/auth/*`
- Projects: `GET|POST|PATCH /api/v1/projects`
- Mentions: `GET /api/v1/mentions`
- Alerts: `GET /api/v1/alerts`
- Reports: `GET /api/v1/reports/:id` (PDF)

## Ingestion Flow (Summary)

1) Scheduler selects active projects that are due to run
2) Each enabled connector fetches raw mentions
3) Mentions are filtered by keyword and boolean query
4) Mentions are enriched and deduped before insertion
5) Usage is tracked and alerts are emitted (including spikes)

## Realtime Events

Socket rooms:
- `user:{userId}`
- `project:{projectId}`

Events:
- `alert` (new alert payloads)

## Data Model (High Level)

- `User` (auth + plan)
- `Project` (keywords, sources, schedule, geo focus)
- `Mention` (source, text, engagement, sentiment, reach)
- `Alert` (type, message, payload)
- `Usage` (monthly counts)
- `AuditLog` (connector errors)

## Scripts

- `npm run dev` runs the API with nodemon
- `npm test` placeholder
