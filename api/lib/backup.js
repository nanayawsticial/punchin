// api/lib/backup.js
// Simple JSON backup fallback when pg_dump is unavailable.
// This script uses Prisma to dump all tables into a single JSON file.

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function dumpDatabase() {
  const backupDir = path.resolve(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(backupDir, `backup-${timestamp}.json`);

  const data = {};
  // List of models in Prisma schema (auto‑generated on client)
  const models = Object.keys(prisma);
  for (const modelName of models) {
    // Skip internal properties (e.g., $connect, $disconnect)
    if (modelName.startsWith('$')) continue;
    try {
      const records = await prisma[modelName].findMany();
      data[modelName] = records;
    } catch (e) {
      // Not a model (e.g., $transaction). Ignore.
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[BACKUP] JSON dump written to ${filePath}`);
  await prisma.$disconnect();
}

if (require.main === module) {
  dumpDatabase().catch(err => {
    console.error('[BACKUP] Error during backup:', err);
    process.exit(1);
  });
}

module.exports = { dumpDatabase };
