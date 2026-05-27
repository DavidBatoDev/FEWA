from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.routes import agent, leads, agora, campaigns, dashboard, intake_forms, products, orders
from app.db.couchbase import reset_request_scope, set_request_scope_from_flow

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
app.include_router(intake_forms.router)
app.include_router(leads.router)
app.include_router(agora.router)
app.include_router(campaigns.router)
app.include_router(dashboard.router)
app.include_router(products.router)
app.include_router(orders.router)


@app.middleware("http")
async def route_couchbase_scope_by_flow(request: Request, call_next):
    flow = request.headers.get("x-sales-flow") or request.query_params.get("flow")
    token = set_request_scope_from_flow(flow)
    try:
        return await call_next(request)
    finally:
        reset_request_scope(token)


@app.get("/")
async def root():
    return {"status": "ok", "service": "Workflow PH AI Sales Agent API"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
