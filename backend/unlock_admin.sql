-- Unlock admin account by resetting lockout
UPDATE "AspNetUsers"
SET 
    "LockoutEnd" = NULL,
    "AccessFailedCount" = 0
WHERE "Email" = 'admin@futurecv.com';

-- Verify the update
SELECT "Id", "Email", "LockoutEnd", "AccessFailedCount"
FROM "AspNetUsers"
WHERE "Email" = 'admin@futurecv.com';
