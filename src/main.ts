import '@fontsource-variable/geist';
import '@fontsource-variable/oswald';
import './style.css';
import { createIcons, Tickets, Medal, Minus, Plus, RotateCcw, ArrowDownToLine, Copy, Github, ExternalLink, Download } from 'lucide';
import { RULES } from './rules.ts';
import { recommend, evaluate, fundingRequirement, statusText, InputError, type Result, type FundingRequirement } from './calculator.ts';
import { initFooter } from './footer.ts';
import { load, save, defaults, toInputs, manualPlan, changeLevel, progressMax, type State, type Store } from './state.ts';

const icons = { Tickets, Medal, Minus, Plus, RotateCcw, ArrowDownToLine, Copy, Github, ExternalLink, Download };
const icon = (name: keyof typeof icons) => `<i data-lucide="${name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}" aria-hidden="true"></i>`;
const fmt = (n: number) => n.toLocaleString('zh-CN', { maximumFractionDigits: 3 });
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const storage: Store = {
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};
const restored = load(storage);
let state: State = restored.state;
let storageWarning = restored.warning;
let recommendation: Result | null = null;
const apkDownload = __NATIVE_OFFLINE__ ? '' : `<a id="apk-download" class="apk-download" href="https://github.com/Yotaoer/Kards_Supply_Crate_Calculator/releases/download/v1.0.1-offline-test/KARDS-Supply-Planner-1.0.1-offline-debug.apk" target="_blank" rel="noopener noreferrer" aria-label="下载 APK（测试版）">${icon('Download')}下载 APK（测试版）</a>`;

function resourceField(key: keyof State, label: string, unit: string, max: number) {
  return `<label class="resource-field"><span>${label}</span><span class="unit-input">
    <input id="${key}" data-field="${key}" type="number" min="0" max="${max}" step="1" inputmode="numeric" aria-describedby="${key}-error" />
    <span>${unit}</span></span><small id="${key}-error" class="field-error" hidden></small></label>`;
}

function packRow(type: 'normal' | 'officer', label: string, price: number) {
  const field = type === 'normal' ? 'manualNormal' : 'manualOfficer';
  return `<div class="pack-row pack-${type}">
    <div class="pack-identity"><span class="supply-mark">${icon(type === 'normal' ? 'Tickets' : 'Medal')}</span><div><label for="${field}">${label}</label><span class="supply-name">${type === 'normal' ? 'STANDARD' : 'OFFICER'}</span><span>${price} 金币 / 新购包</span></div></div>
    <div class="stepper">
      <button type="button" data-step="${field}" data-delta="-1" title="减少${label}" aria-label="减少${label}">${icon('Minus')}</button>
      <input type="number" id="${field}" data-field="${field}" min="0" max="${RULES.limits.count}" step="1" inputmode="numeric" aria-describedby="${field}-error" />
      <button type="button" data-step="${field}" data-delta="1" title="增加${label}" aria-label="增加${label}">${icon('Plus')}</button>
    </div>
    <input id="${field}-range" class="pack-range" data-range="${field}" type="range" min="0" max="100" step="1" aria-label="${label}本次开包数量" />
    <small id="${field}-error" class="field-error" hidden></small>
    <div class="pack-breakdown"><span>已有 <b id="${type}-used">0</b></span><span>新购 <b id="${type}-buy">0</b></span><span id="${type}-xp">0 点</span></div>
  </div>`;
}

el('app').innerHTML = `
  <a class="skip-link" href="#workspace">跳到规划区</a>
  <header class="brand-bar"><div class="brand-inner">
    <div class="brand"><img class="wordmark" src="./assets/kards/logo.svg" alt="KARDS官方卡牌标识" width="132" height="48" /><span class="brand-title">KARDS</span><span class="brand-name">军需调配台</span></div>
    <div class="header-actions">${apkDownload}<span id="save-state">本地方案</span><button id="reset" class="icon-button" title="清空本地方案" aria-label="清空本地方案">${icon('RotateCcw')}</button></div>
  </div></header>
  <main class="workspace" id="workspace">
    <h1 class="page-title">军需箱资源规划</h1>
    <section class="tier-section" aria-labelledby="tier-heading">
      <div class="mission-object"><div><h2>本次调配目标</h2><strong id="mission-target">精英</strong><span>军需箱</span></div></div>
      <div class="upgrade-route">
      <div class="section-title"><h2 id="tier-heading">军需升级</h2><span id="tier-summary"></span></div>
      <div class="tier-scale" role="img" id="tier-scale" aria-label="箱子经验进度">
        <div class="tier-track"><span id="current-fill" class="current-fill"></span><span id="plan-fill" class="plan-fill"></span><span id="gap-fill" class="gap-fill"></span></div>
        <div class="tier-divisions"><span style="left:10%"></span><span style="left:25%"></span><span style="left:50%"></span></div>
        <span id="target-marker" class="target-marker"></span>
      </div>
      <div class="tier-labels"><span class="first" data-tier="0">基础<small>0</small></span><span style="left:10%" data-tier="1">普通<small>20</small></span><span style="left:25%" data-tier="2">限定<small>50</small></span><span style="left:50%" data-tier="3">特殊<small>100</small></span><span class="last" data-tier="4">精英<small>200</small></span></div>
      <div class="scale-caption"><div class="legend"><span><i class="legend-current"></i>当前</span><span><i class="legend-plan"></i>本次计划</span><span><i class="legend-gap"></i>待补进度</span></div><span id="scale-result">还需 150 点</span></div>
      </div>
    </section>
    <div id="mobile-summary" class="mobile-summary" role="status"></div>
    <p id="storage-warning" class="storage-warning" role="status" hidden></p>
    <div class="work-grid">
      <div class="input-column">
        <section class="input-section" aria-labelledby="target-heading">
          <div class="section-title"><h2 id="target-heading">目标设定</h2><span id="required-label"></span></div>
          <div class="two-fields">
            <label>当前档位<select id="currentLevel" data-field="currentLevel"></select></label>
            <label>目标档位<select id="targetLevel" data-field="targetLevel"></select></label>
          </div>
          <label class="progress-label" for="progress">当前档进度<span class="unit-input compact"><input type="number" id="progress" data-field="progress" min="0" step="0.001" inputmode="decimal" aria-describedby="progress-error" /><span id="progress-max">/ 50</span></span></label>
          <input type="range" id="progress-range" data-range="progress" min="0" step="0.001" aria-label="当前档进度" />
          <small id="progress-error" class="field-error" hidden></small>
          <label class="scenario-label">经验口径<select id="scenario" data-field="scenario"><option value="base">基础经验 · 只计开包</option><option value="full">全卡 · 旧表期望</option></select></label>
          <p id="scenario-note" class="context-note"></p>
        </section>
        <section class="input-section assets-section" aria-labelledby="assets-heading">
          <div class="section-title"><h2 id="assets-heading">资产清单</h2><span>已有包不重复计费</span></div>
          ${resourceField('coins', '金币预算', '金币', RULES.limits.coins)}
          <div class="two-fields">
            ${resourceField('ownedNormal', '已有普通包', '包', RULES.limits.count)}
            ${resourceField('ownedOfficer', '已有军官包', '包', RULES.limits.count)}
          </div>
          <details id="destroy-details"><summary>本次固定销毁 <span id="destroy-summary">0 点</span></summary>
            <div class="destroy-fields">
              ${resourceField('destroyGold', '金卡 · 24点', '张', RULES.limits.count)}
              ${resourceField('destroySilver', '银卡 · 8点', '张', RULES.limits.count)}
              ${resourceField('destroyBronze', '铜卡 · 2.4点', '张', RULES.limits.count)}
              ${resourceField('destroyIron', '铁卡 · 0.8点', '张', RULES.limits.count)}
            </div><p class="context-note">仅计你明确填写的本次数量，不自动建议销毁。</p>
          </details>
        </section>
      </div>
      <div class="plan-column">
        <section class="allocation-section" aria-labelledby="allocation-heading">
          <div class="section-title"><h2 id="allocation-heading">本次开包</h2><div class="segmented" role="group" aria-label="配比模式"><button data-mode="auto" type="button">自动推荐</button><button data-mode="manual" type="button">手动配比</button></div></div>
          <div class="strategy-row"><label for="strategy">推荐优先</label><select id="strategy" data-field="strategy"><option value="coins">省金币</option><option value="packs">少开包</option></select><button id="apply" class="text-button" type="button">${icon('ArrowDownToLine')}采用推荐</button></div>
          <div id="allocation-summary" class="mobile-summary" role="status"></div>
          ${packRow('normal', '普通包', RULES.costs.normal)}
          ${packRow('officer', '军官包', RULES.costs.officer)}
          <div class="allocation-total"><span>本次总包数</span><strong id="total-packs">0 <small>包</small></strong></div>
        </section>
        <section class="result-section" aria-labelledby="result-heading">
          <div class="result-heading"><h2 id="result-heading">结算单</h2><span id="result-basis">基础经验</span></div>
          <div class="answer-row"><div><span id="answer-label">仍缺进度</span><div class="answer-value"><strong id="answer">150</strong><span>点</span></div></div><p id="result-status" role="status"></p></div>
          <dl class="result-ledger">
            <div class="funding-row"><dt id="minimum-cost-label">达标最低新购</dt><dd id="minimum-cost">-</dd></div>
            <div class="funding-row"><dt id="coin-shortfall-label">还缺金币</dt><dd id="coin-shortfall">-</dd></div>
            <div><dt id="gain-label">本次提供</dt><dd id="gain">0 点</dd></div>
            <div><dt>其中固定销毁</dt><dd id="destroy-result">0 点</dd></div>
            <div><dt>新购消耗</dt><dd id="cost">0 金币</dd></div>
            <div><dt id="balance-label">预算剩余</dt><dd id="balance">0 金币</dd></div>
          </dl>
          <p class="result-note" id="result-note" hidden></p>
          <p class="field-error" id="global-error" role="alert" hidden></p>
        </section>
      </div>
    </div>
    <footer>
      <div class="friend-row">
        <h2>友情链接</h2>
        <a id="project-link" href="https://github.com/Yotaoer/Kards_Supply_Crate_Calculator" target="_blank" rel="noopener noreferrer">${icon('Github')}本项目源码</a>
        <a id="homepage-link" href="https://yotaoer.github.io/my-homepage/" target="_blank" rel="noopener noreferrer">${icon('ExternalLink')}怪东西修理铺</a>
        <span class="friend-tool"><a id="glyph-link" href="https://yotaoer.github.io/kards-glyph-workbench/" target="_blank" rel="noopener noreferrer">KARDS剪字工作台</a><a id="glyph-source-link" class="footer-icon" href="https://github.com/Yotaoer/kards-glyph-workbench" target="_blank" rel="noopener noreferrer" title="KARDS剪字工作台GitHub源码" aria-label="KARDS剪字工作台GitHub源码">${icon('Github')}</a></span>
      </div>
      <div class="community-row">
        <div class="qq-group"><span>QQ交流群</span><span id="qq-number" tabindex="0">861577417</span><button id="copy-qq" type="button" class="footer-icon" title="复制QQ群号861577417" aria-label="复制QQ群号861577417">${icon('Copy')}</button><span id="copy-status" role="status"></span></div>
        <div class="page-views"><span>本页访问次数</span><span id="page-view-status" role="status">统计加载中</span></div>
      </div>
      <span id="analytics-source" hidden aria-hidden="true"><span id="busuanzi_value_page_pv"></span></span>
      <div class="footer-meta"><span>KARDS · 非官方玩家工具</span><details><summary>规则与口径</summary><p>档位需求20 / 30 / 50 / 100；基础开包3 / 6点；包价100 / 330金币。全卡13.688 / 29.936为旧表期望值，是否包含开包基础点数待核，不能视为保底。无游戏账号连接。</p></details></div>
    </footer>
  </main>
  <dialog id="reset-dialog" aria-labelledby="reset-heading"><form method="dialog">
    <h2 id="reset-heading">清空本地方案？</h2><p>金币、卡包、目标和手动草稿将恢复默认值。</p>
    <div class="dialog-actions"><button value="cancel" autofocus>取消</button><button value="confirm" class="primary-button">确认清空</button></div>
  </form></dialog>`;

for (const id of ['currentLevel', 'targetLevel']) {
  el<HTMLSelectElement>(id).innerHTML = RULES.levels.map((label, value) => `<option value="${value}">${label}</option>`).join('');
}

function setText(id: string, value: string) { el(id).textContent = value; }
function syncInputs() {
  setText('mission-target', RULES.levels[state.targetLevel]);
  for (const tier of document.querySelectorAll<HTMLElement>('[data-tier]')) {
    tier.classList.toggle('is-current', Number(tier.dataset.tier) === state.currentLevel);
    tier.classList.toggle('is-target', Number(tier.dataset.tier) === state.targetLevel);
  }
  for (const input of document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-field]')) {
    const key = input.dataset.field as keyof State;
    // Keep the browser's in-progress decimal/sign editing buffer intact.
    if (input.value !== String(state[key])) input.value = String(state[key]);
  }
  const max = progressMax(state);
  el<HTMLInputElement>('progress').max = String(max);
  el<HTMLInputElement>('progress').disabled = max === 0;
  const progressRange = el<HTMLInputElement>('progress-range');
  progressRange.max = String(max);
  progressRange.value = state.progress;
  progressRange.disabled = max === 0;
  setText('progress-max', `/ ${max}`);
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) {
    button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode));
  }
  el<HTMLButtonElement>('apply').hidden = state.mode !== 'auto';
}

function validateFields() {
  for (const input of document.querySelectorAll<HTMLInputElement>('input[data-field]')) {
    const empty = input.value.trim() === '' || input.validity.badInput;
    const value = Number(input.value);
    const max = Number(input.max);
    const isProgress = input.id === 'progress';
    const invalid = empty || !Number.isFinite(value) || value < 0 || value > max ||
      (!isProgress && !Number.isSafeInteger(value)) ||
      (isProgress && Math.abs(value * 1000 - Math.round(value * 1000)) > 1e-7);
    input.setAttribute('aria-invalid', String(invalid));
    const error = el(`${input.id}-error`);
    error.hidden = !invalid;
    error.textContent = invalid ? isProgress ? `请输入0至${max}，最多3位小数` : `请输入0至${fmt(max)}的整数` : '';
  }
}

function updateResult(result: Result, funding: FundingRequirement) {
  const expected = result.scenario === 'full';
  const status = statusText(result, state.mode === 'auto');
  const gap = result.gap > 0;
  const answer = result.required === 0 ? 0 : gap ? result.gap : result.surplus;
  const answerLabel = gap ? '仍缺进度' : result.required === 0 ? '无需新增进度' : '超出目标';
  setText('answer-label', answerLabel);
  setText('answer', fmt(result.required === 0 ? 0 : answer));
  setText('result-status', status);
  el('result-status').dataset.kind = !result.withinBudget || gap ? 'warning' : 'success';
  setText('result-basis', expected ? '旧表期望 · 非保底' : '基础经验');
  setText('gain-label', expected ? '本次期望提供' : '本次提供');
  setText('minimum-cost-label', expected ? '期望达标最低新购' : '达标最低新购');
  setText('coin-shortfall-label', expected ? '期望达标还缺金币' : '还缺金币');
  setText('minimum-cost', `${fmt(funding.minimumCost)} 金币`);
  setText('coin-shortfall', `${fmt(funding.shortfall)} 金币`);
  setText('gain', `${fmt(result.gain)} 点`);
  setText('destroy-result', `${fmt(result.destroyXP)} 点`);
  setText('cost', `${fmt(result.cost)} 金币`);
  setText('balance-label', result.withinBudget ? '预算剩余' : '预算差额');
  setText('balance', `${fmt(Math.abs(result.remainingCoins))} 金币`);
  el('balance').dataset.kind = result.withinBudget ? '' : 'warning';
  setText('total-packs', `${fmt(result.totalPacks)} 包`);
  for (const type of ['normal', 'officer'] as const) {
    const normal = type === 'normal';
    setText(`${type}-used`, fmt(normal ? result.usedNormal : result.usedOfficer));
    setText(`${type}-buy`, fmt(normal ? result.buyNormal : result.buyOfficer));
    setText(`${type}-xp`, `${expected ? '期望 ' : ''}${fmt(normal ? result.normalXP : result.officerXP)} 点`);
  }
  setText('required-label', `还需 ${fmt(result.required)} 点`);
  setText('tier-summary', `${RULES.levels[state.currentLevel]} → ${RULES.levels[state.targetLevel]}`);
  setText('scale-result', `${gap ? '仍缺' : '超出'} ${fmt(answer)} 点`);
  setText('destroy-summary', `${fmt(result.destroyXP)} 点`);
  const currentPercent = Math.min(100, result.current / 2);
  const contribution = Math.max(0, Math.min(result.target, result.current + result.gain) - result.current);
  el('current-fill').style.width = `${currentPercent}%`;
  el('plan-fill').style.left = `${currentPercent}%`;
  el('plan-fill').style.width = `${contribution / 2}%`;
  el('gap-fill').style.left = `${(result.target - result.gap) / 2}%`;
  el('gap-fill').style.width = `${result.gap / 2}%`;
  el('target-marker').style.left = `${result.target / 2}%`;
  el('tier-scale').setAttribute('aria-label', `总刻度200点，当前${fmt(result.current)}点，本次${expected ? '期望' : '计划'}${fmt(result.gain)}点，目标${fmt(result.target)}点，仍缺${fmt(result.gap)}点`);
  const summary = `${expected ? '期望' : '基础'}${gap ? '仍缺' : '超出'} ${fmt(answer)} 点 · 新购 ${fmt(result.cost)} 金币${result.withinBudget ? '' : ' · 超预算'}`;
  setText('mobile-summary', summary);
  setText('allocation-summary', summary);
  const resultNote = !result.withinBudget ? '手动配比超出金币预算，不可执行。已有包仍按免费计入。'
    : expected ? (state.mode === 'auto' && gap ? `预算内最大期望 ${fmt(result.gain)} 点，仍缺 ${fmt(result.gap)} 点。` : '') +
      '旧表期望口径待核，不代表实际开包保底达标。' : state.mode === 'auto' && gap
      ? `预算内最大可得 ${fmt(result.gain)} 点，仍缺 ${fmt(result.gap)} 点。`
      : '';
  setText('result-note', resultNote);
  el('result-note').hidden = !resultNote;
}

function clearResult(message: string) {
  for (const id of ['answer', 'minimum-cost', 'coin-shortfall', 'gain', 'destroy-result', 'cost', 'balance', 'total-packs', 'required-label',
    'scale-result', 'destroy-summary', 'normal-used', 'normal-buy', 'normal-xp', 'officer-used', 'officer-buy', 'officer-xp']) setText(id, '-');
  setText('result-status', '输入有误，未生成有效方案');
  el('result-status').dataset.kind = 'warning';
  setText('mobile-summary', '输入有误，未生成有效方案');
  setText('allocation-summary', '输入有误，未生成有效方案');
  setText('result-note', '');
  el('result-note').hidden = true;
  el('current-fill').style.width = '0%';
  el('plan-fill').style.width = '0%';
  el('gap-fill').style.width = '0%';
  el('target-marker').hidden = true;
  el('tier-scale').setAttribute('aria-label', '输入有误，无法计算进度');
  setText('global-error', message);
  el('global-error').hidden = false;
}

function render() {
  syncInputs();
  el('target-marker').hidden = false;
  el('global-error').hidden = true;
  setText('scenario-note', state.scenario === 'full'
    ? '普通13.688 / 军官29.936点，旧表期望口径待核，非保底。'
    : '普通3 / 军官6点，不估计未指定的重复卡收益。');
  recommendation = null;
  try {
    const input = toInputs(state);
    recommendation = recommend(input);
    const result = state.mode === 'auto' ? recommendation : evaluate(input, manualPlan(state));
    updateResult(result, fundingRequirement(input));
    for (const type of ['Normal', 'Officer'] as const) {
      const key = `manual${type}` as 'manualNormal' | 'manualOfficer';
      const inputEl = el<HTMLInputElement>(key);
      if (state.mode === 'auto') inputEl.value = String(type === 'Normal' ? result.normal : result.officer);
    }
  } catch (error) {
    clearResult(error instanceof InputError ? error.message : '计算失败，请检查输入');
  }
  for (const key of ['manualNormal', 'manualOfficer']) {
    const inputEl = el<HTMLInputElement>(key);
    const range = el<HTMLInputElement>(`${key}-range`);
    const n = Number(inputEl.value);
    range.max = String(Math.min(RULES.limits.count, Math.max(100, Number.isFinite(n) ? Math.ceil(n) : 100)));
    range.value = inputEl.value;
    range.disabled = inputEl.disabled = state.mode === 'auto';
    for (const button of document.querySelectorAll<HTMLButtonElement>(`[data-step="${key}"]`)) {
      button.disabled = state.mode === 'auto';
    }
  }
  el<HTMLButtonElement>('apply').disabled = !recommendation;
  validateFields();
  setText('storage-warning', storageWarning);
  el('storage-warning').hidden = !storageWarning;
  setText('save-state', storageWarning ? '未保存至本机' : '已保存至本机');
}

function changed() {
  storageWarning = save(storage, state) || storageWarning;
  render();
}

for (const input of document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-field]')) {
  input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', () => {
    const key = input.dataset.field as keyof State;
    if (key === 'currentLevel') changeLevel(state, Number(input.value));
    else if (key === 'targetLevel') state.targetLevel = Number(input.value);
    else Object.assign(state, { [key]: input.value });
    changed();
  });
}
for (const range of document.querySelectorAll<HTMLInputElement>('[data-range]')) {
  range.addEventListener('input', () => {
    Object.assign(state, { [range.dataset.range!]: range.value });
    changed();
  });
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-step]')) {
  button.addEventListener('click', () => {
    const key = button.dataset.step as 'manualNormal' | 'manualOfficer';
    const value = Number(state[key]);
    if (!Number.isSafeInteger(value) || value < 0 || value > RULES.limits.count) {
      el<HTMLInputElement>(key).focus();
      return;
    }
    state[key] = String(Math.max(0, Math.min(RULES.limits.count, value + Number(button.dataset.delta))));
    changed();
  });
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) {
  button.addEventListener('click', () => { state.mode = button.dataset.mode as State['mode']; changed(); });
}
el('apply').addEventListener('click', () => {
  if (!recommendation) return;
  state.manualNormal = String(recommendation.normal);
  state.manualOfficer = String(recommendation.officer);
  state.mode = 'manual';
  changed();
});
el('reset').addEventListener('click', () => el<HTMLDialogElement>('reset-dialog').showModal());
el('reset-dialog').addEventListener('close', () => {
  if (el<HTMLDialogElement>('reset-dialog').returnValue === 'confirm') {
    state = defaults();
    storageWarning = save(storage, state);
    render();
  }
});

createIcons({ icons, attrs: { 'stroke-width': 1.6 } });
render();
initFooter();
