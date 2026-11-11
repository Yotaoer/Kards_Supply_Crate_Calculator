import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { evaluate, recommend, statusText, InputError } from '../src/calculator.ts';
import { defaults, toInputs, manualPlan, load, save, STORAGE_KEY, changeLevel } from '../src/state.ts';

const base = (overrides = {}) => ({ ...toInputs(defaults()), ...overrides });
const simple = (overrides = {}) => base({ currentLevel: 0, targetLevel: 1, ...overrides });

test('跨档与当前小数进度准确累计', () => {
  assert.equal(evaluate(base({ progress: 12.4 }), { normal: 0, officer: 0 }).required, 137.6);
  assert.equal(evaluate(simple({ targetLevel: 4, progress: .8 }), { normal: 0, officer: 0 }).required, 199.2);
  assert.equal(evaluate(base({ progress: .001 }), { normal: 0, officer: 0 }).required, 149.999);
});

test('满级、较低目标、同档目标和阶段已满均为零需求', () => {
  for (const input of [
    base({ currentLevel: 4 }), base({ targetLevel: 1 }),
    base({ targetLevel: 2 }), simple({ progress: 20 }),
  ]) {
    const result = recommend(input);
    assert.equal(result.required, 0);
    assert.equal(result.totalPacks, 0);
    assert.equal(result.cost, 0);
    assert.match(statusText(result, true), /无需新增/);
  }
});

test('20点需求补7包21点，重复推荐不退化也不震荡', () => {
  const input = simple({ coins: 700 });
  for (let i = 0; i < 10; i++) {
    const result = recommend(input);
    assert.deepEqual([result.normal, result.officer, result.gain, result.gap], [7, 0, 21, 0]);
  }
});

test('已有包免费，只收新购费用，且不修改资产', () => {
  const input = simple({ ownedNormal: 3, ownedOfficer: 1, coins: 200 });
  const original = structuredClone(input);
  const result = evaluate(input, { normal: 5, officer: 1 });
  assert.deepEqual([result.usedNormal, result.usedOfficer, result.buyNormal, result.buyOfficer], [3, 1, 2, 0]);
  assert.equal(result.cost, 200);
  assert.equal(result.remainingCoins, 0);
  assert.deepEqual(input, original);
});

test('预算刚好可达、不足返回最大收益，不超预算', () => {
  const exact = recommend(simple({ coins: 700 }));
  assert.equal(exact.executable, true);
  const short = recommend(simple({ coins: 699 }));
  assert.deepEqual([short.cost, short.gain, short.gap], [600, 18, 2]);
  assert.equal(short.executable, false);
  assert.match(statusText(short, true), /预算无法/);
});

test('省金币与少开包有不同且明确的排序', () => {
  const input = simple({ progress: 14, coins: 330 });
  const cheap = recommend(input);
  const fast = recommend({ ...input, strategy: 'packs' });
  assert.deepEqual([cheap.normal, cheap.officer, cheap.cost], [2, 0, 200]);
  assert.deepEqual([fast.normal, fast.officer, fast.cost], [0, 1, 330]);
});

test('金币相同先少包，包数相同先少溢出', () => {
  const result = recommend(simple({ ownedNormal: 10, ownedOfficer: 10, progress: 14 }));
  assert.deepEqual([result.normal, result.officer, result.cost], [0, 1, 0]);
  const tight = recommend(simple({ ownedNormal: 10, ownedOfficer: 10, progress: 17 }));
  assert.deepEqual([tight.normal, tight.officer], [1, 0]);
});

test('固定销毁只接受用户显式数量，不自动加卡', () => {
  const input = simple({ coins: 100, destroySilver: 2, destroyIron: 2 });
  const original = structuredClone(input);
  const result = recommend(input);
  assert.deepEqual([result.destroyXP, result.normal, result.gain, result.gap], [17.6, 1, 20.6, 0]);
  assert.deepEqual(input, original);
  assert.equal(recommend(simple({ destroyGold: 1 })).totalPacks, 0);
});

test('全卡旧系数原样保留，结果措辞是期望而非保证', () => {
  const result = evaluate(simple({ coins: 330, scenario: 'full' }), { normal: 0, officer: 1 });
  assert.equal(result.officerXP, 29.936);
  assert.match(statusText(result, false), /期望.*非保底/);
  assert.doesNotMatch(statusText(result, false), /保证|保底达标|按基础经验/);
  const normal = evaluate(simple({ scenario: 'full' }), { normal: 1, officer: 0 });
  assert.equal(normal.normalXP, 13.688);
});

test('手动超预算显式不可执行，即使经验已够', () => {
  const result = evaluate(simple({ coins: 99 }), { normal: 7, officer: 0 });
  assert.equal(result.reachesTarget, true);
  assert.equal(result.executable, false);
  assert.equal(result.remainingCoins, -601);
  assert.match(statusText(result, false), /超出预算 601.*不可执行/);
});

test('零资源不足、不产生NaN', () => {
  const result = recommend(base());
  assert.deepEqual([result.gain, result.cost, result.gap], [0, 0, 150]);
  assert.ok(Object.values(result).filter(v => typeof v === 'number').every(Number.isFinite));
});

test('负数、小数资源、空白、无穷与超上限均拒绝', () => {
  for (const field of ['coins', 'ownedNormal', 'ownedOfficer', 'destroyGold', 'destroySilver', 'destroyBronze', 'destroyIron']) {
    for (const value of [-1, .5, NaN, Infinity, 1e20]) {
      assert.throws(() => recommend(base({ [field]: value })), InputError);
    }
  }
  for (const value of [-1, .5, Infinity, 1e20]) {
    assert.throws(() => evaluate(base(), { normal: value, officer: 0 }), InputError);
  }
  assert.throws(() => toInputs({ ...defaults(), coins: '' }), InputError);
  assert.throws(() => manualPlan({ ...defaults(), manualNormal: '' }), InputError);
});

test('小数进度上限与精度、场景边界均校验', () => {
  for (const progress of [-.1, 50.1, .0001, NaN]) assert.throws(() => recommend(base({ progress })), InputError);
  assert.throws(() => recommend(base({ currentLevel: 4, progress: .1 })), InputError);
  assert.throws(() => recommend(base({ scenario: 'constructor' })), InputError);
  assert.throws(() => recommend(base({ currentLevel: 5 })), InputError);
});

test('十亿库存的自动推荐有界，不按库存枚举', () => {
  const start = performance.now();
  const result = recommend(simple({ targetLevel: 4, coins: 1e12, ownedNormal: 1e9, ownedOfficer: 1e9 }));
  assert.equal(result.cost, 0);
  assert.equal(result.totalPacks, 34);
  assert.ok(performance.now() - start < 2000);
});

test('手动十亿包仍有限且精确，配比总量一致', () => {
  const result = evaluate(base({ coins: 1e12, scenario: 'full' }), { normal: 1e9, officer: 1e9 });
  assert.equal(result.packXP, result.normalXP + result.officerXP);
  assert.equal(result.packXP, 43_624_000_000);
  assert.equal(result.cost, 430_000_000_000);
});

// Independent oracle: no call to evaluate, recommend, or their ranking helpers.
function brute(input) {
  const thresholds = [0, 20, 50, 100, 200];
  const needed = Math.round(Math.max(0, thresholds[input.targetLevel] - thresholds[input.currentLevel] - input.progress) * 1000);
  const nx = input.scenario === 'base' ? 3000 : 13688;
  const ox = input.scenario === 'base' ? 6000 : 29936;
  const fixed = input.destroyGold * 24000 + input.destroySilver * 8000 + input.destroyBronze * 2400 + input.destroyIron * 800;
  const candidates = [];
  for (let n = 0; n <= 14; n++) for (let o = 0; o <= 14; o++) {
    const cost = Math.max(0, n - input.ownedNormal) * 100 + Math.max(0, o - input.ownedOfficer) * 330;
    if (cost > input.coins) continue;
    const gain = n * nx + o * ox + fixed;
    const reached = gain >= needed;
    const keys = !reached ? [1, -gain, cost, n + o, n]
      : input.strategy === 'coins' ? [0, cost, n + o, gain - needed, n]
        : [0, n + o, cost, gain - needed, n];
    candidates.push({ n, o, keys });
  }
  candidates.sort((a, b) => {
    for (let i = 0; i < a.keys.length; i++) if (a.keys[i] !== b.keys[i]) return a.keys[i] - b.keys[i];
    return 0;
  });
  return candidates[0];
}

test('独立小范围穷举对照：两场景、两策略、预算、库存和固定贡献', () => {
  let cases = 0;
  for (const scenario of ['base', 'full']) for (const strategy of ['coins', 'packs'])
    for (const coins of [0, 99, 100, 200, 330, 600, 700])
      for (const ownedNormal of [0, 1, 3]) for (const ownedOfficer of [0, 1, 3])
        for (const progress of [0, 10.4, 19.2]) for (const destroyIron of [0, 1]) {
          const input = simple({ scenario, strategy, coins, ownedNormal, ownedOfficer, progress, destroyIron });
          const expected = brute(input);
          const actual = recommend(input);
          assert.deepEqual([actual.normal, actual.officer], [expected.n, expected.o], JSON.stringify(input));
          assert.ok(actual.cost <= coins);
          cases++;
        }
  assert.equal(cases, 1512);
});

test('本地保存、刷新恢复手动草稿，模式切换不修改草稿', () => {
  const map = new Map();
  const store = { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
  const state = { ...defaults(), mode: 'manual', manualNormal: '7', coins: '700' };
  assert.equal(save(store, state), '');
  assert.deepEqual(load(store).state, state);
  state.mode = 'auto';
  recommend(toInputs(state));
  assert.equal(state.manualNormal, '7');
  state.mode = 'manual';
  assert.equal(manualPlan(state).normal, 7);
  changeLevel(state, 4);
  assert.equal(state.progress, '0');
});

test('存储损坏、禁用和写入失败不影响计算核', () => {
  for (const text of ['not-json', 'null', '[]', '{}', JSON.stringify({ ...defaults(), scenario: 'bogus' })]) {
    const restored = load({ getItem: () => text });
    assert.deepEqual(restored.state, defaults());
    assert.ok(restored.warning);
  }
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
  assert.ok(load(blocked).warning);
  assert.ok(save(blocked, defaults()));
  assert.equal(recommend(toInputs(load(blocked).state)).gap, 150);
  assert.equal(STORAGE_KEY, 'kards-supply-planner:v1');
});
