from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import agent, leads, agora

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


@app.get("/")
async def root():
    return {"status": "ok", "service": "Workflow PH AI Sales Agent API"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
