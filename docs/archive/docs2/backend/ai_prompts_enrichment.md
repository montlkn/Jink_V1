# AI Enrichment Prompts (exa + LLM)

## Building Card Enrichment
- Input: name, year, architect, style, 2–3 facts, city district
- Prompt goals: 3-sentence summary, one quirky detail, one cross-link
- Guardrails: no speculation; cite if confidence < 0.6

## Deep Dive Report (Pro)
- Sections: Origins, Materials, Context, Anecdotes, Nearby Related
- Style: calm, precise, concrete examples
- Length: 300–500 words, bulleted where helpful

## Safety
- Never fabricate dates; prefer “unknown”
- Strip PII from contributions before summarizing
