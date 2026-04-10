from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import ensure_indexes, get_client
from app.job import run_scheduler_job


def _validate_scheduler_token(token: str | None) -> None:
    expected = settings.scheduler_token.strip()
    if not expected:
        return
    if token != expected:
        raise HTTPException(status_code=401, detail="Invalid scheduler token")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    yield
    get_client().close()


app = FastAPI(
    title="MarketMind Scheduler Service",
    description="Runs due-post publishing job (shared core for API + Lambda)",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "scheduler-service"}


@app.post("/jobs/run")
async def run_job(x_scheduler_token: str | None = Header(default=None)):
    _validate_scheduler_token(x_scheduler_token)
    return await run_scheduler_job(trigger="api")
