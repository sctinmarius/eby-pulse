import { startOfCurrentMonthUtc } from '../libs/agent-runner.js';
import { prisma } from '../libs/prisma.js';

export interface UsageBreakdownRow {
  task: string;
  model: string;
  runCount: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface MonthlyUsage {
  periodStart: string;
  capUsd: number | null;
  spentUsd: number;
  remainingUsd: number | null;
  breakdown: UsageBreakdownRow[];
}

export async function getMonthlyUsage(
  businessId: string,
  capUsd: number | null,
): Promise<MonthlyUsage> {
  const periodStart = startOfCurrentMonthUtc();
  const rows = await prisma.agentRun.groupBy({
    by: ['task', 'model'],
    where: { product: { businessId }, createdAt: { gte: periodStart } },
    _sum: { costUsd: true, inputTokens: true, outputTokens: true },
    _count: { _all: true },
  });

  const breakdown = rows.map((row) => ({
    task: row.task,
    model: row.model,
    runCount: row._count._all,
    inputTokens: row._sum.inputTokens ?? 0,
    outputTokens: row._sum.outputTokens ?? 0,
    costUsd: Number(row._sum.costUsd ?? 0),
  }));

  const spentUsd = breakdown.reduce((sum, row) => sum + row.costUsd, 0);

  return {
    periodStart: periodStart.toISOString(),
    capUsd,
    spentUsd,
    remainingUsd: capUsd === null ? null : Math.max(capUsd - spentUsd, 0),
    breakdown,
  };
}

export interface AgentRunHistoryPage {
  runs: {
    id: string;
    productId: string;
    product: { name: string; slug: string };
    task: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    status: string;
    error: string | null;
    createdAt: Date;
    finishedAt: Date | null;
  }[];
  nextCursor: string | null;
}

export async function listAgentRuns(
  businessId: string,
  { limit, cursor }: { limit: number; cursor?: string },
): Promise<AgentRunHistoryPage> {
  const runs = await prisma.agentRun.findMany({
    where: { product: { businessId } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: { product: { select: { name: true, slug: true } } },
  });

  return {
    runs: runs.map((run) => ({ ...run, costUsd: Number(run.costUsd) })),
    nextCursor: runs.length === limit ? (runs[runs.length - 1]?.id ?? null) : null,
  };
}
