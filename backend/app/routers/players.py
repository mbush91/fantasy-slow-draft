import csv
from io import StringIO
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

from ..auth import get_current_team, get_current_league, get_current_admin
from ..db import players_col
from ..schemas import PlayerOut, DraftedPlayerOut

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
    col = players_col()
    # Determine starting rank. If overwriting, we reset to 1; otherwise continue after current max.
    if overwrite:
        rank_counter = 1
    else:
        existing = await col.find_one({"league_name": league_name, "rank": {"$ne": None}}, sort=[("rank", -1)])
        rank_counter = (existing.get("rank") if existing else 0) + 1
    for row in reader:
        name = (row.get("name") or row.get("Name") or "").strip()
        position = (row.get("position") or row.get("Position") or "").strip()
        if name and position:
            docs.append({
                "name": name,
                "position": position,
                "drafted_by": None,
                "league_name": league_name,
                # Preserve upload order as rank (1-based)
                "rank": rank_counter,
            })
            rank_counter += 1

    if not docs:
        raise HTTPException(status_code=400, detail="No valid players found in CSV")

    if overwrite:
        await col.delete_many({"league_name": league_name})

    if docs:
        await col.insert_many(docs)

    return {"inserted": len(docs)}


@router.get("/available", response_model=List[PlayerOut])
async def list_available_players(
    position: Optional[str] = Query(None),
    team_name: str = Depends(get_current_team),
    league_name: str = Depends(get_current_league),
):
    col = players_col()
    base_filter = {"drafted_by": None, "league_name": league_name}
    if position:
        base_filter["position"] = position

    # Return ranked players first (ascending by rank), then unranked by name
    players: List[PlayerOut] = []
    ranked_cursor = col.find({**base_filter, "rank": {"$ne": None}}).sort("rank", 1)
    async for doc in ranked_cursor:
        players.append(
            PlayerOut(
                id=str(doc.get("_id")),
                name=doc.get("name"),
                position=doc.get("position"),
                drafted_by=doc.get("drafted_by"),
                rank=doc.get("rank"),
            )
        )
    unranked_cursor = col.find({**base_filter, "rank": None}).sort("name", 1)
    async for doc in unranked_cursor:
        players.append(
            PlayerOut(
                id=str(doc.get("_id")),
                name=doc.get("name"),
                position=doc.get("position"),
                drafted_by=doc.get("drafted_by"),
                rank=doc.get("rank"),
            )
        )
    return players


@router.get("/drafted", response_model=List[DraftedPlayerOut])
async def list_drafted_players(
    limit: int = Query(10, ge=1, le=100),
    team_name: str = Depends(get_current_team),
    league_name: str = Depends(get_current_league),
):
    col = players_col()
    # Only players that have been drafted in this league. Sort newest first by drafted_at (missing last), then _id.
    cursor = (
        col.find({"drafted_by": {"$ne": None}, "league_name": league_name})
        .sort([("drafted_at", -1), ("_id", -1)])
        .limit(limit)
    )
    out: List[DraftedPlayerOut] = []
    async for doc in cursor:
        out.append(
            DraftedPlayerOut(
                id=str(doc.get("_id")),
                name=doc.get("name"),
                position=doc.get("position"),
                drafted_by=str(doc.get("drafted_by")),
                drafted_at=doc.get("drafted_at"),
            )
        )
    return out
