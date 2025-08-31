from typing import Dict
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_team, get_current_league, get_current_admin
from ..db import config_col, players_col
from ..schemas import DraftConfigIn, DraftPickIn, DraftStateOut, PlayerOut

router = APIRouter()


async def _get_config_doc(league_name: str) -> Dict | None:
    return await config_col().find_one({"_id": f"config:{league_name}"})


@router.post("/config")
async def set_config(
    body: DraftConfigIn,
    team_name: str = Depends(get_current_team),
    league_name: str = Depends(get_current_league),
    is_admin: bool = Depends(get_current_admin),
):
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    # Upsert single config doc
    doc = {
        "_id": f"config:{league_name}",
        "position_limits": body.position_limits,
        "draft_order": body.draft_order,
        "current_pick_index": 0,
        "league_name": league_name,
    }
    await config_col().replace_one({"_id": doc["_id"]}, doc, upsert=True)
    return {"ok": True}


@router.get("/state", response_model=DraftStateOut)
async def get_state(team_name: str = Depends(get_current_team), league_name: str = Depends(get_current_league)):
    cfg = await _get_config_doc(league_name)
    if not cfg:
        return DraftStateOut(position_limits={}, draft_order=[], current_pick_index=0, current_team=None)
    idx = cfg.get("current_pick_index", 0)
    order = cfg.get("draft_order", [])
    current_team = order[idx] if order and 0 <= idx < len(order) else None
    return DraftStateOut(
        position_limits=cfg.get("position_limits", {}),
        draft_order=order,
        current_pick_index=idx,
        current_team=current_team,
    )


@router.post("/pick")
async def make_pick(body: DraftPickIn, team_name: str = Depends(get_current_team), league_name: str = Depends(get_current_league)):
    cfg = await _get_config_doc(league_name)
    if not cfg:
        raise HTTPException(status_code=400, detail="Draft not configured")

    order = cfg.get("draft_order", [])
    idx = cfg.get("current_pick_index", 0)
    if not order:
        raise HTTPException(status_code=400, detail="No draft order configured")

    current_team = order[idx % len(order)]
    if team_name != current_team:
        raise HTTPException(status_code=403, detail=f"It's {current_team}'s turn")

    # Validate player is available
    pcol = players_col()
    pid = body.player_id
    try:
        oid = ObjectId(pid)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid player id")

    player = await pcol.find_one({"_id": oid, "league_name": league_name})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    if player.get("drafted_by"):
        raise HTTPException(status_code=400, detail="Player already drafted")

    # Enforce position limits
    position = player.get("position")
    limits: Dict[str, int] = cfg.get("position_limits", {})
    limit = limits.get(position)
    if limit is not None:
        drafted_count = await pcol.count_documents({"drafted_by": team_name, "position": position, "league_name": league_name})
        if drafted_count >= limit:
            raise HTTPException(status_code=400, detail=f"Roster limit reached for {position}")

    # Draft player
    await pcol.update_one(
        {"_id": oid, "drafted_by": None, "league_name": league_name},
        {"$set": {"drafted_by": team_name, "drafted_at": datetime.utcnow()}},
    )

    # Advance pick
    next_idx = (idx + 1) % len(order)
    await config_col().update_one({"_id": f"config:{league_name}"}, {"$set": {"current_pick_index": next_idx}})

    return {"ok": True}
