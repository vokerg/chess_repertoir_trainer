SELECT setval(
  pg_get_serial_sequence('"AppUser"', 'id'),
  COALESCE((SELECT MAX("id") FROM "AppUser"), 1),
  true
);
