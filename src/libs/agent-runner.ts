import { BudgetExceededError } from '../common/error.js';
import type { AgentTask } from '../generated/prisma/client.js';
import { costUsd } from './model-pricing.js';
import { prisma } from './prisma.js';

export interface RunAgentTaskParams<T> {
  businessId: string;
  productId: string;
  task: AgentTask;
  model: string;
  run: () => Promise<{ result: T; usage: { inputTokens: number; outputTokens: number } }>;
}

export function startOfCurrentMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

async function currentMonthSpendUsd(businessId: string): Promise<number> {
  const { _sum } = await prisma.agentRun.aggregate({
    where: { product: { businessId }, createdAt: { gte: startOfCurrentMonthUtc() } },
    _sum: { costUsd: true },
  });

  return Number(_sum.costUsd ?? 0);
}

async function assertWithinBudget(businessId: string): Promise<void> {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
  if (business.monthlySpendCapUsd === null) {
    return;
  }

  const cap = Number(business.monthlySpendCapUsd);
  const spent = await currentMonthSpendUsd(businessId);
  if (spent >= cap) {
    throw new BudgetExceededError(
      `Monthly spend cap of $${cap.toFixed(2)} reached ($${spent.toFixed(2)} spent this month). Raise the cap via PATCH /businesses/me or wait until next month.`,
    );
  }
}

export async function runAgentTask<T>(params: RunAgentTaskParams<T>): Promise<T> {
  await assertWithinBudget(params.businessId);

  const agentRun = await prisma.agentRun.create({
    data: { productId: params.productId, task: params.task, model: params.model },
  });

  try {
    const { result, usage } = await params.run();
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: 'SUCCEEDED',
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUsd: costUsd(params.model, usage.inputTokens, usage.outputTokens),
        finishedAt: new Date(),
      },
    });
    return result;
  } catch (err) {
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: 'FAILED',
        error: err instanceof Error ? err.message : String(err),
        finishedAt: new Date(),
      },
    });
    throw err;
  }
}
