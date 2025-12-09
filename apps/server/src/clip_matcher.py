"""
CLIP-based building image matching service
Uses OpenAI ViT-B-32 CLIP model for image embeddings
"""

import torch
import open_clip
from PIL import Image
import numpy as np
from io import BytesIO
import httpx
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

_model = None
_preprocess = None

def get_model():
    """Lazy loads the OpenAI ViT-B-32 CLIP model on first use"""
    global _model, _preprocess
    
    if _model is None:
        logger.info('Loading CLIP model (ViT-B-32)...')
        _model, _, _preprocess = open_clip.create_model_and_transforms(
            'ViT-B-32',
            pretrained='openai'
        )
        _model.eval()
        logger.info('✅ CLIP model loaded')
    return _model, _preprocess

async def encode_photo(photo_bytes):
    """Encode a photo into a CLIP embedding"""
    model, preprocess = get_model()

    image = Image.open(BytesIO(photo_bytes))
    image_tensor = preprocess(image).unsqueeze(0)

    with torch.no_grad():
        embedding = model.encode_image(image_tensor)

    # Normalize
    embedding = embedding / embedding.norm(dim=-1, keepdim=True)
    return embedding.cpu().numpy()[0]


async def compare_images(
    user_photo_url: str,
    candidates: List[Dict[str, Any]],
    reference_data: Dict[str, List[Dict[str, Any]]]
) -> List[Dict[str, Any]]:
    """
    Compare user photo against reference images using CLIP embeddings

    Args:
        user_photo_url: URL to user's uploaded photo
        candidates: List of candidate buildings from geospatial search
        reference_data: Dict mapping BIN -> list of reference image dicts
            Each dict can contain either:
            - 'embedding': Pre-computed embedding from database
            - 'image_bytes': Raw image bytes (for lazy-fetched Street View)

    Returns:
        List of matches sorted by confidence score
    """
    logger.info(f"🔍 Comparing user photo against {len(reference_data)} buildings with reference images")

    # Download and encode user photo
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(user_photo_url)
        user_photo_bytes = response.content

    user_embedding = await encode_photo(user_photo_bytes)

    # Compare against all reference embeddings
    matches = []

    for candidate in candidates:
        bin_val = candidate['bin']

        # Skip if no reference images for this building
        if bin_val not in reference_data:
            continue

        ref_images = reference_data[bin_val]

        # Calculate similarity scores for all reference images of this building
        similarities = []
        for ref_img in ref_images:
            # Handle two cases:
            # 1. Pre-computed embedding from database
            if 'embedding' in ref_img:
                ref_embedding = np.array(ref_img['embedding'])
            # 2. Lazy-fetched image bytes (need to encode on-the-fly)
            elif 'image_bytes' in ref_img:
                logger.info(f"  Encoding lazy-fetched Street View for BIN {bin_val}")
                ref_embedding = await encode_photo(ref_img['image_bytes'])
            else:
                logger.warning(f"  Reference image for BIN {bin_val} has neither embedding nor image_bytes")
                continue

            # Cosine similarity (embeddings are already normalized)
            similarity = float(np.dot(user_embedding, ref_embedding))
            similarities.append(similarity)

        # Use best match for this building
        if similarities:
            best_similarity = max(similarities)
            avg_similarity = sum(similarities) / len(similarities)

            matches.append({
                'bin': bin_val,
                'bbl': candidate.get('bbl'),
                'address': candidate.get('address'),
                'confidence': round(best_similarity * 100, 2),  # Convert to percentage
                'avg_confidence': round(avg_similarity * 100, 2),
                'num_references': len(similarities),
                'distance_meters': candidate.get('distance_meters'),
                'bearing_difference': candidate.get('bearing_difference'),
            })

    # Sort by confidence score
    matches.sort(key=lambda x: x['confidence'], reverse=True)

    logger.info(f"✅ Found {len(matches)} matches with reference images")
    if matches:
        logger.info(f"  Top match: {matches[0]['address']} (BIN {matches[0]['bin']}) - {matches[0]['confidence']}% confidence")

    return matches
