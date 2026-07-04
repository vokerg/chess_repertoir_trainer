UPDATE "ImportedGame"
SET "tagCodes" = ARRAY(
  SELECT DISTINCT code
  FROM unnest(array_replace("tagCodes", 109, 113)) AS code
  ORDER BY code
)
WHERE "tagCodes" @> ARRAY[109];

DELETE FROM "GameTagDefinition"
WHERE "code" = 109;
