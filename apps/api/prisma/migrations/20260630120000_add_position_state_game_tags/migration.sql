INSERT INTO "GameTagDefinition" ("code", "name")
VALUES
  (170, 'WAS_MUCH_WORSE'),
  (171, 'WAS_LOST'),
  (172, 'WAS_MUCH_BETTER'),
  (173, 'WAS_WINNING')
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name";
