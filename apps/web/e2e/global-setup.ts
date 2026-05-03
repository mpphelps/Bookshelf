import { execSync } from "child_process";
import path from "path";
import fs from "fs";

export default async function globalSetup() {
  const dbPackage = path.resolve(import.meta.dirname, "../../../packages/database");

  console.log(`[e2e] Migrating test database: ${process.env.DATABASE_URL}`);

  console.log(`[e2e] dbPackage: ${dbPackage}`);
  console.log(`[e2e] exists: ${fs.existsSync(dbPackage)}`);

  execSync("npx prisma migrate deploy", {
    cwd: dbPackage,
    stdio: "inherit",
    env: process.env,
    shell: true,
  });
}
