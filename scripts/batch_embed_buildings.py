#!/usr/bin/env python3
"""
Batch script to compute CLIP embeddings for buildings.
Run this AFTER deploying the Supabase migration.

Usage:
    python scripts/batch_embed_buildings.py

Prerequisites:
    - SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables
    - R2 images available at the configured bucket
"""

import asyncio
import os
import sys

# Add server src to path for clip_matcher
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'apps', 'server', 'src'))

import httpx
from supabase import create_client

# Configuration
BATCH_SIZE = 10
R2_BASE = os.environ.get(
    "R2_PUBLIC_URL", 
    "https://jink-building-captures.47cf6ebee78f6d8a95ed0a80b66ccdc7.r2.cloudflarestorage.com"
)
IMAGE_PATH_TEMPLATE = "/buildings/{bin}/0deg_40pitch.jpg"


async def main():
    from clip_matcher import encode_photo, get_model
    
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
        return
    
    supabase = create_client(supabase_url, supabase_key)
    
    # Pre-load CLIP model
    print("Loading CLIP model...")
    get_model()
    print("✅ CLIP model loaded")
    
    # Get buildings without embeddings
    print("\nFetching buildings without embeddings...")
    result = supabase.table("buildings").select("bin").is_("clip_embedding", "null").limit(500).execute()
    bins = [r["bin"] for r in result.data]
    
    print(f"Found {len(bins)} buildings without embeddings")
    
    if not bins:
        print("✅ All buildings already have embeddings!")
        return
    
    # Process in batches
    success_count = 0
    fail_count = 0
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for i in range(0, len(bins), BATCH_SIZE):
            batch = bins[i:i + BATCH_SIZE]
            print(f"\nProcessing batch {i // BATCH_SIZE + 1} ({len(batch)} buildings)...")
            
            for bin_val in batch:
                try:
                    image_url = f"{R2_BASE}{IMAGE_PATH_TEMPLATE.format(bin=bin_val)}"
                    response = await client.get(image_url)
                    
                    if response.status_code != 200:
                        print(f"  ⚠️  {bin_val}: Image not found (HTTP {response.status_code})")
                        fail_count += 1
                        continue
                    
                    embedding = await encode_photo(response.content)
                    
                    # Update database
                    supabase.table("buildings").update({
                        "clip_embedding": embedding.tolist()
                    }).eq("bin", bin_val).execute()
                    
                    print(f"  ✅ {bin_val}")
                    success_count += 1
                    
                except Exception as e:
                    print(f"  ❌ {bin_val}: {str(e)[:50]}")
                    fail_count += 1
    
    print(f"\n=== Complete ===")
    print(f"✅ Success: {success_count}")
    print(f"❌ Failed: {fail_count}")


if __name__ == "__main__":
    asyncio.run(main())
