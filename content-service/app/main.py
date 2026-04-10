from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import ensure_indexes, get_client
from app.routers.campaigns import router as campaigns_router
from app.routers.posts import router as posts_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    yield
    client = get_client()
    client.close()


app = FastAPI(
    title="MarketMind Content Service",
    description="Campaigns and content APIs (FastAPI + MongoDB)",
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

app.include_router(campaigns_router)
app.include_router(posts_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "content-service"}
