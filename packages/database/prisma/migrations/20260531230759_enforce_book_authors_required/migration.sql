-- Lock the column down: cannot be NULL, must have at least one element
-- Safe to run because authors backfilled all rows

ALTER TABLE "Book" ALTER COLUMN "authors" SET NOT NULL;

ALTER TABLE "Book" ADD CONSTRAINT "book_authors_nonempty" CHECK (cardinality("authors") >= 1);