from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import ensure_indexes
from app.routers.knowledge import router as knowledge_router
from app.routers.assistant import router as assistant_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await ensure_indexes()
    yield
    # Shutdown
    # Clean up resources if needed


app = FastAPI(
    title="MarketMind RAG Service",
    description="Knowledge management and RAG assistant API",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(knowledge_router)
app.include_router(assistant_router)


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "service": "rag-service"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "MarketMind RAG Service",
        "version": "1.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.debug
    )
