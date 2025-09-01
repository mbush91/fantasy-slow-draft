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
        return DraftStateOut(position_limits={}, draft_order=[], current_pick_index=0, current_team=None, draft_started=False)
    idx = cfg.get("current_pick_index", 0)  # total picks made so far (0-based)
    order = cfg.get("draft_order", [])
    n = len(order)
    if n == 0:
        current_team = None
    else:
        round_num = idx // n
        pick_in_round = idx % n
        if round_num % 2 == 0:
            sel = pick_in_round
        else:
            sel = n - 1 - pick_in_round
        current_team = order[sel]
    return DraftStateOut(
        position_limits=cfg.get("position_limits", {}),
        draft_order=order,
        current_pick_index=idx,
        current_team=current_team,
        draft_started=bool(cfg.get("draft_started", False)),
    )


@router.post("/start")
async def start_draft(
    team_name: str = Depends(get_current_team),
    league_name: str = Depends(get_current_league),
    is_admin: bool = Depends(get_current_admin),
):
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    cfg = await _get_config_doc(league_name)
    if not cfg:
        raise HTTPException(status_code=400, detail="Draft not configured")
    await config_col().update_one({"_id": f"config:{league_name}"}, {"$set": {"draft_started": True}})
    return {"ok": True, "draft_started": True}


@router.post("/pick")
async def make_pick(body: DraftPickIn, team_name: str = Depends(get_current_team), league_name: str = Depends(get_current_league)):
    cfg = await _get_config_doc(league_name)
    if not cfg:
        raise HTTPException(status_code=400, detail="Draft not configured")

    order = cfg.get("draft_order", [])
    idx = cfg.get("current_pick_index", 0)  # total picks made so far
    if not order:
        raise HTTPException(status_code=400, detail="No draft order configured")

    # Determine current team using snake order
    n = len(order)
    round_num = idx // n
    pick_in_round = idx % n
    if round_num % 2 == 0:
        sel = pick_in_round
    else:
        sel = n - 1 - pick_in_round
    current_team = order[sel]
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

    # Enforce position limits, with support for ANY slots
    position = player.get("position")
    limits: Dict[str, int] = cfg.get("position_limits", {}) or {}
    any_limit = int(limits.get("ANY", 0) or 0)
    pos_limit = limits.get(position)
    drafted_pos = await pcol.count_documents({"drafted_by": team_name, "position": position, "league_name": league_name})

    # If specific limit exists and not yet reached, allow immediately
    try:
        pos_limit_int = int(pos_limit) if pos_limit is not None else None
    except (TypeError, ValueError):
        pos_limit_int = None
    if pos_limit_int is not None and drafted_pos < pos_limit_int:
        pass  # allowed
    else:
        # Either limit reached or no specific cap exists -> rely on ANY pool
        if any_limit <= 0:
            if pos_limit_int is None:
                raise HTTPException(status_code=400, detail=f"No ANY slots configured and no specific cap for {position}")
            else:
                raise HTTPException(status_code=400, detail=f"Roster limit reached for {position}")
        # Compute ANY usage as excess picks over (per-position cap or 0 if not set)
        counts_by_pos: Dict[str, int] = {}
        async for doc in pcol.find({"drafted_by": team_name, "league_name": league_name}, {"position": 1}):
            p = doc.get("position")
            counts_by_pos[p] = counts_by_pos.get(p, 0) + 1
        any_used = 0
        for p, picked in counts_by_pos.items():
            if p == "ANY":
                continue
            lim_val = limits.get(p)
            try:
                lim_int = int(lim_val) if lim_val is not None else 0
            except (TypeError, ValueError):
                lim_int = 0
            excess = picked - lim_int
            if excess > 0:
                any_used += excess
        any_remaining = any_limit - any_used
        if any_remaining <= 0:
            raise HTTPException(status_code=400, detail=f"No ANY slots remaining")

    # Draft player
    await pcol.update_one(
        {"_id": oid, "drafted_by": None, "league_name": league_name},
        {"$set": {"drafted_by": team_name, "drafted_at": datetime.utcnow()}},
    )

    # Advance pick (keep a running total; do not modulo)
    next_idx = idx + 1
    await config_col().update_one({"_id": f"config:{league_name}"}, {"$set": {"current_pick_index": next_idx}})

    return {"ok": True}
