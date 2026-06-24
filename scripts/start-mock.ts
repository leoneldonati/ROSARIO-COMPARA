import { MongoMemoryServer } from "mongodb-memory-server";
import { execSync, spawn } from "child_process";
import { existsSync } from "fs";

function cmd(name: string): string {
  const local = `node_modules\\.bin\\${name}.cmd`;
  if (existsSync(local)) return local;
  return `${name}.cmd`;
}

async function main() {
  const mongod = await MongoMemoryServer.create({
    instance: { dbName: "compra-bar" },
  });
  const uri = mongod.getUri();

  console.log(`🧪 MongoDB en memoria iniciado: ${uri}`);

  // 1. Seed data
  execSync(`${cmd("tsx")} scripts/seed.ts`, {
    env: { ...process.env, MONGODB_URI: uri },
    stdio: "inherit",
  });

  console.log("\n🚀 Iniciando servidor de desarrollo...\n");

  // 2. Start dev server
  const dev = spawn(cmd("react-router"), ["dev"], {
    env: { ...process.env, MONGODB_URI: uri },
    stdio: "inherit",
    shell: true,
  });

  dev.on("close", async (code) => {
    await mongod.stop();
    process.exit(code ?? 0);
  });

  const shutdown = async () => {
    console.log("\nDeteniendo servidor...");
    dev.kill();
    await mongod.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
