-- Migration: Add HNSW indexes on all vector(1024) columns
-- Context: The feed, search, matching, and filter services run
--   `1 - (embedding <=> $query::vector) > 0.65` queries that currently
--   perform a sequential scan. At scale this becomes a wall.
--   HNSW gives ~O(log n) ANN lookup with cosine distance.
--
-- vector_cosine_ops matches the `<=>` operator used throughout the code.
-- Indexes are partial (WHERE embedding IS NOT NULL) to keep them tight.
-- IF NOT EXISTS makes this migration safe to re-run.

CREATE INDEX IF NOT EXISTS projects_description_embedding_hnsw
  ON projects
  USING hnsw (description_embedding vector_cosine_ops)
  WHERE description_embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS candidate_profiles_bio_embedding_hnsw
  ON candidate_profiles
  USING hnsw (bio_embedding vector_cosine_ops)
  WHERE bio_embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS candidate_profiles_skills_embedding_hnsw
  ON candidate_profiles
  USING hnsw (skills_embedding vector_cosine_ops)
  WHERE skills_embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS filter_embeddings_embedding_hnsw
  ON filter_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;
