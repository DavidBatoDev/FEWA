import logging
from datetime import timedelta
from couchbase.auth import PasswordAuthenticator
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions
from couchbase.management.collections import CollectionSpec
from couchbase.exceptions import CollectionAlreadyExistsException, ScopeAlreadyExistsException
from app.config import settings

logger = logging.getLogger(__name__)

_cluster: Cluster | None = None
_collections: dict[str, object] = {}  # collection-name → cached Collection object

REQUIRED_COLLECTIONS = [
    "leads",
    "conversations",
    "follow_ups",
    "customers",
    "orders",
    "products",
]


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
    """Create the required scope and collections if they don't exist."""
    cluster = get_cluster()
    bucket = cluster.bucket(settings.couchbase_bucket)
    cm = bucket.collections()

    # Ensure scope exists
    try:
        cm.create_scope(settings.couchbase_scope)
        logger.info("Created Couchbase scope: %r", settings.couchbase_scope)
    except ScopeAlreadyExistsException:
        pass

    # List existing collections in our scope
    existing = set()
    for scope in cm.get_all_scopes():
        if scope.name == settings.couchbase_scope:
            existing = {c.name for c in scope.collections}
            break

    for name in REQUIRED_COLLECTIONS:
        if name in existing:
            logger.info("Collection already exists: %r", name)
            continue
        try:
            cm.create_collection(CollectionSpec(name, scope_name=settings.couchbase_scope))
            logger.info("Created Couchbase collection: %r", name)
        except CollectionAlreadyExistsException:
            logger.info("Collection already exists (race): %r", name)


def get_collection(collection_name: str):
    if collection_name not in _collections:
        cluster = get_cluster()
        bucket = cluster.bucket(settings.couchbase_bucket)
        scope = bucket.scope(settings.couchbase_scope)
        _collections[collection_name] = scope.collection(collection_name)
    return _collections[collection_name]


def get_scope():
    cluster = get_cluster()
    bucket = cluster.bucket(settings.couchbase_bucket)
    return bucket.scope(settings.couchbase_scope)
