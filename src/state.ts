import { RULES, type Scenario, type Strategy } from './rules.ts';
import { InputError, type Inputs, type Plan } from './calculator.ts';

export interface State {
  currentLevel: number;
  targetLevel: number;
  progress: string;
  coins: string;
  ownedNormal: string;
  ownedOfficer: string;
  destroyGold: string;
  destroySilver: string;
  destroyBronze: string;
  destroyIron: string;
  manualNormal: string;
  manualOfficer: string;
  scenario: Scenario;
  strategy: Strategy;
  mode: 'auto' | 'manual';
}

export const STORAGE_KEY = 'kards-supply-planner:v1';
export const defaults = (): State => ({
  currentLevel: 2, targetLevel: 4, progress: '0', coins: '0',
  ownedNormal: '0', ownedOfficer: '0',
  destroyGold: '0', destroySilver: '0', destroyBronze: '0', destroyIron: '0',
  manualNormal: '0', manualOfficer: '0',
  scenario: 'base', strategy: 'coins', mode: 'auto',
});

export interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function load(store: Store): { state: State; warning: string } {
  try {
    const text = store.getItem(STORAGE_KEY);
    if (!text) return { state: defaults(), warning: '' };
    const saved: unknown = JSON.parse(text);
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new Error();
    const state = defaults();
    for (const key of Object.keys(state) as (keyof State)[]) {
      const value = (saved as Record<string, unknown>)[key];
      if (typeof value !== typeof state[key]) throw new Error();
      if (typeof value === 'string' && value.length > 40) throw new Error();
    }
    Object.assign(state, Object.fromEntries(Object.keys(state).map(key => [key, (saved as Record<string, unknown>)[key]])));
    if (!['base', 'full'].includes(state.scenario) || !['coins', 'packs'].includes(state.strategy) ||
        !['auto', 'manual'].includes(state.mode) || ![state.currentLevel, state.targetLevel].every(n => Number.isInteger(n) && n >= 0 && n <= 4)) {
      throw new Error();
    }
    return { state, warning: '' };
  } catch {
    return { state: defaults(), warning: '本地记录无法读取，已使用默认值；仍可继续计算。' };
  }
}

export function save(store: Store, state: State): string {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(state));
    return '';
  } catch {
    return '本地保存不可用，本次仍可计算；刷新后可能丢失输入。';
  }
}

export function numberFrom(value: string, label: string): number {
  if (!value.trim()) throw new InputError(`${label}不能为空`);
  const n = Number(value);
  if (!Number.isFinite(n)) throw new InputError(`${label}须为有效数字`);
  return n;
}

export function toInputs(state: State): Inputs {
  return {
    currentLevel: state.currentLevel, targetLevel: state.targetLevel,
    progress: numberFrom(state.progress, '当前进度'),
    coins: numberFrom(state.coins, '金币'),
    ownedNormal: numberFrom(state.ownedNormal, '已有普通包'),
    ownedOfficer: numberFrom(state.ownedOfficer, '已有军官包'),
    destroyGold: numberFrom(state.destroyGold, '金卡数量'),
    destroySilver: numberFrom(state.destroySilver, '银卡数量'),
    destroyBronze: numberFrom(state.destroyBronze, '铜卡数量'),
    destroyIron: numberFrom(state.destroyIron, '铁卡数量'),
    scenario: state.scenario, strategy: state.strategy,
  };
}

export function manualPlan(state: State): Plan {
  return { normal: numberFrom(state.manualNormal, '本次普通包'), officer: numberFrom(state.manualOfficer, '本次军官包') };
}

export function changeLevel(state: State, level: number): void {
  state.currentLevel = level;
  state.progress = '0';
}

export function progressMax(state: State): number {
  return RULES.requirements[state.currentLevel] ?? 0;
}
