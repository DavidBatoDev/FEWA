"""
Migration: seeds the products collection with 16 shoes for the B2C Commerce Agent demo.
Self-contained — creates the Couchbase scope and collection if they don't exist.

  python couchbase/seed_products.py
"""
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / "server" / ".env")

from couchbase.auth import PasswordAuthenticator
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions
from couchbase.management.collections import CollectionSpec
from couchbase.exceptions import ScopeAlreadyExistsException, CollectionAlreadyExistsException

CONNECTION_STRING = os.getenv("COUCHBASE_CONNECTION_STRING", "")
USERNAME = os.getenv("COUCHBASE_USERNAME", "")
PASSWORD = os.getenv("COUCHBASE_PASSWORD", "")
BUCKET_NAME = os.getenv("COUCHBASE_BUCKET", "fflow_ph")
SCOPE_NAME = os.getenv("COUCHBASE_SCOPE", "sales_agent")

NOW = datetime.now(timezone.utc).isoformat()

# All image_url values are specific Unsplash photo IDs (not random).
# Descriptions are written to help the LLM understand each product when
# a customer references it by feel ("the chunky one", "the canvas classic", etc.)
PRODUCTS = [
    # ── Nike ────────────────────────────────────────────────────────────────
    {
        "key": "product::nike-pegasus-40",
        "doc": {
            "type": "product",
            "name": "Pegasus 40",
            "brand": "Nike",
            "category": "shoes",
            "price": 7295,
            "currency": "PHP",
            "description": "Nike's workhorse daily trainer. Usually seen in classic black/white and wolf grey, but also available in bold volt yellow and university red. React foam midsole, breathable mesh upper.",
            "sizes": ["7", "8", "9", "10", "11"],
            "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
            "use_cases": ["running", "daily"],
            "priorities": ["cushioning", "lightweight"],
            "stock": 25,
            "created_at": NOW,
        },
    },
    {
        "key": "product::nike-react-infinity-run",
        "doc": {
            "type": "product",
            "name": "React Infinity Run FK 3",
            "brand": "Nike",
            "category": "shoes",
            "price": 8595,
            "currency": "PHP",
            "description": "Nike's injury-reduction running shoe. Bold colorways: bright pink foam/white, volt/neon yellow, and midnight navy. Wider base and rocker geometry keep you stable; React foam is plush underfoot.",
            "sizes": ["7", "8", "9", "10", "11"],
            "image_url": "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80",
            "use_cases": ["running", "daily"],
            "priorities": ["cushioning", "comfort", "durability"],
            "stock": 20,
            "created_at": NOW,
        },
    },
    {
        "key": "product::nike-air-force-1",
        "doc": {
            "type": "product",
            "name": "Air Force 1 Low",
            "brand": "Nike",
            "category": "shoes",
            "price": 5995,
            "currency": "PHP",
            "description": "The timeless leather basketball-turned-street shoe. Most popular in all-white, but also comes in black/white and triple-black. Clean, boxy silhouette with Air cushioning.",
            "sizes": ["7", "8", "9", "10", "11"],
            "image_url": "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=800&q=80",
            "use_cases": ["casual", "lifestyle"],
            "priorities": ["style", "comfort", "value"],
            "stock": 30,
            "created_at": NOW,
        },
    },
    {
        "key": "product::nike-air-max-270",
        "doc": {
            "type": "product",
            "name": "Air Max 270",
            "brand": "Nike",
            "category": "shoes",
            "price": 7795,
            "currency": "PHP",
            "description": "Features Nike's tallest Air heel unit with a large visible air bubble. Popular in black/white, white/neon green, and white/university red. Lifestyle-first design for all-day wear.",
            "sizes": ["7", "8", "9", "10", "11"],
            "image_url": "https://images.unsplash.com/photo-1542219550-37153d387c27?w=800&q=80",
            "use_cases": ["lifestyle", "casual"],
            "priorities": ["cushioning", "style"],
            "stock": 16,
            "created_at": NOW,
        },
    },
    # ── Jordan ───────────────────────────────────────────────────────────────
    {
        "key": "product::jordan-1-low",
        "doc": {
            "type": "product",
            "name": "Jordan 1 Low",
            "brand": "Jordan",
            "category": "shoes",
            "price": 6995,
            "currency": "PHP",
            "description": "Low-top version of sneaker culture's most iconic silhouette. Classic colorways: black-toe (white/black/red), royal blue/white, and shadow grey. Premium leather panels, Nike Air heel.",
            "sizes": ["7", "8", "9", "10", "11"],
            "image_url": "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800&q=80",
            "use_cases": ["lifestyle", "casual"],
            "priorities": ["style", "comfort"],
            "stock": 14,
            "created_at": NOW,
        },
    },
    # ── Adidas ───────────────────────────────────────────────────────────────
    {
        "key": "product::adidas-ultraboost-22",
        "doc": {
            "type": "product",
            "name": "Ultraboost 22",
            "brand": "Adidas",
            "category": "shoes",
            "price": 9495,
            "currency": "PHP",
            "description": "Energy-returning Boost midsole. Available in triple white, core black, and cloud white/grey. The white pair has a sock-like Primeknit upper that feels like wearing a cloud.",
            "sizes": ["7", "8", "9", "10", "11"],
            "image_url": "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80",
            "use_cases": ["running", "lifestyle"],
            "priorities": ["cushioning", "comfort"],
            "stock": 18,
            "created_at": NOW,
        },
    },
    {
        "key": "product::adidas-samba",
        "doc": {
            "type": "product",
            "name": "Samba OG",
            "brand": "Adidas",
            "category": "shoes",
            "price": 5995,
            "currency": "PHP",
            "description": "The iconic terrace silhouette that defined 2024-2025 street style. Classic black/white/gum, white/green gum, and earth brown colorways. Slim low-profile leather upper with gum outsole.",
            "sizes": ["7", "8", "9", "10", "11"],
            "image_url": "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800&q=80",
            "use_cases": ["lifestyle", "casual"],
            "priorities": ["style"],
            "stock": 11,
            "created_at": NOW,
        },
    },
    {
        "key": "product::adidas-stan-smith",
        "doc": {
            "type": "product",
            "name": "Stan Smith",
            "brand": "Adidas",
            "category": "shoes",
            "price": 4795,
            "currency": "PHP",
            "description": "The original clean-white tennis classic with signature green heel tab. Most popular in white/green, also available in white/navy and white/pink. Minimalist leather upper.",
            "sizes": ["7", "8", "9", "10", "11"],
            "image_url": "https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&q=80",
            "use_cases": ["casual", "lifestyle"],
            "priorities": ["style", "value"],
            "stock": 22,
            "created_at": NOW,
        },
    },
    # ── Hoka ─────────────────────────────────────────────────────────────────
    {
        "key": "product::hoka-clifton-9",
        "doc": {
            "type": "product",
            "name": "Clifton 9",
            "brand": "Hoka",
            "category": "shoes",
            "price": 7995,
            "currency": "PHP",
            "description": "Maximum cushioning with a thick, rocker-style midsole. Comes in cool ceramic blue/white, vibrant orange/red, and black/black. Favorite of long-distance runners who need joint protection.",
            "sizes": ["7", "8", "9", "10", "11", "12"],
            "image_url": "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80",
            "use_cases": ["running", "walking"],
            "priorities": ["cushioning", "comfort", "lightweight"],
            "stock": 14,
            "created_at": NOW,
        },
    },
    # ── Asics ────────────────────────────────────────────────────────────────
    {
        "key": "product::asics-gel-nimbus-25",
        "doc": {
            "type": "product",
            "name": "Gel-Nimbus 25",
            "brand": "Asics",
            "category": "shoes",
            "price": 8995,
            "currency": "PHP",
            "description": "Asics' premium cushioning flagship. Available in glacier grey/blue expanse, black/graphite grey, and a striking pink/hot pink colorway. PureGEL technology absorbs impact on every landing.",
            "sizes": ["8", "9", "10", "11"],
            "image_url": "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=800&q=80",
            "use_cases": ["running"],
            "priorities": ["cushioning", "durability"],
            "stock": 12,
            "created_at": NOW,
        },
    },
    # ── New Balance ───────────────────────────────────────────────────────────
    {
        "key": "product::new-balance-990v6",
        "doc": {
            "type": "product",
            "name": "990v6",
            "brand": "New Balance",
            "category": "shoes",
            "price": 11995,
            "currency": "PHP",
            "description": "Made in USA heritage runner. Classic colorways: grey/silver, navy/white, and black. Recognizable by its 'N' logo. ENCAP cushioning, premium pigskin and mesh upper.",
            "sizes": ["8", "9", "10", "11"],
            "image_url": "https://images.unsplash.com/photo-1597248374161-426f0d6d2fc9?w=800&q=80",
            "use_cases": ["walking", "lifestyle"],
            "priorities": ["comfort", "durability"],
            "stock": 9,
            "created_at": NOW,
        },
    },
    # ── Converse ─────────────────────────────────────────────────────────────
    {
        "key": "product::converse-chuck-70",
        "doc": {
            "type": "product",
            "name": "Chuck 70",
            "brand": "Converse",
            "category": "shoes",
            "price": 4995,
            "currency": "PHP",
            "description": "Premium canvas high-top available in black/white, optical white, red, and navy. The one with the ankle patch and star logo. Heavier canvas and extra cushioning vs. the standard Chuck Taylor.",
            "sizes": ["7", "8", "9", "10", "11"],
            "image_url": "https://images.unsplash.com/photo-1521405924368-64c5b84bec60?w=800&q=80",
            "use_cases": ["casual", "lifestyle"],
            "priorities": ["style", "value"],
            "stock": 30,
            "created_at": NOW,
        },
    },
    # ── Vans ─────────────────────────────────────────────────────────────────
    {
        "key": "product::vans-old-skool",
        "doc": {
            "type": "product",
            "name": "Old Skool",
            "brand": "Vans",
            "category": "shoes",
            "price": 4295,
            "currency": "PHP",
            "description": "The original skate shoe. Most iconic in black/white with the white side stripe, also in navy/white and all-black. Canvas and suede upper with signature waffle outsole.",
            "sizes": ["7", "8", "9", "10", "11"],
            "image_url": "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&q=80",
            "use_cases": ["casual", "skate", "lifestyle"],
            "priorities": ["style", "durability", "value"],
            "stock": 22,
            "created_at": NOW,
        },
    },
    # ── Reebok ───────────────────────────────────────────────────────────────
    {
        "key": "product::reebok-club-c-85",
        "doc": {
            "type": "product",
            "name": "Club C 85",
            "brand": "Reebok",
            "category": "shoes",
            "price": 4495,
            "currency": "PHP",
            "description": "Minimalist 1985 tennis classic. Always clean: white/green, white/chalk, or all-white. Soft leather upper, low-profile silhouette — the 'no fuss' casual sneaker.",
            "sizes": ["8", "9", "10", "11"],
            "image_url": "https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=800&q=80",
            "use_cases": ["casual", "lifestyle"],
            "priorities": ["style", "value"],
            "stock": 17,
            "created_at": NOW,
        },
    },
    # ── Puma ─────────────────────────────────────────────────────────────────
    {
        "key": "product::puma-rs-x",
        "doc": {
            "type": "product",
            "name": "RS-X",
            "brand": "Puma",
            "category": "shoes",
            "price": 5495,
            "currency": "PHP",
            "description": "Bold chunky dad-shoe. Eye-catching multi-panel design in blue/red/white, neon yellow/black, or parchment/whisper white. RS cushioning unit visible in the sole.",
            "sizes": ["8", "9", "10", "11"],
            "image_url": "https://images.unsplash.com/photo-1608667508764-33cf0726b13a?w=800&q=80",
            "use_cases": ["lifestyle", "casual"],
            "priorities": ["style", "cushioning"],
            "stock": 13,
            "created_at": NOW,
        },
    },
    # ── Skechers ─────────────────────────────────────────────────────────────
    {
        "key": "product::skechers-go-walk-6",
        "doc": {
            "type": "product",
            "name": "Go Walk 6",
            "brand": "Skechers",
            "category": "shoes",
            "price": 3995,
            "currency": "PHP",
            "description": "Ultra-lightweight slip-on walker. Available in all-black, navy/white, and a light taupe/beige. Machine washable. Hyper Burst foam cushioning — the most affordable all-day comfort pick in the catalog.",
            "sizes": ["7", "8", "9", "10", "11"],
            "image_url": "https://images.unsplash.com/photo-1542219550-37153d387c27?w=800&q=80",
            "use_cases": ["walking", "casual"],
            "priorities": ["comfort", "lightweight", "value"],
            "stock": 35,
            "created_at": NOW,
        },
    },
]


def _ensure_scope_and_collection(cluster, bucket_name: str, scope_name: str, collection_name: str) -> None:
    bucket = cluster.bucket(bucket_name)
    cm = bucket.collections()

    try:
        cm.create_scope(scope_name)
        print(f"  Created scope: {scope_name}")
    except ScopeAlreadyExistsException:
        pass

    existing = set()
    for scope in cm.get_all_scopes():
        if scope.name == scope_name:
            existing = {c.name for c in scope.collections}
            break

    if collection_name not in existing:
        try:
            cm.create_collection(CollectionSpec(collection_name, scope_name=scope_name))
            print(f"  Created collection: {scope_name}.{collection_name}")
        except CollectionAlreadyExistsException:
            pass


def main():
    if not all([CONNECTION_STRING, USERNAME, PASSWORD]):
        print("ERROR: Missing Couchbase credentials. Check server/.env")
        sys.exit(1)

    print(f"Connecting to {CONNECTION_STRING}...")
    auth = PasswordAuthenticator(USERNAME, PASSWORD)
    cluster = Cluster(CONNECTION_STRING, ClusterOptions(auth))
    cluster.wait_until_ready(timedelta(seconds=15))
    print("Connected.\n")

    print("Ensuring scope and collection exist...")
    _ensure_scope_and_collection(cluster, BUCKET_NAME, SCOPE_NAME, "products")

    bucket = cluster.bucket(BUCKET_NAME)
    scope = bucket.scope(SCOPE_NAME)
    products_col = scope.collection("products")

    try:
        cluster.query(
            f"CREATE PRIMARY INDEX IF NOT EXISTS ON `{BUCKET_NAME}`.`{SCOPE_NAME}`.`products`"
        ).execute()
        print("Primary index on products: ready.")
    except Exception as exc:
        print(f"(Warning) Could not create primary index: {exc}")

    print(f"\nSeeding {len(PRODUCTS)} products...")
    for item in PRODUCTS:
        products_col.upsert(item["key"], item["doc"])
        print(f"  Upserted: {item['doc']['brand']} {item['doc']['name']}  ₱{item['doc']['price']:,}")

    print(f"\nDone. {len(PRODUCTS)} products ready in {BUCKET_NAME}.{SCOPE_NAME}.products")


if __name__ == "__main__":
    main()
