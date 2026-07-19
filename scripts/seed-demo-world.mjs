#!/usr/bin/env node
// Semeia um mundo demo VIVO para o app/admin consumirem dados reais:
//   world:create → world:genesis (20 clubes + jogadores) → world:activate
//   → AUTORIA da Liga Inicial (create/configure/lock/start) — o mundo nasce
//     SEM competição (C7-V3), então o seed a cria como o admin faria
//   → 20 `world:advance-day` para já haver tabela e artilharia de verdade
//   → world:set-clock (4h reais/dia, ANDANDO) — o mundo passa a avançar sozinho
//   → listings de mercado (negociação jogável).
// Requer a API rodando (padrão http://localhost:3000) e a chave de dev de
// admin. Imprime o worldId; aponte EXPO_PUBLIC_WORLD_ID nele.
//
// Nota: alguns valores de `seed` fazem a gênese violar a invariante de força
// total do elenco (=1.380) e o genesis é RECUSADO. `grinta-demo` passa. É bug
// latente do gerador de elencos, não deste script.
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

/** startDate + n dias, em ISO (YYYY-MM-DD). Script pode usar Date; o domínio não. */
function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Contador para variar a chave de idempotência entre chamadas do MESMO command
// (ex.: os 20 `world:advance-day`). Sem isto, o fingerprint da requisição
// (R-184) trataria a 2ª..20ª como ALREADY_APPLIED e o mundo não avançaria.
let commandSeq = 0;

async function command(token, commandType, payload, worldId) {
  commandSeq += 1;
  const env = {
    contractVersion: "v1",
    correlationId: `seed-${commandType}-${commandSeq}`,
    commandType,
    idempotencyKey: `seed-${commandType}-${commandSeq}-${stamp}`,
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

  // --- Liga Inicial ---------------------------------------------------------
  // O mundo NASCE SEM competição (C7-V3): o seed a AUTORIA como o admin faria —
  // cria, configura com todos os clubes, tranca (materializa o calendário) e
  // inicia. Antes o script lia `competitions.fixtureCount` esperando que a
  // gênese já trouxesse a liga; ela não traz mais, e a leitura estourava em
  // `null`. Divisão única do mundo ⇒ acesso/rebaixamento 0/0 (topo E fundo).
  const clubData = await query(token, worldId, "club-detail");
  const clubIds = (clubData.clubs ?? []).map((c) => c.id);
  const endsOn = addDays(startDate, 200);
  const league = await command(
    token,
    "competition:create",
    { name: "Liga Inicial", type: "LEAGUE", format: "ROUND_ROBIN", tier: 1, reputation: 60 },
    worldId,
  );
  const competitionId = String(league.resource ?? "").replace(/^competition:/, "");
  await command(
    token,
    "competition:configure",
    {
      competitionId,
      clubIds,
      startsOn: startDate,
      endsOn,
      config: {
        rules: {
          pointsWin: 3,
          pointsDraw: 1,
          legs: 1,
          promotionSlots: 0,
          relegationSlots: 0,
          tiebreakers: ["POINTS", "GOAL_DIFFERENCE", "GOALS_FOR"],
          groupCount: null,
          qualifiersPerGroup: null,
        },
        prizes: {
          participationMinor: "1000000",
          winBonusMinor: "50000",
          positionMinor: ["10000000", "5000000", "2500000"],
          topScorerMinor: "500000",
          bestPlayerMinor: "0",
        },
        qualifications: [],
      },
    },
    worldId,
  );
  await command(token, "competition:lock", { competitionId }, worldId);
  await command(token, "competition:start", { competitionId }, worldId);
  console.log(`✓ liga (autoria)  → ${clubIds.length} clubes, janela ${startDate}…${endsOn}`);

  // Joga algumas rodadas AGORA para o mundo já ter tabela e artilharia de
  // verdade quando o dono abrir — cada `advance-day` roda um dia lógico inteiro
  // (abre/joga/homologa). Depois o relógio segue andando sozinho.
  for (let i = 0; i < 20; i += 1) {
    await command(token, "world:advance-day", {}, worldId);
  }
  const standings = await query(token, worldId, "competitions");
  console.log(
    `✓ 20 dias rodados → ${standings?.playedMatches ?? 0}/${standings?.totalMatches ?? 0} jogos, líder ${standings?.table?.[0]?.clubName ?? "—"}`,
  );

  // Liga o relógio: 4h reais por dia lógico, andando — o mundo passa a avançar
  // sozinho (MUNDO V3/V4). O dono ajusta ou pausa no admin.
  await command(
    token,
    "world:set-clock",
    { realSecondsPerDay: 14400, running: true },
    worldId,
  );
  console.log("✓ relógio ligado  → 4h reais/dia, andando (ajuste no admin)");

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
