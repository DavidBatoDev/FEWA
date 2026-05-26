from datetime import timedelta
from couchbase.auth import PasswordAuthenticator
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions
from app.config import settings

_cluster: Cluster | None = None


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
    scope = bucket.scope(settings.couchbase_scope)
    return scope.collection(collection_name)


def get_scope():
    cluster = get_cluster()
    bucket = cluster.bucket(settings.couchbase_bucket)
    return bucket.scope(settings.couchbase_scope)
