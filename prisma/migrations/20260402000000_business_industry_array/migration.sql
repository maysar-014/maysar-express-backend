-- AlterTable
ALTER TABLE "businessregistry_businesses"
  ALTER COLUMN "industry" TYPE TEXT[] USING (
    CASE
      WHEN "industry" IS NULL OR btrim("industry") = '' THEN ARRAY[]::TEXT[]
      ELSE regexp_split_to_array("industry", '\s*,\s*')
    END
  ),
  ALTER COLUMN "industry" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "industry" SET NOT NULL;
