# RAG System Setup Guide

This guide walks you through setting up the Retrieval-Augmented Generation (RAG) system for enriching Similar Buildings AI commentary with historical context from NYC Landmarks Commission PDF reports.

## Overview

The RAG system enhances the Similar Buildings feature by:
- Retrieving relevant historical context from NYC Landmarks PDF reports
- Providing Gemini with specific architectural facts and connections
- Generating richer, more informative similarity explanations

**Architecture:**
- Client-side RAG retrieval via Supabase RPC
- One-time PDF processing batch job (Python script)
- Seamless integration with existing similarBuildingsService

---

## Setup Instructions

### Step 1: Run Database Migration

Run the migration in Supabase SQL Editor:

```bash
# Location: architecture-app/supabase/migrations/20251211_landmark_chunks_rag.sql
```

This creates:
- `landmark_chunks` table with pgvector support
- `search_landmark_chunks` RPC function for client-side queries
- Necessary indexes and permissions

**Verify migration:**
```sql
-- Check table exists
SELECT COUNT(*) FROM landmark_chunks;

-- Check RPC function exists
SELECT proname FROM pg_proc WHERE proname = 'search_landmark_chunks';
```

---

### Step 2: Process PDF Reports

**Prerequisites:**
```bash
cd /Users/lucienmount/coding/nyc_scan
pip install PyPDF2 google-generativeai psycopg2-binary python-dotenv
```

**Environment Variables:**
```bash
# Required in nyc_scan/.env
export GEMINI_API_KEY=your-gemini-api-key
export DATABASE_URL=postgresql://...  # Supabase connection string
```

**Test with 50 PDFs (dry run):**
```bash
python backend/scripts/process_landmark_pdfs.py \
  /Users/lucienmount/coding/pdf_database_designated/output_downsized/books \
  --limit 50 \
  --dry-run
```

**Process 50 PDFs (write to database):**
```bash
python backend/scripts/process_landmark_pdfs.py \
  /Users/lucienmount/coding/pdf_database_designated/output_downsized/books \
  --limit 50
```

**Expected output:**
```
📚 Found 2847 PDFs in /path/to/books
📌 Processing first 50 PDFs
✅ Gemini API configured
✅ Connected to database
============================================================
Starting PDF processing...
============================================================

📄 Processing: Empire_State_Building.pdf
  Building: Empire State Building
  Address: 350 Fifth Avenue
  Page 1: 3 chunks
  Page 2: 4 chunks
  ✅ Stored 7 chunks

...

============================================================
✅ Done! Processed 50 PDFs
📊 Total chunks: 847
============================================================
```

**Verify chunks in database:**
```sql
-- Check total chunks
SELECT COUNT(*) FROM landmark_chunks;

-- Check sample data
SELECT
    building_name,
    source_file,
    chunk_index,
    LEFT(chunk_text, 100) as preview
FROM landmark_chunks
LIMIT 10;

-- Check embeddings
SELECT COUNT(*) FROM landmark_chunks WHERE embedding IS NOT NULL;
```

---

### Step 3: Test in App

The RAG integration is automatic! Similar Buildings now uses RAG context when available.

**Test flow:**
1. Open app and navigate to any building
2. Tap "Find Similar" button
3. Check similarity reasons - they should be more detailed when RAG context is available

**Example output difference:**

**Without RAG:**
```
"Shares similar Art Deco setbacks and ornamental crown."
```

**With RAG:**
```
"Both commissioned by the Chanin Construction Company in 1929,
featuring Jacques Delamarre's signature terracotta ornamentation."
```

**Check logs:**
```
[SimilarBuildings] Fetching RAG context (buildings: 8)
[RAG] Retrieved chunks (building: Chrysler Building, count: 1)
[SimilarBuildings] RAG context retrieved (buildingsWithContext: 5)
[SimilarBuildings] Generated Gemini reasons (count: 7, withRAG: true)
```

---

### Step 4: Process Full Corpus (Optional)

After testing with 50 PDFs, process the full corpus:

```bash
# This will take 5-10 hours and cost ~$5 in Gemini embeddings
python backend/scripts/process_landmark_pdfs.py \
  /Users/lucienmount/coding/pdf_database_designated/output_downsized/books
```

**Run overnight with nohup:**
```bash
nohup python backend/scripts/process_landmark_pdfs.py \
  /Users/lucienmount/coding/pdf_database_designated/output_downsized/books \
  > pdf_processing.log 2>&1 &
```

**Monitor progress:**
```bash
tail -f pdf_processing.log

# Check database count periodically
psql $DATABASE_URL -c "SELECT COUNT(*) FROM landmark_chunks;"
```

---

## Architecture Details

### Database Schema

```sql
CREATE TABLE landmark_chunks (
    id SERIAL PRIMARY KEY,
    building_name TEXT,           -- Extracted from filename/PDF
    bin TEXT,                      -- Building ID (if found in PDF)
    bbl TEXT,                      -- BBL (if found in PDF)
    address TEXT,                  -- Address pattern match
    chunk_text TEXT NOT NULL,      -- ~500 tokens of text
    chunk_index INT,               -- Position in document
    embedding vector(768),         -- Gemini embedding-001
    source_file TEXT,              -- PDF filename
    page_number INT,               -- Page in PDF
    created_at TIMESTAMP
);
```

### RPC Function

```sql
search_landmark_chunks(
    building_name_pattern TEXT,
    query_embedding vector(768) DEFAULT NULL,
    match_limit INT DEFAULT 3
) RETURNS TABLE (...)
```

- Text-based search by building name
- Optional semantic search with embeddings (future enhancement)
- Returns top N chunks with similarity scores

### Code Flow

```
User taps "Find Similar"
  → findSimilarBuildings()
    → generateSimilarityReasons()
      → getLandmarkContextBatch() [RAG]
        → Supabase RPC: search_landmark_chunks
        ← Returns historical chunks
      → formatContextBlock()
      → Enhanced Gemini prompt with context
      → Gemini generates richer explanations
```

---

## Cost & Performance

| Operation | Cost | Time |
|-----------|------|------|
| Embedding 1 PDF (~10 chunks) | ~$0.001 | ~5-10 sec |
| Processing 50 PDFs | ~$0.05 | ~5 minutes |
| Processing 2847 PDFs (full) | ~$5 | 5-10 hours |
| RAG query at runtime | $0 | ~100ms |
| Gemini prompt with RAG | ~$0.0005 | ~500ms |

**Storage:**
- ~500 tokens per chunk
- ~10 chunks per PDF
- 2847 PDFs × 10 chunks = ~28,000 chunks
- Vector storage: ~28,000 × 768 × 4 bytes = ~86 MB

---

## Troubleshooting

### Migration fails with "extension vector does not exist"

Enable pgvector in Supabase:
```sql
CREATE EXTENSION vector;
```

### Script fails with "No module named 'PyPDF2'"

Install dependencies:
```bash
pip install PyPDF2 google-generativeai psycopg2-binary
```

### Script fails with "GEMINI_API_KEY not set"

Set environment variable:
```bash
export GEMINI_API_KEY=your-key-here
```

### No RAG context appears in app

Check:
1. Migration ran successfully
2. PDFs were processed (check landmark_chunks count)
3. Building names match between app and PDF data
4. Logs show `[RAG] Retrieved chunks`

Test query manually:
```sql
SELECT * FROM search_landmark_chunks('Empire State', NULL, 3);
```

### Embeddings are NULL in database

Gemini API might be failing. Check script output for errors:
```
❌ Embedding error: [error details]
```

Possible causes:
- Invalid API key
- Rate limiting
- Network issues

---

## Maintenance

### Update existing PDFs

Re-run script with same PDFs - it will insert new chunks (duplicates OK for now).

### Clear all chunks

```sql
TRUNCATE landmark_chunks;
```

### Check chunk coverage

```sql
-- Buildings with chunks
SELECT building_name, COUNT(*) as chunk_count
FROM landmark_chunks
GROUP BY building_name
ORDER BY chunk_count DESC
LIMIT 20;

-- Total unique buildings
SELECT COUNT(DISTINCT building_name) FROM landmark_chunks;
```

---

## Future Enhancements

- [ ] Semantic search using query embeddings (not just text match)
- [ ] Deduplication of chunks across re-runs
- [ ] BIN/BBL matching for better building lookup
- [ ] Chunk quality scoring
- [ ] Incremental updates (only process new PDFs)
- [ ] Context caching for frequently queried buildings

---

## Files Modified

| File | Description |
|------|-------------|
| `supabase/migrations/20251211_landmark_chunks_rag.sql` | Database schema + RPC function |
| `src/services/ai/ragService.ts` | Client-side RAG retrieval service |
| `src/services/similarBuildingsService.ts` | Enhanced with RAG integration |
| `/Users/lucienmount/coding/nyc_scan/backend/scripts/process_landmark_pdfs.py` | PDF processing script |

---

## Questions?

Check logs in app (Metro bundler console) for RAG activity:
```
[RAG] Retrieved chunks (building: X, count: Y)
[SimilarBuildings] Generated Gemini reasons (withRAG: true)
```
