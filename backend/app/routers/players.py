import csv
from io import StringIO
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

from ..auth import get_current_team, get_current_league, get_current_admin
from ..db import players_col
from ..schemas import PlayerOut

router = APIRouter()


@router.post("/upload")
async def upload_players(
    file: UploadFile = File(...),
    overwrite: bool = Query(True),
    team_name: str = Depends(get_current_team),
    league_name: str = Depends(get_current_league),
    is_admin: bool = Depends(get_current_admin),
):
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    # Read the uploaded CSV file
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file")

    content = (await file.read()).decode("utf-8")
    reader = csv.DictReader(StringIO(content))
    required_cols = {"name", "position"}
    if not required_cols.issubset({c.lower() for c in reader.fieldnames or []}):
        raise HTTPException(status_code=400, detail="CSV must have 'name' and 'position' headers")

    docs = []
    for row in reader:
        name = (row.get("name") or row.get("Name") or "").strip()
        position = (row.get("position") or row.get("Position") or "").strip()
        if name and position:
            docs.append({"name": name, "position": position, "drafted_by": None, "league_name": league_name})

    if not docs:
        raise HTTPException(status_code=400, detail="No valid players found in CSV")

    col = players_col()
    if overwrite:
        await col.delete_many({"league_name": league_name})

    if docs:
        await col.insert_many(docs)

    return {"inserted": len(docs)}


@router.get("/available", response_model=List[PlayerOut])
async def list_available_players(team_name: str = Depends(get_current_team), league_name: str = Depends(get_current_league)):
    col = players_col()
    cursor = col.find({"drafted_by": None, "league_name": league_name}).sort("name", 1)
    players: List[PlayerOut] = []
    async for doc in cursor:
        players.append(
            PlayerOut(
                id=str(doc.get("_id")),
                name=doc.get("name"),
                position=doc.get("position"),
                drafted_by=doc.get("drafted_by"),
            )
        )
    return players
