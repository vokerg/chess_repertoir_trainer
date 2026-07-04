INSERT INTO "GameTagDefinition" ("code", "name")
VALUES (137, 'USER_BLUNDERED')
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name";
