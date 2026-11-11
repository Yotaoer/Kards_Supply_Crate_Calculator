export const RULES = {
  scale: 1000,
  levels: ['基础', '普通', '限定', '特殊', '精英'],
  requirements: [20, 30, 50, 100],
  costs: { normal: 100, officer: 330 },
  xp: {
    base: { normal: 3, officer: 6 },
    full: { normal: 13.688, officer: 29.936 },
  },
  destroy: { gold: 24, silver: 8, bronze: 2.4, iron: 0.8 },
  limits: { count: 1_000_000_000, coins: 1_000_000_000_000 },
} as const;

export type Scenario = keyof typeof RULES.xp;
export type Strategy = 'coins' | 'packs';
export type PackType = 'normal' | 'officer';

export function cumulative(level: number): number {
  return RULES.requirements.slice(0, level).reduce((sum, n) => sum + n, 0);
}
