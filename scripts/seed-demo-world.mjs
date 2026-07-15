#!/usr/bin/env node
// Semeia um mundo demo VÁLIDO (schema atual) para o app mobile consumir dados
// reais: world:create → world:genesis (gera 16 clubes + ~368 jogadores) →
// world:activate. Requer a API rodando (padrão http://localhost:3000) e a
// chave de dev de admin. Imprime o worldId; aponte EXPO_PUBLIC_WORLD_ID nele.
//
// Uso:  node scripts/seed-demo-world.mjs [seed] [startDate]
//   ex: node scripts/seed-demo-world.mjs grinta-demo 2026-01-01

const API = process.env.GRINTA_API_URL ?? "http://localhost:3000/api/v1";
const ADMIN_KEY = process.env.GRINTA_ADMIN_KEY ?? "grinta-dev-admin";
const seed = process.argv[2] ?? "grinta-demo";
const startDate = process.argv[3] ?? "2026-01-01";
const stamp = `${seed}-${startDate}`;

async function session() {
  const r = await fetch(`${API}/auth/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ subject: "seed-script", role: "admin", adminKey: ADMIN_KEY }),
  });
  if (!r.ok) throw new Error(`sessão falhou: ${r.status} ${await r.text()}`);
  return (await r.json()).token;
}

async function command(token, commandType, payload, worldId) {
  const env = {
    contractVersion: "v1",
    correlationId: `seed-${commandType}`,
    commandType,
    idempotencyKey: `seed-${commandType}-${stamp}`,
    payload: payload ?? {},
  };
  if (worldId) env.worldId = worldId;
  const r = await fetch(`${API}/commands`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(env),
  });
  const body = await r.json();
  if (!r.ok || body.error) throw new Error(`${commandType} falhou: ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  const token = await session();
  const created = await command(token, "world:create", { seed, startDate, rulesetVersion: "1.0.0" });
  const worldId = String(created.resource ?? "").replace(/^world:/, "");
  if (!worldId) throw new Error(`world:create não retornou worldId: ${JSON.stringify(created)}`);
  console.log(`✓ world:create   → ${worldId} (${created.status})`);

  const genesis = await command(token, "world:genesis", {}, worldId);
  console.log(`✓ world:genesis  → ${genesis.status} (16 clubes + jogadores gerados)`);

  const activate = await command(token, "world:activate", {}, worldId);
  console.log(`✓ world:activate → ${activate.status}`);

  console.log("");
  console.log(`Mundo demo pronto: ${worldId}`);
  console.log(`Aponte o app:  EXPO_PUBLIC_WORLD_ID=${worldId}`);
}

main().catch((e) => {
  console.error("Falha ao semear:", e.message);
  process.exit(1);
});
