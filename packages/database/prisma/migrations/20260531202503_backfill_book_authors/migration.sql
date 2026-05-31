-- Backfill: populate authors[] from the legacy author column
-- for rows that pre-date the dual-write
UPDATE "Book"
SET "authors" = ARRAY["author"]
WHERE "authors" IS NULL OR cardinality("authors") = 0;