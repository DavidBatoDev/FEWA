from datetime import timedelta
from contextvars import ContextVar, Token

from couchbase.auth import PasswordAuthenticator
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions
from app.config import settings

_cluster: Cluster | None = None
_request_context: ContextVar[dict[str, str] | None] = ContextVar("request_context", default=None)


def _resolve_scope_for_flow(flow: str | None) -> str:
    if not flow:
        return settings.couchbase_scope

    flow_key = flow.strip().lower()
    if flow_key == "b2b":
        return settings.couchbase_scope_b2b
    if flow_key == "b2c":
        return settings.couchbase_scope_b2c
    return settings.couchbase_scope


def _normalize_flow(flow: str | None) -> str:
    if not flow:
        return ""
    flow_key = flow.strip().lower()
    if flow_key in {"b2b", "b2c"}:
        return flow_key
    return ""


def set_request_scope_from_flow(flow: str | None) -> Token:
    scope_name = _resolve_scope_for_flow(flow)
    normalized_flow = _normalize_flow(flow)
    return _request_context.set({"scope": scope_name, "flow": normalized_flow})


def reset_request_scope(token: Token) -> None:
    _request_context.reset(token)


def get_active_scope_name() -> str:
    ctx = _request_context.get()
    if not ctx:
        return settings.couchbase_scope
    return ctx.get("scope") or settings.couchbase_scope


def get_active_flow() -> str:
    ctx = _request_context.get()
    if ctx and ctx.get("flow"):
        return ctx["flow"]

    active_scope = get_active_scope_name()
    if active_scope == settings.couchbase_scope_b2c:
        return "b2c"
    return "b2b"


def get_cluster() -> Cluster:
    global _cluster
    if _cluster is None:
        auth = PasswordAuthenticator(settings.couchbase_username, settings.couchbase_password)
        _cluster = Cluster(
            settings.couchbase_connection_string,
            ClusterOptions(auth),
        )
        _cluster.wait_until_ready(timedelta(seconds=10))
    return _cluster


def get_collection(collection_name: str):
    cluster = get_cluster()
    bucket = cluster.bucket(settings.couchbase_bucket)
    scope = bucket.scope(get_active_scope_name())
    return scope.collection(collection_name)


def get_scope():
    cluster = get_cluster()
    bucket = cluster.bucket(settings.couchbase_bucket)
    return bucket.scope(get_active_scope_name())
