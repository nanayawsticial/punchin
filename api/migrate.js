process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const oldDbUrl = "postgresql://postgres.bhjqnjdjoqymnagqvurb:8%40YsX%24pSPA8i3MV@aws-1-eu-central-2.pooler.supabase.com:5432/postgres";
const newDbUrl = "postgresql://postgres.worwwccqqwakmxajhwxp:8%40YsX%24pSPA8i3MV@aws-1-eu-central-1.pooler.supabase.com:5432/postgres";

const OLD_ORG_ID = 'cmqkpuqx30000118rksz01i7q'; // STEMAIDE Africa LTD
const NEW_ORG_ID = 'cmqygu2na000012pwgpdyv360'; // STEMAIDE Africa Limited

// Map old roles to new enums
function mapRole(oldRole) {
  const role = oldRole.toLowerCase();
  if (role === 'super_admin') return 'SUPER_ADMIN';
  if (role === 'admin') return 'ADMIN';
  if (role === 'manager') return 'MANAGER';
  return 'EMPLOYEE'; // fallback/employee
}

// Map old status to new enums
function mapStatus(oldStatus) {
  const status = oldStatus.toLowerCase();
  if (status === 'inactive') return 'INACTIVE';
  if (status === 'suspended') return 'SUSPENDED';
  return 'ACTIVE';
}

async function migrate() {
  const oldClient = new Client({ connectionString: oldDbUrl, ssl: { rejectUnauthorized: false } });
  const newClient = new Client({ connectionString: newDbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await oldClient.connect();
    await newClient.connect();
    console.log("Connected to both databases successfully!");

    // Start transaction in new database
    await newClient.query('BEGIN');

    // 1. Fetch departments from old DB
    console.log("Fetching departments from old DB...");
    const deptsRes = await oldClient.query('SELECT * FROM "Department" WHERE "organizationId" = $1', [OLD_ORG_ID]);
    console.log(`Found ${deptsRes.rowCount} departments.`);

    // 2. Insert departments into new DB (preserving old IDs)
    for (const dept of deptsRes.rows) {
      console.log(`Migrating department: ${dept.name} (${dept.id})`);
      await newClient.query(
        `INSERT INTO "Department" (id, name, color, "organizationId", "createdAt")
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET name = $2, color = $3`,
        [dept.id, dept.name, dept.color, NEW_ORG_ID, dept.createdAt]
      );
    }

    // 3. Fetch users from old DB
    console.log("Fetching users from old DB...");
    const usersRes = await oldClient.query('SELECT * FROM "User" WHERE "organizationId" = $1', [OLD_ORG_ID]);
    console.log(`Found ${usersRes.rowCount} users.`);

    // 4. Insert/Update users in new DB
    for (const user of usersRes.rows) {
      const email = user.email.toLowerCase();
      const mappedRole = mapRole(user.role);
      const mappedStatus = mapStatus(user.status);

      if (email === 'owner@stemaide.com') {
        console.log(`Updating existing super admin: ${email}`);
        // We preserve their ID, passwordHash and organizationId in the new DB, but update their metadata from old DB
        await newClient.query(
          `UPDATE "User"
           SET name = $1, "employeeCode" = $2, "departmentId" = $3, phone = $4, avatar = $5, "mfaEnabled" = $6, "mfaSecret" = $7
           WHERE email = $8`,
          [user.name, user.employeeCode, user.departmentId, user.phone || null, user.avatar || null, user.mfaEnabled, user.mfaSecret, email]
        );
      } else {
        console.log(`Migrating user: ${user.name} (${email})`);
        await newClient.query(
          `INSERT INTO "User" (id, name, email, "passwordHash", role, "employeeCode", "departmentId", "organizationId", avatar, phone, status, "mfaEnabled", "mfaSecret", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           ON CONFLICT (email) DO NOTHING`,
          [
            user.id,
            user.name,
            email,
            user.passwordHash,
            mappedRole,
            user.employeeCode,
            user.departmentId,
            NEW_ORG_ID,
            user.avatar || null,
            user.phone || null,
            mappedStatus,
            user.mfaEnabled,
            user.mfaSecret,
            user.createdAt,
            user.updatedAt
          ]
        );
      }
    }

    await newClient.query('COMMIT');
    console.log("Migration completed successfully!");

  } catch (err) {
    await newClient.query('ROLLBACK');
    console.error("Migration failed, transaction rolled back:", err);
  } finally {
    await oldClient.end();
    await newClient.end();
  }
}

migrate();
