/* 믿을 수 있게 보내기 — 명세 기반의 의존성 없는 웹앱 */

const STORAGE_KEY = 'gifted26_noisy_state';
const LOG_KEY = 'gifted26_noisy_log';
const SCRIPT_URL = ''; // 배포한 Apps Script URL을 이곳에 넣으면 직접 제출할 수 있습니다.
const NOISE_RATE = 0.1;
const OPTIONAL_IDS = new Set(['N16', 'N17', 'N18', 'N19']);
const WRITE_FIELDS = [
  ['N1_thought', '도입 생각'], ['N2_observe', '잡음 관찰'], ['N2_explain', '읽기 한계'], ['N3_reason', 'N3 예측 이유'],
  ['N5_method', '다수결 판단 방법'], ['N5_compare', '반복 횟수 비교'], ['N6_predict', '통신로 예측'], ['N9_reflect', '통신로 비교 성찰'],
  ['N13_one', '한 칸 찾기 절차'], ['N13_two', '두 칸 오류의 한계'], ['N15_change', '질문 수를 바꾼 이유'], ['N15_binary', '이진 표현 해석'],
  ['N18_reason', '거리와 정정'], ['N19_mariner', '마리너 9호 비교'], ['N20_reflect', '종합 선택']
];

const SCREEN_ORDER = [
  { id: 'N0', activity: '시작', label: '시작' },
  { id: 'N1', activity: '보내면 망가진다', label: '도입' },
  { id: 'N2_operate', activity: '보내면 망가진다', label: '잡음 관찰' },
  { id: 'N2_write', activity: '보내면 망가진다', label: '잡음 관찰 · 작성' },
  { id: 'N3', activity: '보내면 망가진다', label: '예측' },
  { id: 'N4', activity: '다수결', label: '겹쳐 놓고 고르기' },
  { id: 'N5_operate', activity: '다수결', label: '반복 횟수 정하기' },
  { id: 'N5_write', activity: '다수결', label: '반복 횟수 · 작성' },
  { id: 'N6_predict', activity: '통신로 설계', label: '조립 S1 · 예측' },
  { id: 'N6_operate', activity: '통신로 설계', label: '조립 S1 · 시험' },
  { id: 'N7', activity: '통신로 설계', label: '조립 S2' },
  { id: 'N8', activity: '통신로 설계', label: '조립 S3' },
  { id: 'N9', activity: '통신로 설계', label: '비교 · 성찰' },
  { id: 'N10', activity: '어디가 틀렸나', label: '조립 S4' },
  { id: 'N11', activity: '어디가 틀렸나', label: '패리티 놓기' },
  { id: 'N12', activity: '어디가 틀렸나', label: '한 칸 찾기' },
  { id: 'N13_observe', activity: '어디가 틀렸나', label: '두 칸 오류 · 관찰' },
  { id: 'N13_write', activity: '어디가 틀렸나', label: '두 칸 오류 · 작성' },
  { id: 'N14', activity: '질문 세 번', label: '질문 수 예측', optional: false },
  { id: 'N15_operate', activity: '질문 세 번', label: '질문 설계' },
  { id: 'N15_write', activity: '질문 세 번', label: '질문 설계 · 작성' },
  { id: 'N16', activity: '질문 세 번', label: '내 질문 시험', optional: true },
  { id: 'N17', activity: '얼마나 멀어야', label: '부호 설계', optional: true },
  { id: 'N18', activity: '얼마나 멀어야', label: '거리 해석', optional: true },
  { id: 'N19', activity: '닫기', label: '마리너 9호', optional: true },
  { id: 'N20', activity: '닫기', label: '종합' },
  { id: 'N21', activity: '닫기', label: '제출' }
];

const HINTS = {
  N2_operate: [
    '같은 오류율이어도 매번 다른 자리가 바뀔 수 있어요.',
    '오류율은 한 번의 결과가 아니라 여러 번의 경향을 말해요. 바뀐 자리를 비교해 보세요.',
    '무작위 오류에서는 한 번 받은 결과만으로 원래 값을 확정하기 어렵습니다.'
  ],
  N4: [
    '각 세로줄에서 같은 값이 몇 번 나왔는지 세어 보세요.',
    '세 값 중 둘 이상 같은 쪽을 고르면 한 번의 잡음을 덜 흔들리게 볼 수 있어요.',
    '여러 번 관찰한 값에서 더 많은 쪽을 선택하는 것이 다수결입니다.'
  ],
  N5_operate: [
    '각 열의 0과 1 개수를 먼저 세어 보세요.',
    '짝수 번 관찰하면 같은 수가 나오는 경우도 있습니다. 그 열을 표시해 보세요.',
    '다수결이 항상 하나로 정해지려면 관찰 횟수의 홀짝도 살펴야 합니다.'
  ],
  N6_operate: [
    '8비트 중 절반도 제대로 도착하지 못했습니다.',
    '신호가 잡음 구간을 한 번 지납니다. 받는 쪽에 값이 하나만 도착하면, 그 값이 맞는지 판단할 근거가 있을까요?',
    '여러 개가 도착하면 그중 많은 쪽을 고를 수 있습니다. 그러려면 최소 몇 개가 필요할까요?'
  ],
  N7: [
    '아직 4분의 3에 못 미칩니다.',
    '블록이 놓인 순서를 보세요. 복제가 잡음을 만나기 전에 일어나고 있나요?',
    '여러 개를 받은 쪽에서 무엇을 해야 하나요? 앞에서 손으로 해 본 그것입니다.'
  ],
  N8: [
    '성공률 조건은 만족했습니다. 전송량도 확인해 보세요.',
    '8비트를 24비트로 보낸다는 것은 한 비트당 몇 개를 쓴다는 뜻일까요?',
    '다수결이 가능한 가장 작은 홀수를 생각해 보세요. 앞에서 만난 것입니다.'
  ],
  N10: [
    '검사 비트가 붙어 있고, 검사를 잡음 구간 뒤에 하고 있나요?',
    '검사 비트는 메시지를 고치는 대신 이상이 있다는 사실만 알려 주는 장치입니다.',
    '전체 1의 개수가 짝수가 되도록 한 비트를 붙이면, 한 비트가 뒤집혔을 때 홀수가 됩니다.'
  ],
  N12: [
    '아직 아닙니다. 어느 줄이 이상한지 먼저 찾아보세요.',
    '가로줄을 하나씩 세어 보세요. 볼록한 점이 홀수인 줄이 있습니다.',
    '이상한 가로줄과 이상한 세로줄이 만나는 곳을 생각해 보세요.'
  ],
  N15_operate: [
    '아직 구별되지 않는 자리가 있습니다. 표에서 같은 답 패턴을 찾아보세요.',
    '질문 하나의 답은 예 또는 아니오 두 가지입니다. 질문 두 개로 만들 수 있는 패턴 수를 세어 보세요.',
    '여덟 가지 경우를 가르려면 답 패턴이 여덟 개 모두 달라야 합니다.'
  ],
  N17: [
    '두 줄을 골라 다른 칸의 개수를 세어 보세요.',
    '모든 두 부호가 적어도 세 자리 달라야 합니다.',
    '한 칸 오류가 생겨도 원래 부호와 다른 부호를 구별하려면 최소 거리가 필요합니다.'
  ]
};

const ACTIVITY_SECTIONS = {
  N0: '0 시작', N1: '1 보내면 망가진다', N2_operate: '1 보내면 망가진다', N2_write: '1 보내면 망가진다', N3: '1 보내면 망가진다',
  N4: '2 다수결', N5_operate: '2 다수결', N5_write: '2 다수결', N6_predict: '3 통신로 설계', N6_operate: '3 통신로 설계', N7: '3 통신로 설계', N8: '3 통신로 설계', N9: '3 통신로 설계',
  N10: '4 어디가 틀렸나', N11: '4 어디가 틀렸나', N12: '4 어디가 틀렸나', N13_observe: '4 어디가 틀렸나', N13_write: '4 어디가 틀렸나', N14: '5 질문 세 번', N15_operate: '5 질문 세 번', N15_write: '5 질문 세 번', N16: '5 질문 세 번',
  N17: '6 얼마나 멀어야', N18: '6 얼마나 멀어야', N19: '7 닫기', N20: '7 닫기', N21: '7 닫기'
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function defaultCircuit(stage = 'N6') {
  const fixed = ['message', 'receiver'];
  if (stage === 'N10') return { nodes: ['message', 'parityEncode', 'noise', 'parityCheck', 'receiver'], selected: null, version: 0, lastResult: null };
  return { nodes: ['message', 'noise', 'receiver'], selected: null, version: 0, lastResult: null, fixed };
}

function createParityGrid() {
  const data = Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => ((r * 5 + c * 3 + r + c) % 2)));
  return { data, values: Array.from({ length: 7 }, () => Array(7).fill(null)), placed: [], check: null };
}

function initialState() {
  return {
    v: 1,
    student: { sid: '', name: '' },
    screenId: 'N0',
    includeOptional: false,
    views: {},
    writes: {},
    hints: {},
    hintOpen: false,
    guideSeen: {},
    screens: {
      N2: { rate: 10, sends: 0, lastBits: null },
      N3: { prediction: '', locked: false, reason: '' },
      N4: { answer: Array(8).fill(null), checked: false },
      N5: { count: 3, answer: [], checked: false, ties: [] },
      N6: { predictionLocked: false },
      N12: { round: 0, guesses: [], board: null },
      N14: { prediction: '', confirmed: false },
      N15: { groups: [[], [], []], checked: false },
      N16: { round: 0, guesses: [], cases: [] },
      N17: { codes: ['000000', '011011', '101101', '110110'], query: null, guess: '', tested: false }
    },
    circuits: { N6: defaultCircuit('N6'), N7: defaultCircuit('N7'), N8: defaultCircuit('N8'), N10: defaultCircuit('N10') },
    parity: createParityGrid(),
    submitted: { at: 0, code: '', status: '' },
    log: [],
    lastSavedAt: 0
  };
}

let state = loadState();
let saveTimer = null;
let mascotState = { mood: 'idle', text: '조작할 곳을 찾았다면, 네 방법으로 먼저 시험해 보세요.', open: false };

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw);
    const fresh = initialState();
    const merged = { ...fresh, ...parsed, student: { ...fresh.student, ...(parsed.student || {}) }, screens: { ...fresh.screens, ...(parsed.screens || {}) }, circuits: { ...fresh.circuits, ...(parsed.circuits || {}) }, submitted: { ...fresh.submitted, ...(parsed.submitted || {}) } };
    merged.log = Array.isArray(parsed.log) ? parsed.log : [];
    merged.writes = parsed.writes || {};
    merged.hints = parsed.hints || {};
    merged.parity = parsed.parity && parsed.parity.data ? parsed.parity : fresh.parity;
    return merged;
  } catch (error) {
    return initialState();
  }
}

function persist(immediate = false) {
  clearTimeout(saveTimer);
  const action = () => {
    try {
      state.lastSavedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem(LOG_KEY, JSON.stringify(state.log));
      const save = $('#save-state');
      if (save) save.textContent = `자동 저장됨 ${new Date(state.lastSavedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch (error) {
      const save = $('#save-state');
      if (save) save.textContent = '저장할 수 없음';
    }
  };
  if (immediate) action(); else saveTimer = setTimeout(action, 300);
}

function logEvent(kind, screen, detail = {}, result = '') {
  state.log.push({ t: Date.now(), screen, kind, ...detail, result, hintLevel: state.hints[screen] || 0 });
  if (state.log.length > 2000) state.log = state.log.slice(-2000);
  persist();
}

function activeScreens() {
  return SCREEN_ORDER.filter(screen => state.includeOptional || !screen.optional);
}

function currentIndex() {
  let index = activeScreens().findIndex(screen => screen.id === state.screenId);
  if (index < 0) {
    state.screenId = state.includeOptional ? 'N0' : 'N20';
    index = activeScreens().findIndex(screen => screen.id === state.screenId);
  }
  return Math.max(index, 0);
}

function screenInfo(id = state.screenId) { return SCREEN_ORDER.find(screen => screen.id === id) || SCREEN_ORDER[0]; }

function updateStudentField(key, value) {
  state.student[key] = value;
  persist();
}

function hasResumeData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return Boolean(saved && (saved.screenId && saved.screenId !== 'N0' || saved.student?.sid?.trim() || saved.student?.name?.trim() || Object.keys(saved.writes || {}).length || (saved.log || []).length));
  } catch (error) {
    return false;
  }
}

function recordView(id = state.screenId) {
  state.views[id] = { ...(state.views[id] || {}), visited: true, at: Date.now() };
  persist();
}

function navTo(id, { log = true } = {}) {
  const target = activeScreens().find(screen => screen.id === id);
  if (!target) return;
  if (log && state.screenId !== id) logEvent('nav', state.screenId, { to: id });
  state.screenId = id;
  state.hintOpen = false;
  mascotState = { mood: 'idle', text: '', open: false };
  recordView(id);
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigate(delta) {
  const screens = activeScreens();
  const index = currentIndex();
  if (delta > 0 && state.screenId === 'N0' && (!state.student.sid.trim() || !state.student.name.trim())) {
    const note = $('#n0-validation');
    if (note) { note.textContent = '학번과 이름을 입력하면 이어서 진행할 수 있어요.'; note.className = 'result fail'; }
    $('#student-sid')?.focus();
    return;
  }
  const next = screens[index + delta];
  if (next) navTo(next.id);
}

function render() {
  const info = screenInfo();
  currentIndex();
  recordView(info.id);
  $('#section-label').textContent = ACTIVITY_SECTIONS[info.id] || '';
  $('#screen-root').innerHTML = renderScreen(info.id);
  bindScreen(info.id);
  updateNavigation();
  renderActivityMenu();
  renderMascot();
}

function updateNavigation() {
  const screens = activeScreens();
  const index = currentIndex();
  const percent = Math.round(((index + 1) / screens.length) * 100);
  $('#progress-bar').style.width = `${percent}%`;
  $('#screen-count').textContent = `${index + 1} / ${screens.length}`;
  $('#prev-button').disabled = index === 0;
  $('#next-button').disabled = index >= screens.length - 1;
  $('#next-button').textContent = state.screenId === 'N21' ? '완료' : '다음';
}

function renderActivityMenu() {
  const list = $('#activity-list');
  if (!list) return;
  const screens = activeScreens();
  list.innerHTML = screens.map(screen => {
    const visited = state.views[screen.id]?.visited;
    const active = screen.id === state.screenId;
    const optional = screen.optional ? ' optional' : '';
    return `<button type="button" class="activity-link${active ? ' active' : ''}${optional}" data-nav="${screen.id}">
      <span class="activity-id" aria-hidden="true">·</span>
      <span>${esc(screen.label)}${screen.optional ? ' · 선택' : ''}</span>
      <span class="activity-status">${active ? '현재' : visited ? '방문' : ''}</span>
    </button>`;
  }).join('');
  $$('.activity-link', list).forEach(button => button.addEventListener('click', () => {
    navTo(button.dataset.nav);
    $('#activity-menu').hidden = true;
    $('#menu-button').setAttribute('aria-expanded', 'false');
  }));
}

function renderScreen(id) {
  const renderers = {
    N0: renderN0, N1: renderN1, N2_operate: renderN2Operate, N2_write: renderN2Write, N3: renderN3, N4: renderN4,
    N5_operate: renderN5Operate, N5_write: renderN5Write, N6_predict: renderN6Predict, N6_operate: renderCircuitScreen,
    N7: renderCircuitScreen, N8: renderCircuitScreen, N9: renderN9, N10: renderCircuitScreen, N11: renderN11, N12: renderN12,
    N13_observe: renderN13Observe, N13_write: renderN13Write, N14: renderN14, N15_operate: renderN15Operate, N15_write: renderN15Write,
    N16: renderN16, N17: renderN17, N18: renderN18, N19: renderN19, N20: renderN20, N21: renderN21
  };
  return `<section class="screen">${(renderers[id] || renderN1)(id)}</section>`;
}

function heading(kicker, title, text) {
  return `<div class="screen-heading"><span class="eyebrow">${esc(kicker)}</span><h2>${esc(title)}</h2><p>${esc(text)}</p></div>`;
}

function writeBox(id, prompt, kind = 'explain', options = {}) {
  const value = state.writes[id] || '';
  const locked = options.locked || false;
  return `<div class="write-item">
    <label for="write-${esc(id)}">${esc(prompt)}</label>
    ${options.hint ? `<small>${esc(options.hint)}</small>` : ''}
    <textarea id="write-${esc(id)}" data-write="${esc(id)}" data-kind="${esc(kind)}" ${locked ? 'disabled' : ''} placeholder="실험 결과를 근거로 적어 보세요.">${esc(value)}</textarea>
    ${locked ? '<small class="muted">확정한 예측은 원 기록으로 보존됩니다.</small>' : ''}
  </div>`;
}

function evidenceFor(ids = []) {
  const logs = state.log.filter(item => item.kind === 'attempt' && ids.includes(item.screen));
  if (!logs.length) return '<div class="evidence muted">아직 실행 기록이 없습니다.</div>';
  const rows = logs.slice(-8).map((item, index) => `<div>${index + 1}차 — ${esc(item.detail || item.result || '실행 기록')} ${item.result === 'ok' ? '✓' : ''}</div>`).join('');
  return `<details class="attempt-details"><summary>이 섹션의 시도 이력 ${logs.length}회</summary><div class="evidence">${rows}</div></details>`;
}

function renderN0() {
  const hasSaved = hasResumeData();
  return `${heading('0 시작', '오류가 있어도 읽을 수 있게 보내려면?', '보내는 방법을 직접 바꾸고, 여러 번 시험하면서 어떤 방법이 믿을 만한지 찾아봅니다.')}
  <div class="screen-layout">
    <div class="card stack">
      <h3>학생 정보</h3>
      <div class="two-column">
        <div class="field"><label for="student-sid">학번</label><input id="student-sid" type="text" autocomplete="off" value="${esc(state.student.sid)}" placeholder="예: 20101"></div>
        <div class="field"><label for="student-name">이름</label><input id="student-name" type="text" autocomplete="name" value="${esc(state.student.name)}" placeholder="이름을 입력하세요"></div>
      </div>
      <label class="choice" style="display:flex;align-items:center;gap:9px"><input id="include-optional" type="checkbox" ${state.includeOptional ? 'checked' : ''}><span>선택 활동도 포함하기</span></label>
      <div id="n0-validation" class="result" role="status">${hasSaved ? '저장된 기록이 있습니다. 이어할 위치는 활동 목록에서 다시 열 수 있어요.' : '입력한 내용은 이 브라우저에 자동 저장됩니다.'}</div>
      <p class="muted small" style="margin:0">시크릿 모드나 사이트 데이터 삭제에서는 기록이 사라질 수 있습니다. 차시가 끝날 때 진행 코드를 복사해 두세요.</p>
      <div class="button-row"><button id="resume-button" class="primary-button" type="button" ${hasSaved ? '' : 'disabled'}>이어서 하기</button><button id="new-button" class="secondary-button" type="button">새로 시작</button></div>
    </div>
    <div class="card">
      <h3>오늘의 흐름</h3>
      <ul class="check-list"><li>잡음을 직접 보고, 반복과 다수결을 비교합니다.</li><li>통신로를 설계하고 정확성과 전송량을 함께 살핍니다.</li><li>패리티와 질문 설계로 오류 위치를 찾아봅니다.</li><li>마지막에는 실제 시도와 생각의 변화를 제출합니다.</li></ul>
      <p class="muted small" style="margin-bottom:0">선택 활동은 언제든 활동 목록에서 포함하거나 건너뛸 수 있습니다.</p>
    </div>
  </div>`;
}

function renderN1() {
  return `${heading('1 보내면 망가진다', '짝에게 보낸 암호문에 점 하나가 눌렸다면?', '받는 사람이 원래 메시지를 알아볼 수 있도록 하려면, 보내는 쪽에서 무엇을 바꿀 수 있을까요?')}
  <div class="card stack"><div class="notice">오늘은 오류를 없애는 것이 아니라, 오류가 있어도 원래 뜻을 추측할 수 있는 방법을 설계합니다.</div><div class="writing-list">${writeBox('N1_thought', '지금 떠오르는 방법을 한 가지 적어 보세요.', 'reflect')}</div></div>`;
}

function nameBits() {
  const source = state.student.name || '학생';
  const bytes = [...source].slice(0, 4).map(char => char.codePointAt(0) % 256);
  const bits = bytes.flatMap(byte => byte.toString(2).padStart(8, '0').split('').map(Number));
  return bits.length ? bits : [0, 1, 0, 1, 1, 0, 1, 0];
}

function makeBrailleCells(bits, rate, seed = 0) {
  const cells = [];
  for (let i = 0; i < 8; i += 1) {
    const source = bits.slice(i * 8, i * 8 + 8);
    const displayed = source.map((bit, j) => {
      const shouldFlip = ((seed + i * 7 + j * 11) % 100) < rate;
      return shouldFlip ? 1 - bit : bit;
    });
    cells.push({ source, displayed });
  }
  return cells;
}

function brailleHtml(cells) {
  return `<div class="braille-cells">${cells.map(cell => `<div class="braille-cell" aria-label="점자 8점 ${cell.displayed.join(' ')}">${cell.displayed.map(bit => `<span class="braille-dot ${bit ? 'on' : ''}"></span>`).join('')}</div>`).join('')}</div>`;
}

function renderN2Operate() {
  const n2 = state.screens.N2;
  const bits = nameBits();
  const cells = n2.lastBits || makeBrailleCells(bits, n2.rate, n2.sends);
  return `${heading('1 보내면 망가진다 · 관찰', '내 이름은 어디까지 읽을 수 있을까?', '오류율을 바꾸고 같은 메시지를 다시 보내 보세요. 같은 비율이어도 바뀌는 자리는 달라질 수 있습니다.')}
  <div class="card stack">
    <div class="braille-card"><strong>현재 받은 점자</strong>${brailleHtml(cells)}<span class="muted small">오류율 ${n2.rate}% · 다시 보낸 횟수 ${n2.sends}회</span></div>
    <div class="slider-wrap"><label for="noise-rate"><strong>오류율</strong> <output id="noise-rate-value">${n2.rate}%</output></label><input id="noise-rate" type="range" min="0" max="30" value="${n2.rate}"></div>
    <div class="button-row"><button id="resend-noise" class="primary-button" type="button">다시 보내기</button><button id="open-noise-guide" class="secondary-button" type="button">조작 안내</button></div>
    <div id="noise-result" class="status-line" role="status"><span class="muted">판정하지 않습니다. 달라진 점을 관찰해 보세요.</span></div>
  </div>`;
}

function renderN2Write() {
  const n2 = state.screens.N2;
  return `${heading('1 보내면 망가진다 · 작성', '관찰한 변화를 근거로 설명해 보세요.', '직전 실험의 오류율과 다시 보낸 횟수가 함께 기록되어 있습니다.')}
  <div class="card stack"><div class="evidence">오류율 ${n2.rate}% · 다시 보낸 횟수 ${n2.sends}회</div><div class="writing-list">${writeBox('N2_observe', '같은 오류율인데 누를 때마다 결과가 다른 이유는?', 'observe')}${writeBox('N2_explain', '내 이름을 읽을 수 있는 한계는 몇 %인가요? 그렇게 정한 이유는?', 'explain')}</div></div>`;
}

function renderN3() {
  const n3 = state.screens.N3;
  return `${heading('1 보내면 망가진다 · 예측', '몇 번 반복해서 보내면 더 잘 읽을 수 있을까?', '실험 결과를 보기 전에 예측을 정합니다. 확정한 최초 응답은 나중에 바뀌지 않습니다.')}
  <div class="card stack"><div class="choice-grid">${['1회', '3회', '5회'].map(option => `<div class="choice"><input id="n3-${option}" name="n3" type="radio" value="${option}" ${n3.prediction === option ? 'checked' : ''} ${n3.locked ? 'disabled' : ''}><label for="n3-${option}">${option}</label></div>`).join('')}</div>${writeBox('N3_reason', '왜 그렇게 예상했나요?', 'predict', { locked: n3.locked })}<div class="button-row"><button id="confirm-n3" class="primary-button" type="button" ${n3.locked ? 'disabled' : ''}>예측 확정</button>${n3.locked ? '<span class="result ok">예측이 잠겼습니다.</span>' : ''}</div></div>`;
}

function rowsHtml(rows, answer = [], editable = false, ties = []) {
  return `<div class="bit-display">${rows.map((row, r) => `<div class="bit-row"><span class="row-label">${r + 1}차</span>${row.map((bit, c) => `<span class="bit" aria-label="${r + 1}차 ${c + 1}번째 ${bit}">${bit}</span>`).join('')}</div>`).join('')}${editable ? `<div class="bit-row"><span class="row-label">내 답</span>${answer.map((value, c) => `<button type="button" class="bit-button ${value === null ? 'empty' : 'selected'} ${ties.includes(c) ? 'tie' : ''}" data-majority-index="${c}" aria-label="${c + 1}번째 답 ${value === null ? '미선택' : value}">${value === null ? '·' : value}</button>`).join('')}</div>` : ''}</div>`;
}

function renderN4() {
  const rows = [[1,0,1,0,1,0,1,1], [1,0,0,0,1,1,1,1], [1,1,1,0,0,1,1,0]];
  const n4 = state.screens.N4;
  const correct = rows[0].map((_, c) => rows.map(row => row[c]).filter(Boolean).length >= 2 ? 1 : 0);
  const chosen = n4.answer.every(value => value !== null);
  const success = chosen && n4.answer.every((value, i) => value === correct[i]);
  return `${heading('2 다수결', '겹쳐 놓고, 열마다 하나를 골라 보세요.', '세 줄을 한 열씩 비교해 내 답을 정합니다. 복원된 점자는 선택에 따라 바로 바뀝니다.')}
  <div class="card stack">${rowsHtml(rows, n4.answer, true)}<div class="result ${success ? 'ok' : chosen ? 'fail' : ''}" role="status">${!chosen ? '8칸을 모두 선택해 보세요.' : success ? '복원된 메시지가 읽힙니다.' : '아직 깨진 부분이 있습니다. 어느 열인지 직접 다시 살펴보세요.'}</div><div class="button-row"><button id="reset-n4" class="secondary-button" type="button">선택 다시 하기</button><button id="open-n4-guide" class="secondary-button" type="button">조작 안내</button></div></div>`;
}

function renderN5Operate() {
  const n5 = state.screens.N5;
  const rows = repeatedRows(n5.count);
  const ties = columnTies(rows);
  const answer = n5.answer.length === 8 ? n5.answer : Array(8).fill(null);
  const complete = answer.every(value => value !== null);
  const hasTie = ties.length > 0;
  const correct = majorityAnswers(rows);
  const success = complete && !hasTie && answer.every((value, i) => value === correct[i]);
  return `${heading('2 다수결 · 조작', '반복 횟수를 내가 정하면 무엇이 달라질까?', '3·4·5줄 중 하나를 골라 같은 방식으로 답을 정합니다. 4줄의 동점은 미리 알려 주지 않습니다.')}
  <div class="card stack"><div class="choice-grid">${[3,4,5].map(count => `<div class="choice"><input id="n5-count-${count}" name="n5-count" type="radio" value="${count}" ${n5.count === count ? 'checked' : ''}><label for="n5-count-${count}">${count}줄 보기</label></div>`).join('')}</div>${rowsHtml(rows, answer, true)}<div class="result ${hasTie ? 'partial' : success ? 'ok' : complete ? 'fail' : ''}" role="status">${hasTie ? `동점인 열이 ${ties.map(value => value + 1).join(', ')}번째에 있습니다. 한쪽을 다수라고 정하기 어렵습니다.` : !complete ? '내 답 행을 채워 보세요.' : success ? '이 반복 횟수에서는 모든 열을 정할 수 있습니다.' : '선택한 답과 각 열의 값을 다시 비교해 보세요.'}</div><div class="button-row"><button id="reset-n5" class="secondary-button" type="button">답 다시 하기</button><button id="open-n5-guide" class="secondary-button" type="button">조작 안내</button></div></div>`;
}

function repeatedRows(count) {
  const base = [1,0,1,0,1,0,1,1];
  return Array.from({ length: count }, (_, r) => base.map((bit, c) => ((r + c * 2 + (r === count - 1 ? 1 : 0)) % 5 === 0 ? 1 - bit : bit)));
}

function majorityAnswers(rows) {
  return Array.from({ length: 8 }, (_, c) => {
    const ones = rows.filter(row => row[c] === 1).length;
    return ones * 2 > rows.length ? 1 : ones * 2 < rows.length ? 0 : null;
  });
}

function columnTies(rows) { return majorityAnswers(rows).map((v, i) => v === null ? i : -1).filter(i => i >= 0); }

function renderN5Write() {
  const n5 = state.screens.N5;
  const rows = repeatedRows(n5.count);
  return `${heading('2 다수결 · 작성', '반복 횟수와 판단 방법을 돌아보세요.', `선택한 ${n5.count}줄의 결과와 동점 여부가 근거로 남아 있습니다.`)}
  <div class="card stack"><div class="evidence">선택한 반복: ${n5.count}줄 · 동점 열: ${columnTies(rows).length ? columnTies(rows).map(i => i + 1).join(', ') : '없음'}</div><div class="writing-list">${writeBox('N5_method', '각 열에서 어떻게 판단했나요?', 'explain')}${writeBox('N5_compare', '왜 3번, 5번은 되는데 4번은 안 될까요?', 'explain')}</div>${evidenceFor(['N5_operate'])}</div>`;
}

function circuitBlockLabel(type) {
  return ({ message: '메시지 8비트', repeat3: '3번 반복', repeat5: '5번 반복', noise: '잡음 구간', majority: '다수결', parityEncode: '패리티 붙이기', parityCheck: '패리티 검사', receiver: '받은 메시지' })[type] || type;
}

function circuitNode(type, index, selected, fixed = false) {
  return `<div class="circuit-node ${fixed ? 'fixed' : ''} ${selected === index ? 'selected' : ''}" data-node-index="${index}" tabindex="0" role="button" aria-label="${esc(circuitBlockLabel(type))} 블록">
    <strong>${esc(circuitBlockLabel(type))}</strong><span class="muted small">${fixed ? '고정 블록' : '설계 블록'}</span>
    ${!fixed ? `<div class="node-actions"><button type="button" data-node-action="up" data-node-index="${index}" aria-label="위로 이동">↑</button><button type="button" data-node-action="down" data-node-index="${index}" aria-label="아래로 이동">↓</button><button type="button" data-node-action="remove" data-node-index="${index}" aria-label="블록 삭제">삭제</button></div>` : ''}
  </div>`;
}

function circuitConfigFor(id) { return state.circuits[id] || state.circuits.N6; }

/* ── 통신로 시뮬레이션 (명세서 §6-2, §17-2) ───────────────────────────────
   블록을 왼쪽에서 오른쪽 순서로 신호 배열에 적용한다. 순서가 결과를 바꾼다.
   화면에 쓰는 모든 수치는 실제 난수 시행의 상대도수이며 상수를 쓰지 않는다. */
const TRIALS = 1000;
const SOURCE = [1, 0, 1, 1, 0, 0, 1, 0];
const SOURCE_BITS = SOURCE.length;

/* 난수 없이 길이만 따라가며 최종 길이·전송량·구조 경고를 구한다. */
function analyzeCircuit(nodes) {
  let length = SOURCE_BITS;
  let groupSize = 1;
  let parityAttached = false;
  let noiseBits = 0;
  const warnings = [];
  for (const type of nodes) {
    if (type === 'repeat3' || type === 'repeat5') {
      const k = type === 'repeat3' ? 3 : 5;
      length *= k;
      groupSize *= k;
    } else if (type === 'parityEncode') {
      length += 1;
      parityAttached = true;
    } else if (type === 'noise') {
      noiseBits = length;
    } else if (type === 'majority') {
      if (groupSize <= 1) { warnings.push('다수결할 대상이 없습니다. 앞쪽에 반복 블록이 필요합니다.'); continue; }
      length = Math.floor(length / groupSize);
      groupSize = 1;
    } else if (type === 'parityCheck') {
      if (!parityAttached) { warnings.push('검사할 검사 비트가 없습니다. 앞쪽에 패리티 붙이기가 필요합니다.'); continue; }
      length -= 1;
      parityAttached = false;
    }
  }
  const canCompare = length === SOURCE_BITS;
  if (!canCompare) warnings.push(`최종 신호가 ${length}비트입니다. 원본 ${SOURCE_BITS}비트와 나란히 비교할 수 없습니다.`);
  return { canCompare, finalLength: length, noiseBits, warnings };
}

/* 파이프라인 1회 실행. mode 'noise'는 각 비트를 NOISE_RATE로, 'one'은 정확히 한 비트를 뒤집는다. */
function runPipelineOnce(nodes, mode) {
  let signal = SOURCE.slice();
  let groupSize = 1;
  let parityAttached = false;
  let detected = false;
  for (const type of nodes) {
    if (type === 'repeat3' || type === 'repeat5') {
      const k = type === 'repeat3' ? 3 : 5;
      const next = [];
      for (const bit of signal) for (let i = 0; i < k; i += 1) next.push(bit);
      signal = next;
      groupSize *= k;
    } else if (type === 'parityEncode') {
      signal = signal.concat([signal.reduce((sum, bit) => sum + bit, 0) % 2]);
      parityAttached = true;
    } else if (type === 'noise') {
      if (mode === 'one') {
        const at = Math.floor(Math.random() * signal.length);
        signal = signal.map((bit, index) => (index === at ? bit ^ 1 : bit));
      } else {
        signal = signal.map(bit => (Math.random() < NOISE_RATE ? bit ^ 1 : bit));
      }
    } else if (type === 'majority') {
      if (groupSize <= 1) continue;
      const next = [];
      for (let i = 0; i + groupSize <= signal.length; i += groupSize) {
        let ones = 0;
        for (let j = 0; j < groupSize; j += 1) ones += signal[i + j];
        /* 짝수 반복은 동점이 생긴다. 다수결로 정할 수 없으므로 한쪽을 무작위로 고른다. */
        next.push(ones * 2 === groupSize ? (Math.random() < 0.5 ? 1 : 0) : (ones * 2 > groupSize ? 1 : 0));
      }
      signal = next;
      groupSize = 1;
    } else if (type === 'parityCheck') {
      if (!parityAttached) continue;
      detected = signal.reduce((sum, bit) => sum + bit, 0) % 2 !== 0;
      signal = signal.slice(0, -1);
      parityAttached = false;
    }
  }
  return { signal, detected };
}

/* 1000회 시행의 상대도수를 낸다. N10은 한 비트 오류를 강제로 넣어 탐지율을 본다. */
function simulateCircuit(nodes, stage) {
  const info = analyzeCircuit(nodes);
  if (!info.canCompare) return { ...info, ran: false };
  const mode = stage === 'N10' ? 'one' : 'noise';
  let exact = 0;
  let bitHits = 0;
  let detectHits = 0;
  for (let t = 0; t < TRIALS; t += 1) {
    const out = runPipelineOnce(nodes, mode);
    let same = 0;
    for (let i = 0; i < SOURCE_BITS; i += 1) if (out.signal[i] === SOURCE[i]) same += 1;
    bitHits += same;
    if (same === SOURCE_BITS) exact += 1;
    if (out.detected) detectHits += 1;
  }
  return {
    ...info,
    ran: true,
    trials: TRIALS,
    messageSuccess: (exact / TRIALS) * 100,
    bitRecovery: (bitHits / (TRIALS * SOURCE_BITS)) * 100,
    detectRate: (detectHits / TRIALS) * 100,
    bits: info.noiseBits
  };
}

/* 판정은 측정값만으로 한다(명세서 §17-4). 블록 구성을 조건에 넣지 않는다 —
   5번 반복으로 푼 학생이 탈락해서는 안 된다. */
const MESSAGE_GOAL = 75;

function judgeCircuit(metric, stage) {
  if (!metric || !metric.ran) return 'blocked';
  if (stage === 'N6') return 'ok';
  if (stage === 'N7') return metric.messageSuccess >= MESSAGE_GOAL ? 'ok' : 'fail';
  if (stage === 'N8') {
    const accurate = metric.messageSuccess >= MESSAGE_GOAL;
    const cheap = metric.bits <= 24;
    return accurate && cheap ? 'ok' : (accurate || cheap ? 'partial' : 'fail');
  }
  if (stage === 'N10') {
    const cheap = metric.bits <= 9;
    const detects = metric.detectRate >= 100;
    return cheap && detects ? 'ok' : (cheap || detects ? 'partial' : 'fail');
  }
  return 'fail';
}

/* 1단계 힌트는 학생이 방금 만든 결과에 맞춰 고른다(명세서 §24).
   2·3단계는 HINTS의 고정 문구를 그대로 쓴다. */
function circuitHint(stage, level, metric) {
  const fixed = (HINTS[stage === 'N6' ? 'N6_operate' : stage] || [])[Math.max(0, level - 1)];
  if (level !== 1 || !metric || !metric.ran) return fixed;
  if (stage === 'N8') {
    const accurate = metric.messageSuccess >= MESSAGE_GOAL;
    const cheap = metric.bits <= 24;
    if (accurate && !cheap) return '성공률 조건은 만족했습니다. 전송량도 확인해 보세요.';
    if (!accurate && cheap) return '전송량은 넉넉합니다. 8비트가 모두 맞을 확률을 4분의 3까지 올려 보세요.';
    return '성공률과 전송량이 아직 둘 다 조건에 못 미칩니다.';
  }
  if (stage === 'N10') {
    const cheap = metric.bits <= 9;
    const detects = metric.detectRate >= 100;
    if (cheap && !detects) return '전송량은 조건 안에 있습니다. 오류를 알아채지 못한 까닭을 살펴보세요.';
    if (!cheap && detects) return '오류는 알아챘습니다. 전송량이 9비트를 넘었습니다.';
  }
  return fixed;
}

function circuitDetail(metric, stage) {
  if (stage === 'N10') return `전송량 ${metric.bits}비트 · 한 비트 오류 탐지율 ${metric.detectRate.toFixed(1)}% · ${metric.trials}회 시행`;
  return `메시지 전체 성공률 ${metric.messageSuccess.toFixed(1)}% · 비트 복원률 ${metric.bitRecovery.toFixed(1)}% · 전송량 ${metric.bits}비트 · ${metric.trials}회 시행`;
}

const STAGE_COPY = {
  N6: ['조립 S1 · 시험', '일단 보내 보고, 잡음이 얼마나 남는지 확인합니다.', '메시지 → 잡음 → 받은 메시지가 이어진 상태에서 실행해 보세요.'],
  N7: ['조립 S2', '정확하게 보내는 통신로를 설계해 보세요.', '목표는 8비트가 모두 맞을 확률 4분의 3(75%) 이상입니다.'],
  N8: ['조립 S3', '정확하고 싸게 보내 보세요.', '8비트가 모두 맞을 확률 75% 이상이면서, 잡음 구간을 지나는 비트가 24개 이하여야 합니다.'],
  N10: ['조립 S4', '9비트로 보내되, 오류를 알아채는 방법을 설계해 보세요.', '잡음 구간을 지나는 비트 9개 이하에서 한 비트 오류를 100% 알아채는 구조를 만들어 봅니다.']
};

const VERDICT_TEXT = {
  ok: '목표 조건을 만족했습니다.',
  partial: '조건 하나는 만족했습니다. 남은 조건을 확인해 보세요.',
  fail: '아직 조건을 만족하지 않습니다. 다른 구성을 시험해 보세요.',
  blocked: '지금 구성으로는 결과를 낼 수 없습니다.'
};

/* N8은 N7의 설계를 이어받는다(명세서 §9). 학생이 손대지 않은 경우에만 복사한다. */
function inheritCircuit(stage) {
  if (stage !== 'N8') return;
  const target = state.circuits.N8;
  const source = state.circuits.N7;
  if (!target || !source || target.inherited) return;
  /* 첫 진입에서 한 번만 물려받는다. 매 렌더마다 돌면 방금 낸 실행 결과를 지운다. */
  if (target.version === 0 && source.version > 0) {
    target.nodes = source.nodes.slice();
    target.selected = null;
    target.lastResult = null;
  }
  target.inherited = true;
}

function renderCircuitScreen(id) {
  const stage = id === 'N6_operate' ? 'N6' : id;
  inheritCircuit(stage);
  const circuit = circuitConfigFor(stage);
  const info = analyzeCircuit(circuit.nodes);
  const last = circuit.lastResult;
  const stale = Boolean(last) && last.version !== circuit.version;
  const copy = STAGE_COPY[stage] || ['통신로 조립', '블록을 골라 통신로를 바꾸어 보세요.', ''];

  const flow = circuit.nodes.map((node, index) => {
    const fixed = node === 'message' || node === 'noise' || node === 'receiver';
    return `${circuitNode(node, index, circuit.selected, fixed)}${index < circuit.nodes.length - 1 ? '<span class="circuit-arrow" aria-hidden="true">→</span>' : ''}`;
  }).join('');

  const palette = ['repeat3', 'repeat5', 'majority', 'parityEncode', 'parityCheck']
    .map(type => `<button type="button" data-add-block="${type}">+ ${circuitBlockLabel(type)}</button>`).join('');

  const warnBox = info.warnings.length
    ? `<div class="result fail" role="status">${resultIcon('fail')} ${info.warnings.map(esc).join('<br>')}</div>`
    : '';

  let resultBox = '<p class="muted small" style="margin:0">아직 실행하지 않았습니다. 설계한 통신로를 시험해 보세요.</p>';
  if (last) {
    const m = last.metric;
    const headline = stage === 'N10'
      ? { label: '한 비트 오류 탐지율', value: `${m.detectRate.toFixed(1)}%`, sub: `전송량 ${m.bits}비트 · ${m.trials}회 시행` }
      : { label: '메시지 전체 성공률', value: `${m.messageSuccess.toFixed(1)}%`, sub: `비트 복원률 ${m.bitRecovery.toFixed(1)}% · 전송량 ${m.bits}비트 · ${m.trials}회 시행` };
    resultBox = `<div class="evidence">
      ${stale ? '<span class="muted small">이전 구성의 결과</span><br>' : ''}
      <strong>${headline.label}</strong><br>${headline.value}<br>
      <span class="muted small">${esc(headline.sub)}</span>
    </div>
    <div class="status-line"><span class="result ${last.verdict}" role="status">${resultIcon(last.verdict)} ${esc(VERDICT_TEXT[last.verdict] || '')}</span></div>
    ${stale ? '<p class="muted small" style="margin:6px 0 0">구성이 바뀌었습니다. 다시 시험해 보세요.</p>' : ''}`;
  }

  let runLabel = stage === 'N10' ? '오류를 넣어 시험하기' : `${TRIALS}번 보내기`;
  if (last && !stale) runLabel = stage === 'N10' ? '다시 시험하기' : '다시 보내기';

  return `${heading(copy[0], copy[1], copy[2])}
  <div class="card stack">
    <div class="circuit-board">
      <div class="circuit-flow">${flow}</div>
      <p class="muted small" style="margin:0">블록을 추가한 뒤 ↑ ↓ 로 순서를 바꿔 보세요. 연결은 왼쪽에서 오른쪽으로 읽습니다. 놓는 순서에 따라 결과가 달라집니다.</p>
      <div><h3 style="font-size:1rem">블록 팔레트</h3><div class="palette">${palette}</div></div>
    </div>
    ${warnBox}
    <div>${resultBox}</div>
    <div class="button-row">
      <button id="run-circuit" class="primary-button" type="button">${esc(runLabel)}</button>
      <button id="open-circuit-guide" class="secondary-button" type="button">조작 안내</button>
    </div>
  </div>`;
}

function renderN6Predict() {
  const locked = state.screens.N6.predictionLocked;
  return `${heading('3 통신로 설계 · 예측', '블록을 어떻게 이으면 성공률이 올라갈까?', '아직 회로를 보지 않고 먼저 생각합니다. 확정한 예측은 실험 뒤에도 원문 그대로 남습니다.')}
  <div class="card stack">${writeBox('N6_predict', '예상하는 통신로와 이유를 적어 보세요.', 'predict', { locked })}<div class="button-row"><button id="confirm-n6-predict" class="primary-button" type="button" ${locked ? 'disabled' : ''}>${locked ? '예측 확정됨' : '예측 확정'}</button></div></div>`;
}

function renderN9() {
  const n3 = state.screens.N3;
  const n6 = state.writes.N6_predict || '미작성';
  const circuitLogs = state.log.filter(item => ['N6_operate','N7','N8'].includes(item.screen) && item.kind === 'attempt');
  return `${heading('3 통신로 설계 · 비교', '가장 정확한 방법과 가장 합리적인 방법은 같은가?', '예측과 실제 실행을 나란히 보고, 정확성과 전송량 사이의 선택을 자신의 말로 설명합니다.')}
  <div class="card stack"><div class="two-column"><div class="evidence"><strong>처음 예측</strong><br>${esc(n3.prediction || '미작성')}<br><span class="muted">${esc(state.writes.N3_reason || '이유 미작성')}</span></div><div class="evidence"><strong>N6 통신로 예측</strong><br>${esc(n6)}</div></div>${evidenceFor(['N6_operate','N7','N8'])}<div class="writing-list">${writeBox('N9_reflect', '가장 정확한 방법과 가장 합리적인 방법은 같은가? 오늘 실험에서 예를 들어 쓰시오.', 'reflect')}</div>${circuitLogs.length ? `<details class="attempt-details"><summary>최근 실행 구성 ${circuitLogs.length}회</summary><div class="evidence">${circuitLogs.slice(-6).map(item => `<div>${esc(item.detail || '')}</div>`).join('')}</div></details>` : ''}</div>`;
}

function resultIcon(result) { return result === 'ok' ? '✓' : result === 'partial' ? '△' : result === 'fail' ? '!' : '·'; }

function renderN11() {
  const grid = state.parity;
  const placedCount = grid.placed.length;
  const check = checkParityGrid();
  return `${heading('4 어디가 틀렸나 · 패리티 놓기', '검사 칸을 직접 채워 보세요.', '6×6 정보 칸의 각 행과 열이 일정한 짝을 이루도록 가장자리 검사 칸을 정합니다.')}<div class="card stack"><div class="parity-grid" role="grid" aria-label="7 곱하기 7 패리티 격자">${grid.values.map((row, r) => row.map((value, c) => { const editable = r === 0 || c === 0; const shown = editable ? value : grid.data[r - 1]?.[c - 1]; return `<button type="button" class="grid-cell ${editable ? 'parity editable' : ''} ${shown === null ? 'empty' : ''} ${check.badCells?.some(cell => cell[0] === r && cell[1] === c) ? 'bad' : ''} ${check.ok && editable ? 'good' : ''}" data-parity-cell="${r},${c}" aria-label="${r + 1}행 ${c + 1}열 ${shown === null ? '미입력' : shown}">${shown === null ? '·' : shown}</button>`; }).join('')).join('')}</div><div class="axis-status">${check.rowStatus.map((good, i) => `<span class="axis-pill ${good ? 'good' : 'bad'}">가로 ${i + 1} ${good ? '✓' : '확인'}</span>`).join('')}${check.colStatus.map((good, i) => `<span class="axis-pill ${good ? 'good' : 'bad'}">세로 ${i + 1} ${good ? '✓' : '확인'}</span>`).join('')}</div><div class="result ${check.ok ? 'ok' : placedCount === 13 ? 'fail' : ''}" role="status">${check.ok ? '행과 열의 상태가 모두 맞습니다.' : `검사 칸 ${placedCount}/13개를 정했습니다. 색보다 행·열 문구를 함께 확인하세요.`}</div><button id="reset-parity" class="secondary-button" type="button">검사 칸 다시 비우기</button></div>`;
}

function parityExpected() {
  const grid = state.parity;
  const expected = Array.from({ length: 7 }, () => Array(7).fill(null));
  for (let c = 1; c < 7; c += 1) expected[0][c] = grid.data.reduce((sum, row) => sum + row[c - 1], 0) % 2;
  for (let r = 1; r < 7; r += 1) expected[r][0] = grid.data[r - 1].reduce((sum, bit) => sum + bit, 0) % 2;
  expected[0][0] = 0;
  return expected;
}

function checkParityGrid() {
  const grid = state.parity;
  const expected = parityExpected();
  const rowStatus = Array.from({ length: 7 }, (_, r) => {
    if (r === 0) return grid.values[0].slice(1).every(v => v !== null);
    return grid.values[r][0] !== null && grid.data[r - 1].reduce((sum, bit) => sum + bit, 0) + grid.values[r][0] % 2 === 0;
  });
  const colStatus = Array.from({ length: 7 }, (_, c) => {
    if (c === 0) return grid.values.slice(1).every(row => row[0] !== null);
    return grid.values[0][c] !== null && grid.data.reduce((sum, row) => sum + row[c - 1], 0) + grid.values[0][c] % 2 === 0;
  });
  const ok = grid.placed.length === 13 && rowStatus.every(Boolean) && colStatus.every(Boolean);
  const badCells = [];
  for (let c = 1; c < 7; c += 1) if (grid.values[0][c] !== null && grid.values[0][c] !== expected[0][c]) badCells.push([0, c]);
  for (let r = 1; r < 7; r += 1) if (grid.values[r][0] !== null && grid.values[r][0] !== expected[r][0]) badCells.push([r, 0]);
  return { rowStatus, colStatus, ok, badCells };
}

function randomErrorBoard(errorCount = 1) {
  const base = state.parity.data.map(row => row.slice());
  const cells = [];
  while (cells.length < errorCount) { const r = Math.floor(Math.random() * 6); const c = Math.floor(Math.random() * 6); if (!cells.some(cell => cell[0] === r && cell[1] === c)) cells.push([r, c]); }
  cells.forEach(([r, c]) => { base[r][c] = 1 - base[r][c]; });
  return { base, cells };
}

function renderN12() {
  const n12 = state.screens.N12;
  if (!n12.board) n12.board = randomErrorBoard(1);
  const board = n12.board;
  const chosen = n12.guesses[n12.round];
  const correct = chosen && chosen[0] === board.cells[0][0] && chosen[1] === board.cells[0][1];
  return `${heading('4 어디가 틀렸나 · 한 칸 찾기', `뒤집힌 칸을 찾아 보세요 · ${n12.round + 1}/3판`, '한 칸이 바뀌었을 때 행과 열의 이상 신호를 이용해 위치를 추측합니다.')}<div class="card stack"><div class="parity-grid">${Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => { const editable = r > 0 && c > 0; const bit = editable ? board.base[r - 1][c - 1] : r === 0 || c === 0 ? '' : ''; const selected = chosen && chosen[0] === r - 1 && chosen[1] === c - 1; return `<button type="button" class="grid-cell ${selected ? (correct ? 'good' : 'bad') : ''}" data-find-cell="${r - 1},${c - 1}" ${editable ? '' : 'disabled'} aria-label="${r === 0 || c === 0 ? '검사 줄' : `${r}행 ${c}열 ${bit}`}">${r === 0 || c === 0 ? (r === 0 && c === 0 ? '·' : r === 0 ? '↓' : '→') : bit}</button>`; }).join('')).join('')}</div><div class="result ${chosen ? (correct ? 'ok' : 'fail') : ''}" role="status">${chosen ? (correct ? '찾았습니다. 다음 판도 같은 방법으로 생각해 보세요.' : '아직 아닙니다. 어느 가로줄과 세로줄이 이상한지 다시 살펴보세요.') : '검사할 칸을 하나 골라 보세요.'}</div>${correct && n12.round < 2 ? '<button id="next-n12-round" class="primary-button" type="button">다음 판</button>' : ''}<button id="reset-n12" class="secondary-button" type="button">이 판 다시 만들기</button></div>`;
}

function renderN13Observe() {
  if (!state.screens.N13) state.screens.N13 = { board: randomErrorBoard(2) };
  const board = state.screens.N13.board || randomErrorBoard(2);
  return `${heading('4 어디가 틀렸나 · 두 칸 오류', '두 칸이 뒤집히면 어떤 일이 생길까?', '이번에는 두 칸을 바꾼 상태를 관찰합니다. 하나의 위치를 확정하기 어려운 이유를 다음 보기에서 설명합니다.')}
  <div class="card stack"><div class="parity-grid">${board.base.map((row, r) => row.map((bit, c) => `<span class="grid-cell">${bit}</span>`).join('')).join('')}</div><div class="axis-status"><span class="axis-pill bad">이상 신호가 여러 줄에 나타남</span><span class="axis-pill">두 곳의 조합을 더 비교해야 함</span></div><div class="notice">색이나 위치가 정답을 알려 주는 화면이 아닙니다. 지금 본 반응을 근거로 다음 작성 보기에서 설명해 보세요.</div></div>`;
}

function renderN13Write() {
  return `${heading('4 어디가 틀렸나 · 작성', '오류 위치를 찾는 방법과 한계를 설명해 보세요.', '한 칸을 찾았던 절차와 두 칸 오류에서 달라진 점을 구분해 적습니다.')}
  <div class="card stack"><div class="writing-list">${writeBox('N13_one', '한 칸을 찾았을 때 어떤 순서로 찾았나요?', 'explain')}${writeBox('N13_two', '두 칸이 뒤집히면 왜 하나의 위치를 확정하기 어려울까요?', 'explain')}</div>${evidenceFor(['N12'])}</div>`;
}

function renderN14() {
  const n14 = state.screens.N14;
  return `${heading('5 질문 세 번 · 예측', '7자리 중 하나가 틀렸다면, 몇 번 물어야 할까?', '예 또는 아니오로만 답하는 질문으로 위치를 알아낸다고 생각해 봅니다. 지금은 예측만 받습니다.')}
  <div class="card stack"><p>가능한 답은 1번부터 7번, 그리고 틀린 곳 없음까지 모두 8가지입니다.</p><div class="choice-grid">${[2,3,4,7].map(value => `<div class="choice"><input id="n14-${value}" name="n14" type="radio" value="${value}" ${n14.prediction === String(value) ? 'checked' : ''}><label for="n14-${value}">${value}번</label></div>`).join('')}</div><div class="button-row"><button id="confirm-n14" class="primary-button" type="button">예측 기록</button>${n14.confirmed ? '<span class="result ok">예측이 기록되었습니다.</span>' : ''}</div></div>`;
}

function n15Patterns() {
  const groups = state.screens.N15.groups;
  return Array.from({ length: 8 }, (_, errorCase) => {
    const values = groups.map(group => {
      if (errorCase === 0) return 0;
      return group.includes(errorCase) ? 1 : 0;
    });
    return { errorCase, values, pattern: values.join('') };
  });
}

function renderN15Operate() {
  const n15 = state.screens.N15;
  const patterns = n15Patterns();
  const duplicatePatterns = new Set(patterns.map(item => item.pattern).filter((pattern, i, all) => all.indexOf(pattern) !== i));
  const unique = duplicatePatterns.size === 0 && new Set(patterns.map(item => item.pattern)).size === 8;
  return `${heading('5 질문 세 번 · 설계', '질문 묶음을 직접 만들어 보세요.', '번호 블록을 세 질문 상자에 넣는다고 생각하고, 각 질문의 예·아니오 패턴이 서로 달라지는지 확인합니다.')}
  <div class="card stack"><div class="three-column">${n15.groups.map((group, g) => `<div class="card" style="padding:14px"><h3>질문 ${g + 1}</h3><p class="muted small">포함할 번호</p><div class="choice-grid">${[1,2,3,4,5,6,7].map(number => `<div class="choice"><input id="n15-${g}-${number}" type="checkbox" data-question="${g},${number}" ${group.includes(number) ? 'checked' : ''}><label for="n15-${g}-${number}">${number}</label></div>`).join('')}</div></div>`).join('')}</div><div class="table-wrap"><table class="pattern-table"><thead><tr><th>경우</th><th>질문 1</th><th>질문 2</th><th>질문 3</th><th>답 패턴</th></tr></thead><tbody>${patterns.map(item => `<tr class="${duplicatePatterns.has(item.pattern) ? 'duplicate' : 'unique'}"><td>${item.errorCase === 0 ? '틀린 곳 없음' : `${item.errorCase}번`}</td>${item.values.map(value => `<td>${value ? '예' : '아니오'}</td>`).join('')}<td><strong>${item.pattern}</strong></td></tr>`).join('')}</tbody></table></div><div class="result ${unique ? 'ok' : 'partial'}" role="status">${unique ? '여덟 가지 경우의 답 패턴이 모두 다릅니다.' : '아직 같은 답 패턴을 가진 경우가 있습니다. 표에서 겹치는 줄을 찾아 설계를 바꾸어 보세요.'}</div><div class="button-row"><button id="check-n15" class="primary-button" type="button">이 질문들로 구별할 수 있나?</button><button id="reset-n15" class="secondary-button" type="button">질문 비우기</button><button id="open-n15-guide" class="secondary-button" type="button">조작 안내</button></div></div>`;
}

function renderN15Write() {
  return `${heading('5 질문 세 번 · 작성', '질문 수를 바꾼 이유를 설명해 보세요.', '방금 만든 답 패턴 표와 실제 설계 변화가 근거로 남아 있습니다.')}
  <div class="card stack"><div class="evidence">현재 질문 묶음: ${state.screens.N15.groups.map((group, i) => `질문 ${i + 1} = ${group.length ? group.join(', ') : '없음'}`).join(' · ')}</div><div class="writing-list">${writeBox('N15_change', '질문을 몇 개로 시작했고, 왜 바꾸었나요?', 'reflect')}${writeBox('N15_binary', '예/아니오를 1/0으로 읽어 붙이면 무엇이 되나요?', 'explain')}</div></div>`;
}

function renderN16() {
  const n16 = state.screens.N16;
  if (!n16.cases.length) n16.cases = [randomQuestionCase(), randomQuestionCase(), randomQuestionCase()];
  const target = n16.cases[n16.round];
  const guess = n16.guesses[n16.round];
  const ok = guess !== undefined && Number(guess) === target;
  return `${heading('5 질문 세 번 · 선택 활동', `내 질문으로 오류 위치 찾기 · ${n16.round + 1}/3판`, 'N15에서 만든 질문 묶음의 답 패턴을 보고 실제 위치를 골라 봅니다.')}
  <div class="card stack"><div class="notice">이번 답 패턴: <strong>${questionPatternFor(target)}</strong></div><div class="choice-grid">${['없음',1,2,3,4,5,6,7].map((label, i) => { const value = i === 0 ? 0 : i; return `<div class="choice"><input id="n16-${value}" name="n16" type="radio" value="${value}" ${guess !== undefined && Number(guess) === value ? 'checked' : ''}><label for="n16-${value}">${label === '없음' ? '틀린 곳 없음' : `${label}번`}</label></div>`; }).join('')}</div><div class="result ${guess === undefined ? '' : ok ? 'ok' : 'fail'}" role="status">${guess === undefined ? '답을 하나 골라 보세요.' : ok ? '맞았습니다.' : '다른 경우의 패턴과 비교해 보세요.'}</div>${ok && n16.round < 2 ? '<button id="next-n16" class="primary-button" type="button">다음 판</button>' : ''}</div>`;
}

function randomQuestionCase() { return Math.floor(Math.random() * 8); }
function questionPatternFor(errorCase) { return n15PatternsFor(errorCase).join(''); }
function n15PatternsFor(errorCase) { return state.screens.N15.groups.map(group => errorCase === 0 ? 0 : group.includes(errorCase) ? 1 : 0); }

function hammingDistance(a, b) { return [...a].reduce((count, bit, index) => count + (bit !== b[index] ? 1 : 0), 0); }

function renderN17() {
  const n17 = state.screens.N17;
  const pairs = [];
  for (let i = 0; i < n17.codes.length; i += 1) for (let j = i + 1; j < n17.codes.length; j += 1) pairs.push({ a: i, b: j, distance: hammingDistance(n17.codes[i], n17.codes[j]) });
  const min = Math.min(...pairs.map(pair => pair.distance));
  const allGood = min >= 3;
  const query = n17.query || { code: n17.codes[0], error: 2 };
  return `${heading('6 얼마나 멀어야 · 선택 활동', '서로 다른 부호를 얼마나 멀리 둘까?', '네 가지 신호에 6비트 부호를 배정하고, 두 부호 사이의 거리를 비교합니다.')}
  <div class="card stack"><div class="code-grid">${n17.codes.map((code, i) => `<div class="code-row"><strong>신호 ${i + 1}</strong><div class="code-cells">${[...code].map((bit, c) => `<button type="button" class="bit-button ${bit === '1' ? 'selected' : ''}" data-code-cell="${i},${c}" aria-label="신호 ${i + 1} ${c + 1}번째 ${bit}">${bit}</button>`).join('')}</div></div>`).join('')}</div><div class="table-wrap"><table><thead><tr><th>두 부호</th><th>거리</th></tr></thead><tbody>${pairs.map(pair => `<tr><td>${pair.a + 1} ↔ ${pair.b + 1}</td><td class="${pair.distance < 3 ? 'distance-bad' : 'distance-good'}">${pair.distance}</td></tr>`).join('')}</tbody></table></div><div class="result ${allGood ? 'ok' : 'partial'}">${allGood ? '최소 거리가 3 이상입니다. 이제 한 칸 오류를 시험해 보세요.' : '3보다 가까운 두 부호가 있습니다. 표의 거리를 보며 바꾸어 보세요.'}</div><div class="button-row"><button id="test-code-error" class="primary-button" type="button">한 칸 오류 시험</button></div>${n17.tested ? `<div class="evidence">오류가 난 신호: ${esc(query.code)} → 받은 값 ${esc(flipBit(query.code, query.error))}<br>가장 가까운 부호를 비교해 원래 신호를 추측합니다.</div>` : ''}</div>`;
}

function flipBit(code, index) { return [...code].map((bit, i) => i === index ? (bit === '0' ? '1' : '0') : bit).join(''); }

function renderN18() {
  return `${heading('6 얼마나 멀어야 · 선택 활동', '거리와 오류 정정 능력을 연결해 보세요.', 'N17에서 만든 부호와 다음 표를 보고, 최소 거리가 왜 중요한지 설명합니다.')}
  <div class="card stack"><div class="table-wrap"><table><thead><tr><th>최소 거리</th><th>탐지할 수 있는 오류</th><th>정정할 수 있는 오류</th></tr></thead><tbody><tr><td>1</td><td>없음</td><td>없음</td></tr><tr><td>2</td><td>1개</td><td>없음</td></tr><tr><td>3</td><td>2개</td><td>1개</td></tr></tbody></table></div><div class="writing-list">${writeBox('N18_reason', '거리가 3이면 왜 한 개의 오류를 고칠 수 있는지 쓰시오.', 'explain')}</div></div>`;
}

function renderN19() {
  return `${heading('7 닫기 · 선택 활동', '다시 보내기 어려운 곳에서는 무엇을 선택할까?', '마리너 9호의 사례를 읽고, 우리가 만든 통신로와 비교해 봅니다.')}
  <div class="card stack"><div class="reading"><p>1972년 화성 궤도에 들어간 마리너 9호는 흑백 사진을 보내려고 6비트를 32비트로 부풀려 보냈습니다. 다시 보내 달라고 요청하기 어려운 곳에서는 전송량보다 오류를 견디는 힘이 더 중요할 수 있습니다.</p><p style="margin-bottom:0">점자도 한 번 보낸 뒤 다시 확인하기 어려운 상황과 닮아 있습니다.</p></div>${writeBox('N19_mariner', '우리가 만든 통신로 중 마리너 9호에 가장 가까운 것은 어느 것인가요? 왜 그렇게 극단적으로 만들었을까요?', 'reflect')}</div>`;
}

function compareRows() {
  const logs = state.log.filter(item => item.kind === 'attempt');
  const real = (screen, fallback) => { const item = [...logs].reverse().find(log => log.screen === screen); return item?.detail || fallback; };
  return [
    ['그냥 보내기', '8비트', '✗', '✗', '1', real('N6_operate', '미실행')],
    ['3번 반복', '24비트', '○', '1개', '3', real('N8', '미실행')],
    ['패리티 1비트', '9비트', '1개', '✗', '2', real('N10', '미실행')],
    ['6×6 격자 패리티', '49비트', '○', '1개', '3', state.parity.check?.ok ? '검사 완료' : '미실행'],
    ['질문 3개', '12비트', '○', '1개', '3', state.screens.N15.checked ? '설계 완료' : '미실행']
  ];
}

function renderN20() {
  return `${heading('7 닫기 · 종합', '어떤 방법이 점자에 가장 어울릴까?', '지나온 방법의 전송량과 오류 대응을 비교하고, 자신의 선택을 근거와 함께 정리합니다.')}
  <div class="card stack"><div class="table-wrap"><table><thead><tr><th>방식</th><th>8비트를 보낼 때</th><th>탐지</th><th>정정</th><th>최소 거리</th><th>내 기록</th></tr></thead><tbody>${compareRows().map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${writeBox('N20_reflect', '나라면 점자에 어느 방법을 쓰겠는가? 다시 보낼 수 없다는 점을 생각해서 쓰시오.', 'reflect')}${evidenceFor(['N6_operate','N7','N8','N10','N11','N12','N15_operate'])}</div>`;
}

function submissionSummary() {
  const statuses = [];
  for (const screen of SCREEN_ORDER) {
    if (screen.optional && !state.includeOptional) continue;
    if (screen.id === 'N0') continue;
    const viewed = state.views[screen.id]?.visited;
    statuses.push({ id: screen.id, label: screen.label, status: viewed ? '방문' : '미방문' });
  }
  const expected = WRITE_FIELDS.filter(([key]) => state.includeOptional || !['N18_reason', 'N19_mariner'].includes(key));
  const unfilled = expected.filter(([key]) => !String(state.writes[key] || '').trim()).map(([key]) => key);
  const unresolved = state.log.filter(item => item.kind === 'attempt' && item.result === 'fail').length;
  return { statuses, unfilled, unresolved };
}

function renderN21() {
  const summary = submissionSummary();
  const submitted = state.submitted.at > 0;
  return `${heading('7 닫기 · 제출', '오늘의 탐구 기록을 제출하세요.', '미작성·미해결·건너뛴 활동도 숨기지 않고 기록합니다. 제출은 한 번으로 시도하고, 실패하면 파일로 저장할 수 있습니다.')}
  <div class="card stack"><div class="two-column"><div class="evidence"><strong>미작성 문항</strong><br>${summary.unfilled.length ? `${summary.unfilled.length}개` : '없음'}</div><div class="evidence"><strong>실패로 기록된 실행</strong><br>${summary.unresolved}회</div></div><details class="attempt-details"><summary>활동별 방문 기록 보기</summary><div class="evidence">${summary.statuses.map(item => `<div>${esc(item.id)} · ${esc(item.label)} · ${item.status}</div>`).join('')}</div></details><div id="submit-result" class="result ${submitted ? 'ok' : ''}" role="status">${submitted ? `제출 상태: ${esc(state.submitted.status)} · 확인 코드 ${esc(state.submitted.code)}` : '제출 버튼을 누르면 화면 기록 HTML이 만들어집니다.'}</div><div class="button-row"><button id="submit-button" class="primary-button" type="button" ${submitted ? 'disabled' : ''}>${submitted ? '이미 제출했습니다' : '제출'}</button><button id="download-button" class="secondary-button" type="button" ${submitted && state.submitted.status === 'ok' ? 'disabled' : ''}>파일로 저장</button></div></div>`;
}

function bindScreen(id) {
  bindCommonWrites();
  if (id === 'N0') bindN0();
  if (id === 'N2_operate') bindN2();
  if (id === 'N3') bindN3();
  if (id === 'N4') bindN4();
  if (id === 'N5_operate') bindN5();
  if (id === 'N6_predict') bindN6Predict();
  if (['N6_operate','N7','N8','N10'].includes(id)) bindCircuit(id === 'N6_operate' ? 'N6' : id);
  if (id === 'N11') bindN11();
  if (id === 'N12') bindN12();
  if (id === 'N13_observe' && !state.screens.N13) { state.screens.N13 = { board: randomErrorBoard(2) }; persist(); }
  if (id === 'N14') bindN14();
  if (id === 'N15_operate') bindN15();
  if (id === 'N16') bindN16();
  if (id === 'N17') bindN17();
  if (id === 'N21') bindN21();
}

function bindCommonWrites() {
  $$('[data-write]').forEach(input => input.addEventListener('input', event => { state.writes[event.target.dataset.write] = event.target.value; logEvent('write', state.screenId, { field: event.target.dataset.write }); persist(); }));
}

function bindN0() {
  $('#student-sid')?.addEventListener('input', e => updateStudentField('sid', e.target.value));
  $('#student-name')?.addEventListener('input', e => updateStudentField('name', e.target.value));
  $('#include-optional')?.addEventListener('change', e => { state.includeOptional = e.target.checked; persist(true); updateNavigation(); renderActivityMenu(); });
  $('#resume-button')?.addEventListener('click', () => { const target = state.screenId === 'N0' ? 'N1' : state.screenId; navTo(target); });
  $('#new-button')?.addEventListener('click', () => { const student = { ...state.student }; state = initialState(); state.student = student; persist(true); render(); });
}

function bindN2() {
  const slider = $('#noise-rate');
  slider?.addEventListener('input', e => { state.screens.N2.rate = Number(e.target.value); state.screens.N2.lastBits = makeBrailleCells(nameBits(), state.screens.N2.rate, state.screens.N2.sends); $('#noise-rate-value').textContent = `${state.screens.N2.rate}%`; $('.braille-cells').outerHTML = brailleHtml(state.screens.N2.lastBits); persist(); });
  $('#resend-noise')?.addEventListener('click', () => { const n2 = state.screens.N2; n2.sends += 1; n2.lastBits = makeBrailleCells(nameBits(), n2.rate, n2.sends); logEvent('attempt', 'N2_operate', { detail: `오류율 ${n2.rate}%, 다시 보내기 ${n2.sends}회` }, 'observe'); mascotState = { mood: 'tilt', text: '같은 오류율이어도 바뀌는 자리는 달라질 수 있어요.', open: true }; persist(); render(); });
  $('#open-noise-guide')?.addEventListener('click', () => openGuide('N2_operate', '오류율 슬라이더와 다시 보내기 버튼을 사용해 보세요.'));
}

function bindN3() {
  $$('input[name="n3"]').forEach(input => input.addEventListener('change', e => { state.screens.N3.prediction = e.target.value; persist(); }));
  $('#confirm-n3')?.addEventListener('click', () => { state.screens.N3.locked = true; logEvent('attempt', 'N3', { detail: `예측 ${state.screens.N3.prediction || '미선택'}` }, 'predict'); persist(true); render(); });
}

function bindN4() {
  $$('[data-majority-index]').forEach(button => button.addEventListener('click', () => { const i = Number(button.dataset.majorityIndex); const answer = state.screens.N4.answer; answer[i] = answer[i] === null ? 0 : answer[i] === 0 ? 1 : null; state.screens.N4.checked = answer.every(value => value !== null); if (state.screens.N4.checked) logEvent('attempt', 'N4', { detail: `다수결 답 ${answer.join('')}` }, answer.join('') === '10101111' ? 'ok' : 'fail'); persist(); render(); }));
  $('#reset-n4')?.addEventListener('click', () => { state.screens.N4.answer = Array(8).fill(null); state.screens.N4.checked = false; persist(); render(); });
  $('#open-n4-guide')?.addEventListener('click', () => openGuide('N4', '내 답 행의 각 칸을 눌러 0, 1을 번갈아 선택할 수 있습니다.'));
}

function bindN5() {
  $$('input[name="n5-count"]').forEach(input => input.addEventListener('change', e => { state.screens.N5.count = Number(e.target.value); state.screens.N5.answer = Array(8).fill(null); state.screens.N5.ties = columnTies(repeatedRows(state.screens.N5.count)); persist(); render(); }));
  $$('[data-majority-index]').forEach(button => button.addEventListener('click', () => { const i = Number(button.dataset.majorityIndex); const answer = state.screens.N5.answer.length === 8 ? state.screens.N5.answer : Array(8).fill(null); answer[i] = answer[i] === null ? 0 : answer[i] === 0 ? 1 : null; state.screens.N5.answer = answer; state.screens.N5.checked = answer.every(value => value !== null); state.screens.N5.ties = columnTies(repeatedRows(state.screens.N5.count)); if (state.screens.N5.checked) logEvent('attempt', 'N5_operate', { detail: `${state.screens.N5.count}줄, 답 ${answer.join('')}` }, state.screens.N5.ties.length ? 'partial' : 'attempt'); persist(); render(); }));
  $('#reset-n5')?.addEventListener('click', () => { state.screens.N5.answer = Array(8).fill(null); state.screens.N5.checked = false; persist(); render(); });
  $('#open-n5-guide')?.addEventListener('click', () => openGuide('N5_operate', '먼저 반복 횟수를 고르고, 내 답 행의 각 열을 눌러 정하세요.'));
}

function bindN6Predict() { $('#confirm-n6-predict')?.addEventListener('click', () => { state.screens.N6.predictionLocked = true; logEvent('attempt', 'N6_predict', { detail: '통신로 예측 확정' }, 'predict'); persist(true); render(); }); }

function bindCircuit(stage) {
  const circuit = circuitConfigFor(stage);
  $$('[data-add-block]').forEach(button => button.addEventListener('click', () => { const type = button.dataset.addBlock; if (!circuit.nodes.includes(type) || type === 'majority') circuit.nodes.splice(Math.max(1, circuit.nodes.length - 1), 0, type); else circuit.nodes.splice(Math.max(1, circuit.nodes.length - 1), 0, type); circuit.version += 1; persist(); render(); }));
  $$('[data-node-index]').forEach(node => node.addEventListener('click', event => { if (event.target.closest('[data-node-action]')) return; circuit.selected = Number(node.dataset.nodeIndex); persist(); render(); }));
  $$('[data-node-action]').forEach(button => button.addEventListener('click', () => { const index = Number(button.dataset.nodeIndex); const action = button.dataset.nodeAction; if (action === 'remove' && !['message','receiver'].includes(circuit.nodes[index])) circuit.nodes.splice(index, 1); if (action === 'up' && index > 1) [circuit.nodes[index - 1], circuit.nodes[index]] = [circuit.nodes[index], circuit.nodes[index - 1]]; if (action === 'down' && index < circuit.nodes.length - 2) [circuit.nodes[index + 1], circuit.nodes[index]] = [circuit.nodes[index], circuit.nodes[index + 1]]; circuit.version += 1; persist(); render(); }));
  $$('[data-node-index]').forEach(node => node.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); node.click(); } }));
  $('#run-circuit')?.addEventListener('click', () => {
    const viewId = stage === 'N6' ? 'N6_operate' : stage;
    const info = analyzeCircuit(circuit.nodes);
    if (!info.canCompare) {
      /* 실행 불가능한 구조와 실패로 결론 낼 수 있는 설계를 구분한다(명세서 §14).
         이 경우는 수학적 실패 횟수에 넣지 않는다. */
      mascotState = { mood: 'idle', text: info.warnings[0] || '아직 실행할 수 없는 구성입니다.', open: true };
      logEvent('guide', viewId, { detail: `실행 불가 구성 · ${info.warnings.join(' / ')}` }, 'blocked');
      render();
      return;
    }
    const metric = simulateCircuit(circuit.nodes, stage);
    const verdict = judgeCircuit(metric, stage);
    const detail = circuitDetail(metric, stage);
    circuit.lastResult = { version: circuit.version, verdict, detail, metric, blocks: circuit.nodes.slice() };
    logEvent('attempt', viewId, { detail, attempt: { blocks: circuit.nodes.slice(), order: circuit.nodes.join(' > ') } }, verdict === 'ok' ? 'ok' : 'fail');
    if (verdict === 'ok') {
      mascotState = { mood: 'cheer', text: '목표 조건을 만족했어요. 다른 구성과도 비교해 보세요.', open: true };
    } else {
      const level = advanceHint(viewId);
      const mood = level >= 3 ? 'explain' : level >= 2 ? 'worry' : 'tilt';
      mascotState = { mood, text: circuitHint(stage, level, metric) || '구성을 바꾸고 다시 시험해 보세요.', open: true };
    }
    persist();
    render();
  });
  $('#open-circuit-guide')?.addEventListener('click', () => openGuide(stage, '팔레트에서 블록을 추가하고, 블록의 화살표 버튼으로 순서를 바꿔 보세요. 실행 후에도 다시 구성할 수 있습니다.'));
}

function bindN11() { $$('[data-parity-cell]').forEach(button => button.addEventListener('click', () => { const [r, c] = button.dataset.parityCell.split(',').map(Number); if (!(r === 0 || c === 0)) return; const current = state.parity.values[r][c]; state.parity.values[r][c] = current === null ? 0 : current === 0 ? 1 : null; if (!state.parity.placed.some(cell => cell[0] === r && cell[1] === c) && state.parity.values[r][c] !== null) state.parity.placed.push([r,c]); if (state.parity.values[r][c] === null) state.parity.placed = state.parity.placed.filter(cell => cell[0] !== r || cell[1] !== c); state.parity.check = checkParityGrid(); if (state.parity.check.ok) logEvent('attempt', 'N11', { detail: '13개 검사 칸 배치 완료' }, 'ok'); persist(); render(); })); $('#reset-parity')?.addEventListener('click', () => { state.parity = createParityGrid(); persist(); render(); }); }

function bindN12() { $$('[data-find-cell]').forEach(button => button.addEventListener('click', () => { const [r,c] = button.dataset.findCell.split(',').map(Number); if (r < 0 || c < 0) return; const n12 = state.screens.N12; const target = n12.board.cells[0]; const ok = r === target[0] && c === target[1]; n12.guesses[n12.round] = [r,c]; logEvent('attempt', 'N12', { detail: `선택한 칸 ${r + 1}행 ${c + 1}열`, attempt: { selected: [r,c], actual: target } }, ok ? 'ok' : 'fail'); if (!ok) advanceHint('N12'); mascotState = { mood: ok ? 'cheer' : (state.hints.N12 >= 2 ? 'worry' : 'tilt'), text: ok ? '찾았습니다. 같은 방법이 두 칸 오류에도 통할지 생각해 보세요.' : (HINTS.N12[state.hints.N12 - 1] || HINTS.N12[0]), open: true }; persist(); render(); })); $('#next-n12-round')?.addEventListener('click', () => { state.screens.N12.round += 1; state.screens.N12.board = randomErrorBoard(1); persist(); render(); }); $('#reset-n12')?.addEventListener('click', () => { state.screens.N12.board = randomErrorBoard(1); state.screens.N12.guesses[state.screens.N12.round] = undefined; persist(); render(); }); }

function bindN14() { $$('input[name="n14"]').forEach(input => input.addEventListener('change', e => { state.screens.N14.prediction = e.target.value; persist(); })); $('#confirm-n14')?.addEventListener('click', () => { state.screens.N14.confirmed = true; logEvent('attempt', 'N14', { detail: `질문 수 예측 ${state.screens.N14.prediction || '미선택'}` }, 'predict'); persist(); render(); }); }

function bindN15() { $$('[data-question]').forEach(input => input.addEventListener('change', e => { const [g, number] = e.target.dataset.question.split(',').map(Number); const group = state.screens.N15.groups[g]; state.screens.N15.groups[g] = e.target.checked ? [...new Set([...group, number])].sort((a,b) => a-b) : group.filter(value => value !== number); state.screens.N15.checked = false; persist(); render(); })); $('#check-n15')?.addEventListener('click', () => { const patterns = n15Patterns(); const unique = new Set(patterns.map(item => item.pattern)).size === 8; state.screens.N15.checked = unique; logEvent('attempt', 'N15_operate', { detail: `질문 패턴 ${patterns.map(item => item.pattern).join(', ')}` }, unique ? 'ok' : 'fail'); if (!unique) advanceHint('N15_operate'); mascotState = { mood: unique ? 'cheer' : 'tilt', text: unique ? '모든 경우가 다른 답 패턴을 가졌어요.' : (HINTS.N15_operate[state.hints.N15_operate - 1] || HINTS.N15_operate[0]), open: true }; persist(); render(); }); $('#reset-n15')?.addEventListener('click', () => { state.screens.N15.groups = [[], [], []]; state.screens.N15.checked = false; persist(); render(); }); $('#open-n15-guide')?.addEventListener('click', () => openGuide('N15_operate', '질문 상자마다 포함할 번호를 체크하고, 표의 답 패턴이 겹치는지 확인하세요.')) }

function bindN16() { $$('input[name="n16"]').forEach(input => input.addEventListener('change', e => { const n16 = state.screens.N16; const target = n16.cases[n16.round]; const guess = Number(e.target.value); n16.guesses[n16.round] = guess; const ok = guess === target; logEvent('attempt', 'N16', { detail: `질문 패턴 ${questionPatternFor(target)}에 ${guess === 0 ? '오류 없음' : `${guess}번`} 선택` }, ok ? 'ok' : 'fail'); persist(); render(); })); $('#next-n16')?.addEventListener('click', () => { state.screens.N16.round += 1; persist(); render(); }); }

function bindN17() { $$('[data-code-cell]').forEach(button => button.addEventListener('click', () => { const [row, col] = button.dataset.codeCell.split(',').map(Number); const chars = [...state.screens.N17.codes[row]]; chars[col] = chars[col] === '0' ? '1' : '0'; state.screens.N17.codes[row] = chars.join(''); state.screens.N17.tested = false; persist(); render(); })); $('#test-code-error')?.addEventListener('click', () => { state.screens.N17.query = { code: state.screens.N17.codes[0], error: Math.floor(Math.random() * 6) }; state.screens.N17.tested = true; logEvent('attempt', 'N17', { detail: `최소 거리 시험 ${Math.min(...state.screens.N17.codes.flatMap((a,i,arr) => arr.slice(i+1).map(b => hammingDistance(a,b))))}` }, 'attempt'); persist(); render(); }); }

function bindN21() { $('#submit-button')?.addEventListener('click', submitWork); $('#download-button')?.addEventListener('click', () => downloadSubmission()); }

function openGuide(screen, text) { state.guideSeen[screen] = true; mascotState = { mood: 'idle', text, open: true }; logEvent('hint', screen, { detail: '조작 안내 열기' }, 'guide'); persist(); renderMascot(); }

function advanceHint(screen) { const current = state.hints[screen] || 0; const attempts = state.log.filter(item => item.screen === screen && item.kind === 'attempt' && item.result === 'fail').length; const desired = attempts >= 5 ? 3 : attempts >= 3 ? 2 : attempts >= 1 ? 1 : current; if (desired > current) { state.hints[screen] = desired; logEvent('hint', screen, { detail: `힌트 ${desired}단계` }, 'hint'); } return state.hints[screen] || 0; }

function renderMascot() {
  let slot = $('.mascot-slot');
  if (!slot) { slot = document.createElement('div'); slot.className = 'mascot-slot'; document.body.appendChild(slot); }
  const mood = mascotState.mood || 'idle';
  const level = state.hints[state.screenId] || 0;
  const fallback = level && HINTS[state.screenId] ? HINTS[state.screenId][level - 1] : '지금 필요한 조작을 찾아 보세요.';
  const hintText = mascotState.text || fallback;
  slot.innerHTML = `<div class="mascot-bubble" aria-live="polite" ${mascotState.open ? '' : 'hidden'}><p>${esc(hintText)}</p><div class="mascot-actions">${level && level < 3 ? '<button id="next-hint" type="button">다음 힌트</button>' : ''}<button id="close-mascot" type="button">닫기</button></div></div><button id="mascot-button" class="mascot-button" type="button" aria-label="${mascotState.open ? '힌트 닫기' : '힌트 열기'}"><img src="../../assets/mascot-${esc(mood)}.png" alt="" aria-hidden="true" onerror="if (!this.dataset.fallback) { this.dataset.fallback='1'; this.src='assets/mascot-${esc(mood)}.png'; } else { this.style.display='none'; }"></button>`;
  $('#mascot-button')?.addEventListener('click', () => { mascotState.open = !mascotState.open; renderMascot(); });
  $('#close-mascot')?.addEventListener('click', () => { mascotState.open = false; renderMascot(); });
  $('#next-hint')?.addEventListener('click', () => { const current = state.hints[state.screenId] || 0; const next = Math.min(3, current + 1); state.hints[state.screenId] = next; mascotState.text = (HINTS[state.screenId] || [])[next - 1] || ''; mascotState.mood = next >= 3 ? 'explain' : next >= 2 ? 'worry' : 'tilt'; logEvent('hint', state.screenId, { detail: `힌트 ${next}단계 직접 열기` }, 'hint'); persist(); renderMascot(); });
}

function createConfirmationCode() { const seed = `${state.student.sid}${state.student.name}${Date.now()}`; let hash = 0; for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 1000000; return String(hash).padStart(6, '0'); }

function buildSubmissionHtml() {
  const summary = submissionSummary();
  const rows = compareRows().map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('');
  const expected = WRITE_FIELDS.filter(([key]) => state.includeOptional || !['N18_reason', 'N19_mariner'].includes(key));
  const writeRows = expected.map(([key, label]) => `<section><h3>${esc(label)}</h3><p>${esc(state.writes[key] || '미작성')}</p></section>`).join('');
  const logRows = state.log.map(item => `<tr><td>${new Date(item.t).toLocaleString('ko-KR')}</td><td>${esc(item.screen)}</td><td>${esc(item.kind)}</td><td>${esc(item.detail || '')}</td><td>${esc(item.result || '')}</td></tr>`).join('');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>믿을 수 있게 보내기 제출 기록</title><style>@page{size:A4;margin:15mm}body{font-family:Arial,sans-serif;color:#202938;line-height:1.6}table{width:100%;border-collapse:collapse;margin:12px 0 24px}th,td{border:1px solid #ccc;padding:6px;text-align:left}h1{margin-bottom:4px}section{break-inside:avoid;border-top:1px solid #ddd;padding:8px 0}@media print{details{display:block}}</style></head><body><h1>믿을 수 있게 보내기</h1><p>학번: ${esc(state.student.sid)} · 이름: ${esc(state.student.name)}<br>제출 시각: ${new Date().toLocaleString('ko-KR')} · 확인 코드: ${esc(state.submitted.code || createConfirmationCode())}</p><h2>화면별 기록</h2>${writeRows}<h2>종합 비교표</h2><table><thead><tr><th>방식</th><th>전송량</th><th>탐지</th><th>정정</th><th>최소 거리</th><th>기록</th></tr></thead><tbody>${rows}</tbody></table><h2>시도 요약</h2><p>미작성 ${summary.unfilled.length}개 · 실패 실행 ${summary.unresolved}회</p><details><summary>전체 로그</summary><table><thead><tr><th>시각</th><th>화면</th><th>종류</th><th>상세</th><th>결과</th></tr></thead><tbody>${logRows}</tbody></table></details></body></html>`;
}

function downloadSubmission() { const code = state.submitted.code || createConfirmationCode(); state.submitted.code = code; const blob = new Blob([buildSubmissionHtml()], { type: 'text/html;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${state.student.sid || '학번없음'}_${state.student.name || '이름없음'}_믿을수있게보내기.html`; link.click(); URL.revokeObjectURL(url); }

async function submitWork() {
  const button = $('#submit-button');
  if (!button) return;
  const code = createConfirmationCode();
  state.submitted = { at: Date.now(), code, status: '준비 중' };
  const html = buildSubmissionHtml();
  if (!SCRIPT_URL) { state.submitted.status = '파일 저장 대기'; logEvent('submit', 'N21', { detail: 'Apps Script URL 미설정 · 파일 저장 가능' }, 'sent'); persist(true); render(); return; }
  button.disabled = true;
  try {
    const body = new URLSearchParams({ sid: state.student.sid, name: state.student.name, code, html });
    const response = await fetch(SCRIPT_URL, { method: 'POST', body });
    const text = await response.text();
    state.submitted.status = text.includes('ok') ? '제출되었습니다.' : '보냈지만 확인할 수 없습니다.';
    logEvent('submit', 'N21', { detail: state.submitted.status }, text.includes('ok') ? 'ok' : 'sent');
  } catch (error) {
    state.submitted.status = '전송 실패 · 파일로 저장하세요.';
    logEvent('submit', 'N21', { detail: '전송 실패' }, 'fail');
  }
  persist(true);
  render();
}

document.addEventListener('DOMContentLoaded', () => {
  $('#prev-button').addEventListener('click', () => navigate(-1));
  $('#next-button').addEventListener('click', () => navigate(1));
  $('#menu-button').addEventListener('click', () => { const menu = $('#activity-menu'); menu.hidden = !menu.hidden; $('#menu-button').setAttribute('aria-expanded', String(!menu.hidden)); });
  $('#menu-close').addEventListener('click', () => { $('#activity-menu').hidden = true; $('#menu-button').setAttribute('aria-expanded', 'false'); });
  $('#export-code').addEventListener('click', () => { $('#progress-code').value = btoa(unescape(encodeURIComponent(JSON.stringify(state)))); });
  $('#import-code').addEventListener('click', () => { try { const imported = JSON.parse(decodeURIComponent(escape(atob($('#progress-code').value.trim())))); localStorage.setItem(STORAGE_KEY, JSON.stringify(imported)); state = loadState(); render(); } catch (error) { $('#progress-code').value = '코드를 읽지 못했습니다.'; } });
  window.addEventListener('beforeunload', () => persist(true));
  render();
});

window.SCREEN_ORDER = SCREEN_ORDER;
window.giftedNoisy = { getState: () => state, reset: () => { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(LOG_KEY); state = initialState(); render(); } };
