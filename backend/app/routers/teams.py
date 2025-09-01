from collections import Counter
from typing import List

from fastapi import APIRouter, Depends

from ..auth import get_current_team, get_current_league
from ..db import players_col
from ..schemas import PlayerOut, TeamRosterOut

router = APIRouter()


@router.get("/me", response_model=TeamRosterOut)
async def my_team(team_name: str = Depends(get_current_team), league_name: str = Depends(get_current_league)):
    col = players_col()
    cursor = col.find({"drafted_by": team_name, "league_name": league_name}).sort("name", 1)
    players: List[PlayerOut] = []
    counts = Counter()
    async for doc in cursor:
        players.append(
            PlayerOut(
                id=str(doc.get("_id")),
                name=doc.get("name"),
                position=doc.get("position"),
                drafted_by=doc.get("drafted_by"),
            )
        )
        counts[doc.get("position")] += 1
    return TeamRosterOut(team_name=team_name, players=players, counts_by_position=dict(counts))


@router.get("/by_name/{target_team}", response_model=TeamRosterOut)
async def team_by_name(
    target_team: str,
    team_name: str = Depends(get_current_team),
    league_name: str = Depends(get_current_league),
):
    # Auth ensures caller is in a league; we scope query to the same league
    col = players_col()
    cursor = col.find({"drafted_by": target_team, "league_name": league_name}).sort("name", 1)
    players: List[PlayerOut] = []
    counts = Counter()
    async for doc in cursor:
        players.append(
            PlayerOut(
                id=str(doc.get("_id")),
                name=doc.get("name"),
                position=doc.get("position"),
                drafted_by=doc.get("drafted_by"),
            )
        )
        counts[doc.get("position")] += 1
    return TeamRosterOut(team_name=target_team, players=players, counts_by_position=dict(counts))
