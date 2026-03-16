-- Harmoniser toutes les colonnes vector de 1536 vers 1024 (Jina AI v3)
-- Les embeddings existants sont invalidés (NULL) car les dimensions changent

ALTER TABLE projects
  ALTER COLUMN description_embedding TYPE vector(1024)
  USING NULL;

ALTER TABLE candidate_profiles
  ALTER COLUMN bio_embedding TYPE vector(1024)
  USING NULL;

ALTER TABLE candidate_profiles
  ALTER COLUMN skills_embedding TYPE vector(1024)
  USING NULL;
