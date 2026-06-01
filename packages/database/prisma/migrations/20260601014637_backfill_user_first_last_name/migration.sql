-- Backfill: split User.name into firstName + lastName for rows
  -- that pre-date the M4a dual-write.
  --
  -- Rule (matches splitName() in apps/web/app/lib/name.ts):
  --   1. Trim name
  --   2. If empty                  → firstName='Unknown', lastName=NULL
  --   3. If no space               → firstName=trimmed,   lastName=NULL
  --   4. Else                      → firstName=text before first space,
  --                                  lastName=trim(text after first space) || NULL
  --
  -- Idempotent: the WHERE clause means re-running is a no-op once every row
  -- has firstName set.

  UPDATE "User"
  SET
    "firstName" = CASE
      WHEN trim("name") = ''                       THEN 'Unknown'
      WHEN position(' ' IN trim("name")) = 0       THEN trim("name")
      ELSE substring(trim("name") FROM 1 FOR position(' ' IN trim("name")) - 1)
    END,
    "lastName" = CASE
      WHEN trim("name") = ''                       THEN NULL
      WHEN position(' ' IN trim("name")) = 0       THEN NULL
      ELSE NULLIF(
        trim(substring(trim("name") FROM position(' ' IN trim("name")) + 1)),
        ''
      )
    END
  WHERE "firstName" IS NULL;