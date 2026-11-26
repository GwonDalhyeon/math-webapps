/* 「퍼셉트론, 직선으로 판단하다」 — 상태·저장·이동·힌트·캐릭터.
   제작 명세서 §2·§3-5·§3-6·§7. 화면은 screens.js, 제출은 submit.js. */
'use strict';

const STORAGE_KEY = 'gifted26_perceptron_state';
const APP_TITLE = '퍼셉트론, 직선으로 판단하다';
const APP_KEY = '퍼셉트론직선으로판단하다';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyJkUruf0Y8waxOJokJxrq6Rk5o4JrwLcgY51NmsFdHPD2oKQja5E0-5SBtCNjOV665/exec';

/* XOR 이동 잠금(00_내용구성 D4, 시제품을 보고 정한다).
   'none': 막지 않는다(기본). 'word': 「나눌 수 있었나」(P8)에서 선생님이 화상으로 알려 주는 낱말을 넣어야 P9 이후가 열린다.
   미리보기: 주소 뒤에 ?gate=word 를 붙이면 이번만 'word'로 열린다 */
const XOR_GATE = { mode: 'none', word: '접기' };
try { const q = new URLSearchParams(location.search).get('gate'); if (q === 'word' || q === 'none') XOR_GATE.mode = q; } catch (e) { /* 무시 */ }
const gateClosed = () => XOR_GATE.mode === 'word' && !state.screens.P8.gateOpen;

const SECTIONS = {
  0: '0 시작', 1: '1 지난 시간 되짚기', 2: '2 판단은 가르기', 3: '3 직선 하나로 가를 수 있을까',
  4: '4 접으면?', 5: '5 이것이 퍼셉트론이다', 6: '6 닫기', 7: '7 한 걸음 더'
};
/* 2차 개정(03_2차개정_명세서 §2): 비대면 온라인이라 모든 보기는 학생이 각자 조작한다. 선택 보기 없음, 제출은 맨 끝 */
/* 2026-11-26 가독성 개정: P20 「돌아보기」는 뺐다(P13·P19·P8과 겹침, 04_가독성_개정 §26) */
const SCREENS = [
  { id: 'P0', s: 0, label: '시작' },
  { id: 'P1', s: 1, label: '네 가지 판단' },
  { id: 'P2a', s: 1, label: '내 장치 설계 ① 상황과 조건' },
  { id: 'P2b', s: 1, label: '내 장치 설계 ② 회로로 만들기' },
  { id: 'P2e', s: 1, label: '내 장치 설계 ③ 식으로 나타내기' },
  { id: 'P3', s: 1, label: 'XOR을 만든 회로' },
  { id: 'P4', s: 2, label: '합격선' },
  { id: 'P5', s: 2, label: '진리표가 점이 된다' },
  { id: 'P6', s: 3, label: 'AND와 OR' },
  { id: 'P7', s: 3, label: 'XOR' },
  { id: 'P8', s: 3, label: '나눌 수 있었나' },
  { id: 'P9', s: 3, label: '두 선분이 만나는 점' },
  { id: 'P10', s: 4, label: '접어 보기' },
  { id: 'P11', s: 4, label: '접은 채로 직선 하나' },
  { id: 'P12', s: 4, label: '접기와 회로' },
  { id: 'P13', s: 5, label: '쉬는 시간 전에 쓴 답' },
  { id: 'P14', s: 5, label: '더해서 기준과 비교' },
  { id: 'P15', s: 5, label: 'AND' },
  { id: 'P16', s: 5, label: 'OR이 되는 기준 c 찾기' },
  { id: 'P16w', s: 5, label: '기준선은 어떻게 달라지나' },
  { id: 'P17', s: 5, label: 'XOR도 될까' },
  { id: 'P17r', s: 5, label: '그 무렵 연구자들도' },
  { id: 'P18', s: 5, label: '두 직선 사이의 점' },
  { id: 'P18c', s: 5, label: '두 판단을 이어 판단하기' },
  { id: 'P19', s: 5, label: '층을 쌓는다' },
  { id: 'P21', s: 6, label: '처음부터 다시 보기' },
  { id: 'P21s', s: 6, label: '마지막 한 문장' },
  { id: 'P24', s: 7, label: '직선 하나로 만들 수 있는 나누기' },
  { id: 'P23', s: 7, label: '입력마다 다른 수를 곱하면?' },
  { id: 'P23w', s: 7, label: '왜 안 되는지 부등식으로' },
  { id: 'P25', s: 7, label: '기계가 직선을 찾는다' },
  { id: 'P22', s: 7, label: '제출' }
];

/* 제출물 「작성한 설명」 순서. required는 미작성 개수에 센다 */
const WRITE_FIELDS = [
  ['P8_reason', '직선 하나로 나눌 수 있었나 · 까닭', true],
  ['P8_rule', '규칙을 하나 바꿀 수 있다면', false],
  ['P12_blank1', '접기와 회로 · 둘 다 먼저 하는 것(쉬는 시간 전)', true],
  ['P12_blank2', '접기와 회로 · 그 결과로 마지막에 하는 것(쉬는 시간 전)', true],
  ['P16_blank1', 'c의 값을 바꾸면 기준선의 기울기는', true],
  ['P16_blank2', 'c의 값을 바꾸면 기준선의 위치는', true],
  ['P17_reason', 'XOR은 왜 어떤 c로도 안 되나(내 말로 한 줄)', true],
  ['P21_sentence', '0과 1로 할 수 있게 된 일 가운데 가장 뜻밖이었던 것', true],
  ['P23_reason', 'XOR의 네 부등식을 모두 만족하는 수가 없는 까닭(내 말로)', true],
  ['P25_link', '기계가 직선을 찾는 것과 「학습」', false]
];

const HINTS = {
  P1: ['표 위의 문장과 한 행씩 비교해 보세요.', '두 입력이 모두 1일 때부터 확인해 보세요.', '표 위의 문장을 한 행씩 그대로 읽어 보세요.'],
  P2a: ['조건 문장에 나오는 것만 골라 보세요.', '문장에 없는 조건이 하나 섞여 있어요.', '문장을 쉼표와 「단,」에서 끊어 읽고, 조각마다 조건 하나를 찾아보세요.'],
  P2b: ['다른 행의 입력대로 스위치를 놓고, 어느 선의 값이 생각과 다른지 따라가 보세요.', '「~이고」는 AND, 「~이거나」는 OR, 「~이 아니면」·「단, ~이면 않는다」는 NOT으로 바꿔 보세요.', '먼저 묶이는 부분(예: 앞이나 뒤)을 게이트 하나로 만들고, 그 출력을 다음 게이트로 보내세요.'],
  P2e: ['회로의 게이트 하나가 식의 괄호 하나입니다.', '출력에 가장 가까운 게이트가 식의 가장 바깥 연산입니다.', '입력에 가장 가까운 게이트부터 (A OR B)처럼 괄호로 쓰고 바깥으로 넓혀 보세요.'],
  P3: ['스위치를 표의 입력대로 하나씩 놓고 출력 상자를 보세요.', '선마다 흐르는 값을 왼쪽부터 따라가 보세요.', '출력 상자에 적힌 값이 그 행의 출력입니다.'],
  P6: ['잘못된 쪽에 남은 점을 보세요.', '●가 하나뿐이면 그 점만 떼어 내는 직선을 생각해 보세요.', '한 점만 떼어 내려면 그 점과 나머지 세 점 사이로 직선을 지나가게 하면 됩니다.'],
  P7: ['', '● 두 점은 어디에 있고, ○ 두 점은 어디에 있나요?', '몇 번 더 그어 보고, 다음 화면에서 지금까지의 생각을 적어 보세요.'],
  P9: ['두 선분이 겹치는 곳을 그림에서 찾아보세요.', '그 점은 네 점의 한가운데입니다. 가로·세로 좌표는 각각 얼마일까요?', '(0, 0)과 (1, 1)의 가운데, (0, 1)과 (1, 0)의 가운데를 생각해 보세요.'],
  P11: ['겹친 ○와 접힌 선 위의 ● 사이로 직선을 지나가게 해 보세요.', '● 두 점이 같은 쪽에 있어야 합니다.', '접힌 선과 나란하게, ○ 쪽으로 조금 옮긴 직선을 생각해 보세요.'],
  P12: ['접기만 하고 나서 ●와 ○가 갈렸는지 그림을 보세요.', '출력 단자에 바로 이어진 게이트를 찾아보세요.', '접기도 회로도, 마지막 판단 앞에 한 단계가 더 있습니다.'],
  P15: ['A+B를 먼저 계산하고 1.5와 비교해 보세요.', '1.5보다 크면 1, 아니면 0입니다.', 'A+B가 2일 때만 1.5보다 큽니다.'],
  P16: ['네 점 가운데 OR과 다른 점을 보세요.', '(0, 0)은 0이 되고, 나머지 세 점은 1이 되어야 합니다.', '합이 0인 점과 합이 1인 점 사이에 칸막이를 두어 보세요.'],
  P17: ['(0, 1)의 합은 1입니다. 출력이 1이 되려면 c가 1보다 어때야 할까요?', '그때 (1, 1)의 합 2와 c를 비교해 보세요.', '칸막이 하나는 오른쪽을 모두 1로 만듭니다. 합 2는 합 1보다 오른쪽에 있어요.'],
  P18: ['두 직선 사이의 띠 안에 있는 점을 보세요.', '「앞은 예, 뒤는 아니오」인 점을 찾아보세요.', '합이 1인 점들입니다.'],
  P18c: ['판단 장치 회로의 상자 하나를 누른 뒤, XOR 회로에서 같은 일을 하는 게이트를 누르세요.', 'A+B > 0.5는 OR과, A+B > 1.5는 AND와 같았습니다.', '그 뒤의 NOT과 AND는 두 회로에서 같은 자리에 있습니다.'],
  P21: ['그 학습지의 그림을 떠올려 보세요.'],
  P23w: ['출력이 1인 점은 「> θ」, 0인 점은 「≤ θ」입니다.', 'XOR은 (0, 1)과 (1, 0)에서 1입니다.', '(0, 0): 0 ≤ θ, (0, 1): w₂ > θ, (1, 0): w₁ > θ, (1, 1): w₁ + w₂ ≤ θ'],
  P24: ['직선을 여러 방향으로 그어 흐린 칸을 채워 보세요.', '한 점만 떼어 내는 직선, 이웃한 두 점씩 나누는 직선을 생각해 보세요.', '대각선에 있는 두 점끼리 묶는 칸은 오늘 어디서 보았나요?']
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (v = '') => String(v).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const clone = (x) => JSON.parse(JSON.stringify(x));

function initialP2() {
  return { scenario: '', assign: [], assignOk: false, assignTried: false, blocks: [], wires: [], nextBlock: 1, sw: { A: 0, B: 0, C: 0 }, checked: false, circuitOk: false, diffRows: [], view: 'board',
    tokens: [], cursor: 0, exprOk: false, exprError: '', exprChecked: false, exprMatch: false, exprDiff: [] };
}
function initialScreens() {
  const blank4 = () => [null, null, null, null];
  return {
    P1: { tables: { AND: blank4(), OR: blank4(), NOT: [null, null], XOR: blank4() } },
    P2: initialP2(),
    P3: { sw: { A: 0, B: 0 }, table: blank4() },
    P4: { sel: null, guess: '', tried: false },
    P5: { step: 0 },
    P6: { and: { marks: [0, 0, 0, 0], line: null, result: '' }, or: { marks: [0, 0, 0, 0], line: null, result: '' }, alone: { and: null, or: null } },
    P7: { line: null, history: [], parts: [] },
    P8: { choice: '', gateOpen: false, gateTry: '' },
    P9: { black: [], white: [], x: '', y: '', ok: false, tried: false, explain: 0 },
    P10: { step: 0, yaw: 0, pitch: 0 },
    P11: { line: null, ok: false, cut: false, open: false, count: '', countOk: null, yaw: 0, pitch: 0 },
    P12: { q1: '', q2: null },
    P15: { sel: null, guess: null, rows: {}, right: [], same: '' },
    P16: { c10: 5, found: [], dir: '', slope: '' },
    P17: { c10: 5, swept: false, explain: 0, b1: '', b2: '', b3: '', b4: '', blankOk: null },
    P18: { picked: [], pickOk: null, same: '', blank1: '', blank2: '', sw: { A: 0, B: 0 }, band: blank4(), xor: blank4(), tableOk: null, pairs: {}, pairSel: '' },
    P21: { links: {}, sel: null, wrongFlash: '' },
    P23: { target: 'AND', w1: 10, w2: 10, t: 15 },
    P23w: { signs: ['', '', '', ''], sum: '', explain: 0 },
    P24: { line: null, found: [], pick: null, shape: '' },
    P25: { target: 'AND', learn: null, last: null, why: '' }
  };
}
function initialState() {
  return {
    v: 2, app: 'perceptron',
    student: { school: '', sid: '', name: '' },
    screenId: 'P0',
    views: {}, writes: {}, writeMeta: {}, predicts: {},
    screens: initialScreens(),
    hints: {}, attemptStats: {}, guideSeen: {},
    log: [], submitted: { at: 0, code: '', status: '', result: '' },
    lastSavedAt: 0, migratedFrom1: false
  };
}
/* 1판(v1) 기록: 구조가 바뀐 보기(P2·P12·P16w·P17·P19·P20·P23w·P24)는 새로 시작하고, 나머지는 그대로 옮긴다(03 §5) */
function migrateV1(parsed) {
  const d = clone(parsed);
  const sc = d.screens || {};
  ['P2', 'P12', 'P17', 'P23w', 'P24'].forEach((k) => { delete sc[k]; });
  if (sc.P16) { delete sc.P16.rangeChoice; delete sc.P16.recordMsg; }
  if (d.predicts) { delete d.predicts.P5; delete d.predicts.P12; }
  delete d.includeOptional;
  d.v = 2; d.migratedFrom1 = true;
  return d;
}
function mergeState(parsed) {
  if (parsed && parsed.v === 1) parsed = migrateV1(parsed);
  const fresh = initialState();
  const merged = { ...fresh, ...parsed, student: { ...fresh.student, ...(parsed.student || {}) }, submitted: { ...fresh.submitted, ...(parsed.submitted || {}) } };
  delete merged.includeOptional;
  merged.screens = { ...fresh.screens };
  Object.keys(fresh.screens).forEach((k) => { merged.screens[k] = { ...fresh.screens[k], ...((parsed.screens || {})[k] || {}) }; });
  ['views', 'writes', 'writeMeta', 'predicts', 'hints', 'attemptStats', 'guideSeen'].forEach((k) => { merged[k] = parsed[k] && typeof parsed[k] === 'object' ? parsed[k] : {}; });
  merged.log = Array.isArray(parsed.log) ? parsed.log : [];
  if (!SCREENS.some((s) => s.id === merged.screenId)) merged.screenId = 'P0';
  if (merged.submitted.result === 'pending') merged.submitted = { at: 0, code: merged.submitted.code, status: '전송이 중단되었습니다. 확인 후 다시 제출하세요.', result: 'fail' };
  return merged;
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    return mergeState(JSON.parse(raw));
  } catch (e) { return initialState(); }
}
function validProgress(d) {
  const obj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  return obj(d) && (d.v === 1 || d.v === 2) && d.app === 'perceptron' && obj(d.student) && typeof d.student.sid === 'string' && obj(d.screens) && Array.isArray(d.log);
}

let state = loadState();
let resumeView = state.screenId;
if (resumeView !== 'P0') state.screenId = 'P0';
let saveTimer = null;
let mascotState = { mood: 'idle', text: '', open: false };
let feedback = null;      // 이번 그리기에서 캐릭터가 말할 내용

function persist(now = false) {
  clearTimeout(saveTimer);
  const act = () => {
    try {
      state.lastSavedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, screenId: state.screenId === 'P0' ? resumeView : state.screenId }));
      const el = $('#save-state');
      if (el) el.textContent = `자동 저장됨 ${new Date(state.lastSavedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) { const el = $('#save-state'); if (el) el.textContent = '저장할 수 없음'; }
  };
  if (now) act(); else saveTimer = setTimeout(act, 300);
}

function trimLog() {
  if (state.log.length <= 2000) return;
  const keep = new Set(), first = new Set(), ok = new Set(), last = new Map();
  state.log.forEach((e) => {
    if (e.kind !== 'attempt') return;
    if (!first.has(e.screen)) { first.add(e.screen); keep.add(e); }
    if (e.result === 'ok' && !ok.has(e.screen)) { ok.add(e.screen); keep.add(e); }
    last.set(e.screen, e);
  });
  last.forEach((e) => keep.add(e));
  for (let i = state.log.length - 1; i >= 0 && keep.size < 2000; i--) keep.add(state.log[i]);
  state.log = state.log.filter((e) => keep.has(e));
}
function logEvent(kind, screen, detail = '', result = '', attempt = null) {
  const e = { t: Date.now(), screen, kind, detail, result, hintLevel: state.hints[screen] || 0 };
  if (attempt) e.attempt = attempt;
  if (kind === 'attempt') {
    const st = state.attemptStats[screen] || { count: 0, failures: 0, firstSuccess: null };
    st.count += 1;
    if (result === 'fail' || result === 'partial') st.failures += 1;
    if (result === 'ok' && st.firstSuccess === null) st.firstSuccess = st.count;
    state.attemptStats[screen] = st;
    e.number = st.count;
  }
  state.log.push(e);
  trimLog();
  persist();
  return e;
}

/* 힌트 깊이: 목표 미달 1·3·5회에 1·2·3단계(P7은 나눈 방법 가짓수) */
function advanceHint(screen, failures) {
  const cur = state.hints[screen] || 0;
  const want = failures >= 5 ? 3 : failures >= 3 ? 2 : failures >= 1 ? 1 : 0;
  const max = (HINTS[screen] || []).length || 3;
  const next = Math.min(max, Math.max(cur, want));
  if (next > cur) { state.hints[screen] = next; logEvent('hint', screen, `힌트 ${next}단계`, 'hint'); }
  return state.hints[screen] || 0;
}
const hintMood = (lv) => (lv >= 3 ? 'explain' : lv >= 2 ? 'worry' : lv >= 1 ? 'tilt' : 'idle');
function say(text, mood = 'idle', open = true) { mascotState = { mood, text, open }; }
function fail(screen, firstText, failures) {
  const lv = advanceHint(screen, failures === undefined ? (state.attemptStats[screen] || {}).failures || 0 : failures);
  const list = HINTS[screen] || [];
  const text = lv <= 1 || !list[lv - 1] ? (firstText || list[0] || '') : list[lv - 1];
  say(text || firstText, hintMood(lv));
}
function success(text) { say(text, 'cheer'); }

function activeScreens() { return SCREENS; }
function screenInfo(id = state.screenId) { return SCREENS.find((s) => s.id === id) || SCREENS[0]; }
function currentIndex() { const list = activeScreens(); const i = list.findIndex((s) => s.id === state.screenId); return i < 0 ? 0 : i; }
const studentReady = () => ['school', 'sid', 'name'].every((k) => String(state.student[k] || '').trim());

function navTo(id) {
  if (!activeScreens().some((s) => s.id === id)) return;
  if (id !== 'P0' && !studentReady()) { state.screenId = 'P0'; render(); const n = $('#p0-note'); if (n) { n.textContent = '학교·학번·이름을 입력하면 이어서 진행할 수 있어요.'; n.className = 'result fail'; } return; }
  const order = (x) => SCREENS.findIndex((s) => s.id === x);
  if (gateClosed() && order(id) > order('P8')) {
    if (state.screenId !== 'P8') { state.screenId = 'P8'; render(); }
    say('선생님이 화상으로 알려 주는 낱말을 넣으면 다음 화면이 열려요.', 'idle'); renderMascot();
    return;
  }
  if (state.screenId !== id) logEvent('nav', state.screenId, `→ ${id}`);
  state.screenId = id;
  if (id !== 'P0') resumeView = id;
  mascotState = { mood: 'idle', text: '', open: false };
  state.views[id] = { visited: true, at: Date.now() };
  persist();
  render();
  $('#main-content')?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function navigate(d) { const list = activeScreens(); const next = list[currentIndex() + d]; if (next) navTo(next.id); }

/* 화면 다시 그리기. keepScroll이면 스크롤 위치를 지킨다(조작 직후) */
function render() {
  const info = screenInfo();
  state.views[info.id] = { ...(state.views[info.id] || {}), visited: true, at: Date.now() };
  const focused = document.activeElement;
  const focusSel = focused && focused.id ? `#${CSS.escape(focused.id)}` : null;
  $('#section-label').textContent = SECTIONS[info.s] || '';
  const root = $('#screen-root');
  const same = root.dataset.screenId === info.id;
  const y = window.scrollY;
  const shownBefore = same ? new Set($$('[data-reveal]', root).map((el) => el.dataset.reveal)) : null;
  root.innerHTML = `<section class="screen${same ? ' screen-update' : ''}">${(RENDER[info.id] || (() => ''))()}</section>`;
  root.dataset.screenId = info.id;
  (BIND[info.id] || (() => {}))();
  bindWrites(root);
  bindPredicts(root);
  updateNavigation();
  renderMenu();
  renderMascot();
  if (same) window.scrollTo(0, y);
  if (focusSel) { const el = $(focusSel); if (el) el.focus({ preventScroll: true }); }
  /* 조작 뒤 새로 펼쳐진 부분이 화면 밖에 생겼으면 그쪽으로 부드럽게 내려 준다 */
  if (shownBefore) {
    const fresh = $$('[data-reveal]', root).find((el) => !shownBefore.has(el.dataset.reveal));
    if (fresh) {
      const r = fresh.getBoundingClientRect(), bar = $('.bottom-bar').getBoundingClientRect().height;
      if (r.bottom > window.innerHeight - bar - 8) {
        const top = $('.topbar').getBoundingClientRect().height + 10;
        window.scrollBy({ top: Math.min(r.top - top, r.bottom - (window.innerHeight - bar - 16)), behavior: 'smooth' });
      }
    }
  }
  updateScrollCue();
}

/* 슬라이더를 끄는 동안 쓰는 가벼운 다시 그리기.
   render()는 화면을 통째로 갈아 끼워서, 끌고 있던 슬라이더가 새 요소로 바뀌어 끌기가 한 칸에서 끊긴다.
   여기서는 새 화면을 따로 만든 뒤 지금 있는 요소의 글자·속성만 맞춰 바꾼다(요소와 이벤트는 그대로).
   손을 떼면(change) render()로 한 번 제대로 다시 그린다. */
function morphNode(a, b, keep) {
  if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) { a.replaceWith(b); return; }
  if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  [...a.attributes].forEach((at) => { if (!b.hasAttribute(at.name)) a.removeAttribute(at.name); });
  [...b.attributes].forEach((at) => { if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value); });
  if (a.tagName === 'INPUT' && a !== keep) {
    if (a.type === 'checkbox' || a.type === 'radio') a.checked = b.hasAttribute('checked');
    else if (a !== document.activeElement) a.value = b.getAttribute('value') || '';
  }
  const ac = [...a.childNodes], bc = [...b.childNodes];
  for (let i = 0; i < Math.max(ac.length, bc.length); i++) {
    if (i >= ac.length) a.appendChild(bc[i]);
    else if (i >= bc.length) ac[i].remove();
    else morphNode(ac[i], bc[i], keep);
  }
}
function softRender(keep) {
  const info = screenInfo(), root = $('#screen-root'), cur = root.firstElementChild;
  if (!cur || root.dataset.screenId !== info.id) { render(); return; }
  const tmp = document.createElement('section');
  tmp.innerHTML = (RENDER[info.id] || (() => ''))();
  morphNode(cur, Object.assign(tmp, { className: cur.className }), keep);
}

function updateNavigation() {
  const list = activeScreens(), i = currentIndex();
  $('#progress-bar').style.width = `${Math.round(((i + 1) / list.length) * 100)}%`;
  $('#page-number').value = i + 1;
  $('#page-number').max = list.length;
  $('#page-total').textContent = `/ ${list.length}`;
  $('#prev-button').disabled = i === 0;
  $('#next-button').disabled = i >= list.length - 1;
}
function renderMenu() {
  const box = $('#activity-list');
  if (!box) return;
  let lastS = -1;
  box.innerHTML = activeScreens().map((s) => {
    const head = s.s !== lastS ? `<div class="menu-section">${esc(SECTIONS[s.s])}</div>` : '';
    lastS = s.s;
    const active = s.id === state.screenId, visited = state.views[s.id]?.visited;
    return `${head}<button type="button" class="activity-link${active ? ' active' : ''}" data-nav="${s.id}"><span class="activity-id" aria-hidden="true">·</span><span>${esc(s.label)}</span><span class="activity-status">${active ? '현재' : visited ? '방문' : ''}</span></button>`;
  }).join('');
  $$('.activity-link', box).forEach((b) => b.addEventListener('click', () => { navTo(b.dataset.nav); $('#activity-menu').hidden = true; $('#menu-button').setAttribute('aria-expanded', 'false'); }));
}

/* 보기 머리: 제목, 안내. 모든 보기가 각자 조작이므로 형태 칩은 두지 않는다(03 D16) */
function head(title, text = '', extra = '', tools = '') {
  return `<div class="screen-heading"><div class="heading-line"><h2>${title}</h2>${extra ? `<span class="eyebrow">${esc(extra)}</span>` : ''}${tools}</div>${text ? `<p>${text}</p>` : ''}</div>`;
}

/* ------------------------------------------------------------ 서술 칸·예측 잠금 */
function writeBox(id, prompt, o = {}) {
  const v = state.writes[id] || '';
  const locked = o.locked || false;
  return `<div class="write-item">
    <label for="w-${id}">${prompt}</label>${o.hint ? `<small class="muted">${o.hint}</small>` : ''}
    <textarea id="w-${id}" data-write="${id}" rows="${o.rows || 3}" ${locked ? 'disabled' : ''} placeholder="${esc(o.placeholder || '자기 말로 짧게 적어 보세요.')}">${esc(v)}</textarea>
    ${locked ? '<small class="muted">확정한 답은 원 기록으로 남습니다.</small>' : ''}
  </div>`;
}
function bindWrites(root) {
  $$('[data-write]', root).forEach((el) => el.addEventListener('input', (ev) => {
    const k = ev.target.dataset.write;
    state.writes[k] = ev.target.value;
    state.writeMeta[k] = { at: Date.now() };
    if (!state.guideSeen[`w:${k}`]) { state.guideSeen[`w:${k}`] = true; logEvent('write', state.screenId, k); } else persist();
  }));
}
/* 예측: data-predict-confirm="P12" 버튼이 확정한다. 값은 화면이 넘겨 준다 */
function predictLocked(key) { return Boolean(state.predicts[key]?.confirmed); }
function confirmPredict(key, value) {
  const p = state.predicts[key] || {};
  if (p.confirmed) return;
  const rec = { value: clone(value), at: Date.now() };
  state.predicts[key] = { first: p.first || rec, confirmed: rec, latest: rec };
  logEvent('predict', state.screenId, `${key} 확정: ${typeof value === 'string' ? value : JSON.stringify(value)}`, 'ok');
}
function draftPredict(key, value) {
  const p = state.predicts[key] || {};
  if (p.confirmed) return;
  const rec = { value: clone(value), at: Date.now() };
  state.predicts[key] = { ...p, first: p.first || rec, latest: rec };
  persist();
}
function predictValue(key) { const p = state.predicts[key]; return p ? (p.confirmed || p.latest || p.first || {}).value : undefined; }
function bindPredicts() { /* 화면별 BIND에서 처리 */ }

/* ------------------------------------------------------------ 캐릭터 */
function renderMascot() {
  let slot = $('.mascot-slot');
  if (!slot) { slot = document.createElement('div'); slot.className = 'mascot-slot'; $('.bottom-bar').insertBefore(slot, $('#prev-button')); }
  const id = state.screenId, lv = state.hints[id] || 0;
  const list = HINTS[id] || [];
  const text = mascotState.text || (lv && list[lv - 1]) || (list.length ? (list[0] || list[1]) : '') || '막히면 이 화면의 안내를 다시 읽어 보세요. 그래도 막히면 선생님께 말해 보세요.';
  const mood = mascotState.text ? mascotState.mood : hintMood(lv);
  const canMore = list.length > 1 && lv < list.length && mood !== 'cheer';
  const sig = JSON.stringify([mood, text, id, lv, canMore]);
  if (slot.dataset.sig !== sig) {
    slot.dataset.sig = sig;
    slot.innerHTML = `<div class="mascot-bubble" aria-live="polite" hidden><p>${esc(text)}</p><div class="mascot-actions">${canMore ? '<button id="next-hint" type="button">다음 힌트</button>' : ''}<button id="close-mascot" type="button">닫기</button></div></div><button id="mascot-button" class="mascot-button" type="button"><span aria-hidden="true" class="mascot-fallback" hidden>?</span><img src="../../assets/mascot-${mood}.png" alt="" aria-hidden="true" onerror="this.hidden=true;this.previousElementSibling.hidden=false"></button>`;
    $('#mascot-button').addEventListener('click', () => { mascotState.open = !mascotState.open; renderMascot(); });
    $('#close-mascot').addEventListener('click', () => { mascotState.open = false; renderMascot(); });
    $('#next-hint')?.addEventListener('click', () => {
      const next = Math.min(list.length, (state.hints[id] || 0) + 1);
      state.hints[id] = next;
      logEvent('hint', id, `힌트 ${next}단계 직접 열기`, 'hint');
      mascotState = { mood: hintMood(next), text: list[next - 1] || (next >= 3 ? '선생님께 말해 보세요.' : ''), open: true };
      renderMascot();
    });
  }
  const bubble = slot.querySelector('.mascot-bubble');
  if (bubble) bubble.hidden = !mascotState.open;
  $('#mascot-button')?.setAttribute('aria-label', mascotState.open ? '힌트 닫기' : '힌트 열기');
  if (!window.__mascotAuto) {
    window.__mascotAuto = true;
    const close = (ev) => { if (mascotState.open && ev.target.closest && ev.target.closest('.main-content')) { mascotState.open = false; renderMascot(); } };
    document.addEventListener('focusin', close);
    document.addEventListener('pointerdown', close, true);
  }
}

/* ------------------------------------------------------------ 시작 */
document.addEventListener('DOMContentLoaded', () => {
  $('#screen-count').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const list = activeScreens(), n = Number($('#page-number').value);
    if (!Number.isInteger(n) || n < 1 || n > list.length) { $('#page-number').setCustomValidity(`1부터 ${list.length}까지 입력하세요.`); $('#page-number').reportValidity(); return; }
    navTo(list[n - 1].id);
  });
  $('#page-number').addEventListener('input', (ev) => ev.target.setCustomValidity(''));
  $('#page-number').addEventListener('focus', (ev) => ev.target.select());
  $('#prev-button').addEventListener('click', () => navigate(-1));
  $('#next-button').addEventListener('click', () => navigate(1));
  $('#menu-button').addEventListener('click', () => { const m = $('#activity-menu'); m.hidden = !m.hidden; $('#menu-button').setAttribute('aria-expanded', String(!m.hidden)); });
  $('#menu-close').addEventListener('click', () => { $('#activity-menu').hidden = true; $('#menu-button').setAttribute('aria-expanded', 'false'); });
  $('#export-code').addEventListener('click', () => { $('#progress-code').value = btoa(unescape(encodeURIComponent(JSON.stringify({ ...state, screenId: state.screenId === 'P0' ? resumeView : state.screenId })))); });
  $('#import-code').addEventListener('click', () => {
    try {
      const d = JSON.parse(decodeURIComponent(escape(atob($('#progress-code').value.trim()))));
      if (!validProgress(d)) throw new Error('invalid');
      state = mergeState(d); resumeView = state.screenId; state.screenId = 'P0';
      $('#activity-menu').hidden = true; persist(true); render();
    } catch (e) { $('#progress-code').value = '코드를 읽지 못했습니다.'; }
  });
  window.addEventListener('pagehide', () => persist(true));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persist(true); });
  window.addEventListener('scroll', updateScrollCue, { passive: true });
  window.addEventListener('resize', updateScrollCue);
  if (window.ResizeObserver) new ResizeObserver(updateScrollCue).observe($('#screen-root'));
  $('#scroll-cue').addEventListener('click', () => window.scrollBy({ top: Math.round(window.innerHeight * 0.6), behavior: 'smooth' }));
  render();
});

/* 화면 아래에 내용이 더 있으면 하단 바 위에 「아래에 더 있어요 ↓」와 흐림 띠를 보인다(끝까지 내리면 사라짐) */
function updateScrollCue() {
  const cue = $('#scroll-cue');
  if (!cue) return;
  const bar = $('.bottom-bar');
  const barH = bar ? bar.getBoundingClientRect().height : 0;
  const rootBottom = $('#screen-root').getBoundingClientRect().bottom;
  const more = rootBottom - (window.innerHeight - barH) > 24;
  cue.hidden = !more;
  document.body.classList.toggle('has-more', more);
}
