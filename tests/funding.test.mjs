import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fundingRequirement, recommend, evaluate, InputError } from '../src/calculator.ts';
import { defaults, toInputs } from '../src/state.ts';

const input = (overrides = {}) => ({ ...toInputs(defaults()), currentLevel: 0, targetLevel: 1, ...overrides });

test('达标最低成本不被当前预算截断：0/699/700/1000金币', () => {
  for (const [coins, shortfall] of [[0, 700], [699, 1], [700, 0], [1000, 0]]) {
    const state = input({ coins });
    const original = structuredClone(state);
    assert.deepEqual(fundingRequirement(state), { minimumCost: 700, shortfall, scenario: 'base' });
    assert.deepEqual(state, original);
  }
  assert.equal(recommend(input({ coins: 699 })).cost, 600);
  assert.equal(fundingRequirement(input({ coins: 699 })).minimumCost, 700);
});

test('已有普通/军官包免费抵扣，库存足够不缺金币', () => {
  assert.equal(fundingRequirement(input({ ownedNormal: 3, ownedOfficer: 1 })).minimumCost, 200);
  assert.equal(fundingRequirement(input({ ownedNormal: 7 })).shortfall, 0);
  assert.equal(fundingRequirement(input({ ownedOfficer: 4 })).minimumCost, 0);
});

test('满级、目标已达和固定销毁覆盖目标均无需新金币', () => {
  for (const state of [
    input({ currentLevel: 4 }), input({ currentLevel: 2, targetLevel: 1 }),
    input({ targetLevel: 0 }), input({ progress: 20 }), input({ destroyGold: 1 }),
  ]) {
    const funding = fundingRequirement(state);
    assert.equal(funding.minimumCost, 0);
    assert.equal(funding.shortfall, 0);
  }
});

test('金币需求保留当前小数进度与固定销毁贡献', () => {
  assert.equal(fundingRequirement(input({ progress: 2.4 })).minimumCost, 600);
  assert.equal(fundingRequirement(input({ progress: .8 })).minimumCost, 700);
  assert.equal(fundingRequirement(input({ destroySilver: 2, destroyIron: 2 })).minimumCost, 100);
});

test('全卡沿用旧表期望口径，无新增保底含义', () => {
  assert.deepEqual(fundingRequirement(input({ scenario: 'full', coins: 199 })), {
    minimumCost: 200, shortfall: 1, scenario: 'full',
  });
});

test('最低金币固定省金币排序，与少开包策略或手动草稿不同', () => {
  const state = input({ progress: 14, coins: 330 });
  assert.equal(recommend({ ...state, strategy: 'packs' }).cost, 330);
  for (const strategy of ['coins', 'packs']) {
    assert.equal(fundingRequirement({ ...state, strategy }).minimumCost, 200);
    evaluate({ ...state, strategy }, { normal: 20, officer: 3 });
    assert.equal(fundingRequirement({ ...state, strategy }).minimumCost, 200);
  }
});

test('非法输入不因放宽求解预算而绕过验证', () => {
  for (const state of [input({ coins: -1 }), input({ coins: .5 }), input({ ownedNormal: NaN }), input({ progress: 21 })]) {
    assert.throws(() => fundingRequirement(state), InputError);
  }
});
