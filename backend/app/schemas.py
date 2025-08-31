from typing import Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    league_name: str = Field(min_length=1)
    league_password: str
    team_name: str = Field(min_length=1)


class LeagueCreateRequest(BaseModel):
    league_name: str = Field(min_length=1)
    league_password: str = Field(min_length=4)
    team_name: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    team_name: str
    league_name: str
    is_admin: bool = False


class PlayerOut(BaseModel):
    id: str
    name: str
    position: str
    drafted_by: Optional[str] = None


class DraftConfigIn(BaseModel):
    position_limits: Dict[str, int]
    draft_order: List[str]


class DraftStateOut(BaseModel):
    position_limits: Dict[str, int]
    draft_order: List[str]
    current_pick_index: int
    current_team: Optional[str]


class DraftPickIn(BaseModel):
    player_id: str


class TeamRosterOut(BaseModel):
    team_name: str
    players: List[PlayerOut]
    counts_by_position: Dict[str, int]


class DraftedPlayerOut(BaseModel):
    id: str
    name: str
    position: str
    drafted_by: str
    drafted_at: Optional[datetime] = None
