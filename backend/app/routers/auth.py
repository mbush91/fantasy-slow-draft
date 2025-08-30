import os
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv

from ..auth import create_access_token
from ..db import teams_col
from ..schemas import LoginRequest, TokenResponse

load_dotenv()

router = APIRouter()

LEAGUE_PASSWORD = os.getenv("LEAGUE_PASSWORD", "")


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    if body.league_password != LEAGUE_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid league password")

    league_name = body.league_name.strip()
    team_name = body.team_name.strip()
    if not league_name:
        raise HTTPException(status_code=400, detail="League name required")
    if not team_name:
        raise HTTPException(status_code=400, detail="Team name required")

    # Ensure team exists
    col = teams_col()
    existing = await col.find_one({"team_name": team_name, "league_name": league_name})
    if not existing:
        await col.insert_one({"team_name": team_name, "league_name": league_name})

    token = create_access_token({"team_name": team_name, "league_name": league_name})
    return TokenResponse(access_token=token, team_name=team_name, league_name=league_name)
