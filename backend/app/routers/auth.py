import os
from datetime import datetime, timezone
import bcrypt
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv

from ..auth import create_access_token
from ..db import teams_col, leagues_col, config_col
from ..schemas import LoginRequest, TokenResponse, LeagueCreateRequest

load_dotenv()

router = APIRouter()


@router.post("/create_league", response_model=TokenResponse)
async def create_league(body: LeagueCreateRequest):
    league_name = body.league_name.strip()
    team_name = body.team_name.strip()
    if not league_name or not team_name:
        raise HTTPException(status_code=400, detail="League and team name required")

    lcol = leagues_col()
    existing = await lcol.find_one({"_id": league_name})
    if existing:
        raise HTTPException(status_code=409, detail="League already exists")

    pw_hash = bcrypt.hashpw(body.league_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    await lcol.insert_one({
        "_id": league_name,
        "password_hash": pw_hash,
        "admin_team_name": team_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # Create admin team
    tcol = teams_col()
    await tcol.insert_one({"team_name": team_name, "league_name": league_name, "is_admin": True})

    token = create_access_token({"team_name": team_name, "league_name": league_name, "is_admin": True})
    return TokenResponse(access_token=token, team_name=team_name, league_name=league_name, is_admin=True)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    league_name = body.league_name.strip()
    team_name = body.team_name.strip()
    if not league_name or not team_name:
        raise HTTPException(status_code=400, detail="League and team name required")

    ldoc = await leagues_col().find_one({"_id": league_name})
    if not ldoc:
        raise HTTPException(status_code=404, detail="League not found")

    if not bcrypt.checkpw(body.league_password.encode("utf-8"), ldoc["password_hash"].encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid league password")

    # Ensure team exists; auto-add if not (unless draft already started)
    tcol = teams_col()
    team = await tcol.find_one({"team_name": team_name, "league_name": league_name})
    if not team:
        cfg = await config_col().find_one({"_id": f"config:{league_name}"})
        if cfg and cfg.get("draft_started"):
            raise HTTPException(status_code=403, detail="Draft already started. No new teams can be added to this league.")
        await tcol.insert_one({"team_name": team_name, "league_name": league_name, "is_admin": False})
        team = {"team_name": team_name, "league_name": league_name, "is_admin": False}

    is_admin = bool(team.get("is_admin"))
    token = create_access_token({"team_name": team_name, "league_name": league_name, "is_admin": is_admin})
    return TokenResponse(access_token=token, team_name=team_name, league_name=league_name, is_admin=is_admin)
