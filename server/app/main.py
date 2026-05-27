from app.logging_config import setup_logging
setup_logging()

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import agent, leads, agora, campaigns, dashboard
from app.routes import llm, events
from app.config import settings

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Workflow PH AI Sales Agent API",
    description="Real-time AI sales agent backend for Philippine service businesses",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent.router)
app.include_router(leads.router)
app.include_router(agora.router)
app.include_router(campaigns.router)
app.include_router(dashboard.router)
app.include_router(llm.router)
app.include_router(events.router)


@app.on_event("startup")
async def _startup():
    logger.info(
        "Server started. BACKEND_PUBLIC_URL=%r  CUSTOM_LLM_API_KEY_SET=%s",
        settings.backend_public_url,
        bool(settings.custom_llm_api_key),
    )
    # Pre-warm Couchbase collection manifest so the first KV request doesn't
    # hit the `key_value_collection_outdated` stale-manifest timeout.
    try:
        from app.db.couchbase import ensure_collections
        ensure_collections()
        logger.info("Couchbase collections ready.")
    except Exception as exc:
        logger.warning("Couchbase setup failed (non-fatal): %s", exc)


@app.get("/")
async def root():
    return {"status": "ok", "service": "Workflow PH AI Sales Agent API"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
