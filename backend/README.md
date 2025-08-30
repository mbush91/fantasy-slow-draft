# Fantasy Draft Backend (FastAPI)

## Setup

1. Create a virtual environment and install dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

2. Copy environment template and edit values:

```bash
cp backend/.env.example backend/.env
```

3. Run the API:

```bash
uvicorn backend.app.main:app --reload
```

The API runs on http://localhost:8000

## Environment Variables

- MONGO_URL=mongodb://localhost:27017
- DB_NAME=fantasy_draft
- SECRET_KEY=change-this
- CORS_ORIGINS=http://localhost:5173

## API Overview

- POST /auth/create_league (body: league_name, team_name, league_password) → creates league and makes team admin
- POST /auth/login (body: league_name, team_name, league_password)
- POST /players/upload?overwrite=true (admin only)
- GET  /players/available
- POST /draft/config (admin only)
- GET  /draft/state
- POST /draft/pick
- GET  /teams/me

## Docker

This service is dockerized and used by the root `docker-compose.yml`.

```bash
docker compose up -d --build backend
```

Env vars are passed from docker-compose; you don't need a `.env` inside the container.
