INSERT INTO "GameTagDefinition" ("code", "name")
VALUES (174, 'OPENING_ADVANTAGE')
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name";
