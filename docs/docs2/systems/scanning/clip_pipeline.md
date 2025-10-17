# Scanning: CLIP Pipeline

## Summary
Outlines how JINK processes images through CLIP (Contrastive Language–Image Pretraining) to identify architectural features and match them to the database.

## Pipeline
1. Capture image → resize and normalize
2. Send to remote CLIP inference API
3. Receive 512-d embedding vector
4. Compare with stored building vectors using cosine similarity
5. Return top candidate (confidence ≥ 0.7)

## Notes
- Image preprocessing: 224×224, mean/std normalization
- Model: ViT-B/32 baseline, extendable to custom fine-tuned weights
- Store embeddings in Supabase `buildings` table

> *The eye sees, CLIP remembers.*
