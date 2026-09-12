-- Check current user info
SELECT u."Id", u."Email", r."Name" as Role 
FROM "AspNetUsers" u 
JOIN "AspNetUserRoles" ur ON u."Id" = ur."UserId" 
JOIN "AspNetRoles" r ON ur."RoleId" = r."Id" 
WHERE u."Email" = 'nglich2044@gmail.com';

-- Get Role IDs
SELECT "Id", "Name" FROM "AspNetRoles";
