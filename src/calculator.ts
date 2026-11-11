import { RULES, cumulative, type Scenario, type Strategy } from './rules.ts';

export interface Inputs {
  currentLevel: number;
  targetLevel: number;
  progress: number;
  coins: number;
  ownedNormal: number;
  ownedOfficer: number;
  destroyGold: number;
  destroySilver: number;
  destroyBronze: number;
  destroyIron: number;
  scenario: Scenario;
  strategy: Strategy;
}

export interface Plan {
  normal: number;
  officer: number;
}

export interface Result extends Plan {
  required: number;
  current: number;
  target: number;
  packXP: number;
  normalXP: number;
  officerXP: number;
  destroyXP: number;
  gain: number;
  gap: number;
  surplus: number;
  cost: number;
  remainingCoins: number;
  usedNormal: number;
  usedOfficer: number;
  buyNormal: number;
  buyOfficer: number;
  totalPacks: number;
  withinBudget: boolean;
  reachesTarget: boolean;
  executable: boolean;
  scenario: Scenario;
}

export class InputError extends Error {}

function integer(value: number, name: string, max: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) {
    throw new InputError(`${name}须为0至${max.toLocaleString('zh-CN')}的整数`);
  }
}

export function validate(input: Inputs, plan?: Plan): void {
  integer(input.currentLevel, '当前档位', 4);
  integer(input.targetLevel, '目标档位', 4);
  if (!Object.hasOwn(RULES.xp, input.scenario) || !['coins', 'packs'].includes(input.strategy)) {
    throw new InputError('经验场景或推荐策略无效');
  }
  const maxProgress = RULES.requirements[input.currentLevel] ?? 0;
  if (!Number.isFinite(input.progress) || input.progress < 0 || input.progress > maxProgress ||
      Math.abs(input.progress * RULES.scale - Math.round(input.progress * RULES.scale)) > 1e-7) {
    throw new InputError(`当前进度须为0至${maxProgress}，最多3位小数`);
  }
  integer(input.coins, '金币', RULES.limits.coins);
  for (const [key, label] of [
    ['ownedNormal', '已有普通包'], ['ownedOfficer', '已有军官包'],
    ['destroyGold', '金卡数量'], ['destroySilver', '银卡数量'],
    ['destroyBronze', '铜卡数量'], ['destroyIron', '铁卡数量'],
  ] as const) integer(input[key], label, RULES.limits.count);
  if (plan) {
    integer(plan.normal, '本次普通包', RULES.limits.count);
    integer(plan.officer, '本次军官包', RULES.limits.count);
  }
}

function scaled(value: number): number {
  return Math.round(value * RULES.scale);
}

export function evaluate(input: Inputs, plan: Plan): Result {
  validate(input, plan);
  const current = scaled(cumulative(input.currentLevel) + input.progress);
  const target = scaled(cumulative(input.targetLevel));
  const required = Math.max(0, target - current);
  const xp = RULES.xp[input.scenario];
  const packXP = plan.normal * scaled(xp.normal) + plan.officer * scaled(xp.officer);
  const destroyXP = input.destroyGold * scaled(RULES.destroy.gold) +
    input.destroySilver * scaled(RULES.destroy.silver) +
    input.destroyBronze * scaled(RULES.destroy.bronze) +
    input.destroyIron * scaled(RULES.destroy.iron);
  const usedNormal = Math.min(plan.normal, input.ownedNormal);
  const usedOfficer = Math.min(plan.officer, input.ownedOfficer);
  const buyNormal = plan.normal - usedNormal;
  const buyOfficer = plan.officer - usedOfficer;
  const cost = buyNormal * RULES.costs.normal + buyOfficer * RULES.costs.officer;
  const gain = packXP + destroyXP;
  const withinBudget = cost <= input.coins;
  const reachesTarget = gain >= required;
  return {
    ...plan, required: required / RULES.scale, current: current / RULES.scale,
    target: target / RULES.scale, packXP: packXP / RULES.scale,
    normalXP: plan.normal * scaled(xp.normal) / RULES.scale,
    officerXP: plan.officer * scaled(xp.officer) / RULES.scale,
    destroyXP: destroyXP / RULES.scale, gain: gain / RULES.scale,
    gap: Math.max(0, required - gain) / RULES.scale,
    surplus: Math.max(0, gain - required) / RULES.scale,
    cost, remainingCoins: input.coins - cost, usedNormal, usedOfficer, buyNormal, buyOfficer,
    totalPacks: plan.normal + plan.officer, withinBudget, reachesTarget,
    executable: withinBudget && reachesTarget, scenario: input.scenario,
  };
}

function rank(result: Result, strategy: Strategy): number[] {
  if (!result.reachesTarget) return [-scaled(result.gain), result.cost, result.totalPacks, result.normal];
  return strategy === 'coins'
    ? [result.cost, result.totalPacks, scaled(result.surplus), result.normal]
    : [result.totalPacks, result.cost, scaled(result.surplus), result.normal];
}

function better(a: Result, b: Result, strategy: Strategy): boolean {
  if (a.reachesTarget !== b.reachesTarget) return a.reachesTarget;
  const left = rank(a, strategy);
  const right = rank(b, strategy);
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return left[i] < right[i];
  }
  return false;
}

export function recommend(input: Inputs): Result {
  validate(input);
  let best = evaluate(input, { normal: 0, officer: 0 });
  const residual = Math.max(0, scaled(best.required) - scaled(best.destroyXP));
  const xp = RULES.xp[input.scenario];
  // Beyond these caps, removing a pack keeps the target met and improves either ordering.
  const normalCap = Math.ceil(residual / scaled(xp.normal));
  const officerCap = Math.ceil(residual / scaled(xp.officer));
  for (let normal = 0; normal <= normalCap; normal++) {
    for (let officer = 0; officer <= officerCap; officer++) {
      const candidate = evaluate(input, { normal, officer });
      if (candidate.withinBudget && better(candidate, best, input.strategy)) best = candidate;
    }
  }
  return best;
}

export interface FundingRequirement {
  minimumCost: number;
  shortfall: number;
  scenario: Scenario;
}

export function fundingRequirement(input: Inputs): FundingRequirement {
  validate(input);
  // Funding is the cheapest target-reaching plan, independent of budget and draft.
  const cheapest = recommend({ ...input, coins: RULES.limits.coins, strategy: 'coins' });
  return {
    minimumCost: cheapest.cost,
    shortfall: Math.max(0, cheapest.cost - input.coins),
    scenario: input.scenario,
  };
}

export function statusText(result: Result, automatic: boolean): string {
  if (!result.withinBudget) return `超出预算 ${-result.remainingCoins} 金币，不可执行`;
  if (!result.required) return '目标已达到，无需新增进度';
  if (result.scenario === 'full') {
    return result.reachesTarget
      ? '按旧表期望达到目标，非保底'
      : automatic ? '当前预算下期望仍不足，非保底' : '手动配比期望未达目标，非保底';
  }
  if (result.reachesTarget) return '按基础经验达到目标';
  return automatic ? '当前预算无法达到目标' : '手动配比未达目标';
}
