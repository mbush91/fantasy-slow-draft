# Fantasy Draft App

FastAPI backend + MongoDB + React frontend for running a league draft with per-league passwords and team names. The team that creates a league becomes the admin.

## Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB running locally on port 27017 (or use Docker, see below)

## Quick Start (Local dev)

1) Backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
uvicorn backend.app.main:app --reload
```

2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173 and calls API at http://localhost:8000 by default.

## Docker (Full stack)

Use Docker Compose to run MongoDB, backend, and frontend together:

```bash
docker compose up -d --build
```

Then open http://localhost:5173

Stop with:

```bash
docker compose down
```

## Create or Join a League

- Create League: On the login page, switch to "Create New League". Enter a unique League Name, set a League Password, and your Team Name. You'll be logged in as admin.
- Join Existing League: Use the same League Name, your Team Name, and the league's password. You'll be auto-added to the league.

Admin-only actions:
- Upload player CSV
- Set draft configuration (position limits, draft order)


## CSV Format

Upload a CSV with headers:

```
name,position
Patrick Mahomes,QB
Christian McCaffrey,RB
```

## Draft Flow

- Admin sets draft config (position limits, draft order).
- Teams log in with the league name and password and their team name.
- CSV uploaded to populate available players.
- On your turn, pick a player. Limits per position enforced.

