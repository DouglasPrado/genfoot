#!/usr/bin/env node
// Semeia um mundo demo VÁLIDO (schema atual) para o app mobile consumir dados
// reais: world:create → world:genesis (16 clubes, ~368 jogadores, Liga Inicial
// com 240 fixtures E manifests de partida) → world:activate → listings de
// mercado (para a negociação ser jogável; o genesis entrega agentes livres,
// mas nenhum jogador listado por clubes).
// Requer a API rodando (padrão http://localhost:3000) e a chave de dev de
// admin. Imprime o worldId; aponte EXPO_PUBLIC_WORLD_ID nele.
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

async function query(token, worldId, queryType) {
  const r = await fetch(
    `${API}/worlds/${worldId}/${queryType}?limit=500`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  const body = await r.json();
  if (!r.ok) throw new Error(`query ${queryType} falhou: ${JSON.stringify(body)}`);
  return body.data;
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

  const competitions = await query(token, worldId, "competitions");
  console.log(
    `✓ liga (genesis) → ${competitions.fixtureCount} fixtures, próximo kickoff ${competitions.nextKickoffOn}`,
  );

  // --- Mercado: listings reais (vendedor = clubes não-gerenciados) ----------
  const portfolio = await query(token, worldId, "club");
  const squads = portfolio.squads ?? [];
  const listed = [];
  for (const squad of squads.slice(1, 7)) {
    const membership = squad.memberships.at(-1);
    if (!membership) continue;
    const env = {
      contractVersion: "v1",
      correlationId: `seed-listing-${membership.playerId}`,
      commandType: "market:publish-listing",
      idempotencyKey: `seed-listing-${membership.playerId}-${stamp}`,
      worldId,
      payload: {
        playerId: membership.playerId,
        sellerClubId: squad.clubId,
        askingFeeMinor: 2_500_000,
        rulesetVersion: "1.0.0",
      },
    };
    const r = await fetch(`${API}/commands`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(env),
    });
    const body = await r.json();
    if (!r.ok || body.error) throw new Error(`publish-listing falhou: ${JSON.stringify(body)}`);
    listed.push(membership.playerId);
  }
  console.log(`✓ mercado        → ${listed.length} listings publicadas`);

  console.log("");
  console.log(`Mundo demo pronto: ${worldId}`);
  console.log(`Aponte o app:  EXPO_PUBLIC_WORLD_ID=${worldId}`);
}

main().catch((e) => {
  console.error("Falha ao semear:", e.message);
  process.exit(1);
});
