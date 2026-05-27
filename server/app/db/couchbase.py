import logging
from datetime import timedelta
from contextvars import ContextVar, Token

from couchbase.auth import PasswordAuthenticator
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions
from couchbase.management.collections import CollectionSpec
from couchbase.exceptions import CollectionAlreadyExistsException, ScopeAlreadyExistsException
from app.config import settings

logger = logging.getLogger(__name__)

_cluster: Cluster | None = None
_request_context: ContextVar[dict[str, str] | None] = ContextVar("request_context", default=None)

REQUIRED_COLLECTIONS = ["leads", "conversations", "follow_ups"]


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


def ensure_collections() -> None:
    """Create required scopes and collections if they don't exist."""
    cluster = get_cluster()
    bucket = cluster.bucket(settings.couchbase_bucket)
    cm = bucket.collections()

    for scope_name in [settings.couchbase_scope, settings.couchbase_scope_b2b, settings.couchbase_scope_b2c]:
        try:
            cm.create_scope(scope_name)
            logger.info("Created Couchbase scope: %r", scope_name)
        except ScopeAlreadyExistsException:
            pass

        existing = set()
        for scope in cm.get_all_scopes():
            if scope.name == scope_name:
                existing = {c.name for c in scope.collections}
                break

        for name in REQUIRED_COLLECTIONS:
            if name in existing:
                continue
            try:
                cm.create_collection(CollectionSpec(name, scope_name=scope_name))
                logger.info("Created collection %r in scope %r", name, scope_name)
            except CollectionAlreadyExistsException:
                pass


def get_collection(collection_name: str):
    cluster = get_cluster()
    bucket = cluster.bucket(settings.couchbase_bucket)
    scope = bucket.scope(get_active_scope_name())
    return scope.collection(collection_name)


def get_scope():
    cluster = get_cluster()
    bucket = cluster.bucket(settings.couchbase_bucket)
    return bucket.scope(get_active_scope_name())
