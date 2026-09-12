-- Step 1: Delete Candidate profile
DELETE FROM "Candidates" WHERE "UserId" = '850fb471-099d-4e11-a16f-c7e3e18ebc8a';

-- Step 2: Change role from Candidate to Employer
UPDATE "AspNetUserRoles" 
SET "RoleId" = '885f6dea-bb68-4f20-a469-0931d9c4aaf8' 
WHERE "UserId" = '850fb471-099d-4e11-a16f-c7e3e18ebc8a';

-- Step 3: Create Company
INSERT INTO "Companies" ("Id", "Name", "TaxCode", "VerifiedStatus", "CreatedAt", "UpdatedAt")
VALUES (
  gen_random_uuid(),
  'Công ty mới',
  'TEMP_' || substring(gen_random_uuid()::text, 1, 8),
  'Unverified',
  NOW(),
  NOW()
)
RETURNING "Id";

-- Step 4: Create Employer profile (Run after getting Company ID)
-- Replace <COMPANY_ID> with the ID from step 3
-- INSERT INTO "Employers" ("Id", "UserId", "FullName", "Phone", "CompanyId", "CreatedAt", "UpdatedAt")
-- VALUES (
--   gen_random_uuid(),
--   '850fb471-099d-4e11-a16f-c7e3e18ebc8a',
--   'Nguyen Van A',
--   '0123456789',
--   '<COMPANY_ID>',
--   NOW(),
--   NOW()
-- );

-- Verify result
SELECT u."Id", u."Email", r."Name" as Role 
FROM "AspNetUsers" u 
JOIN "AspNetUserRoles" ur ON u."Id" = ur."UserId" 
JOIN "AspNetRoles" r ON ur."RoleId" = r."Id" 
WHERE u."Email" = 'nglich2044@gmail.com';
