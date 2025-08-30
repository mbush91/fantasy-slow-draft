import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .routers import auth as auth_router
from .routers import players as players_router
from .routers import draft as draft_router
from .routers import teams as teams_router

# Load env from backend/.env regardless of current working directory
_dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(dotenv_path=_dotenv_path)

app = FastAPI(title="Fantasy Draft API")

origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/auth", tags=["auth"])
app.include_router(players_router.router, prefix="/players", tags=["players"])
app.include_router(draft_router.router, prefix="/draft", tags=["draft"])
app.include_router(teams_router.router, prefix="/teams", tags=["teams"])


@app.get("/")
def root():
    return {"status": "ok"}
