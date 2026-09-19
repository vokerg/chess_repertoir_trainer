INSERT INTO "GameTagDefinition" ("code", "name")
VALUES (136, 'SLOW_BLEED_WIN')
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name";
