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

/* ================================================================ 섹션 0 */
RENDER.P0 = () => {
  const saved = Object.keys(state.views).length > 1;
  return `${head('직선 하나로 판단할 수 있을까?', '지난 시간에 만든 판단을 좌표평면의 점으로 옮기고, 직선으로 갈라 봅니다. 마지막에는 오늘 한 것을 선생님께 제출합니다.')}
  <div class="warning">종이 학습지는 덮어 두세요. 오늘은 이 화면으로 합니다.</div>
  <div class="screen-layout two-col">
    <div class="card stack">
      <h3>학생 정보</h3>
      <div class="field"><label for="st-school">학교</label><input id="st-school" type="text" autocomplete="off" value="${esc(state.student.school)}" placeholder="예: ○○중학교"></div>
      <div class="two-column">
        <div class="field"><label for="st-sid">학번</label><input id="st-sid" type="text" autocomplete="off" value="${esc(state.student.sid)}" placeholder="예: 3101"></div>
        <div class="field"><label for="st-name">이름</label><input id="st-name" type="text" autocomplete="off" value="${esc(state.student.name)}" placeholder="이름"></div>
      </div>
      <label class="check-line"><input id="st-optional" type="checkbox" ${state.includeOptional ? 'checked' : ''}><span>더 해보기(선택 활동 3개)도 포함하기</span></label>
      <div id="p0-note" class="result" role="status">${saved ? '저장된 기록이 있습니다. 「이어서 하기」를 누르세요.' : '입력한 내용은 이 브라우저에 자동 저장됩니다.'}</div>
      <p class="muted small" style="margin:0">시크릿 창이나 사이트 데이터 삭제에서는 기록이 사라질 수 있습니다. 다른 기기로 옮길 때는 활동 목록의 「진행 코드」를 쓰세요.</p>
      <div class="button-row"><button id="p0-resume" class="primary-button" type="button">${saved ? '이어서 하기' : '시작하기'}</button>${saved ? '<button id="p0-new" class="secondary-button" type="button">새로 시작</button>' : ''}</div>
    </div>
    <div class="card">
      <h3>오늘의 흐름</h3>
      <ul class="check-list">
        <li>지난 시간의 판단(AND·OR·NOT·XOR)을 되짚고, 내 장치를 회로로 만듭니다.</li>
        <li>판단을 좌표평면의 점으로 옮기고, 직선 하나로 갈라 봅니다.</li>
        <li>평면을 접어 봅니다.</li>
        <li>「퍼셉트론」이라는 판단 장치를 만나 봅니다.</li>
        <li>학기 전체를 돌아보고 제출합니다.</li>
      </ul>
    </div>
  </div>`;
};
BIND.P0 = () => {
  [['st-school', 'school'], ['st-sid', 'sid'], ['st-name', 'name']].forEach(([id, k]) => $('#' + id).addEventListener('input', (e) => { state.student[k] = e.target.value; persist(); }));
  $('#st-optional').addEventListener('change', (e) => { state.includeOptional = e.target.checked; persist(); updateNavigation(); renderMenu(); });
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
      const wrong = full && v !== right[i];
      return `<tr>${r.map((x) => `<td>${x}</td>`).join('')}<td><button type="button" class="cell-button${v === null ? ' empty' : ''}${wrong ? ' wrong' : ''}" data-p1="${op}:${i}" aria-label="${op} ${r.join(', ')}일 때 출력">${v === null ? '?' : v}</button></td></tr>`;
    }).join('');
    const ok = full && t[op].every((v, i) => v === right[i]);
    return `<div class="card mini-card"><h3>${op}</h3><p class="muted small">${sent}</p>
      <table class="truth"><thead><tr>${n === 1 ? '<th>A</th>' : '<th>A</th><th>B</th>'}<th>${op === 'NOT' ? 'NOT A' : `A ${op} B`}</th></tr></thead><tbody>${rows}</tbody></table>
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

/* ---------- P2a 내 장치 설계 ① */
const TOKEN_LIST = ['A', 'B', 'C', 'AND', 'OR', 'NOT', '(', ')'];
const EXPR_ERR = {
  empty: '식을 만들어 주세요.', mix: 'AND와 OR이 섞여 있어요. 먼저 계산할 부분을 괄호로 묶어 주세요.',
  paren: '괄호의 짝을 확인해 주세요.', dangling: '식이 연산으로 끝났거나 빈 곳이 있어요.', adjacent: '문자나 괄호 사이에 AND나 OR이 필요해요.',
  noC: '입력 C를 쓰려면 입력 개수를 3개로 바꾸세요.'
};
function p2Ast() {
  const p = S('P2');
  if (!p.exprOk) return null;
  const r = PG.parseExpr(p.exprTokens);
  return r.ast || null;
}
function truthTableHtml(n, outs, o = {}) {
  const rows = PG.rows(n);
  const names = ['A', 'B', 'C'].slice(0, n);
  const cols = o.cols || [['출력', outs]];
  return `<table class="truth${o.cls ? ' ' + o.cls : ''}"><thead><tr>${names.map((x) => `<th>${x}</th>`).join('')}${cols.map(([h]) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr class="${(o.diff || []).includes(i) ? 'diff' : ''}">${r.map((v) => `<td>${v}</td>`).join('')}${cols.map(([, arr]) => `<td><strong>${arr ? arr[i] : ''}</strong></td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
RENDER.P2a = () => {
  const p = S('P2'), n = p.inputs, w = state.writes;
  const ast = p2Ast();
  const exprView = p.tokens.length ? p.tokens.map((t) => `<span class="tok${['AND', 'OR', 'NOT'].includes(t) ? ' op' : ''}">${t}</span>`).join(' ') : '<span class="muted">아래 버튼으로 식을 만드세요.</span>';
  return `${head('내 장치 설계 ① 문장과 식', '생활 속에서 조건에 따라 작동하는 장치를 하나 정하고, 작동 조건을 문장과 식으로 나타내 봅시다.', '오늘의 정리 1')}
  <div class="card stack">
    <div class="field"><label for="w-P2_device">장치</label><input id="w-P2_device" type="text" data-write="P2_device" value="${esc(w.P2_device || '')}" placeholder="예: 화분 자동 물주기"></div>
    <div class="chip-row"><span class="muted small">못 정하겠으면:</span>${['자동문', '에어컨', '화분 물주기'].map((x) => `<button type="button" class="chip-button" data-device="${x}">${x}</button>`).join('')}</div>
    <div class="field"><span class="field-label">입력 개수</span>${choiceRow('p2n', [['2', '2개 (A, B)'], ['3', '3개 (A, B, C)']], String(n))}</div>
    <div class="${n === 3 ? 'three-column' : 'two-column'}">${['A', 'B', 'C'].slice(0, n).map((x) => `<div class="field"><label for="w-P2_in${x}">입력 ${x}가 1이면</label><input id="w-P2_in${x}" type="text" data-write="P2_in${x}" value="${esc(w['P2_in' + x] || '')}" placeholder="예: 흙이 말랐다"></div>`).join('')}</div>
    ${writeBox('P2_sentence', '(1) 장치가 작동하는 조건을 「~이고」, 「~이거나」, 「~가 아니면」 가운데 필요한 말을 써서 한 문장으로 쓰시오.', { rows: 2 })}
  </div>
  <div class="card stack">
    <h3>(2) 그 문장을 AND, OR, NOT을 쓴 식으로</h3>
    <div class="expr-view" aria-live="polite">${exprView}</div>
    <div class="token-pad">${TOKEN_LIST.filter((t) => t !== 'C' || n === 3).map((t) => `<button type="button" class="tok-button" data-tok="${t}">${t}</button>`).join('')}<button type="button" class="tok-button soft" data-tok="BACK" aria-label="하나 지우기">⌫</button><button type="button" class="tok-button soft" data-tok="CLEAR">모두 지우기</button></div>
    <p class="muted small" style="margin:0">NOT은 바로 뒤의 문자나 괄호 하나에만 붙습니다. AND와 OR을 함께 쓸 때는 먼저 계산할 부분을 괄호로 묶습니다.</p>
    <div class="button-row"><button id="p2-check" class="primary-button" type="button">식 확인</button></div>
    ${p.exprError ? resultBox('fail', EXPR_ERR[p.exprError] || '식을 다시 확인해 주세요.') : ''}
    ${ast ? `<div class="stack"><p style="margin:0">식 <strong>${esc(PG.astText(ast))}</strong>의 진리표</p>${truthTableHtml(n, PG.exprTable(ast, n))}
      <div class="field"><span class="field-label">이 표가 (1)의 내 문장과 맞나요?</span>${choiceRow('p2match', [['yes', '맞다'], ['fix', '고칠래요']], p.match)}</div>
      ${p.match === 'fix' ? '<div class="notice">문장이나 식을 고친 뒤 다시 「식 확인」을 누르세요.</div>' : ''}</div>` : ''}
  </div>`;
};
BIND.P2a = () => {
  const p = S('P2');
  $$('[data-device]').forEach((b) => b.addEventListener('click', () => { state.writes.P2_device = b.dataset.device; persist(); render(); }));
  $$('input[name="p2n"]').forEach((r) => r.addEventListener('change', () => {
    p.inputs = Number(r.value);
    if (p.inputs === 2) p.tokens = p.tokens.filter((t) => t !== 'C');
    p.exprOk = false; p.exprError = ''; p.match = ''; persist(); render();
  }));
  $$('[data-tok]').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.tok;
    if (t === 'BACK') p.tokens.pop(); else if (t === 'CLEAR') p.tokens = []; else if (p.tokens.length < 40) p.tokens.push(t);
    p.exprOk = false; p.exprError = ''; p.match = ''; persist(); render();
  }));
  $('#p2-check').addEventListener('click', () => {
    if (p.tokens.includes('C') && p.inputs < 3) { p.exprError = 'noC'; render(); return; }
    const r = PG.parseExpr(p.tokens);
    if (r.error) { p.exprOk = false; p.exprError = r.error; say(EXPR_ERR[r.error], 'tilt'); logEvent('write', 'P2a', `식 형식 오류: ${p.tokens.join(' ')}`); render(); return; }
    p.exprOk = true; p.exprError = ''; p.exprTokens = p.tokens.slice(); p.match = '';
    p.circuitOk = false;
    logEvent('attempt', 'P2a', `식: ${PG.astText(r.ast)} · 진리표 ${PG.exprTable(r.ast, p.inputs).join('')}`, 'ok', { expr: PG.astText(r.ast), inputs: p.inputs });
    success('진리표가 만들어졌습니다. 내 문장과 맞는지 확인해 보세요.');
    render();
  });
  $$('input[name="p2match"]').forEach((r) => r.addEventListener('change', () => { p.match = r.value; logEvent('write', 'P2a', `표와 문장: ${r.value === 'yes' ? '맞다' : '고칠래요'}`); render(); }));
};

/* ---------- P2b 내 장치 설계 ② 회로 */
function p2Circuit() {
  const p = S('P2');
  return { inputs: ['A', 'B', 'C'].slice(0, p.inputs), gates: p.gates, output: p.output };
}
function renumberGates() {
  const p = S('P2'), map = {};
  p.gates.forEach((g, k) => { map[g.id] = `G${k + 1}`; });
  p.gates.forEach((g) => { g.id = map[g.id]; g.inputs = g.inputs.map((x) => (x && x.startsWith('G') ? map[x] || '' : x)); });
  p.output = p.output && p.output.startsWith('G') ? map[p.output] || '' : p.output;
}
RENDER.P2b = () => {
  const p = S('P2'), ast = p2Ast(), n = p.inputs;
  if (!ast) return `${head('내 장치 설계 ② 회로로 만들기', '앞 화면에서 만든 식을 회로로 만듭니다.', '오늘의 정리 1')}<div class="card stack"><div class="notice">먼저 앞 화면에서 식을 만들고 「식 확인」을 눌러 주세요.</div><div class="button-row"><button class="secondary-button" type="button" data-go="P2a">앞 화면으로</button></div></div>`;
  const circ = p2Circuit();
  const chk = PG.circuitCheck(circ);
  const env = Object.fromEntries(circ.inputs.map((x) => [x, p.sw[x] || 0]));
  const vals = chk.ok ? PG.circuitValues(circ, env) : null;
  const srcOpts = (k, cur) => {
    const opts = circ.inputs.concat(p.gates.slice(0, k).map((g) => g.id));
    return `<option value="">고르기</option>${opts.map((x) => `<option value="${x}" ${cur === x ? 'selected' : ''}>${x.startsWith('G') ? `게이트 ${x.slice(1)}의 출력` : `입력 ${x}`}</option>`).join('')}`;
  };
  const rows = p.gates.map((g, k) => `<div class="gate-row">
      <span class="gate-name">게이트 ${k + 1}</span>
      <select data-gtype="${k}" aria-label="게이트 ${k + 1} 종류">${['AND', 'OR', 'NOT'].map((t) => `<option ${g.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <select data-gin="${k}:0" aria-label="게이트 ${k + 1} 첫째 입력">${srcOpts(k, g.inputs[0])}</select>
      ${g.type === 'NOT' ? '' : `<select data-gin="${k}:1" aria-label="게이트 ${k + 1} 둘째 입력">${srcOpts(k, g.inputs[1])}</select>`}
      <button type="button" class="tool-button" data-gdel="${k}" aria-label="게이트 ${k + 1} 지우기">지우기</button></div>`).join('');
  const outOpts = `<option value="">고르기</option>${p.gates.map((g) => `<option value="${g.id}" ${p.output === g.id ? 'selected' : ''}>게이트 ${g.id.slice(1)}의 출력</option>`).join('')}`;
  const exprT = PG.exprTable(ast, n), circT = chk.ok ? PG.circuitTable(circ, n) : null;
  let result = '';
  if (p.checked) {
    if (!chk.ok) result = resultBox('fail', { empty: '게이트를 더해 주세요.', emptyInput: '입력 칸이 비어 있는 게이트가 있어요.', order: '게이트는 앞에 있는 게이트의 출력만 받을 수 있어요.', noOutput: '출력에 연결할 게이트를 고르세요.' }[chk.error] || '회로를 확인해 주세요.');
    else if (p.circuitOk) result = resultBox('ok', `회로의 진리표가 식 ${esc(PG.astText(ast))}의 진리표와 같습니다. 게이트 ${p.gates.length}개를 썼습니다.`);
    else result = resultBox('fail', `다른 행이 ${p.diffRows.length}개 있어요. 표에서 칠한 행을 보세요.`);
  }
  return `${head('내 장치 설계 ② 회로로 만들기', `식 <strong>${esc(PG.astText(ast))}</strong>를 게이트를 이어 회로로 만드세요. 다 만들면 「확인」을 눌러 진리표를 비교합니다.`, '오늘의 정리 1')}
  <div class="card stack">
    <div class="button-row">${['AND', 'OR', 'NOT'].map((t) => `<button type="button" class="secondary-button" data-gadd="${t}" ${p.gates.length >= 6 ? 'disabled' : ''}>+ ${t}</button>`).join('')}<span class="muted small">게이트는 6개까지</span></div>
    <div class="gate-list">${rows || '<p class="muted" style="margin:0">위 버튼으로 게이트를 더하세요.</p>'}</div>
    <div class="gate-row"><span class="gate-name">출력</span><select id="p2-out" aria-label="출력에 연결할 게이트">${outOpts}</select></div>
    <div class="circuit-wrap">${p.gates.length ? circuitSvg(circ, vals, { title: '내가 만든 회로' }) : ''}</div>
    <div class="switch-row"><span class="muted small">스위치:</span>${circ.inputs.map((x) => `<button type="button" class="switch${p.sw[x] ? ' on' : ''}" data-sw="${x}" aria-pressed="${p.sw[x] ? 'true' : 'false'}">${x} = ${p.sw[x] || 0}</button>`).join('')}${vals ? `<span class="out-badge">출력 ${vals.OUT}</span>` : ''}</div>
    <div class="button-row"><button id="p2b-check" class="primary-button" type="button">확인</button></div>
    ${result}
    ${p.checked && chk.ok ? truthTableHtml(n, null, { cols: [['식', exprT], ['내 회로', circT]], diff: p.diffRows }) : ''}
  </div>`;
};
BIND.P2b = () => {
  const p = S('P2');
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => navTo(b.dataset.go)));
  const changed = () => { p.checked = false; p.circuitOk = false; persist(); render(); };
  $$('[data-gadd]').forEach((b) => b.addEventListener('click', () => { if (p.gates.length >= 6) return; p.gates.push({ id: `G${p.gates.length + 1}`, type: b.dataset.gadd, inputs: ['', ''] }); changed(); }));
  $$('[data-gtype]').forEach((s) => s.addEventListener('change', () => { const g = p.gates[Number(s.dataset.gtype)]; g.type = s.value; if (g.type === 'NOT') g.inputs[1] = ''; changed(); }));
  $$('[data-gin]').forEach((s) => s.addEventListener('change', () => { const [k, j] = s.dataset.gin.split(':').map(Number); p.gates[k].inputs[j] = s.value; changed(); }));
  $$('[data-gdel]').forEach((b) => b.addEventListener('click', () => { const k = Number(b.dataset.gdel); const id = p.gates[k].id; p.gates.splice(k, 1); p.gates.forEach((g) => { g.inputs = g.inputs.map((x) => (x === id ? '' : x)); }); if (p.output === id) p.output = ''; renumberGates(); changed(); }));
  $('#p2-out')?.addEventListener('change', (e) => { p.output = e.target.value; changed(); });
  $$('[data-sw]').forEach((b) => b.addEventListener('click', () => { p.sw[b.dataset.sw] = 1 - (p.sw[b.dataset.sw] || 0); persist(); render(); }));
  $('#p2b-check')?.addEventListener('click', () => {
    const ast = p2Ast(), circ = p2Circuit(), chk = PG.circuitCheck(circ);
    p.checked = true;
    if (!chk.ok) { p.circuitOk = false; say('회로가 아직 덜 이어졌어요. 빈 칸과 출력을 확인해 보세요.', 'tilt'); render(); return; }
    const a = PG.exprTable(ast, p.inputs), b = PG.circuitTable(circ, p.inputs);
    p.diffRows = a.map((v, i) => (v !== b[i] ? i : -1)).filter((i) => i >= 0);
    p.circuitOk = p.diffRows.length === 0;
    const desc = circ.gates.map((g) => `${g.id}=${g.type}(${g.inputs.filter(Boolean).join(',')})`).join(' ') + ` → 출력 ${circ.output}`;
    logEvent('attempt', 'P2b', `${desc} · 다른 행 ${p.diffRows.length}개`, p.circuitOk ? 'ok' : 'fail', { circuit: clone(circ), expr: PG.astText(ast) });
    if (p.circuitOk) success('회로가 식과 같은 판단을 합니다. 스위치를 눌러 장치가 언제 켜지는지 보세요.'); else fail('P2b');
    render();
  });
};

/* ---------- P3 XOR 회로 */
RENDER.P3 = () => {
  const p = S('P3');
  const vals = PG.circuitValues(PG.XOR_CIRCUIT, p.sw);
  const full = p.table.every((v) => v !== null), ok = full && sameArr(p.table, LAB.XOR);
  const rows = [[0, 0], [0, 1], [1, 0], [1, 1]].map((r, i) => {
    const v = p.table[i], wrong = full && v !== LAB.XOR[i];
    return `<tr class="${p.sw.A === r[0] && p.sw.B === r[1] ? 'now' : ''}"><td>${r[0]}</td><td>${r[1]}</td><td><button type="button" class="cell-button${v === null ? ' empty' : ''}${wrong ? ' wrong' : ''}" data-p3="${i}">${v === null ? '?' : v}</button></td></tr>`;
  }).join('');
  return `${head('XOR을 만든 회로', '지난 시간에 찾은 XOR 회로 가운데 하나입니다. 스위치를 눌러 선마다 흐르는 값을 보고, 네 경우의 출력을 표에 채우세요.')}
  <div class="card stack">
    <p style="margin:0">식: <strong>(A OR B) AND NOT (A AND B)</strong></p>
    <div class="circuit-wrap">${circuitSvg(PG.XOR_CIRCUIT, vals, { title: 'XOR 회로' })}</div>
    <div class="switch-row"><span class="muted small">스위치:</span>${['A', 'B'].map((x) => `<button type="button" class="switch${p.sw[x] ? ' on' : ''}" data-sw3="${x}" aria-pressed="${p.sw[x] ? 'true' : 'false'}">${x} = ${p.sw[x]}</button>`).join('')}<span class="out-badge">출력 ${vals.OUT}</span></div>
    <table class="truth narrow"><thead><tr><th>A</th><th>B</th><th>출력</th></tr></thead><tbody>${rows}</tbody></table>
    ${full ? (ok ? resultBox('ok', 'XOR도 AND·OR·NOT을 이어 만들 수 있었습니다. 그렇다면 오늘은 다른 방법으로 판단을 들여다봅시다.') : resultBox('fail', '틀린 칸이 있어요. 그 행의 입력대로 스위치를 놓아 보세요.')) : ''}
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
RENDER.P4 = () => {
  const sel = S('P4').sel;
  let info = '점을 누르면 그 학생의 점수가 보입니다.';
  if (sel !== null) { const [x, y] = SCORES[sel]; info = `국어 ${x}점, 수학 ${y}점 → 합 ${x + y}점 → ${x + y > 150 ? '합격 ●' : '불합격 ○'}`; }
  return `${head('판단은 평면을 가르는 일이다', '어느 시험에서 국어 점수와 수학 점수의 합이 150점보다 크면 합격이라고 합시다. 학생 20명의 (국어 점수, 수학 점수)를 좌표평면에 점으로 찍고, 합격은 ●, 불합격은 ○로 나타냈습니다.')}
  <div class="screen-layout two-col"><div class="card"><div class="scatter-box">${scatterSvg({ selected: sel })}</div><div class="result" role="status">${info}</div></div>
  <div class="card stack"><p style="margin:0">직선 「합 = 150」의 오른쪽 위에는 ●만, 왼쪽 아래에는 ○만 있습니다.</p><p style="margin:0"><strong>기준 하나가 평면을 직선 하나로 두 쪽으로 가른 것입니다.</strong></p><p class="muted small" style="margin:0">「150점 이상」이 아니라 「150점보다 크면」으로 정했습니다. 직선 위에 있는 학생은 없습니다.</p></div></div>`;
};
BIND.P4 = () => { $$('[data-score]').forEach((c) => c.addEventListener('click', () => { S('P4').sel = Number(c.dataset.score); render(); })); };

const RULES = ['가로축이 A, 세로축이 B입니다.', '출력이 1인 점은 까맣게 칠하고(●), 0인 점은 비워 둡니다(○).', '직선 하나만 긋습니다. 직선이 점 위를 지나면 나눈 것으로 보지 않습니다.', '직선의 한쪽에 ●만, 다른 쪽에 ○만 있으면 「나누었다」고 합니다.'];
const rulesHtml = () => `<div class="rule-box"><strong>규칙</strong><ol>${RULES.map((r) => `<li>${r}</li>`).join('')}</ol></div>`;
RENDER.P5 = () => {
  const p = S('P5'), step = p.step;
  const out = LAB.NOT_A_AND_B;
  const labels = [0, 1, 2, 3].map((i) => (i < step ? out[i] : null));
  const rows = [[0, 0], [0, 1], [1, 0], [1, 1]].map((r, i) => `<tr class="${i === step - 1 ? 'now' : ''}"><td>${r[0]}</td><td>${r[1]}</td><td>${out[i]}</td><td>${i < step ? `→ ${COORD[i]} ${out[i] ? '●' : '○'}` : ''}</td></tr>`).join('');
  const pv = predictValue('P5') || {}, locked = predictLocked('P5');
  const opts = [['yes', '된다'], ['no', '안 된다'], ['unsure', '모르겠다']];
  return `${head('진리표가 점이 된다', '입력이 0과 1뿐이라면 진리표의 한 행 (A, B)는 순서쌍이므로 좌표평면의 점 하나가 됩니다. 점은 (0, 0), (0, 1), (1, 0), (1, 1)의 네 개입니다. 출력이 1이면 ●, 0이면 ○로 나타냅니다.')}
  <div class="screen-layout two-col">
    <div class="card stack"><h3>2-1 회로(밝다 센서등)의 진리표</h3>
      <table class="truth"><thead><tr><th>A</th><th>B</th><th>출력</th><th>점</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="button-row"><button id="p5-next" class="primary-button" type="button" ${step >= 4 ? 'disabled' : ''}>다음 행을 점으로</button><button id="p5-all" class="secondary-button" type="button" ${step >= 4 ? 'disabled' : ''}>모두 옮기기</button>${step ? '<button id="p5-reset" class="secondary-button" type="button">처음부터</button>' : ''}</div></div>
    <div class="card"><div class="plane-box">${planeSvg({ labels, title: '2-1 회로의 네 점' })}</div></div>
  </div>
  <div class="card stack">${rulesHtml()}
    <h3>그렇다면 AND, OR, XOR도 직선 하나로 가를 수 있을까요?</h3>
    <p class="muted small" style="margin:0">해 보기 전에 예상을 고르고 「확정」을 누르세요. 확정한 예상은 마지막에 다시 봅니다.</p>
    ${['AND', 'OR', 'XOR'].map((op) => `<div class="predict-line"><span class="op-name">${op}</span>${choiceRow('p5-' + op, opts, pv[op] || '', { disabled: locked, label: op + ' 예상' })}</div>`).join('')}
    ${locked ? resultBox('', '예상을 확정했습니다.') : `<div class="button-row"><button id="p5-lock" class="primary-button" type="button">확정</button></div>`}
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
  ['AND', 'OR', 'XOR'].forEach((op) => $$(`input[name="p5-${op}"]`).forEach((r) => r.addEventListener('change', () => { const v = { ...(predictValue('P5') || {}) }; v[op] = r.value; draftPredict('P5', v); render(); })));
  $('#p5-lock')?.addEventListener('click', () => {
    const v = predictValue('P5') || {};
    if (!['AND', 'OR', 'XOR'].every((op) => v[op])) { say('세 연산 모두 예상을 골라 주세요.', 'tilt'); renderMascot(); return; }
    confirmPredict('P5', v); render();
  });
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
    return `<div class="card stack"><h3>${op}</h3>
      <details class="mini-details"><summary>${op} 진리표 보기</summary>${truthTableHtml(2, LAB[op])}</details>
      <div id="pl-${k}" class="plane-box"></div>${planeControlsHtml('pl-' + k)}
      ${j.text ? resultBox(j.cls, j.text) : '<div class="result muted">점을 눌러 ●/○로 칠하고, 직선을 그으세요.</div>'}</div>`;
  };
  return `${head('AND와 OR', 'AND와 OR의 출력에 따라 두 평면의 점을 칠하고, 두 종류의 점을 가르는 직선을 하나씩 그으세요.', '4-1')}
  <p class="muted small">직선 긋기: 빈 곳을 두 번 누르거나 끌기. 끝점(작은 원)을 끌어 고치거나 아래 버튼으로 돌리고 옮길 수 있습니다.</p>
  <div class="screen-layout two-col">${box('and')}${box('or')}</div>
  <details class="card mini-details"><summary>규칙 다시 보기</summary>${rulesHtml()}</details>`;
};
BIND.P6 = () => {
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
  return `${head('XOR', '이제 XOR입니다. 점은 미리 칠해 두었습니다. ●와 ○를 가르는 직선을 그어 보세요.', '4-2')}
  <div class="screen-layout two-col">
    <div class="card stack"><div id="pl-xor" class="plane-box"></div>${planeControlsHtml('pl-xor')}</div>
    <div class="card stack">
      <div class="counter" aria-live="polite">그어 본 직선 <strong>${p.history.length}</strong>개 · 나눈 방법 <strong>${p.parts.length}</strong>가지</div>
      ${res ? (res.ok ? resultBox('ok', '직선 하나로 나누었습니다.') : resultBox(res.reason === 'onPoint' ? 'partial' : 'fail', wrongText(res, LAB.XOR))) : '<div class="result muted">직선을 그어 보세요. 지난 직선은 회색으로 남습니다.</div>'}
      <p class="muted small" style="margin:0">여러 번 그어 보세요. 어떤 직선을 그었는지는 다음 화면에서 모아 봅니다.</p>
      ${rulesHtml()}
    </div>
  </div>`;
  void ghosts;
};
BIND.P7 = () => {
  const p = S('P7');
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
RENDER.P8 = () => {
  const p7 = S('P7'), p = S('P8');
  const pv = (predictValue('P5') || {}).XOR;
  const minis = p7.parts.length ? p7.parts.map((k) => `<figure class="mini-fig">${partMiniSvg(k)}<figcaption>${partText(k)}</figcaption></figure>`).join('') : '<p class="muted">아직 그어 본 직선이 없어요. 앞 화면에서 그어 보세요.</p>';
  return `${head('직선 하나로 나눌 수 있었나', '앞 화면에서 그은 직선을 모두 겹쳐 보았습니다. 직선마다 네 점이 어떻게 두 무리로 갈렸는지도 모았습니다.', '4-2')}
  <div class="screen-layout two-col">
    <div class="card"><div class="plane-box">${planeSvg({ labels: LAB.XOR, ghosts: p7.history, title: '그어 본 직선 모두' })}</div><p class="muted small">그어 본 직선 ${p7.history.length}개</p></div>
    <div class="card stack"><h3>나눈 방법 ${p7.parts.length}가지</h3><p class="muted small" style="margin:0">진한 점과 흐린 점이 직선의 서로 다른 쪽에 있던 무리입니다.</p><div class="mini-grid">${minis}</div></div>
  </div>
  <div class="card stack">
    ${pv ? `<p class="muted small" style="margin:0">처음 예상(XOR): <strong>${{ yes: '된다', no: '안 된다', unsure: '모르겠다' }[pv]}</strong></p>` : ''}
    <div class="field"><span class="field-label">직선 하나로 ●와 ○를 나눌 수 있었는가?</span>${choiceRow('p8', [['yes', '예'], ['no', '아니오'], ['unsure', '아직 모르겠다']], p.choice)}</div>
    ${writeBox('P8_reason', '그렇게 생각한 까닭을 한 줄로 쓰시오.', { rows: 2 })}
    ${writeBox('P8_rule', '[선택] 규칙을 하나 바꿀 수 있다면 무엇을 바꾸겠는가?', { rows: 2 })}
  </div>
  ${XOR_GATE.mode === 'word' ? `<div class="card stack"><h3>다음 화면 열기</h3>${p.gateOpen ? resultBox('ok', '다음 화면이 열렸습니다.') : `<p class="muted small" style="margin:0">위 칸을 쓴 뒤, 선생님이 화상으로 알려 주는 낱말을 넣으세요.</p><div class="inline-actions"><input id="p8-word" type="text" value="${esc(p.gateTry.trim())}" style="max-width:180px" aria-label="열기 낱말"><button id="p8-open" class="primary-button" type="button">열기</button></div>${p.gateTry ? resultBox('fail', '낱말이 맞지 않아요. 선생님께 다시 들어 보세요.') : ''}`}</div>` : ''}`;
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
    <div class="card"><div id="pl-seg" class="plane-box"></div>
      <p class="muted small">${segs.black ? '● 선분 ✓' : '● 두 점을 누르세요'} · ${segs.white ? '○ 선분 ✓' : '○ 두 점을 누르세요'}</p>
      <div class="button-row"><button id="p9-clear" class="secondary-button" type="button">선분 지우기</button></div></div>
    <div class="card stack">
      <div class="field"><span class="field-label">만나는 점의 좌표</span><div class="coord-input">( <input id="p9-x" type="text" inputmode="decimal" value="${esc(p.x)}" aria-label="가로 좌표"> , <input id="p9-y" type="text" inputmode="decimal" value="${esc(p.y)}" aria-label="세로 좌표"> )</div></div>
      <div class="button-row"><button id="p9-check" class="primary-button" type="button" ${both ? '' : 'disabled'}>확인</button></div>
      ${p.ok ? resultBox('ok', '두 선분은 (0.5, 0.5)에서 만납니다.') : p.tried ? resultBox('fail', '그림에서 두 선분이 겹치는 곳을 다시 보세요.') : ''}
      ${p.ok ? `<div class="explain-steps">${P9_STEPS.slice(0, step).map((t, i) => `<p class="explain-step"><span class="step-no">${i + 1}</span>${t}</p>`).join('')}
        ${step < 3 ? `<button id="p9-step" class="secondary-button" type="button">${step ? '다음' : '왜 그런지 보기'}</button>` : ''}</div>` : ''}
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
};

/* ================================================================ 섹션 4 */
const FOLD_T = [0, 130 * Math.PI / 180, Math.PI];
const FOLD_CAP = ['① 점선을 따라 접는다', '② 접는 중', '③ 다 접었을 때'];
RENDER.P10 = () => {
  const step = S('P10').step;
  return `${head('종이를 접으면?', '평면 위에서는 직선 하나로 되지 않았습니다. 그런데 평면을 접는다면 어떨까요? ● 두 점을 지나는 점선(직선 A+B=1)을 따라 원점 쪽 반을 접어 봅시다.', '4-3')}
  <div class="screen-layout two-col">
    <div class="card"><div id="fold-anim" class="plane-box">${foldSvg(FOLD_T[step], { title: FOLD_CAP[step] })}</div><p class="caption">${FOLD_CAP[step]}</p>
      <div class="button-row"><button id="p10-next" class="primary-button" type="button" ${step >= 2 ? 'disabled' : ''}>${step === 0 ? '접기' : '끝까지 접기'}</button><button id="p10-reset" class="secondary-button" type="button" ${step ? '' : 'disabled'}>처음부터</button></div></div>
    <div class="card stack">
      ${step >= 2 ? '<p style="margin:0">다 접으면 ○ 두 점 (0, 0)과 (1, 1)이 한 점에 겹치고, ● 두 점은 접힌 선 위에 놓입니다.</p><p style="margin:0"><strong>이제 ●와 ○를 직선 하나로 가를 수 있을까요?</strong> 다음 화면에서 해 봅니다.</p>' : '<p class="muted" style="margin:0">「접기」를 눌러 보세요.</p>'}
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
  $('#p10-next').addEventListener('click', () => { const from = p.step; p.step = Math.min(2, p.step + 1); persist(); animateFold(from, p.step); $('#p10-next').disabled = true; });
  $('#p10-reset').addEventListener('click', () => { p.step = 0; persist(); render(); });
};

/* ---------- P11 접은 채로 직선 하나 */
const FOLD_MSG = { onPoint: '직선이 점 위를 지나요. 점 위를 지나면 나눈 것으로 보지 않아요.', splitBlack: '● 두 점이 직선의 서로 다른 쪽에 있어요.', sameSide: '겹친 ○가 ● 두 점과 같은 쪽에 있어요.' };
RENDER.P11 = () => {
  const p = S('P11');
  const L = lineFromPts(p.line);
  const j = L ? PG.foldJudge(L) : null;
  const k = L ? PG.parallelK(L) : null;
  let view;
  if (p.open && p.ok) view = `<div class="plane-box">${unfoldSvg(p.line, { title: '다시 펼쳤을 때' })}</div><p class="caption">④ 다시 펼쳤을 때 — 굵은 점선이 잘린 자리</p>`;
  else view = `<div id="pl-fold" class="plane-box"></div>${p.cut ? '' : planeControlsHtml('pl-fold')}<p class="caption">③ 다 접었을 때${p.cut ? ' — 두 겹을 함께 잘랐습니다' : ''}</p>`;
  return `${head('접은 채로 직선 하나', '다 접은 그림에서 ●와 ○를 가르는 직선 하나를 그으세요. 그 직선을 따라 두 겹을 함께 가위로 자른 뒤 다시 펼쳐 봅시다.', '4-3 (1)·(2)')}
  <div class="screen-layout two-col">
    <div class="card">${view}</div>
    <div class="card stack">
      ${j ? (j.ok ? resultBox('ok', '직선 하나로 갈랐습니다.') : resultBox(j.reason === 'onPoint' ? 'partial' : 'fail', FOLD_MSG[j.reason])) : '<div class="result muted">직선을 그으세요(두 번 누르거나 끌기).</div>'}
      ${j && j.ok ? `<div class="button-row">${!p.cut ? '<button id="p11-cut" class="primary-button" type="button">두 겹 함께 자르기</button>' : ''}${p.cut && !p.open ? '<button id="p11-open" class="primary-button" type="button">펼치기</button>' : ''}${p.cut ? '<button id="p11-again" class="secondary-button" type="button">다시 접어 직선 고치기</button>' : ''}</div>` : ''}
      ${p.open ? `<div class="field"><span class="field-label">(3) 펼친 평면에서 ● 두 점은 잘린 자리 몇 개 사이에 있는가?</span><div class="inline-actions"><input id="p11-count" type="text" inputmode="numeric" value="${esc(p.count)}" style="max-width:90px" aria-label="잘린 자리 개수"><span>개</span><button id="p11-check" class="secondary-button" type="button">확인</button></div></div>
        ${p.countOk === true ? resultBox('ok', '잘린 자리는 모두 직선입니다. 접은 뒤 직선 하나로 가르는 것은, 펼친 평면에서 보면 직선 두 개로 가르는 것과 같습니다.') : p.countOk === false ? resultBox('fail', '펼친 그림에서 굵은 점선이 몇 개인지 세어 보세요.') : ''}
        ${p.countOk ? (k === null ? '<p class="muted small" style="margin:0">내 직선은 접힌 선과 나란하지 않아서 두 직선이 「V」 모양으로 만났어요. 그래도 ● 두 점이 두 직선 사이에 있다는 점은 같습니다. 다른 친구는 나란한 두 직선이 나왔을 수도 있어요.</p>' : `<p class="muted small" style="margin:0">내 직선은 A+B=${fmtK(k)}였고, 펼치니 A+B=${fmtK(2 - k)}가 하나 더 생겼습니다.</p>`) : ''}` : ''}
    </div>
  </div>`;
};
BIND.P11 = () => {
  const p = S('P11');
  if (!p.open || !p.ok) {
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
        if (j.ok) success('이제 「두 겹 함께 자르기」를 눌러 보세요.'); else fail('P11', FOLD_MSG[j.reason]);
        persist(); render();
      }
    });
  }
  $('#p11-cut')?.addEventListener('click', () => { p.cut = true; persist(); render(); });
  $('#p11-open')?.addEventListener('click', () => { p.open = true; logEvent('nav', 'P11', '펼치기'); persist(); render(); });
  $('#p11-again')?.addEventListener('click', () => { p.cut = false; p.open = false; p.countOk = null; persist(); render(); });
  $('#p11-count')?.addEventListener('input', (e) => { p.count = e.target.value; persist(); });
  $('#p11-check')?.addEventListener('click', () => { p.countOk = PG.parseNumber(p.count) === 2; logEvent('attempt', 'P11', `잘린 자리 ${p.count}개`, p.countOk ? 'ok' : 'fail'); if (p.countOk) success('직선 두 개 사이에 ● 두 점이 있습니다.'); render(); });
};

/* ---------- P12 정리 2 */
RENDER.P12 = () => {
  const locked = predictLocked('P12');
  return `${head('접기와 회로는 어떻게 닮았을까', 'XOR은 직선 하나로 나눌 수 없었습니다. 그런데 되짚기에서 본 회로로는 XOR을 만들었습니다.', '오늘의 정리 2')}
  <div class="card stack">
    ${writeBox('P12_answer', '4-3의 「접기」와 그 회로는 어떤 점이 닮았을까? 지금 떠오르는 생각을 한 문장으로 쓰시오.', { rows: 2, locked })}
    ${locked ? resultBox('', '답을 확정했습니다. 쉬는 시간 뒤에 이 답을 다시 봅니다.') : '<div class="button-row"><button id="p12-lock" class="primary-button" type="button">확정</button></div>'}
    <div class="notice">기계는 평면을 어떻게 「접을」 수 있을까요? 쉬는 시간 뒤에 이어집니다.</div>
  </div>`;
};
BIND.P12 = () => {
  $('#p12-lock')?.addEventListener('click', () => {
    const v = String(state.writes.P12_answer || '').trim();
    if (!v && !window.confirm('아직 쓰지 않았습니다. 빈 채로 확정할까요?')) return;
    confirmPredict('P12', v); render();
  });
};
