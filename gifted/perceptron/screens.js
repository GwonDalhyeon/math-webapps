/* 「퍼셉트론, 직선으로 판단하다」 — 보기(P0~P25). 제작 명세서 §4, 문구 근거는 00_내용구성 §5 */
'use strict';

const RENDER = {}, BIND = {};
const S = (k) => state.screens[k];
const LAB = PG.TARGETS;
const POINT_NAME = (i, lab) => `${lab === 1 ? '●' : lab === 0 ? '○' : ''} ${COORD[i]}`.trim();
const pend = {};                       // 평면별 아직 짝이 없는 첫 점(저장하지 않음)
let activeTimer = null;
function stopTimer() { if (activeTimer) { clearInterval(activeTimer); activeTimer = null; } }
const _navTo = navTo;
navTo = function (id) { stopTimer(); _navTo(id); };   // eslint-disable-line no-global-assign

/* svg를 통째로 바꾸지 않고 안쪽만 바꾼다(끄는 중에도 누르기가 끊기지 않게) */
function paintSvg(el, s) {
  const old = el.querySelector('svg');
  if (!old) { el.innerHTML = s; return; }
  const tmp = document.createElement('div');
  tmp.innerHTML = s;
  const nw = tmp.firstElementChild;
  old.innerHTML = nw.innerHTML;
  ['viewBox', 'aria-label'].forEach((a) => { if (nw.getAttribute(a)) old.setAttribute(a, nw.getAttribute(a)); });
}
/* 평면 하나를 화면에 붙인다. o: { key, draw(), get(), set(line), commit(kind), onPoint, lineOn } */
function mountPlane(o) {
  const el = document.getElementById(o.key);
  if (!el) return;
  const cfg = {
    lineOn: o.lineOn !== false,
    getLine: o.get, setLine: o.set,
    getPending: () => pend[o.key] || null, setPending: (p) => { pend[o.key] = p; },
    redraw: () => paintSvg(el, o.draw()),
    commit: (kind) => { pend[o.key] = null; o.commit(kind); },
    onPoint: o.onPoint
  };
  el.innerHTML = o.draw();
  bindPlane(el, cfg);
  bindPlaneControls(o.key, cfg);
}
const sameArr = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const choiceRow = (name, opts, cur, o = {}) => `<div class="choice-row" role="radiogroup" aria-label="${esc(o.label || name)}">${opts.map(([v, t]) => `<label class="pill${cur === v ? ' on' : ''}"><input type="radio" name="${name}" value="${esc(v)}" ${cur === v ? 'checked' : ''} ${o.disabled ? 'disabled' : ''}><span>${t}</span></label>`).join('')}</div>`;
const resultBox = (cls, text, id = '') => `<div ${id ? `id="${id}"` : ''} class="result ${cls}" role="status">${cls === 'ok' ? '✓ ' : cls === 'fail' ? '! ' : cls === 'partial' ? '△ ' : ''}${text}</div>`;
function shake(sel) { const el = $(sel); if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
const termBox = (name, body) => `<div class="term-box"><span class="term-tag">용어</span><p><strong>${name}</strong> ${body}</p></div>`;
const readBox = (title, body) => `<div class="read-box"><strong>${title}</strong> ${body}</div>`;
/* 규칙 다시 보기: 눌러 펼치되 아래 내용을 밀지 않는다 */
const rulesPop = () => `<details class="rules-pop"><summary>규칙 다시 보기</summary>${rulesHtml(true)}</details>`;

/* ================================================================ 섹션 0 */
RENDER.P0 = () => {
  const saved = Object.keys(state.views).length > 1;
  return `${head('직선 하나로 판단할 수 있을까?', '지난 시간에 만든 판단을 좌표평면의 점으로 옮기고, 직선으로 갈라 봅니다. 마지막에는 오늘 한 것을 선생님께 제출합니다.')}
  <div class="screen-layout two-col">
    <div class="card stack">
      <h3 style="margin:0">학생 정보</h3>
      <div class="field"><label for="st-school">학교</label><input id="st-school" type="text" autocomplete="off" value="${esc(state.student.school)}" placeholder="예: ○○중학교"></div>
      <div class="two-column">
        <div class="field"><label for="st-sid">학번</label><input id="st-sid" type="text" autocomplete="off" value="${esc(state.student.sid)}" placeholder="예: 3101"></div>
        <div class="field"><label for="st-name">이름</label><input id="st-name" type="text" autocomplete="off" value="${esc(state.student.name)}" placeholder="이름"></div>
      </div>
      ${state.migratedFrom1 ? '<div class="notice">새 판으로 바뀌어 「내 장치 설계」, 「접기와 회로」 같은 몇 활동은 새로 합니다. 나머지 기록은 그대로입니다.</div>' : ''}
      <div id="p0-note" class="result" role="status">${saved ? '저장된 기록이 있습니다. 「이어서 하기」를 누르세요.' : '입력한 내용은 이 브라우저에 자동 저장됩니다. 다른 기기로 옮길 때는 활동 목록의 「진행 코드」를 쓰세요.'}</div>
      <div class="button-row"><button id="p0-resume" class="primary-button" type="button">${saved ? '이어서 하기' : '시작하기'}</button>${saved ? '<button id="p0-new" class="secondary-button" type="button">새로 시작</button>' : ''}</div>
    </div>
    <div class="card stack">
      <div class="warning">종이 학습지는 덮어 두세요. 오늘은 이 화면으로 합니다.</div>
      <h3 style="margin:0">오늘의 흐름</h3>
      <ul class="check-list">
        <li>지난 시간의 판단을 되짚고, 내 장치를 회로로 만듭니다.</li>
        <li>판단을 좌표평면의 점으로 옮겨 직선으로 갈라 보고, 평면을 접어 봅니다.</li>
        <li>「퍼셉트론」을 만나고 학기 전체를 돌아본 뒤, 한 걸음 더 나아가 보고 제출합니다.</li>
      </ul>
    </div>
  </div>`;
};
BIND.P0 = () => {
  [['st-school', 'school'], ['st-sid', 'sid'], ['st-name', 'name']].forEach(([id, k]) => $('#' + id).addEventListener('input', (e) => { state.student[k] = e.target.value; persist(); }));
  $('#p0-resume').addEventListener('click', () => {
    if (!studentReady()) { const n = $('#p0-note'); n.textContent = '학교·학번·이름을 모두 입력해 주세요.'; n.className = 'result fail'; return; }
    const target = resumeView && resumeView !== 'P0' && activeScreens().some((s) => s.id === resumeView) ? resumeView : 'P1';
    navTo(target);
  });
  $('#p0-new')?.addEventListener('click', () => {
    if (!window.confirm('이 브라우저에 저장된 기록을 지우고 새로 시작할까요?')) return;
    const st = { ...state.student };
    state = initialState(); state.student = st; resumeView = 'P0'; persist(true); render();
  });
};

/* ================================================================ 섹션 1 */
const P1_TABLES = [
  ['AND', '「A이고 B」이면 1', 2], ['OR', '「A이거나 B」이면 1 (둘 다 1이어도 1)', 2],
  ['NOT', '「A가 아니면」 1', 1], ['XOR', '「A와 B가 서로 다르면」 1', 2]
];
const truthOf = (op) => (op === 'NOT' ? [1, 0] : LAB[op]);
RENDER.P1 = () => {
  const t = S('P1').tables;
  const cards = P1_TABLES.map(([op, sent, n]) => {
    const rowsIn = n === 1 ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]];
    const full = t[op].every((v) => v !== null);
    const right = truthOf(op);
    const rows = rowsIn.map((r, i) => {
      const v = t[op][i];
      return `<tr>${r.map((x) => `<td>${x}</td>`).join('')}<td><button type="button" class="cell-button${v === null ? ' empty' : ''}" data-p1="${op}:${i}" aria-label="${op} ${r.join(', ')}일 때 출력">${v === null ? '?' : v}</button></td></tr>`;
    }).join('');
    const ok = full && t[op].every((v, i) => v === right[i]);
    return `<div class="card mini-card"><h3>${op}</h3><p class="muted small">${sent}</p>
      <table class="truth compact"><thead><tr>${n === 1 ? '<th>A</th>' : '<th>A</th><th>B</th>'}<th>${op === 'NOT' ? 'NOT A' : `A ${op} B`}</th></tr></thead><tbody>${rows}</tbody></table>
      ${full ? (ok ? resultBox('ok', '맞았습니다') : resultBox('fail', '틀린 칸이 있어요')) : ''}</div>`;
  }).join('');
  return `${head('네 가지 판단', '지난 시간에 만난 네 가지 판단입니다. 출력 칸을 눌러 0 또는 1로 채우세요.')}<div class="grid-4">${cards}</div>`;
};
BIND.P1 = () => {
  $$('[data-p1]').forEach((b) => b.addEventListener('click', () => {
    const [op, i] = b.dataset.p1.split(':');
    const arr = S('P1').tables[op];
    arr[i] = arr[i] === null ? 0 : 1 - arr[i];
    if (arr.every((v) => v !== null)) {
      const ok = sameArr(arr, truthOf(op));
      logEvent('attempt', 'P1', `${op} 표: ${arr.join('')}`, ok ? 'ok' : 'fail', { op, table: arr.slice() });
      if (ok) success(`${op} 표를 맞게 채웠습니다.`); else fail('P1');
    }
    render();
  }));
};

/* ---------- 내 장치 설계 (03_2차개정_명세서 §3-3): ① 상황과 조건 → ② 회로(블록 끌기) → ③ 식(커서) */
const TOKEN_LIST = ['A', 'B', 'C', 'AND', 'OR', 'NOT', '(', ')'];
const IN3 = ['A', 'B', 'C'];
const EXPR_ERR = {
  empty: '식을 만들어 주세요.', mix: 'AND와 OR이 섞여 있어요. 먼저 계산할 부분을 괄호로 묶어 주세요.',
  paren: '괄호의 짝을 확인해 주세요.', dangling: '식이 연산으로 끝났거나 빈 곳이 있어요.', adjacent: '문자나 괄호 사이에 AND나 OR이 필요해요.'
};
const BOARD_ERR = { empty: '블록을 하나 이상 놓아 주세요.', emptyInput: '입력 단자가 비어 있는 블록이 있어요. 블록 왼쪽 점마다 선을 이어 주세요.', noOutput: '출력 단자(오른쪽 「출력」 왼쪽 점)에 선을 이어 주세요.', cycle: '선이 빙 돌아 제자리로 오는 곳이 있어요.', order: '선 연결을 다시 확인해 주세요.' };
const COND_ORDER = [1, 3, 0, 2];                  // 필요 없는 조건이 맨 끝에 오지 않게 보이는 순서
const boardUI = { pending: '', selected: '' };
const p2Scenario = () => PG.scenarioById(S('P2').scenario);
const condOf = (sc, id) => sc.conds.find((c) => c.id === id);
const p2Names = (sc) => Object.fromEntries(S('P2').assign.map((id, k) => [IN3[k], condOf(sc, id).yes]));
const p2Board = () => PG.boardCircuit(S('P2'), IN3);
function p2Reset(level) {           // 앞 단계가 바뀌면 뒤 단계 판정을 지운다
  const p = S('P2');
  if (level <= 1) { p.checked = false; p.circuitOk = false; p.diffRows = []; }
  p.exprChecked = false; p.exprMatch = false; p.exprDiff = []; p.exprOk = false;
}
function truthTableHtml(n, outs, o = {}) {
  const rows = PG.rows(n);
  const names = ['A', 'B', 'C'].slice(0, n);
  const cols = o.cols || [['출력', outs]];
  return `<table class="truth${o.cls ? ' ' + o.cls : ''}"><thead><tr>${names.map((x) => `<th>${x}</th>`).join('')}${cols.map(([h]) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr class="${(o.diff || []).includes(i) ? 'diff' : ''}">${r.map((v) => `<td>${v}</td>`).join('')}${cols.map(([, arr]) => `<td><strong>${arr ? arr[i] : ''}</strong></td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
/* 가로 진리표(행 8개를 열로 눕힘): 화면 높이를 아낀다. 다른 행(diff)은 열째 칠한다 */
function hTruthTable(n, cols, diff = []) {
  const rows = PG.rows(n), names = ['A', 'B', 'C'].slice(0, n);
  const line = (h, vals, strong) => `<tr><th scope="row">${h}</th>${vals.map((v, i) => `<td class="${diff.includes(i) ? 'diff' : ''}">${strong ? `<strong>${v}</strong>` : v}</td>`).join('')}</tr>`;
  return `<table class="truth h-truth"><tbody>${names.map((x, k) => line(x, rows.map((r) => r[k]), false)).join('')}${cols.map(([h, arr]) => line(h, arr, true)).join('')}</tbody></table>`;
}
const outDef = (sc) => `<div class="out-def"><strong>출력</strong><span>1 = ${esc(sc.out1)}</span><span>0 = ${esc(sc.out0)}</span></div>`;
const meaningRows = (sc, assign) => assign.map((id, k) => { const c = condOf(sc, id); return `<li><strong class="var-name">${IN3[k]}</strong> 1이면 ${esc(c.yes)}, 0이면 ${esc(c.no)}</li>`; }).join('');
const needScenario = (title, sub) => `${head(title, '', sub)}<div class="card stack"><div class="notice">먼저 앞 화면에서 상황 카드를 고르고 조건을 A, B, C에 놓아 「확인」을 눌러 주세요.</div><div class="button-row"><button class="secondary-button" type="button" data-go="P2a">앞 화면으로</button></div></div>`;

RENDER.P2a = () => {
  const p = S('P2'), sc = p2Scenario();
  const cards = PG.SCENARIOS.map((x) => `<button type="button" class="scenario-card${p.scenario === x.id ? ' on' : ''}" data-scenario="${x.id}" aria-pressed="${p.scenario === x.id}"><strong>${x.name}</strong><span>${x.goal}</span></button>`).join('');
  let right = '<p class="todo-line">왼쪽에서 상황 카드를 하나 고르세요. 고르면 여기에 조건 문장과 할 일이 나옵니다.</p>';
  if (sc) {
    const placed = new Set(p.assign);
    const chips = COND_ORDER.map((k) => sc.conds[k]).map((c) => `<button type="button" class="cond-chip" data-cond="${c.id}" ${placed.has(c.id) || p.assign.length >= 3 ? 'disabled' : ''}>${esc(c.yes)}</button>`).join('');
    const slots = IN3.map((x, k) => { const id = p.assign[k], c = id ? condOf(sc, id) : null; return `<button type="button" class="cond-slot${id ? ' filled' : ''}" data-slot="${k}" ${id ? `aria-label="${x}에서 빼기"` : 'disabled'}><span class="var-name">${x}</span>${c ? `<span><strong>${esc(c.yes)}</strong><small class="slot-mean">1이면 ${esc(c.yes)}, 0이면 ${esc(c.no)}</small></span><span aria-hidden="true">✕</span>` : '<span class="muted">비어 있음</span>'}</button>`; }).join('');
    const verdict = p.assignOk ? resultBox('ok', '조건을 맞게 골랐습니다. 다음 화면에서 회로를 만듭니다.')
      : p.assignTried && p.assign.length === 3 ? resultBox('fail', '조건 문장에 나오지 않는 조건이 하나 섞여 있어요. 문장을 처음부터 읽으며 조건을 하나씩 대조해 보세요.') : '';
    right = `<div class="task-sentence"><span class="task-tag">${esc(sc.name)} · 조건 문장</span><p>${esc(sc.sentence)}</p>${outDef(sc)}</div>
      <div class="chip-row" aria-label="조건 보기">${chips}</div>
      <div class="slot-row">${slots}</div>
      <div class="check-row"><button id="p2a-check" class="primary-button" type="button" ${p.assign.length < 3 ? 'disabled' : ''}>확인</button>${p.assign.length < 3 ? `<span class="small">${3 - p.assign.length}칸 더 놓으면 확인할 수 있어요.</span>` : verdict}</div>`;
  }
  return `${head('내 장치 설계 ① 상황과 조건', '조건에 따라 작동하는 장치를 설계합니다. 왼쪽에서 상황 카드를 하나 고르면, 오른쪽에 그 장치의 조건 문장과 할 일이 나옵니다.', '오늘의 정리 1 (1)')}
  <div class="screen-layout two-col scenario-layout">
    <div class="card stack"><h3 style="margin:0">상황 카드</h3><div class="scenario-list">${cards}</div>${sc ? `<div class="todo-box"><strong>할 일</strong><ol><li>오른쪽 조건 문장에 나오는 조건 3개를 눌러 A, B, C 칸에 놓습니다. 보기 하나는 문장에 없는 조건입니다.</li><li>「확인」을 누릅니다. 놓은 칸을 누르면 뺍니다.</li></ol></div>` : ''}</div>
    <div class="card stack">${right}</div>
  </div>`;
};
BIND.P2a = () => {
  const p = S('P2');
  $$('[data-scenario]').forEach((b) => b.addEventListener('click', () => {
    if (p.scenario === b.dataset.scenario) return;
    p.scenario = b.dataset.scenario; p.assign = []; p.assignOk = false; p.assignTried = false; p2Reset(1);
    logEvent('write', 'P2a', `상황 카드: ${PG.scenarioById(p.scenario).name}`); render();
  }));
  $$('[data-cond]').forEach((b) => b.addEventListener('click', () => { if (p.assign.length < 3) { p.assign.push(b.dataset.cond); p.assignOk = false; p.assignTried = false; p2Reset(1); persist(); render(); } }));
  $$('[data-slot]').forEach((b) => b.addEventListener('click', () => { p.assign.splice(Number(b.dataset.slot), 1); p.assignOk = false; p.assignTried = false; p2Reset(1); persist(); render(); }));
  $('#p2a-check')?.addEventListener('click', () => {
    const sc = p2Scenario(), ok = PG.assignOk(sc, p.assign);
    p.assignOk = ok; p.assignTried = true;
    logEvent('attempt', 'P2a', `${sc.name} · 고른 조건: ${p.assign.map((id) => condOf(sc, id).yes).join(', ')}`, ok ? 'ok' : 'fail');
    if (ok) success('맞게 골랐습니다. 이제 회로를 만들어 봅시다.'); else fail('P2a');
    render();
  });
};

/* ---------- P2b 내 장치 설계 ② 회로로 만들기 — 블록 끌기 */
RENDER.P2b = () => {
  const p = S('P2'), sc = p2Scenario();
  if (!sc || !p.assignOk) return needScenario('내 장치 설계 ② 회로로 만들기', '오늘의 정리 1 (2)');
  const r = p2Board();
  const target = PG.scenarioTable(sc, p.assign), mine = r.circuit ? PG.circuitTable(r.circuit, 3) : null;
  const vals = evalBoard(p, p.sw);
  let result = '';
  if (p.checked) result = r.error ? resultBox('fail', BOARD_ERR[r.error] || '회로를 확인해 주세요.') : p.circuitOk ? resultBox('ok', `회로가 조건 문장대로 판단합니다. 블록 ${p.blocks.length}개를 썼습니다.`) : resultBox('fail', `조건 문장과 다른 행이 ${p.diffRows.length}개 있어요. 표에서 칠한 행의 입력대로 스위치를 놓아 보세요.`);
  const showTable = p.checked && !r.error;
  return `${head('내 장치 설계 ② 회로로 만들기', `<strong>${esc(sc.name)}</strong> — ${esc(sc.sentence)}`, '오늘의 정리 1 (2)')}
  <div class="screen-layout two-col board-layout">
    <div class="card stack">
      <div id="p2-palette" class="palette"><span class="field-label">블록</span>${['AND', 'OR', 'NOT'].map((t) => `<button type="button" class="block-button" data-palette="${t}" ${p.blocks.length >= MAX_BLOCKS ? 'disabled' : ''}>${t}</button>`).join('')}<span class="muted small">끌어서 판에 놓거나 누르세요 · 6개까지</span></div>
      <div id="p2-board" class="board-box">${boardSvg(p, { inputs: IN3, names: p2Names(sc), outName: `1 = ${sc.out1}`, sw: p.sw, pending: boardUI.pending, selected: boardUI.selected })}</div>
      <p class="muted small board-help">선 잇기: 오른쪽 작은 점에서 끌어 다른 블록의 왼쪽 점에 놓기(또는 두 점을 차례로 누르기) · 선을 누르면 지워짐 · 블록을 판 밖으로 끌면 지워짐</p>
    </div>
    <div class="card stack">
      ${outDef(sc)}
      <ul class="meaning-list compact">${meaningRows(sc, p.assign)}</ul>
      <div class="switch-row"><span class="muted small">스위치:</span>${IN3.map((x) => `<button type="button" class="switch${p.sw[x] ? ' on' : ''}" data-sw="${x}" aria-pressed="${p.sw[x] ? 'true' : 'false'}">${x} = ${p.sw[x] || 0}</button>`).join('')}<span class="out-badge">출력 ${vals.OUT === undefined ? '?' : vals.OUT}</span></div>
      <div class="button-row"><button id="p2b-check" class="primary-button" type="button">확인</button></div>
      ${result}
      ${showTable ? `<div data-reveal="table">${truthTableHtml(3, null, { cols: [['조건 문장', target], ['내 회로', mine]], diff: p.diffRows, cls: 'compact tiny-rows' })}</div>` : ''}
    </div>
  </div>`;
};
BIND.P2b = () => {
  const p = S('P2'), sc = p2Scenario();
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => navTo(b.dataset.go)));
  if (!sc || !p.assignOk) return;
  const el = $('#p2-board');
  const opts = () => ({ inputs: IN3, names: p2Names(sc), outName: `1 = ${sc.out1}`, sw: p.sw, pending: boardUI.pending, selected: boardUI.selected });
  const commit = (kind) => {
    if (kind === 'cycle') { say('그렇게 이으면 선이 빙 돌아 제자리로 와요. 다른 곳에 이어 보세요.', 'tilt'); renderMascot(); paintSvg(el, boardSvg(p, opts())); return; }
    p2Reset(1); persist(); render();
  };
  bindBoard(el, { board: p, ui: boardUI, redraw: (extra = {}) => paintSvg(el, boardSvg(p, { ...opts(), ...extra })), commit, toggle: (x) => { p.sw[x] = 1 - (p.sw[x] || 0); persist(); render(); } });
  bindPalette($('#p2-palette'), el, { board: p, commit, full: () => { say('블록은 6개까지 놓을 수 있어요.', 'tilt'); renderMascot(); } });
  $$('[data-sw]').forEach((b) => b.addEventListener('click', () => { p.sw[b.dataset.sw] = 1 - (p.sw[b.dataset.sw] || 0); persist(); render(); }));
  $('#p2b-check').addEventListener('click', () => {
    const r = p2Board();
    p.checked = true;
    if (r.error) { p.circuitOk = false; logEvent('attempt', 'P2b', `회로 미완성: ${r.error}`, 'fail'); say(BOARD_ERR[r.error] || '회로를 확인해 주세요.', 'tilt'); render(); return; }
    const a = PG.scenarioTable(sc, p.assign), b = PG.circuitTable(r.circuit, 3);
    p.diffRows = a.map((v, i) => (v !== b[i] ? i : -1)).filter((i) => i >= 0);
    p.circuitOk = p.diffRows.length === 0;
    const desc = r.circuit.gates.map((g) => `${g.type}(${g.inputs.join(',')})`).join(' ');
    logEvent('attempt', 'P2b', `${desc} · 다른 행 ${p.diffRows.length}개`, p.circuitOk ? 'ok' : 'fail', { blocks: clone(p.blocks), wires: clone(p.wires) });
    if (p.circuitOk) success('회로가 조건 문장대로 판단합니다. 스위치로 언제 켜지는지 보고, 다음 화면에서 식으로 나타내 봅시다.'); else fail('P2b');
    render();
  });
};

/* ---------- P2e 내 장치 설계 ③ 식으로 나타내기 — 커서 */
RENDER.P2e = () => {
  const p = S('P2'), sc = p2Scenario();
  if (!sc || !p.assignOk) return needScenario('내 장치 설계 ③ 식으로 나타내기', '오늘의 정리 1 (3)');
  const r = p2Board();
  if (r.error) return `${head('내 장치 설계 ③ 식으로 나타내기', '', '오늘의 정리 1 (3)')}<div class="card stack"><div class="notice">먼저 앞 화면에서 회로를 완성하고 「확인」을 눌러 주세요.</div><div class="button-row"><button class="secondary-button" type="button" data-go="P2b">앞 화면으로</button></div></div>`;
  const cur = Math.min(p.cursor, p.tokens.length);
  const gap = (i) => `<button type="button" class="caret-gap${cur === i ? ' on' : ''}" data-cur="${i}" aria-label="${i === 0 ? '맨 앞' : `${i}번째 기호 뒤`}에 커서 놓기"></button>`;
  const exprView = `${gap(0)}${p.tokens.map((t, i) => `<button type="button" class="tok${['AND', 'OR', 'NOT'].includes(t) ? ' op' : ''}" data-tokat="${i}" aria-label="${t} 뒤에 커서 놓기">${t}</button>${gap(i + 1)}`).join('')}${p.tokens.length ? '' : '<span class="muted small">아래 단추로 식을 만드세요.</span>'}`;
  const mine = PG.circuitTable(r.circuit, 3);
  let exprTable = null;
  if (p.exprOk) { const pr = PG.parseExpr(p.tokens); if (pr.ast) exprTable = PG.exprTable(pr.ast, 3); }
  return `${head('내 장치 설계 ③ 식으로 나타내기', '내가 만든 회로를 AND, OR, NOT을 쓴 식으로 나타내 봅시다. 게이트 하나가 괄호 하나입니다.', '오늘의 정리 1 (3)')}
  <div class="screen-layout two-col p2e-top">
    <div class="card stack">
      <div class="board-box small">${boardSvg(p, { inputs: IN3, names: p2Names(sc), outName: `1 = ${sc.out1}`, sw: p.sw, readOnly: true, small: true })}</div>
      ${p.circuitOk ? '' : '<p class="small" style="margin:0">회로가 아직 조건 문장과 다르지만, 지금 회로를 그대로 식으로 나타내 볼 수 있습니다.</p>'}
    </div>
    <div class="card stack">
      ${p.exprError ? resultBox('fail', EXPR_ERR[p.exprError] || '식을 다시 확인해 주세요.') : ''}
      ${p.exprChecked && exprTable ? `<div class="stack" data-reveal="expr">${p.exprMatch ? resultBox('ok', '식과 회로가 같은 판단을 합니다.') : resultBox('fail', `식과 회로가 다른 행이 ${p.exprDiff.length}개 있어요. 표에서 칠한 행을 보세요.`)}${hTruthTable(3, [['내 회로', mine], ['내 식', exprTable]], p.exprDiff)}<p class="small" style="margin:0">세로 한 줄이 진리표의 한 행입니다.</p></div>` : p.exprError ? '' : '<p class="todo-line">아래 칸에 식을 만든 뒤 「식 확인」을 누르세요. 회로와 식의 진리표를 여기에 나란히 비교합니다.</p><ul class="tip-list"><li>기호 사이를 누르거나 ◀ ▶로 커서(세로줄)를 옮기면, 그 자리에 넣거나 지울 수 있습니다.</li><li>NOT은 바로 뒤의 문자나 괄호 하나에만 붙습니다.</li></ul>'}
    </div>
  </div>
  <div class="card stack expr-card">
    <div class="expr-line"><div class="expr-view cursor-view" aria-live="polite">${exprView}</div><button id="p2e-check" class="primary-button" type="button">식 확인</button></div>
    <div class="token-bar">
      <div class="token-pad one-line">${TOKEN_LIST.map((t) => `<button type="button" class="tok-button" data-tok="${t}">${t}</button>`).join('')}</div>
      <div class="token-pad one-line"><button type="button" class="tok-button soft" data-tok="LEFT" aria-label="커서를 왼쪽으로">◀</button><button type="button" class="tok-button soft" data-tok="RIGHT" aria-label="커서를 오른쪽으로">▶</button><button type="button" class="tok-button soft" data-tok="BACK" aria-label="커서 앞 기호 하나 지우기">⌫</button><button type="button" class="tok-button soft" data-tok="CLEAR">모두 지우기</button></div>
    </div>
  </div>`;
};
BIND.P2e = () => {
  const p = S('P2');
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => navTo(b.dataset.go)));
  const edit = (op) => { const r = PG.tokenEdit(p.tokens, p.cursor, op); p.tokens = r.tokens; p.cursor = r.cursor; p.exprError = ''; p2Reset(2); persist(); render(); };
  $$('[data-tok]').forEach((b) => b.addEventListener('click', () => edit(b.dataset.tok)));
  $$('[data-cur]').forEach((b) => b.addEventListener('click', () => { p.cursor = Number(b.dataset.cur); persist(); render(); }));
  $$('[data-tokat]').forEach((b) => b.addEventListener('click', () => { p.cursor = Number(b.dataset.tokat) + 1; persist(); render(); }));
  $('#p2e-check')?.addEventListener('click', () => {
    const r = p2Board(), pr = PG.parseExpr(p.tokens);
    if (r.error) return;
    if (pr.error) { p.exprOk = false; p.exprChecked = false; p.exprError = pr.error; say(EXPR_ERR[pr.error], 'tilt'); logEvent('write', 'P2e', `식 형식 오류: ${p.tokens.join(' ')}`); render(); return; }
    const a = PG.circuitTable(r.circuit, 3), b = PG.exprTable(pr.ast, 3);
    p.exprOk = true; p.exprChecked = true; p.exprError = '';
    p.exprDiff = a.map((v, i) => (v !== b[i] ? i : -1)).filter((i) => i >= 0);
    p.exprMatch = p.exprDiff.length === 0;
    logEvent('attempt', 'P2e', `식: ${PG.astText(pr.ast)} · 회로와 다른 행 ${p.exprDiff.length}개`, p.exprMatch ? 'ok' : 'fail', { expr: PG.astText(pr.ast) });
    if (p.exprMatch) success('식과 회로가 같은 판단을 합니다.'); else fail('P2e');
    render();
  });
};

/* ---------- P3 XOR 회로 */
RENDER.P3 = () => {
  const p = S('P3');
  const vals = PG.circuitValues(PG.XOR_CIRCUIT, p.sw);
  const full = p.table.every((v) => v !== null), ok = full && sameArr(p.table, LAB.XOR);
  const rows = [[0, 0], [0, 1], [1, 0], [1, 1]].map((r, i) => {
    const v = p.table[i];
    return `<tr class="${p.sw.A === r[0] && p.sw.B === r[1] ? 'now' : ''}"><td>${r[0]}</td><td>${r[1]}</td><td><button type="button" class="cell-button${v === null ? ' empty' : ''}" data-p3="${i}">${v === null ? '?' : v}</button></td></tr>`;
  }).join('');
  return `${head('XOR을 만든 회로', '지난 시간에 찾은 XOR 회로 가운데 하나입니다. 스위치 A, B를 하나씩 눌러 네 경우를 모두 만들고, 그때의 출력을 표에 채우세요.')}
  <div class="screen-layout two-col">
    <div class="card stack">
      <p style="margin:0">식: <strong>(A OR B) AND NOT (A AND B)</strong></p>
      <div class="circuit-wrap">${circuitSvg(PG.XOR_CIRCUIT, vals, { title: 'XOR 회로' })}</div>
      <div class="switch-row"><span class="muted small">스위치:</span>${['A', 'B'].map((x) => `<button type="button" class="switch${p.sw[x] ? ' on' : ''}" data-sw3="${x}" aria-pressed="${p.sw[x] ? 'true' : 'false'}">${x} = ${p.sw[x]}</button>`).join('')}<span class="out-badge">출력 ${vals.OUT}</span></div>
    </div>
    <div class="card stack">
      <table class="truth compact"><thead><tr><th>A</th><th>B</th><th>출력</th></tr></thead><tbody>${rows}</tbody></table>
      ${full ? (ok ? resultBox('ok', 'XOR도 AND·OR·NOT을 이어 만들 수 있었습니다. 그렇다면 오늘은 다른 방법으로 판단을 들여다봅시다.') : resultBox('fail', '틀린 칸이 있어요. 표의 입력대로 스위치를 하나씩 놓고 출력을 보세요.')) : '<p class="muted small" style="margin:0">지금 스위치 상태의 행이 칠해집니다.</p>'}
    </div>
  </div>`;
};
BIND.P3 = () => {
  const p = S('P3');
  $$('[data-sw3]').forEach((b) => b.addEventListener('click', () => { p.sw[b.dataset.sw3] = 1 - p.sw[b.dataset.sw3]; persist(); render(); }));
  $$('[data-p3]').forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.dataset.p3);
    p.table[i] = p.table[i] === null ? 0 : 1 - p.table[i];
    if (p.table.every((v) => v !== null)) { const ok = sameArr(p.table, LAB.XOR); logEvent('attempt', 'P3', `확인표 ${p.table.join('')}`, ok ? 'ok' : 'fail'); if (ok) success('네 경우를 모두 확인했습니다.'); else fail('P3'); }
    render();
  }));
};

/* ================================================================ 섹션 2 */
/* 합격 기준 추정: 「합이 T점보다 크면 합격」. 불합격 최고 합 141, 합격 최저 합 160이므로 T = 141~159가 모두 정답 */
const P4_PASS = SCORES.map(([x, y]) => x + y > 150);
const isIntText = (t) => /^-?\d+$/.test(String(t || '').trim());
function judgeP4(t) {
  const T = Number(String(t).trim());
  const wrong = SCORES.map(([x, y], i) => ((x + y > T) !== P4_PASS[i] ? i : -1)).filter((i) => i >= 0);
  return { T, wrong, ok: wrong.length === 0, onLine: SCORES.findIndex(([x, y]) => x + y === T) };
}
RENDER.P4 = () => {
  const p = S('P4'), sel = p.sel;
  const j = p.tried && isIntText(p.guess) ? judgeP4(p.guess) : null;
  const info = sel === null ? '<span class="muted">점을 누르면 그 학생의 점수와 합이 여기에 나옵니다.</span>'
    : (() => { const [x, y] = SCORES[sel]; return `국어 <b>${x}</b> + 수학 <b>${y}</b> = 합 <b>${x + y}</b> → ${P4_PASS[sel] ? '합격 ●' : '불합격 ○'}`; })();
  let verdict = '';
  if (p.tried && !isIntText(p.guess)) verdict = resultBox('fail', '정수로 입력하세요. 예: 120');
  else if (j && j.ok) verdict = resultBox('ok', `맞아요. 직선 「합 = ${j.T}」의 오른쪽 위에는 ●만, 왼쪽 아래에는 ○만 있습니다.${j.onLine >= 0 ? ` 직선 위의 학생(합 ${j.T})은 「${j.T}점보다 크면」이 아니므로 불합격입니다.` : ''}`);
  else if (j) {
    const passLow = j.wrong.filter((i) => P4_PASS[i]).length, failHigh = j.wrong.length - passLow;
    verdict = resultBox('fail', `「합 = ${j.T}」로 가르면 ${[passLow ? `●인데 불합격 쪽에 놓이는 학생이 ${passLow}명` : '', failHigh ? `○인데 합격 쪽에 놓이는 학생이 ${failHigh}명` : ''].filter(Boolean).join(', ')} 있어요. 빨갛게 표시한 점을 눌러 합을 확인해 보세요.`);
  }
  return `${head('판단은 평면을 가르는 일이다', '국어 점수와 수학 점수의 합이 <strong>기준 점수보다 크면</strong> 합격인 시험이 있습니다. 학생 20명의 (국어 점수, 수학 점수)를 점으로 찍고 합격은 ●, 불합격은 ○로 나타냈습니다. 기준 점수는 알려 주지 않았습니다.')}
  <div class="screen-layout two-col"><div class="card"><div class="scatter-box">${scatterSvg({ selected: sel, line: j ? j.T : null, wrong: j && !j.ok ? j.wrong : [] })}</div></div>
  <div class="card stack">
    ${j && j.ok ? '' : '<p class="todo-line">점을 눌러 학생의 점수와 합을 확인하고, 합격 기준 점수를 추정해 보세요.</p>'}
    <div class="score-info" role="status">${info}</div>
    <div class="field"><label class="field-label" for="p4-guess">합격 기준: 국어 점수와 수학 점수의 합이 □점보다 크면 합격이다. □에 들어갈 수 있는 <u>정수</u>를 하나 쓰시오.</label>
      <div class="inline-actions"><input id="p4-guess" type="text" inputmode="numeric" value="${esc(p.guess)}" style="max-width:110px" aria-label="합격 기준 점수(정수)"><span>점</span><button id="p4-check" class="primary-button" type="button">직선 그어 확인</button></div></div>
    ${verdict}
    ${j && j.ok ? `<p class="read-box" style="margin:0" data-reveal="p4ok">실제 기준은 <strong>150점</strong>이었습니다. 불합격자의 합은 141점 이하, 합격자의 합은 160점 이상이라 <strong>141~159의 정수는 모두</strong> 이 20명을 똑같이 가릅니다. <strong>기준 하나가 평면을 직선 하나로 두 쪽으로 가른 것입니다.</strong></p>` : ''}
  </div></div>`;
};
BIND.P4 = () => {
  const p = S('P4');
  $$('[data-score]').forEach((c) => c.addEventListener('click', () => { p.sel = Number(c.dataset.score); persist(); render(); }));
  $('#p4-guess').addEventListener('input', (e) => { p.guess = e.target.value; p.tried = false; persist(); });
  $('#p4-guess').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#p4-check').click(); });
  $('#p4-check').addEventListener('click', () => {
    p.tried = true;
    if (isIntText(p.guess)) {
      const j = judgeP4(p.guess);
      logEvent('attempt', 'P4', `합격 기준 추정 ${j.T} · 잘못 갈린 학생 ${j.wrong.length}명`, j.ok ? 'ok' : 'fail');
      if (j.ok) success('직선 하나로 합격과 불합격이 갈렸습니다.'); else say('빨갛게 표시한 점을 눌러 합을 확인해 보세요.', 'tilt');
    }
    persist(); render();
  });
};

const RULES = ['가로축이 A, 세로축이 B입니다.', '출력이 1인 점은 까맣게 칠하고(●), 0인 점은 비워 둡니다(○).', '직선 하나만 긋습니다. 직선이 점 위를 지나면 나눈 것으로 보지 않습니다.', '직선의 한쪽에 ●만, 다른 쪽에 ○만 있으면 「나누었다」고 합니다.'];
const rulesHtml = (compact) => `<div class="rule-box${compact ? ' compact' : ''}"><strong>규칙</strong><ol>${RULES.map((r) => `<li>${r}</li>`).join('')}</ol></div>`;
RENDER.P5 = () => {
  const p = S('P5'), step = p.step;
  const out = LAB.NOT_A_AND_B;
  const NO = ['①', '②', '③', '④'];
  const labels = [0, 1, 2, 3].map((i) => (i < step ? out[i] : null));
  const unknown = [0, 1, 2, 3].filter((i) => i >= step);
  const badges = Object.fromEntries([0, 1, 2, 3].filter((i) => i < step).map((i) => [i, i + 1]));
  const rows = [[0, 0], [0, 1], [1, 0], [1, 1]].map((r, i) => `<tr class="${i === step - 1 ? 'now' : ''}${i < step ? ' moved' : ''}"><td class="row-no">${NO[i]}</td><td>${r[0]}</td><td>${r[1]}</td><td><strong>${out[i]}</strong></td><td class="pt-cell">${i < step ? `점 <b>${COORD[i]}</b>에 <b class="mark">${out[i] ? '●' : '○'}</b>` : '<span class="muted">아직</span>'}</td></tr>`).join('');
  return `${head('진리표가 점이 된다', '입력이 0과 1뿐이라면 진리표의 한 행 (A, B)는 순서쌍, 곧 좌표평면의 점 하나입니다. 출력이 1이면 ●, 0이면 ○로 나타냅니다.')}
  <div class="screen-layout two-col fig-left">
    <div class="card stack"><div class="plane-box mid">${planeSvg({ labels, unknown, badges, badgeOn: step - 1, selected: step ? [step - 1] : [], title: '2-1 회로의 네 점' })}</div>
      <p class="caption">점 옆의 번호는 진리표의 행 번호입니다. 점선 「?」는 아직 옮기지 않은 점입니다.</p></div>
    <div class="card stack">
      <h3 style="margin:0">2-1 회로(밝다 센서등)의 진리표</h3>
      <table class="truth p5-table"><thead><tr><th>행</th><th>A</th><th>B</th><th>출력</th><th>좌표평면의 점</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="button-row"><button id="p5-next" class="primary-button" type="button" ${step >= 4 ? 'disabled' : ''}>${step ? `다음 행(${NO[Math.min(step, 3)]})을 점으로` : '① 행을 점으로'}</button><button id="p5-all" class="secondary-button" type="button" ${step >= 4 ? 'disabled' : ''}>모두 옮기기</button>${step ? '<button id="p5-reset" class="secondary-button" type="button">처음부터</button>' : ''}</div>
      ${step >= 4 ? '<p style="margin:0" data-reveal="done">네 행이 모두 점이 되었습니다. 다음 화면부터는 이렇게 점으로 옮긴 판단을 <strong>직선 하나로 가를 수 있는지</strong> 직접 그어 봅니다.</p>' : `<p class="todo-line">${step ? `${NO[step - 1]} 행 (A, B) = ${COORD[step - 1]}이 왼쪽 그림의 ${NO[step - 1]}번 점이 되었습니다. 다음 행도 옮겨 보세요.` : '버튼을 눌러 진리표의 행을 하나씩 점으로 옮겨 보세요. 행 (A, B)가 점의 좌표가 됩니다.'}</p>`}
      ${rulesPop()}
    </div>
  </div>`;
};
BIND.P5 = () => {
  const p = S('P5');
  $('#p5-next')?.addEventListener('click', () => { p.step = Math.min(4, p.step + 1); persist(); render(); });
  $('#p5-all')?.addEventListener('click', () => {
    stopTimer();
    activeTimer = setInterval(() => { if (state.screenId !== 'P5' || p.step >= 4) { stopTimer(); return; } p.step += 1; persist(); render(); }, 600);
  });
  $('#p5-reset')?.addEventListener('click', () => { stopTimer(); p.step = 0; persist(); render(); });
};

/* ================================================================ 섹션 3 */
function wrongText(res, labels) {
  if (res.reason === 'onPoint') return `직선이 ${res.onPoints.map((i) => POINT_NAME(i, labels[i])).join(', ')} 위를 지나요. 점 위를 지나면 나눈 것으로 보지 않아요.`;
  if (res.reason === 'mixed') return `이 직선은 ${res.wrong.map((i) => POINT_NAME(i, labels[i])).join(', ')}이 반대쪽 무리와 섞여 있어요.`;
  return '';
}
function judgeP6(k) {
  const g = S('P6')[k], target = LAB[k.toUpperCase()];
  if (!g.line) return { cls: '', text: '' };
  if (!sameArr(g.marks, target)) return { cls: 'partial', text: '점 칠하기를 진리표와 비교해 보세요.', kind: 'mark' };
  const r = PG.judgeLine(lineFromPts(g.line), target);
  if (r.ok) return { cls: 'ok', text: '직선 하나로 나누었습니다.' };
  return { cls: 'fail', text: wrongText(r, target), kind: r.reason };
}
RENDER.P6 = () => {
  const box = (k) => {
    const g = S('P6')[k], op = k.toUpperCase(), j = judgeP6(k);
    return `<div class="card"><div class="fig-row"><div id="pl-${k}" class="plane-box"></div>
      <div class="side-col"><h3 style="margin:0">${op}</h3>${truthTableHtml(2, LAB[op], { cls: 'compact' })}
        ${planeControlsHtml('pl-' + k, true)}
        ${j.text ? resultBox(j.cls, j.text) : '<div class="result muted">점을 눌러 칠하고, 직선을 그으세요.</div>'}</div></div></div>`;
  };
  const al = S('P6').alone, bothOk = judgeP6('and').cls === 'ok' && judgeP6('or').cls === 'ok';
  const pick = (k) => `<div class="inline-actions"><span class="field-label">${k.toUpperCase()}</span>${choiceRow('p6a-' + k, PG.POINTS.map((pt, i) => [String(i), COORD[i]]), al[k] === null ? '' : String(al[k]), { label: `${k.toUpperCase()}에서 떼어 낸 점` })}</div>`;
  const aloneOk = al.and === 3 && al.or === 0;
  return `${head('AND와 OR', 'AND와 OR의 출력에 따라 점을 눌러 ●/○로 칠하고, ●와 ○를 가르는 직선을 하나씩 그어 보세요. 직선은 빈 곳을 두 번 누르거나 끌어서 긋고, 끝점(작은 원)이나 옆 단추로 고칩니다.', '4-1', rulesPop())}
  <div class="screen-layout two-col">${box('and')}${box('or')}</div>
  ${bothOk ? `<div class="card stack" data-reveal="alone"><p style="margin:0"><strong>두 직선은 모두 점 하나만 따로 떼어 냈습니다. 떼어 낸 점은?</strong></p><div class="alone-row">${pick('and')}${pick('or')}</div>
    ${al.and !== null && al.or !== null ? (aloneOk ? resultBox('ok', 'AND는 ●가 (1, 1) 하나, OR은 ○가 (0, 0) 하나였습니다. 한 점만 떼어 내면 직선 하나로 갈립니다.') : resultBox('fail', '직선의 한쪽에 점이 하나만 있는 쪽을 보세요.')) : ''}</div>` : ''}`;
};
BIND.P6 = () => {
  ['and', 'or'].forEach((k) => $$(`input[name="p6a-${k}"]`).forEach((r) => r.addEventListener('change', () => {
    const al = S('P6').alone; al[k] = Number(r.value);
    if (al.and !== null && al.or !== null) logEvent('attempt', 'P6', `떼어 낸 점 AND ${COORD[al.and]} · OR ${COORD[al.or]}`, al.and === 3 && al.or === 0 ? 'ok' : 'fail');
    persist(); render();
  })));
  ['and', 'or'].forEach((k) => {
    const g = S('P6')[k];
    mountPlane({
      key: 'pl-' + k,
      draw: () => planeSvg({ labels: g.marks, line: g.line, interactive: true, pending: pend['pl-' + k], title: `${k.toUpperCase()} 평면` }),
      get: () => g.line, set: (l) => { g.line = l; },
      onPoint: (i) => { g.marks[i] = 1 - g.marks[i]; persist(); render(); },
      commit: () => {
        const j = judgeP6(k);
        if (g.line) {
          logEvent('attempt', 'P6', `${k.toUpperCase()} · 칠하기 ${g.marks.join('')} · ${j.text}`, j.cls === 'ok' ? 'ok' : j.cls === 'partial' ? 'partial' : 'fail', { op: k, marks: g.marks.slice(), line: clone(g.line) });
          if (j.cls === 'ok') success(`${k.toUpperCase()}는 직선 하나로 나누었습니다.`); else fail('P6', j.text);
        }
        persist(); render();
      }
    });
  });
};

/* ---------- P7 XOR */
RENDER.P7 = () => {
  const p = S('P7');
  const L = lineFromPts(p.line);
  const res = L ? PG.judgeLine(L, LAB.XOR) : null;
  const ghosts = p.history.slice(0, -1);
  const locked = predictLocked('P7'), pv = predictValue('P7') || '';
  const predBox = `<div class="predict-box${locked ? ' done' : ''}"><p style="margin:0"><strong>XOR은 ●가 두 개, ○가 두 개입니다. AND·OR처럼 직선 하나로 가를 수 있을까요?</strong></p>
    <div class="inline-actions">${choiceRow('p7-pred', [['yes', '된다'], ['no', '안 된다'], ['unsure', '모르겠다']], pv, { disabled: locked, label: 'XOR 예상' })}${locked ? '<span class="muted small">예상을 확정했습니다. 이제 그어 보세요.</span>' : '<button id="p7-lock" class="primary-button" type="button">확정</button>'}</div></div>`;
  if (!locked) return `${head('XOR', '이제 XOR입니다. 점은 미리 칠해 두었습니다. 먼저 예상을 고르고 「확정」을 누르면 직선을 그을 수 있습니다.', '4-2')}
  <div class="screen-layout two-col">
    <div class="card stack"><div class="plane-box locked-plane">${planeSvg({ labels: LAB.XOR, title: 'XOR의 네 점' })}<div class="lock-note">예상을 확정하면 그을 수 있어요</div></div></div>
    <div class="card stack">${predBox}${rulesHtml(true)}</div>
  </div>`;
  return `${head('XOR', '이제 XOR입니다. 점은 미리 칠해 두었습니다. ●와 ○를 가르는 직선을 그어 보세요.', '4-2')}
  <div class="screen-layout two-col">
    <div class="card stack"><div id="pl-xor" class="plane-box"></div>${planeControlsHtml('pl-xor')}</div>
    <div class="card stack">
      ${predBox}
      <div class="counter" aria-live="polite">그어 본 직선 <strong>${p.history.length}</strong>개 · 나눈 방법 <strong>${p.parts.length}</strong>가지</div>
      ${res ? (res.ok ? resultBox('ok', '직선 하나로 나누었습니다.') : resultBox(res.reason === 'onPoint' ? 'partial' : 'fail', wrongText(res, LAB.XOR))) : '<div class="result muted">직선을 그어 보세요. 지난 직선은 회색으로 남습니다.</div>'}
      <p class="muted small" style="margin:0">여러 번 그어 보세요. 어떤 직선을 그었는지는 다음 화면에서 모아 봅니다.</p>
      ${rulesHtml(true)}
    </div>
  </div>`;
  void ghosts;
};
BIND.P7 = () => {
  const p = S('P7');
  $$('input[name="p7-pred"]').forEach((r) => r.addEventListener('change', () => { draftPredict('P7', r.value); render(); }));
  $('#p7-lock')?.addEventListener('click', () => {
    const v = predictValue('P7');
    if (!v) { say('예상을 하나 골라 주세요. 「모르겠다」도 괜찮아요.', 'tilt'); renderMascot(); return; }
    confirmPredict('P7', v); render();
  });
  if (!predictLocked('P7')) return;
  mountPlane({
    key: 'pl-xor',
    draw: () => planeSvg({ labels: LAB.XOR, line: p.line, ghosts: p.history.slice(0, -1).slice(-12), interactive: true, pending: pend['pl-xor'], title: 'XOR 평면' }),
    get: () => p.line, set: (l) => { p.line = l; },
    commit: (kind) => {
      if (!p.line) { persist(); render(); return; }
      const L = lineFromPts(p.line);
      const r = PG.judgeLine(L, LAB.XOR);
      const last = p.history[p.history.length - 1];
      if (!last || JSON.stringify(last) !== JSON.stringify(p.line)) p.history.push(clone(p.line));
      if (p.history.length > 60) p.history = p.history.slice(-60);
      if (r.reason !== 'onPoint' && !p.parts.includes(r.key)) p.parts.push(r.key);
      logEvent('attempt', 'P7', `${r.ok ? '나눔 성공' : wrongText(r, LAB.XOR)} · 나눈 방법 ${r.key !== undefined ? partText(r.key) : '점 위 통과'}`, r.ok ? 'ok' : r.reason === 'onPoint' ? 'partial' : 'fail', { line: clone(p.line), key: r.key, kind });
      if (r.ok) success('나누었습니다.'); else fail('P7', wrongText(r, LAB.XOR), p.parts.length);
      persist(); render();
    }
  });
};

/* ---------- P8 나눌 수 있었나 */
/* 나눈 방법 하나를 작은 평면으로: XOR의 진짜 ●/○, 그 방법으로 그은 직선 하나, 직선 양쪽 바탕색(파랑·노랑) */
function xorPartFig(k, hist) {
  const line = hist.slice().reverse().find((l) => { const L = lineFromPts(l); const r = L && PG.judgeLine(L, LAB.XOR); return r && r.reason !== 'onPoint' && r.key === k; });
  if (!line) return '';
  const sd = PG.sides(lineFromPts(line));
  const grp = (sg) => [0, 1, 2, 3].filter((i) => sd[i] === sg);
  const txt = (arr) => (arr.length ? arr.map((i) => `${LAB.XOR[i] ? '●' : '○'}${COORD[i]}`).join(' ') : '점 없음');
  const mixed = [1, -1].some((sg) => { const g = grp(sg); return g.some((i) => LAB.XOR[i]) && g.some((i) => !LAB.XOR[i]); });
  return `<figure class="mini-fig part-fig"><div class="plane-box">${planeSvg({ labels: LAB.XOR, line, coords: false, title: '나눈 방법' })}</div>
    <figcaption><span class="side side-a">파랑</span> ${txt(grp(1))}<br><span class="side side-b">노랑</span> ${txt(grp(-1))}<br>${mixed ? '<b class="bad">● ○ 섞임</b>' : '<b class="ok-text">나뉨</b>'}</figcaption></figure>`;
}
RENDER.P8 = () => {
  const p7 = S('P7'), p = S('P8');
  const pv = predictValue('P7');
  const minis = p7.parts.length ? p7.parts.map((k) => xorPartFig(k, p7.history)).join('') : '<p class="small" style="grid-column:1/-1;margin:0">아직 그어 본 직선이 없어요. 앞 화면에서 그어 보세요.</p>';
  return `${head('직선 하나로 나눌 수 있었나', '앞 화면에서 그은 직선을 네 점을 가른 방법에 따라 모았습니다. 칸 하나가 한 가지 방법이고, 그 방법으로 그은 직선 하나를 보여 줍니다.', '4-2')}
  <div class="screen-layout two-col p8-layout">
    <div class="card stack"><p class="todo-line">그어 본 직선 <strong>${p7.history.length}</strong>개 · 네 점을 가른 방법 <strong>${p7.parts.length}</strong>가지. 칸마다 직선의 파란 쪽과 노란 쪽에 어떤 점이 있는지 보세요.</p>
      <div class="mini-grid part-figs">${minis}</div></div>
    <div class="card stack">
      ${pv ? `<p class="muted small" style="margin:0">처음 예상(XOR): <strong>${{ yes: '된다', no: '안 된다', unsure: '모르겠다' }[pv]}</strong></p>` : ''}
      <div class="field"><span class="field-label">직선 하나로 ●와 ○를 나눌 수 있었는가?</span>${choiceRow('p8', [['yes', '예'], ['no', '아니오'], ['unsure', '아직 모르겠다']], p.choice)}</div>
      ${writeBox('P8_reason', '그렇게 생각한 까닭을 한 줄로 쓰시오.', { rows: 2 })}
      ${writeBox('P8_rule', '[선택] 규칙을 하나 바꿀 수 있다면 무엇을 바꾸겠는가?', { rows: 2 })}
      ${XOR_GATE.mode === 'word' ? `<div class="stack"><strong>다음 화면 열기</strong>${p.gateOpen ? resultBox('ok', '다음 화면이 열렸습니다.') : `<p class="muted small" style="margin:0">위 칸을 쓴 뒤, 선생님이 화상으로 알려 주는 낱말을 넣으세요.</p><div class="inline-actions"><input id="p8-word" type="text" value="${esc(p.gateTry.trim())}" style="max-width:180px" aria-label="열기 낱말"><button id="p8-open" class="primary-button" type="button">열기</button></div>${p.gateTry ? resultBox('fail', '낱말이 맞지 않아요. 선생님께 다시 들어 보세요.') : ''}`}</div>` : ''}
    </div>
  </div>`;
};
const squash = (t) => String(t || '').split(' ').join('').trim();
BIND.P8 = () => {
  const p = S('P8');
  $$('input[name="p8"]').forEach((r) => r.addEventListener('change', () => { p.choice = r.value; logEvent('write', 'P8', `판단: ${r.value}`); render(); }));
  $('#p8-open')?.addEventListener('click', () => {
    const w = $('#p8-word').value;
    if (squash(w) && squash(w) === squash(XOR_GATE.word)) { p.gateOpen = true; p.gateTry = ''; logEvent('nav', 'P8', '열기 낱말로 다음 화면 열기', 'ok'); success('다음 화면이 열렸습니다.'); }
    else p.gateTry = w || ' ';
    persist(); render();
  });
};

/* ---------- P9 두 선분 */
const P9_STEPS = [
  '직선 하나로 ●와 ○를 가른다면, ● 두 점을 이은 선분은 통째로 ● 쪽에 있어야 합니다.',
  '마찬가지로 ○ 두 점을 이은 선분은 통째로 ○ 쪽에 있어야 합니다.',
  '그런데 두 선분은 (0.5, 0.5)에서 만납니다. 그 점은 ● 쪽이면서 동시에 ○ 쪽이어야 합니다. 그럴 수는 없으므로 XOR은 직선 하나로 나눌 수 없습니다.'
];
RENDER.P9 = () => {
  const p = S('P9');
  const segs = { black: p.black.length === 2, white: p.white.length === 2 };
  const step = p.explain;
  const both = segs.black && segs.white;
  return `${head('두 선분이 만나는 점', '● 두 점을 차례로 눌러 선분을 긋고, ○ 두 점도 눌러 선분을 그으세요. 두 선분이 만나는 점의 좌표를 쓰시오.', '4-2 (2)')}
  <div class="screen-layout two-col">
    <div class="card"><div id="pl-seg" class="plane-box"></div></div>
    <div class="card stack">
      <div class="inline-actions"><span class="small">${segs.black ? '● 선분 ✓' : '● 두 점을 누르세요'} · ${segs.white ? '○ 선분 ✓' : '○ 두 점을 누르세요'}</span><button id="p9-clear" class="secondary-button" type="button">선분 지우기</button></div>
      <div class="field"><span class="field-label">만나는 점의 좌표</span><div class="coord-input">( <input id="p9-x" type="text" inputmode="decimal" value="${esc(p.x)}" aria-label="가로 좌표"> , <input id="p9-y" type="text" inputmode="decimal" value="${esc(p.y)}" aria-label="세로 좌표"> )</div></div>
      <div class="button-row"><button id="p9-check" class="primary-button" type="button" ${both ? '' : 'disabled'}>확인</button></div>
      ${p.ok ? resultBox('ok', '두 선분은 (0.5, 0.5)에서 만납니다.') : p.tried ? resultBox('fail', '그림에서 두 선분이 겹치는 곳을 다시 보세요.') : ''}
      ${p.ok ? `<div class="step-view" data-reveal="step${step}">${step ? `<p class="explain-step"><span class="step-no">${step}</span>${P9_STEPS[step - 1]}</p>` : ''}
        <div class="step-nav">${step ? `<button id="p9-prev" class="secondary-button" type="button" ${step <= 1 ? 'disabled' : ''}>이전 단계</button><span class="step-count">${step} / 3</span>` : ''}${step < 3 ? `<button id="p9-step" class="primary-button" type="button">${step ? '다음 단계' : '왜 그런지 보기 (3단계까지 눌러 보세요)'}</button>` : ''}</div></div>` : ''}
    </div>
  </div>`;
};
BIND.P9 = () => {
  const p = S('P9');
  const st = p.explain;
  mountPlane({
    key: 'pl-seg', lineOn: false,
    draw: () => planeSvg({ labels: LAB.XOR, segs: { black: p.black.length === 2, white: p.white.length === 2 }, selected: p.black.concat(p.white), star: p.ok && st >= 3, title: '두 선분' }),
    get: () => null, set: () => {}, commit: () => {},
    onPoint: (i) => {
      const list = LAB.XOR[i] === 1 ? p.black : p.white;
      const at = list.indexOf(i);
      if (at >= 0) list.splice(at, 1); else if (list.length < 2) list.push(i);
      persist(); render();
    }
  });
  if (p.ok && st) { const svg = $('#pl-seg svg'); if (svg) svg.classList.add(st === 1 ? 'focus-black' : st === 2 ? 'focus-white' : 'focus-both'); }
  $('#p9-clear').addEventListener('click', () => { p.black = []; p.white = []; persist(); render(); });
  $('#p9-x').addEventListener('input', (e) => { p.x = e.target.value; persist(); });
  $('#p9-y').addEventListener('input', (e) => { p.y = e.target.value; persist(); });
  $('#p9-check')?.addEventListener('click', () => {
    const x = PG.parseNumber(p.x), y = PG.parseNumber(p.y);
    p.tried = true;
    p.ok = x !== null && y !== null && Math.abs(x - 0.5) < 1e-3 && Math.abs(y - 0.5) < 1e-3;
    logEvent('attempt', 'P9', `좌표 (${p.x}, ${p.y})`, p.ok ? 'ok' : 'fail');
    if (p.ok) success('맞았습니다. 이제 왜 그런지 차례로 보세요.'); else fail('P9');
    render();
  });
  $('#p9-step')?.addEventListener('click', () => { p.explain = Math.min(3, p.explain + 1); persist(); render(); });
  $('#p9-prev')?.addEventListener('click', () => { p.explain = Math.max(1, p.explain - 1); persist(); render(); });
};

/* ================================================================ 섹션 4 */
const FOLD_T = [0, 130 * Math.PI / 180, Math.PI];
const FOLD_CAP = ['① 점선을 따라 접는다', '② 접는 중', '③ 다 접었을 때'];
const VIEW_TILT = { yaw: 45 * Math.PI / 180, pitch: 60 * Math.PI / 180 };   // 접힌 선이 가로로 보이게 돌린 뒤 앞으로 기울인다
const deg = (r) => Math.round(r * 180 / Math.PI);
const isTop = (st) => Math.abs(st.yaw) < 1e-3 && Math.abs(st.pitch) < 1e-3;
/* 돌려 보기 조절: 단추 + 슬라이더 두 개 */
function rotateControls(id, st) {
  const top = isTop(st);
  return `<div class="rotate-box" data-rotate="${id}">
    <div class="button-row"><button type="button" class="secondary-button" data-view="${top ? 'tilt' : 'top'}">${top ? '돌려 보기' : '위에서 보기'}</button><span class="muted small">그림을 끌어서 돌려도 됩니다.</span></div>
    <div class="rotate-sliders"><label>좌우로 돌리기 <input type="range" min="-90" max="90" step="1" value="${deg(st.yaw)}" data-rot="yaw" aria-label="좌우로 돌리기"></label>
    <label>앞으로 기울이기 <input type="range" min="0" max="80" step="1" value="${deg(st.pitch)}" data-rot="pitch" aria-label="앞으로 기울이기"></label></div>
  </div>`;
}
/* 보는 방향을 0.4초 동안 바꾼다 */
function animateView(st, to, el, draw, done) {
  const from = { yaw: st.yaw, pitch: st.pitch }, t0 = performance.now(), dur = 400;
  const tick = (now) => {
    if (el && !document.body.contains(el)) return;
    const k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    st.yaw = from.yaw + (to.yaw - from.yaw) * e; st.pitch = from.pitch + (to.pitch - from.pitch) * e;
    if (el) paintSvg(el, draw());
    if (k < 1) requestAnimationFrame(tick); else { st.yaw = to.yaw; st.pitch = to.pitch; persist(); done(); }
  };
  requestAnimationFrame(tick);
}
/* 그림을 끌어 돌리기. onTap이 있으면 끌지 않고 누르기만 했을 때 부른다 */
function bindRotate(el, st, draw, onTap) {
  const svg = el && el.querySelector('svg');
  if (!svg) return;
  let press = null;
  svg.addEventListener('pointerdown', (ev) => { if (ev.button > 0) return; press = { x: ev.clientX, y: ev.clientY, yaw: st.yaw, pitch: st.pitch, id: ev.pointerId, moved: false }; try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* 무시 */ } });
  svg.addEventListener('pointermove', (ev) => {
    if (!press || press.id !== ev.pointerId) return;
    const dx = ev.clientX - press.x, dy = ev.clientY - press.y;
    if (Math.hypot(dx, dy) > 6) press.moved = true;
    if (!press.moved) return;
    st.yaw = Math.max(-90, Math.min(90, deg(press.yaw) + dx * 0.4)) * Math.PI / 180;
    st.pitch = Math.max(0, Math.min(80, deg(press.pitch) + dy * 0.4)) * Math.PI / 180;
    paintSvg(el, draw());
  });
  const end = (ev) => { if (!press || press.id !== ev.pointerId) return; const pr = press; press = null; if (pr.moved) { persist(); render(); } else if (onTap) onTap(); };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', (ev) => { press = null; render(); });
}
function bindRotateControls(id, st, el, draw) {
  const box = document.querySelector(`[data-rotate="${id}"]`);
  if (!box) return;
  box.querySelector('[data-view]').addEventListener('click', (e) => {
    const to = e.currentTarget.dataset.view === 'top' ? { yaw: 0, pitch: 0 } : VIEW_TILT;
    logEvent('nav', state.screenId, to.pitch ? '돌려 보기' : '위에서 보기');
    animateView(st, to, el && el.querySelector('svg') ? el : null, draw, render);
  });
  box.querySelectorAll('[data-rot]').forEach((r) => r.addEventListener('input', () => { st[r.dataset.rot] = Number(r.value) * Math.PI / 180; if (el) paintSvg(el, draw()); }));
  box.querySelectorAll('[data-rot]').forEach((r) => r.addEventListener('change', () => { persist(); render(); }));
}

RENDER.P10 = () => {
  const p = S('P10'), step = p.step;
  const folded = step >= 2, top = isTop(p);
  const fig = folded && !top ? fold3DSvg({ yaw: p.yaw, pitch: p.pitch, title: '다 접은 종이를 돌려 본 모습' }) : foldSvg(FOLD_T[step], { title: FOLD_CAP[step] });
  return `${head('종이를 접으면?', '평면 위에서는 직선 하나로 되지 않았습니다. 그런데 평면을 접는다면 어떨까요? ● 두 점을 지나는 점선(직선 A+B=1)을 따라 원점 쪽 반을 접어 봅시다.', '4-3')}
  <div class="screen-layout two-col">
    <div class="card">${step ? '' : '<p class="todo-line">아래 「접기」 단추를 눌러 보세요.</p>'}<div id="fold-anim" class="plane-box">${fig}</div><p class="caption">${folded && !top ? '돌려 본 모습 — 두 겹 사이를 조금 띄워 그렸습니다' : FOLD_CAP[step]}</p>
      <div class="button-row"><button id="p10-next" class="primary-button" type="button" ${step >= 2 ? 'disabled' : ''}>${step === 0 ? '접기' : '끝까지 접기'}</button><button id="p10-reset" class="secondary-button" type="button" ${step ? '' : 'disabled'}>처음부터</button></div></div>
    <div class="card stack">
      ${folded ? `<p style="margin:0">다 접으면 ○ 두 점 (0, 0)과 (1, 1)이 한 점에 겹치고, ● 두 점은 접힌 선 위에 놓입니다.</p>
        ${rotateControls('p10', p)}
        ${top ? '<p class="muted small" style="margin:0">「돌려 보기」를 눌러 옆에서 보세요.</p>' : '<p style="margin:0" data-reveal="tilt">돌려 보면 ○ 두 점이 <strong>두 겹에 위아래로</strong> 놓여 있습니다. ● 두 점은 두 겹이 만나는 접힌 선 위에 있습니다.</p>'}
        <p style="margin:0"><strong>이제 ●와 ○를 직선 하나로 가를 수 있을까요?</strong> 다음 화면에서 해 봅니다.</p>` : '<p class="muted" style="margin:0">「접기」를 눌러 보세요.</p>'}
      <details class="mini-details"><summary>[선택] 집에 있는 종이로 직접 접어 보기</summary><p class="small">아무 종이에 네 점 (0, 0), (0, 1), (1, 0), (1, 1)을 찍고 ● 두 점을 지나는 점선을 그으세요. 점선을 따라 원점 쪽을 뒤로 접고 불빛에 비춰 보면 ○ 두 점이 겹쳐 보입니다.</p></details>
    </div>
  </div>`;
};
function animateFold(from, to) {
  const el = $('#fold-anim');
  if (!el) return;
  const t0 = performance.now(), dur = 1200, a = FOLD_T[from], b = FOLD_T[to];
  const tick = (now) => {
    if (!document.body.contains(el)) return;
    const k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    paintSvg(el, foldSvg(a + (b - a) * e, {}));
    if (k < 1) requestAnimationFrame(tick); else render();
  };
  requestAnimationFrame(tick);
}
BIND.P10 = () => {
  const p = S('P10');
  $('#p10-next').addEventListener('click', () => { const from = p.step; p.step = Math.min(2, p.step + 1); p.yaw = 0; p.pitch = 0; persist(); animateFold(from, p.step); $('#p10-next').disabled = true; });
  $('#p10-reset').addEventListener('click', () => { p.step = 0; p.yaw = 0; p.pitch = 0; persist(); render(); });
  if (p.step >= 2) {
    const el = $('#fold-anim'), draw = () => fold3DSvg({ yaw: p.yaw, pitch: p.pitch });
    if (!isTop(p)) bindRotate(el, p, draw);
    bindRotateControls('p10', p, el, draw);
  }
};

/* ---------- P11 접은 채로 직선 하나. 직선은 위에서 본 모습에서만 긋는다(03 §3-5) */
const FOLD_MSG = { onPoint: '직선이 점 위를 지나요. 점 위를 지나면 나눈 것으로 보지 않아요.', splitBlack: '● 두 점이 직선의 서로 다른 쪽에 있어요.', sameSide: '겹친 ○가 ● 두 점과 같은 쪽에 있어요.' };
RENDER.P11 = () => {
  const p = S('P11');
  const L = lineFromPts(p.line);
  const j = L ? PG.foldJudge(L) : null;
  const k = L ? PG.parallelK(L) : null;
  const top = isTop(p);
  let view;
  if (p.open && p.ok) view = `<div class="plane-box">${unfoldSvg(p.line, { title: '다시 펼쳤을 때' })}</div><p class="caption">④ 다시 펼쳤을 때 — 굵은 점선이 잘린 자리</p>`;
  else if (!top) view = `<div id="pl-fold3" class="plane-box tap-back">${fold3DSvg({ yaw: p.yaw, pitch: p.pitch, line: p.line, title: '돌려 본 모습' })}</div><p class="caption">돌려 본 모습${p.line ? ' — 빨간 면이 두 겹을 함께 자르는 칼날입니다' : ''}. 그림을 누르면 위에서 본 모습으로 돌아가 그을 수 있어요.</p>`;
  else view = `<div id="pl-fold" class="plane-box"></div>${p.cut ? '' : planeControlsHtml('pl-fold')}<p class="caption">③ 다 접었을 때(위에서 본 모습)${p.cut ? ' — 두 겹을 함께 잘랐습니다' : ''}</p>`;
  return `${head('접은 채로 직선 하나', '다 접은 그림에서 ●와 ○를 가르는 직선 하나를 그으세요. 그 직선을 따라 두 겹을 함께 가위로 자른 뒤 다시 펼쳐 봅시다. 직선은 위에서 본 모습에서 긋고, 「돌려 보기」로 칼날이 두 겹을 함께 지나는지 볼 수 있습니다.', '4-3 (1)·(2)')}
  <div class="screen-layout two-col">
    <div class="card">${view}</div>
    <div class="card stack">
      ${p.open ? '' : rotateControls('p11', p)}
      ${j ? (j.ok ? resultBox('ok', '직선 하나로 갈랐습니다.') : resultBox(j.reason === 'onPoint' ? 'partial' : 'fail', FOLD_MSG[j.reason])) : '<div class="result muted">직선을 그으세요(두 번 누르거나 끌기).</div>'}
      ${j && j.ok ? `<div class="button-row">${!p.cut ? '<button id="p11-cut" class="primary-button" type="button">두 겹 함께 자르기</button>' : ''}${p.cut && !p.open ? '<button id="p11-open" class="primary-button" type="button">펼치기</button>' : ''}${p.cut ? '<button id="p11-again" class="secondary-button" type="button">다시 접어 직선 고치기</button>' : ''}</div>` : ''}
      ${p.open ? `<div class="field" data-reveal="open"><span class="field-label">(3) 펼친 평면에서 ● 두 점은 잘린 자리 몇 개 사이에 있는가?</span><div class="inline-actions"><input id="p11-count" type="text" inputmode="numeric" value="${esc(p.count)}" style="max-width:90px" aria-label="잘린 자리 개수"><span>개</span><button id="p11-check" class="secondary-button" type="button">확인</button></div></div>
        ${p.countOk === true ? resultBox('ok', '잘린 자리는 모두 직선입니다. 접은 뒤 직선 하나로 가르는 것은, 펼친 평면에서 보면 직선 두 개로 가르는 것과 같습니다.') : p.countOk === false ? resultBox('fail', '펼친 그림에서 굵은 점선이 몇 개인지 세어 보세요.') : ''}
        ${p.countOk ? (k === null ? '<p class="muted small" style="margin:0">내 직선은 접힌 선과 나란하지 않아서 두 직선이 「V」 모양으로 만났어요. 그래도 ● 두 점이 두 직선 사이에 있다는 점은 같습니다. 다른 친구는 나란한 두 직선이 나왔을 수도 있어요.</p>' : `<p class="muted small" style="margin:0">내 직선은 A+B=${fmtK(k)}였고, 펼치니 A+B=${fmtK(2 - k)}가 하나 더 생겼습니다.</p>`) : ''}` : ''}
    </div>
  </div>`;
};
BIND.P11 = () => {
  const p = S('P11');
  const top = isTop(p);
  if (!(p.open && p.ok)) {
    if (!top) {
      const el = $('#pl-fold3'), draw = () => fold3DSvg({ yaw: p.yaw, pitch: p.pitch, line: p.line });
      bindRotate(el, p, draw, () => animateView(p, { yaw: 0, pitch: 0 }, el, draw, render));
      bindRotateControls('p11', p, el, draw);
    } else {
      bindRotateControls('p11', p, null, () => '');
      if (p.cut) { const el = $('#pl-fold'); el.innerHTML = foldSvg(Math.PI, { line: p.line, cut: true, title: '두 겹을 함께 자른 모습' }); }
      else mountPlane({
        key: 'pl-fold',
        draw: () => foldSvg(Math.PI, { line: p.line, interactive: true, pending: pend['pl-fold'], title: '다 접은 평면' }),
        get: () => p.line, set: (l) => { p.line = l; p.ok = false; },
        commit: () => {
          const L = lineFromPts(p.line);
          if (!L) { p.ok = false; persist(); render(); return; }
          const j = PG.foldJudge(L);
          p.ok = j.ok;
          logEvent('attempt', 'P11', j.ok ? '접은 그림에서 나눔 성공' : FOLD_MSG[j.reason], j.ok ? 'ok' : 'fail', { line: clone(p.line) });
          if (j.ok) success('이제 「돌려 보기」로 칼날이 두 겹을 함께 지나는지 보거나, 「두 겹 함께 자르기」를 눌러 보세요.'); else fail('P11', FOLD_MSG[j.reason]);
          persist(); render();
        }
      });
    }
  }
  $('#p11-cut')?.addEventListener('click', () => { p.cut = true; persist(); render(); });
  $('#p11-open')?.addEventListener('click', () => { p.open = true; p.yaw = 0; p.pitch = 0; logEvent('nav', 'P11', '펼치기'); persist(); render(); });
  $('#p11-again')?.addEventListener('click', () => { p.cut = false; p.open = false; p.countOk = null; persist(); render(); });
  $('#p11-count')?.addEventListener('input', (e) => { p.count = e.target.value; persist(); });
  $('#p11-check')?.addEventListener('click', () => { p.countOk = PG.parseNumber(p.count) === 2; logEvent('attempt', 'P11', `잘린 자리 ${p.count}개`, p.countOk ? 'ok' : 'fail'); if (p.countOk) success('직선 두 개 사이에 ● 두 점이 있습니다.'); render(); });
};

/* ---------- P12 접기와 회로: 볼 곳을 짚고 빈칸 한 문장을 잠근다(03 §3-6) */
const p12Sentence = () => { const w = state.writes; return `접기와 회로는 둘 다 먼저 「${String(w.P12_blank1 || '').trim() || '…'}」 하고, 그 결과로 마지막에 「${String(w.P12_blank2 || '').trim() || '…'}」 한다.`; };
RENDER.P12 = () => {
  const p = S('P12'), p11 = S('P11'), locked = predictLocked('P12');
  const line = p11.ok && p11.line ? p11.line : { p: [0, 1.5], q: [1.5, 0] };
  const q1Ok = p.q1 === 'line', q2Ok = p.q2 === true;
  const q2Marks = q2Ok ? ['G4'] : [];
  return `${head('접기와 회로는 어떻게 닮았을까', 'XOR은 직선 하나로 나눌 수 없었습니다. 그런데 접으면 갈렸고, 되짚기의 회로로도 XOR을 만들었습니다. 두 방법을 차례로 살펴봅시다.', '오늘의 정리 2')}
  <div class="screen-layout two-col">
    <div class="card stack">
      <div class="fold-steps"><figure><div class="plane-box tiny">${foldSvg(Math.PI, { title: '① 평면을 접는다' })}</div><figcaption>① 평면을 접는다</figcaption></figure><span class="step-arrow" aria-hidden="true">→</span><figure><div class="plane-box tiny">${foldSvg(Math.PI, { line, title: '② 접은 평면에 직선 하나' })}</div><figcaption>② 접은 평면에 직선 하나${p11.ok ? '(14번에서 내가 그은 직선)' : '(예시 직선)'}</figcaption></figure></div>
      <div id="p12-circuit" class="circuit-wrap">${circuitSvg(PG.XOR_CIRCUIT, null, { title: 'XOR 회로', pick: q1Ok && !q2Ok, marks: q2Marks })}</div>
      <p class="caption" style="text-align:left">XOR 회로 (A OR B) AND NOT (A AND B)</p>
    </div>
    <div class="card stack">
      <div class="field"><span class="field-label">1. 접기에서 ●와 ○를 실제로 가르는 단계는?</span>${choiceRow('p12q1', [['fold', '① 접기'], ['line', '② 직선 긋기']], p.q1, { disabled: q1Ok })}</div>
      ${p.q1 ? (q1Ok ? resultBox('ok', '맞아요. 접기는 가르기 전에 평면을 바꿔 두는 단계입니다.') : resultBox('fail', '접기만 하고 나서 ●와 ○가 갈렸는지 그림을 보세요.')) : ''}
      ${q1Ok ? `<div class="field" data-reveal="q2"><span class="field-label">2. 회로에서 출력을 마지막으로 정하는 게이트를 누르세요.</span></div>
        ${q2Ok ? resultBox('ok', '이 AND는 OR 게이트와 NOT 게이트가 먼저 낸 값을 받아 판단합니다.') : p.q2 === false ? resultBox('fail', '출력 단자에 바로 이어진 게이트를 찾아보세요.') : '<p class="muted small" style="margin:0">왼쪽 회로의 게이트를 누르세요.</p>'}` : ''}
      ${q2Ok ? `<div class="stack" data-reveal="q3"><span class="field-label">3. 빈칸을 내 말로 채우고 「확정」을 누르세요. 쉬는 시간 뒤에 이 문장을 다시 봅니다.</span>
        <p class="blank-sentence">접기와 회로는 둘 다 먼저 <input id="w-P12_blank1" type="text" class="blank-input" data-write="P12_blank1" value="${esc(state.writes.P12_blank1 || '')}" ${locked ? 'disabled' : ''} aria-label="둘 다 먼저 하는 것"> 하고, 그 결과로 마지막에 <input id="w-P12_blank2" type="text" class="blank-input" data-write="P12_blank2" value="${esc(state.writes.P12_blank2 || '')}" ${locked ? 'disabled' : ''} aria-label="마지막에 하는 것"> 한다.</p>
        ${locked ? resultBox('', '문장을 확정했습니다. 쉬는 시간 뒤에 다시 봅니다.') : '<div class="button-row"><button id="p12-lock" class="primary-button" type="button">확정</button></div>'}</div>` : ''}
      <div class="notice">기계는 평면을 어떻게 「접을」 수 있을까요? 쉬는 시간 뒤에 이어집니다.</div>
    </div>
  </div>`;
};
BIND.P12 = () => {
  const p = S('P12');
  $$('input[name="p12q1"]').forEach((r) => r.addEventListener('change', () => { p.q1 = r.value; logEvent('attempt', 'P12', `가르는 단계: ${r.value === 'line' ? '직선 긋기' : '접기'}`, r.value === 'line' ? 'ok' : 'fail'); if (r.value !== 'line') fail('P12'); persist(); render(); }));
  $$('#p12-circuit [data-gate]').forEach((g) => {
    const pick = () => { const ok = g.dataset.gate === 'G4'; p.q2 = ok; logEvent('attempt', 'P12', `마지막 게이트: ${g.dataset.gate}`, ok ? 'ok' : 'fail'); if (!ok) say('출력 단자에 바로 이어진 게이트를 찾아보세요.', 'tilt'); persist(); render(); };
    g.addEventListener('click', pick);
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  });
  $('#p12-lock')?.addEventListener('click', () => {
    const w = state.writes;
    if (!String(w.P12_blank1 || '').trim() || !String(w.P12_blank2 || '').trim()) { if (!window.confirm('빈칸이 남아 있습니다. 이대로 확정할까요?')) return; }
    confirmPredict('P12', p12Sentence()); render();
  });
};
