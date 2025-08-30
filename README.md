# Fantasy Draft App

FastAPI backend + MongoDB + React frontend for running a league draft with a shared league password and team names.

## Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB running locally on port 27017 (or use Docker, see below)

## Quick Start

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

## Docker (MongoDB)

If you don't have MongoDB locally, use Docker:

```bash
docker run -d --name fantasy-mongo -p 27017:27017 -v fantasy-mongo-data:/data/db mongo:6
```

Stop/remove with:

```bash
docker stop fantasy-mongo && docker rm fantasy-mongo
```

## CSV Format

Upload a CSV with headers:

```
name,position
Patrick Mahomes,QB
Christian McCaffrey,RB
```

## Draft Flow

- Commission(er) sets draft config (position limits, draft order).
- Teams log in with the shared league password and their team name.
- CSV uploaded to populate available players.
- On your turn, pick a player. Limits per position enforced.

