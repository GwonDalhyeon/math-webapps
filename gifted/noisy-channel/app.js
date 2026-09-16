/* 믿을 수 있게 보내기 — 명세 기반의 의존성 없는 웹앱 */

const STORAGE_KEY = 'gifted26_noisy_state';
const LOG_KEY = 'gifted26_noisy_log';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyJkUruf0Y8waxOJokJxrq6Rk5o4JrwLcgY51NmsFdHPD2oKQja5E0-5SBtCNjOV665/exec';
const NOISE_RATE = 0.1;
const OPTIONAL_IDS = new Set(['N16', 'N17', 'N18', 'N19']);
const WRITE_FIELDS = [
  ['N1_thought', '도입 생각'], ['N2_observe', '잡음 관찰'], ['N2_explain', '읽기 한계'], ['N3_reason', 'N3 예측 이유'],
  ['N5_compare', '반복 횟수 비교'], ['N9_reflect', '통신로 비교 성찰'],
  ['N13_two', '두 칸 오류의 한계'], ['N15_binary', '이진 표현 해석'],
  ['N18_reason', '거리와 정정'], ['N19_mariner', '마리너 9호 비교']
];

const SCREEN_ORDER = [
  { id: 'N0', activity: '시작', label: '시작' },
  { id: 'C1', activity: '보내면 망가진다', label: '만화 ① · 신호는 망가진다' },
  { id: 'N1', activity: '보내면 망가진다', label: '도입' },
  { id: 'N2_operate', activity: '보내면 망가진다', label: '잡음 (가) · 같은 오류율' },
  { id: 'N2_write', activity: '보내면 망가진다', label: '잡음 (나) · 읽기 한계' },
  { id: 'C2', activity: '보내면 망가진다', label: '만화 ② · 여러 번 보내기' },
  { id: 'N3', activity: '보내면 망가진다', label: '예측' },
  { id: 'N4', activity: '다수결', label: '겹쳐 놓고 고르기' },
  { id: 'N5_operate', activity: '다수결', label: '반복 횟수 정하기' },
  { id: 'N5_write', activity: '다수결', label: '반복 횟수 · 작성' },
  { id: 'N6_operate', activity: '통신로 설계', label: '조립 S1 · 시험' },
  { id: 'N6_read', activity: '통신로 설계', label: '결과 읽는 법' },
  { id: 'N7', activity: '통신로 설계', label: '조립 S2' },
  { id: 'N8', activity: '통신로 설계', label: '조립 S3' },
  { id: 'N9', activity: '통신로 설계', label: '비교 · 성찰' },
  { id: 'C3', activity: '어디가 뒤집혔나', label: '만화 ③ · 검사 점 붙이기' },
  /* 개념 → 손(1차원) → 블록(1차원) → 손(2차원). 검사 비트 블록을 만나기
     전에 손으로 한 번 만들어 본다(명세서 §32-4 4번). */
  { id: 'N11a', activity: '어디가 뒤집혔나', label: '검사 점 (가) · 한 줄' },
  { id: 'N10', activity: '어디가 뒤집혔나', label: '조립 S4' },
  { id: 'N11b', activity: '어디가 뒤집혔나', label: '검사 점 (나) · 7×7' },
  { id: 'N12', activity: '어디가 뒤집혔나', label: '한 칸 찾기' },
  { id: 'N13_observe', activity: '어디가 뒤집혔나', label: '두 칸 오류 · 관찰' },
  { id: 'N13_write', activity: '어디가 뒤집혔나', label: '두 칸 오류 · 작성' },
  /* 2차원 격자에서 1차원 7자리로, 정해진 줄에서 설계한 묶음으로 두 번 뛴다.
     그 사이를 잇는다(명세서 §32-4 9번). */
  { id: 'N13_bridge', activity: '검사로 찾기', label: '검사도 결국 묶음이다' },
  /* 만화는 8 → 4 → 2까지만 보여주고 「몇 번 필요할까요?」로 끝난다. 답을
     말하지 않으므로 예측 앞에 둔다(명세서 §32-4 11번). */
  { id: 'C4', activity: '검사로 찾기', label: '만화 ④ · 스무고개' },
  { id: 'N14', activity: '검사로 찾기', label: '검사 횟수 예측', optional: false },
  { id: 'N15_operate', activity: '검사로 찾기', label: '검사 설계' },
  { id: 'N15_write', activity: '검사로 찾기', label: '검사 설계 · 작성' },
  { id: 'N16', activity: '검사로 찾기', label: '내 검사 시험', optional: true },
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
    '같은 자리에서 같은 값이 몇 번 나왔는지 세어 보세요.',
    '세 값 중 둘 이상 같은 쪽을 고르면 한 번의 잡음을 덜 흔들리게 볼 수 있어요.',
    '여러 번 관찰한 값에서 더 많은 쪽을 선택하는 것이 다수결입니다.'
  ],
  N5_operate: [
    '각 열의 0과 1 개수를 먼저 세어 보세요.',
    '짝수 번 관찰하면 같은 수가 나오기도 합니다. 그 열을 표시해 보세요.',
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
  N11a: [
    '이 줄의 1을 하나씩 세어 보세요.',
    '1의 개수가 짝수인가요, 홀수인가요?',
    '홀수라면 검사 점을 하나 붙여 짝수로 만들 수 있습니다.'
  ],
  N11b: [
    '아직 짝수가 아닌 줄이 있습니다. 가로줄부터 하나씩 세어 보세요.',
    '가로줄 여섯 개와 세로줄 여섯 개를 각각 맞춰야 합니다. 둘 다 확인했나요?',
    '맨 오른쪽 아래 한 칸은 가로줄에도 속하고 세로줄에도 속합니다. 두 조건을 같이 만족하나요?'
  ],
  N12: [
    '아직 아닙니다. 어느 가로·세로에서 1의 개수가 홀수인지 먼저 찾아보세요.',
    '가로줄을 하나씩 세어 보세요. 볼록한 점이 홀수인 줄이 있습니다.',
    '이상한 가로줄과 이상한 세로줄이 만나는 곳을 생각해 보세요.'
  ],
  N15_operate: [
    '아직 구별되지 않는 자리가 있습니다. 표에서 결과 패턴이 같은 줄을 찾아보세요.',
    '검사 한 번의 결과는 홀수 또는 짝수 두 가지입니다. 검사 두 번으로 만들 수 있는 패턴 수를 세어 보세요.',
    '여덟 가지를 가르려면 결과 패턴이 여덟 개 모두 달라야 합니다.'
  ],
  N17: [
    '두 부호를 골라 다른 칸의 개수를 세어 보세요.',
    '모든 두 부호가 적어도 세 자리 달라야 합니다.',
    '한 칸 오류가 생겨도 원래 부호와 다른 부호를 구별하려면 최소 거리가 필요합니다.'
  ]
};

const ACTIVITY_SECTIONS = {
  N0: '0 시작', C1: '1 보내면 망가진다', N1: '1 보내면 망가진다', N2_operate: '1 보내면 망가진다', N2_write: '1 보내면 망가진다', C2: '1 보내면 망가진다', N3: '1 보내면 망가진다',
  N4: '2 다수결', N5_operate: '2 다수결', N5_write: '2 다수결', N6_operate: '3 통신로 설계', N6_read: '3 통신로 설계', N7: '3 통신로 설계', N8: '3 통신로 설계', N9: '3 통신로 설계',
  C3: '4 어디가 뒤집혔나', N10: '4 어디가 뒤집혔나', N11a: '4 어디가 뒤집혔나', N11b: '4 어디가 뒤집혔나', N12: '4 어디가 뒤집혔나', N13_observe: '4 어디가 뒤집혔나', N13_write: '4 어디가 뒤집혔나', N13_bridge: '5 검사로 찾기', C4: '5 검사로 찾기', N14: '5 검사로 찾기', N15_operate: '5 검사로 찾기', N15_write: '5 검사로 찾기', N16: '5 검사로 찾기',
  N17: '6 얼마나 멀어야', N18: '6 얼마나 멀어야', N19: '7 닫기', N20: '7 닫기', N21: '7 닫기'
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/* ── 학생마다 다른 문제 (명세서 §36) ──────────────────────────────────────
   순수 난수를 쓰면 교사가 학생 화면을 재현할 수 없고, 새로고침할 때마다
   문제가 바뀌어 이어하기와 충돌한다. 학번을 시드로 쓰면 학생마다 다르면서
   같은 학번은 언제 열어도 같은 문제를 본다.

   만들어진 문제는 state에 저장한다. 시드만 저장하고 매번 다시 만들면,
   나중에 이 알고리즘을 고쳤을 때 과거 제출물을 재현할 수 없게 된다.

   §6-2의 1000회 시뮬레이션과 N2의 잡음에는 쓰지 않는다. 거기서는 실행할
   때마다 값이 달라지는 것 자체가 학습 내용이다. */
function hashSeed(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

function seededRandom(...parts) {
  let a = hashSeed(parts.join('|'));
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function studentId() { return String(state.student.sid || '').trim(); }
function hasStudentId() { return studentId().length > 0; }
function studentRandom(...parts) { return seededRandom(studentId(), ...parts); }

/* 시드로 문제를 만드는 화면은 학번이 없으면 문제를 만들지 않는다(§36-2). */
const SEEDED_SCREENS = new Set(['N4', 'N5_operate', 'N5_write', 'N11a', 'N11b', 'N12', 'N13_observe', 'N13_write', 'N16', 'N17']);

function defaultCircuit(stage = 'N6') {
  const fixed = ['message', 'receiver'];
  return { nodes: ['message', 'noise', 'receiver'], selected: null, version: 0, lastResult: null, fixed };
}

/* ── 한글 점자 (명세서 §15) ──────────────────────────────────────────────
   braille-codec / braille-design과 같은 표를 쓴다. 점 번호는 1~6이고,
   비트는 1번 점을 맨 앞자리로 하여 1번부터 6번까지 순서대로 읽는다. */
const BRAILLE = {
  initial: { 'ㄱ': [4], 'ㄴ': [1,4], 'ㄷ': [2,4], 'ㄹ': [5], 'ㅁ': [1,5], 'ㅂ': [4,5], 'ㅅ': [6], 'ㅇ': [], 'ㅈ': [4,6], 'ㅊ': [5,6], 'ㅋ': [1,2,4], 'ㅌ': [1,2,5], 'ㅍ': [1,4,5], 'ㅎ': [2,4,5] },
  medial: { 'ㅏ': [1,2,6], 'ㅑ': [3,4,5], 'ㅓ': [2,3,4], 'ㅕ': [1,5,6], 'ㅗ': [1,3,6], 'ㅛ': [3,4,6], 'ㅜ': [1,3,4], 'ㅠ': [1,4,6], 'ㅡ': [2,4,6], 'ㅣ': [1,3,5] },
  final: { 'ㄱ': [1], 'ㄴ': [3,4], 'ㄷ': [3,5], 'ㄹ': [2], 'ㅁ': [3,6], 'ㅂ': [3], 'ㅅ': [4], 'ㅇ': [3,4,6] }
};
const CHO_LIST = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG_LIST = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONG_LIST = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JAMO_TYPE_LABEL = { initial: '초성', medial: '중성', final: '종성' };
const DOT_VIEW_ORDER = [0, 3, 1, 4, 2, 5];   /* 화면에는 1,4,2,5,3,6 순서로 그린다 */

function dotsToBits(dots) {
  const bits = [0, 0, 0, 0, 0, 0];
  dots.forEach(n => { bits[n - 1] = 1; });
  return bits;
}

function dotLabel(bits) {
  const on = bits.map((bit, index) => (bit ? index + 1 : 0)).filter(Boolean);
  return on.length ? `${on.join('-')}점` : '점 없음';
}

/* 한 글자를 초성·중성·종성으로 풀어 점형 칸을 만든다. 점자표에 없는 겹자모
   (ㅘ, ㅐ 등)는 임의로 지어내지 않고 화면에 그대로 알린다. */
function messageCells(text) {
  const cells = [];
  const skipped = [];
  for (const [charIndex, char] of [...text].entries()) {
    const code = char.codePointAt(0) - 0xac00;
    if (code < 0 || code > 11171) { if (char.trim()) skipped.push(char); continue; }
    const parts = [
      ['initial', CHO_LIST[Math.floor(code / 588)]],
      ['medial', JUNG_LIST[Math.floor((code % 588) / 28)]],
      ['final', JONG_LIST[code % 28]]
    ];
    for (const [type, sym] of parts) {
      if (!sym) continue;
      if (type === 'initial' && sym === 'ㅇ') continue;   /* 초성 ㅇ은 규칙에 따라 만들지 않는다 */
      const dots = BRAILLE[type][sym];
      if (!dots) { skipped.push(sym); continue; }
      cells.push({ type, sym, charIndex, bits: dotsToBits(dots) });
    }
  }
  return { cells, skipped };
}

/* 기본값은 빈칸이다(명세서 §15). 이름을 자동으로 채우면 학생이 입력할 것이
   없어 보여서 이 화면이 무엇을 하는 곳인지 드러나지 않는다. */
function messageWord() { return String(state.screens.N2.word || '').trim(); }

/* 각 점을 오류율만큼 무작위로 뒤집는다. 고정된 식이 아니므로 누를 때마다 달라진다. */
function transmitCells(cells, ratePercent) {
  return cells.map(cell => ({ ...cell, received: cell.bits.map(bit => (Math.random() * 100 < ratePercent ? bit ^ 1 : bit)) }));
}

// 음절 경계와 생략된 초성 ㅇ·받침 없음은 보낸 낱말의 구조로 보존한다.
// 실제 자모는 원래 글자가 아니라 받은 점형과 해당 위치의 표로만 판독한다.
function readBrailleWord(word, cells) {
  const failures = [];
  const decodedCells = cells.map((cell, index) => {
    const bits = cell.received || cell.bits;
    const found = Object.entries(BRAILLE[cell.type] || {}).find(([, dots]) => dotsToBits(dots).every((bit, i) => bit === bits[i]));
    if (!found) failures.push(`${index + 1}번 칸: 읽을 수 없는 점형`);
    return found ? found[0] : '?';
  });
  const text = [...word].map((char, charIndex) => {
    if (!char.trim()) return char;
    const code = char.codePointAt(0) - 0xac00;
    if (code < 0 || code > 11171 || messageCells(char).skipped.length) {
      failures.push(`${charIndex + 1}번째 글자: 점자표 지원 범위 밖`);
      return '?';
    }
    const parts = { initial: CHO_LIST[Math.floor(code / 588)] === 'ㅇ' ? 'ㅇ' : '?', medial: '?', final: code % 28 === 0 ? '' : '?' };
    cells.forEach((cell, i) => { if (cell.charIndex === charIndex) parts[cell.type] = decodedCells[i]; });
    if (Object.values(parts).includes('?')) return '?';
    return String.fromCharCode(0xac00 + CHO_LIST.indexOf(parts.initial) * 588 + JUNG_LIST.indexOf(parts.medial) * 28 + JONG_LIST.indexOf(parts.final));
  }).join('');
  return { text, decodedCells, failures };
}

function brailleHtml(cells, useReceived = false) {
  if (!cells.length) return '<p class="muted small" style="margin:0">보낼 점형이 없습니다. 위 칸에 한글 낱말을 넣어 주세요.</p>';
  return `<div class="braille-cells">${cells.map(cell => {
    const bits = useReceived && cell.received ? cell.received : cell.bits;
    return `<div class="braille-cell" role="img" aria-label="${esc(JAMO_TYPE_LABEL[cell.type])} ${esc(cell.sym)}, ${dotLabel(bits)}">${DOT_VIEW_ORDER.map(index => `<span class="braille-dot ${bits[index] ? 'on' : ''}"></span>`).join('')}</div>`;
  }).join('')}</div>`;
}

function brailleLabelRow(cells) {
  if (!cells.length) return '';
  return `<div class="cell-labels" aria-hidden="true">${cells.map(cell => `<span class="cell-label">${esc(cell.sym)}</span>`).join('')}</div>`;
}

// One real six-dot cell, prefixed with two zero padding bits, forms the 8-bit example.
const MAJORITY_SOURCE = [0, 0, ...dotsToBits(BRAILLE.medial['ㅜ'])];
const MAJORITY_ROWS = [[0,3,6],[1,4,7],[2,5]].map(errors => MAJORITY_SOURCE.map((bit,index) => errors.includes(index) ? bit ^ 1 : bit));
function majoritySource(activity = 'N4') { return state.screens[activity].exampleVersion === 1 ? [1,0,1,0,1,activity === 'N4' ? 1 : 0,1,1] : MAJORITY_SOURCE; }

function restoredBraille(answer, success) {
  if (state.screens.N4.exampleVersion === 1) return `<div class="evidence">이전 예제의 복원 신호: ${answer.map(value => value === null ? '·' : value).join(' ')} · ${success ? '복원 완료' : '판단 중'}</div>`;
  const ready = answer.length === 8 && answer.every(value => value !== null);
  const bits = Array.from({length:6}, (_,i) => answer[i+2] ?? 0);
  return `<div class="braille-card"><strong>복원 점자</strong><span class="muted small">8비트 중 앞 2비트는 0으로 채운 여백이고, 뒤 6비트가 점 번호 1~6입니다.</span>${brailleHtml([{type:'medial',sym:success?'ㅜ':'선택한 점형',bits}])}<output>${!ready ? '아직 고르지 않은 칸이 있습니다.' : success ? '✓ 복원된 글자: ㅜ' : '아직 원래 점형을 복원하지 못했습니다.'}</output></div>`;
}

/* 6×6 정보 칸은 실제 한글 점자 여섯 자모다(명세서 §18).
   각 행이 한 자모의 점형(6비트), 각 열이 점 번호 1~6번이다.
   이전에는 (r*5+c*3+r+c)%2 로 채웠는데 이 식은 항상 0이라 격자가 통째로
   비어 있었고, 그래서 패리티 활동이 성립하지 않았다. */
/* 정확히 6자모인 낱말만 쓴다. slice(0,6)으로 자르면 격자에 낱말이 다 담기지
   않아 「받은 낱말」을 보여줄 수 없다(명세서 §32-4 5번).
   전부 3음절이고 초성 ㅇ이 없어 여섯 자모 모두 점형이 있다. */
const PARITY_WORDS = [
  '고구마', '스스로', '토마토', '바나나', '다시마', '가마니', '너구리',
  '소나무', '기러기', '도토리', '두더지', '미나리', '보리수', '가로수',
  '바가지', '사다리', '다리미', '고사리', '도라지'
];

/* initialState()는 state가 아직 만들어지기 전에 돌기 때문에 학번을 읽을 수
   없다. 그래서 시드를 인자로 받는다. */
function parityWord(sid = '') {
  const rand = seededRandom(sid, 'N11');
  return PARITY_WORDS[Math.floor(rand() * PARITY_WORDS.length)];
}

function createParityGrid(sid = '') {
  const source = messageCells(parityWord(sid)).cells.slice(0, 6);
  const data = source.map(cell => cell.bits.slice());
  const labels = source.map(cell => cell.sym);
  while (data.length < 6) { data.push([0, 0, 0, 0, 0, 0]); labels.push('·'); }
  const word = parityWord(sid);
  const values = Array.from({ length: 7 }, () => Array(7).fill(null));
  /* 13칸이 전부 빈 상태로 시작하면 막막하다. 첫 세로줄의 검사 칸 하나를
     예시로 채워 둔다(명세서 §18-1). 이 칸은 학생이 고치지 않는다. */
  values[0][1] = data.reduce((sum, row) => sum + row[0], 0) % 2;
  return { word, data, labels, values, placed: [[0, 1]], check: null, checked: false };
}

const PARITY_GIVEN = [0, 1];
function isParityGiven(r, c) { return r === PARITY_GIVEN[0] && c === PARITY_GIVEN[1]; }

function initialState(sid = '') {
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
      N2: { rate: 10, sends: 0, word: '', cells: null },
      N3: { prediction: '', locked: false, reason: '' },
      N4: { answer: Array(8).fill(null), checked: false, exampleVersion: 2 },
      N11a: { answer: null, checked: false, tries: 0 },
      N5: { count: 3, answers: { 3: [], 4: [], 5: [] }, checked: false, ties: [], observedCounts: [], exampleVersion: 2 },
      N12: { round: 0, guesses: [], board: null },
      N14: { prediction: '', confirmed: false, signal: null, pick: [], counted: false },
      N15: { groups: [[]], selected: null, checked: false, unlocked: 1 },
      N16: { round: 0, guesses: [], cases: [] },
      N17: { codes: ['000000', '000000', '000000', '000000'], query: null, guess: '', tested: false }
    },
    circuits: { N6: defaultCircuit('N6'), N7: defaultCircuit('N7'), N8: defaultCircuit('N8'), N10: defaultCircuit('N10') },
    parity: createParityGrid(sid),
    submitted: { at: 0, code: '', status: '' },
    log: [],
    attemptStats: {},
    writeMeta: {},
    predicts: {},
    lastSavedAt: 0
  };
}

let state = loadState();
let saveTimer = null;
let mascotState = { mood: 'idle', text: '조작할 곳을 찾았다면, 네 방법으로 먼저 시험해 보세요.', open: false };
let submissionInFlight = false;
let resumeView = state.screenId;
let feedbackPending = null;
if (resumeView !== 'N0') state.screenId = 'N0';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw);
    const fresh = initialState();
    const merged = { ...fresh, ...parsed, student: { ...fresh.student, ...(parsed.student || {}) }, screens: { ...fresh.screens, ...(parsed.screens || {}) }, circuits: { ...fresh.circuits, ...(parsed.circuits || {}) }, submitted: { ...fresh.submitted, ...(parsed.submitted || {}) } };
    merged.log = Array.isArray(parsed.log) ? parsed.log : [];
    Object.keys(fresh.screens).forEach(key => { merged.screens[key] = { ...fresh.screens[key], ...(parsed.screens?.[key] || {}) }; });
    for (const key of ['N4','N5']) if (parsed.screens?.[key] && !parsed.screens[key].exampleVersion) merged.screens[key].exampleVersion = 1;
    merged.views = parsed.views || {};
    merged.guideSeen = parsed.guideSeen || {};
    merged.attemptStats = parsed.attemptStats || {};
    for (const screen of new Set(merged.log.map(item => item.screen))) {
      if (merged.attemptStats[screen]) continue;
      const attempts = merged.log.filter(item => item.screen === screen && item.kind === 'attempt');
      const firstSuccess = attempts.findIndex(item => item.result === 'ok');
      merged.attemptStats[screen] = { count: attempts.length, failures: attempts.filter(item => ['fail','partial'].includes(item.result)).length, firstSuccess: firstSuccess < 0 ? null : firstSuccess + 1 };
    }
    merged.writeMeta = parsed.writeMeta || {};
    merged.predicts = parsed.predicts || {};
    if (!SCREEN_ORDER.some(screen => screen.id === merged.screenId)) merged.screenId = 'N0';
    if (merged.submitted.status === '준비 중') merged.submitted = { ...merged.submitted, at: 0, status: '전송이 중단되었습니다. 확인 후 다시 제출하세요.', result: 'fail' };
    merged.writes = parsed.writes || {};
    merged.hints = parsed.hints || {};
    merged.parity = parsed.parity && parsed.parity.data ? parsed.parity : fresh.parity;
    return merged;
  } catch (error) {
    return initialState();
  }
}

function validateProgress(data) {
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const bit = value => value === 0 || value === 1;
  const matrix = (value, size, cell) => Array.isArray(value) && value.length === size && value.every(row => Array.isArray(row) && row.length === size && row.every(cell));
  if (!object(data) || data.v !== 1 || !object(data.student) || typeof data.student.sid !== 'string' || typeof data.student.name !== 'string' || !object(data.screens) || !object(data.circuits) || !Array.isArray(data.log) || !SCREEN_ORDER.some(screen => screen.id === data.screenId)) return false;
  if (!object(data.parity) || !matrix(data.parity.data, 6, bit) || !matrix(data.parity.values, 7, value => value === null || bit(value)) || !Array.isArray(data.parity.placed)) return false;
  const fresh = initialState();
  if (!Object.keys(fresh.screens).every(key => object(data.screens[key]))) return false;
  const n2 = data.screens.N2;
  const validNoiseCells = cells => cells === null || (Array.isArray(cells) && cells.length <= 18 && cells.every(cell => object(cell) && ['initial','medial','final'].includes(cell.type) && typeof cell.sym === 'string' && Array.isArray(cell.bits) && cell.bits.length === 6 && cell.bits.every(bit) && (!cell.received || (Array.isArray(cell.received) && cell.received.length === 6 && cell.received.every(bit)))));
  if (typeof n2.word !== 'string' || n2.word.length > 6) return false;
  if (n2.sessions !== undefined && (!object(n2.sessions) || !Object.entries(n2.sessions).every(([key, session]) => ['a','b'].includes(key) && object(session) && typeof session.word === 'string' && session.word.length <= 6 && Number.isFinite(session.rate) && session.rate >= 0 && session.rate <= 30 && Number.isInteger(session.sends) && session.sends >= 0 && Number.isInteger(session.atTen) && session.atTen >= 0 && validNoiseCells(session.cells)))) return false;
  if (!Array.isArray(data.screens.N4.answer) || data.screens.N4.answer.length !== 8 || !data.screens.N4.answer.every(value => value === null || bit(value))) return false;
  /* N5는 3·4·5번 받았을 때의 답을 따로 보관한다(명세서 §16). 옛 구조(answer 하나)도 받는다. */
  const n5Lists = object(data.screens.N5.answers) ? Object.values(data.screens.N5.answers) : [data.screens.N5.answer];
  if (![3,4,5].includes(data.screens.N5.count)) return false;
  if (!n5Lists.every(list => Array.isArray(list) && list.length <= 8 && list.every(value => value === null || bit(value)))) return false;
  if (!['N12','N16'].every(key => Array.isArray(data.screens[key].guesses) && Number.isInteger(data.screens[key].round) && data.screens[key].round >= 0 && data.screens[key].round < 3)) return false;
  if (!Array.isArray(data.screens.N16.cases) || !data.screens.N16.cases.every(value => Number.isInteger(value) && value >= 0 && value <= 7)) return false;
  /* 단계 잠금으로 검사 묶음 1개에서 시작한다(명세서 §32-4 12번). */
  if (!Array.isArray(data.screens.N15.groups) || data.screens.N15.groups.length < 1 || data.screens.N15.groups.length > 4 || !data.screens.N15.groups.every(group => Array.isArray(group) && group.every(value => Number.isInteger(value) && value >= 1 && value <= 7))) return false;
  if (!Array.isArray(data.screens.N17.codes) || data.screens.N17.codes.length !== 4 || !data.screens.N17.codes.every(code => /^[01]{6}$/.test(code))) return false;
  return Object.keys(fresh.circuits).every(key => {
    const nodes = data.circuits[key]?.nodes;
    return Array.isArray(nodes) && nodes[0] === 'message' && nodes.at(-1) === 'receiver' && nodes.filter(type => type === 'noise').length === 1 && nodes.every(type => ['message','noise','receiver','repeat3','repeat5','majority','parityEncode','parityCheck'].includes(type));
  });
}

function persist(immediate = false) {
  clearTimeout(saveTimer);
  const action = () => {
    try {
      state.lastSavedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, screenId: state.screenId === 'N0' ? resumeView : state.screenId }));
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

function protectedLogEntries(logs) {
  const kept = new Set();
  const first = new Set();
  const success = new Set();
  const latest = new Map();
  for (const entry of logs) {
    if (entry.kind !== 'attempt') continue;
    if (!first.has(entry.screen)) { first.add(entry.screen); kept.add(entry); }
    if (entry.result === 'ok' && !success.has(entry.screen)) { success.add(entry.screen); kept.add(entry); }
    latest.set(entry.screen, entry);
  }
  latest.forEach(entry => kept.add(entry));
  return kept;
}

function trimLogs(logs, limit = 2000) {
  if (logs.length <= limit) return logs;
  const keep = protectedLogEntries(logs);
  for (let i = logs.length - 1; i >= 0 && keep.size < limit; i -= 1) keep.add(logs[i]);
  return logs.filter(entry => keep.has(entry));
}

function logEvent(kind, screen, detail = {}, result = '') {
  const entry = { t: Date.now(), screen, kind, ...detail, result, hintLevel: state.hints[screen] || 0 };
  if (kind === 'attempt') {
    const stats = state.attemptStats[screen] || { count: 0, failures: 0, firstSuccess: null };
    stats.count += 1;
    if (result === 'fail' || result === 'partial') stats.failures += 1;
    if (result === 'ok' && stats.firstSuccess === null) stats.firstSuccess = stats.count;
    state.attemptStats[screen] = stats;
    entry.number = stats.count;
    if (HINTS[screen] && ['ok','fail','partial'].includes(result)) feedbackPending = {screen,result};
  }
  state.log.push(entry);
  state.log = trimLogs(state.log);
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
  if (key === 'sid') reseedUntouchedProblems();
  persist();
}

/* 학번을 넣기 전에 만들어 둔 문제는 그 학생의 문제가 아니다. 아직 손대지
   않은 것만 새 학번으로 다시 만든다. 이미 푼 문제는 건드리지 않는다(§36-2). */
function reseedUntouchedProblems() {
  const sid = studentId();
  const screens = state.screens;
  if (screens.N4.answer.every(value => value === null)) screens.N4.rows = null;
  const answered = screens.N5.answers && Object.values(screens.N5.answers).some(list => Array.isArray(list) && list.some(value => value !== null));
  if (!answered) screens.N5.rows = {};
  if (state.parity.placed.length <= 1) state.parity = createParityGrid(sid);
  if (screens.N12 && !screens.N12.guesses.some(guess => guess)) screens.N12.board = null;
  if (screens.N13 && !String(state.writes.N13_two || '').trim()) screens.N13 = null;
  if (screens.N16 && !screens.N16.guesses.some(guess => guess !== undefined)) screens.N16.cases = [];
  if (screens.N17) screens.N17.query = null;
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
  if (id !== 'N0') resumeView = id;
  state.hintOpen = false;
  mascotState = { mood: 'idle', text: '', open: false };
  recordView(id);
  render();
  $('#main-content')?.focus({ preventScroll: true });
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
  const focused = document.activeElement;
  const focusId = focused?.id;
  const focusData = focused?.dataset ? Object.entries(focused.dataset).map(([key, value]) => [key, value]) : [];
  currentIndex();
  const info = screenInfo();
  recordView(info.id);
  $('#section-label').textContent = ACTIVITY_SECTIONS[info.id] || '';
  $('#screen-root').innerHTML = renderScreen(info.id);
  bindScreen(info.id);
  updateNavigation();
  renderActivityMenu();
  if (feedbackPending && feedbackPending.screen===state.screenId) {
    const {screen,result}=feedbackPending;
    feedbackPending=null;
    const level=advanceHint(screen);
    const stage=screen==='N6_operate'?'N6':screen;
    const metric=state.circuits[stage]?.lastResult?.metric;
    const message=result==='ok' ? '목표 조건을 만족했습니다. 결과를 근거로 생각을 정리해 보세요.' : state.circuits[stage] ? circuitHint(stage,level,metric) : hintTextFor(screen,Math.max(1,level));
    const key=`feedback:${screen}`;
    const isNew=state.guideSeen[key]!==message;
    mascotState={mood:result==='ok'?'cheer':hintMood(level),text:message,open:isNew};
    state.guideSeen[key]=message;
  }
  showFirstGuide(info.id);
  renderMascot();
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
  else if (focusData.length) $$('button, [tabindex]').find(element => focusData.every(([key, value]) => element.dataset[key] === value))?.focus({ preventScroll: true });
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

/* 학번이 없으면 문제를 만들지 않는다(명세서 §36-2). 임의 시드로 대신
   만들어 두면 나중에 학번을 넣어도 그 문제가 그대로 남는다. */
function seedNotice(id) {
  const info = screenInfo(id);
  return `${heading(ACTIVITY_SECTIONS[id] || '', '학번을 먼저 입력하세요.', '이 활동은 학생마다 다른 문제가 나옵니다. 학번을 넣어야 내 문제를 만들 수 있습니다.')}
  <div class="card stack">
    <div class="notice">시작 화면에서 학번을 입력하면 「${esc(info.label)}」 문제가 만들어집니다. 같은 학번이면 언제 열어도 같은 문제가 나옵니다.</div>
    <div class="button-row"><button id="go-enter-sid" class="primary-button" type="button">시작 화면으로</button></div>
  </div>`;
}

function renderScreen(id) {
  if (SEEDED_SCREENS.has(id) && !hasStudentId()) return `<section class="screen">${seedNotice(id)}</section>`;
  const renderers = {
    N0: renderN0, C1: renderComic, N1: renderN1, N2_operate: renderN2Operate, N2_write: renderN2Write, C2: renderComic, N3: renderN3, N4: renderN4,
    N5_operate: renderN5Operate, N5_write: renderN5Write, N6_operate: renderCircuitScreen, N6_read: renderN6Read,
    N7: renderCircuitScreen, N8: renderCircuitScreen, N9: renderN9, C3: renderComic, N10: renderCircuitScreen, N11a: renderN11a, N11b: renderN11b, N12: renderN12,
    N13_observe: renderN13Observe, N13_write: renderN13Write, N13_bridge: renderN13Bridge, C4: renderComic, N14: renderN14, N15_operate: renderN15Operate, N15_write: renderN15Write,
    N16: renderN16, N17: renderN17, N18: renderN18, N19: renderN19, N20: renderN20, N21: renderN21
  };
  return `<section class="screen">${(renderers[id] || renderN1)(id)}</section>`;
}

/* 상단 띠가 이미 단원을 적고 있으므로 머리말에서 같은 문구를 반복하지 않는다(명세서 §12).
   「2 다수결 · 조작」처럼 뒤에 붙은 말만 남긴다. */
function heading(kicker, title, text) {
  const section = ACTIVITY_SECTIONS[state.screenId] || '';
  const rest = section && kicker.startsWith(section) ? kicker.slice(section.length).replace(/^\s*·\s*/, '') : kicker;
  return `<div class="screen-heading">${rest ? `<span class="eyebrow">${esc(rest)}</span>` : ''}<h2>${esc(title)}</h2><p>${esc(text)}</p></div>`;
}

function writeBox(id, prompt, kind = 'explain', options = {}) {
  const value = state.writes[id] || '';
  const locked = options.locked || false;
  return `<div class="write-item">
    <label for="write-${esc(id)}">${esc(prompt)}</label>
    ${options.hint ? `<small>${esc(options.hint)}</small>` : ''}
    ${state.writeMeta[id] && state.log.some(item => item.kind === 'attempt' && item.t > state.writeMeta[id].at && evidenceScreens(id).includes(item.screen)) ? '<small>이후 실험 결과가 추가되었습니다. 기존 설명과 비교해 보세요.</small>' : ''}
    <textarea id="write-${esc(id)}" data-write="${esc(id)}" data-kind="${esc(kind)}" ${locked ? 'disabled' : ''} placeholder="실험 결과를 근거로 적어 보세요.">${esc(value)}</textarea>
    ${locked ? '<small class="muted">확정한 예측은 원 기록으로 보존됩니다.</small>' : ''}
  </div>`;
}

function evidenceFor(ids = []) {
  const logs = state.log.filter(item => item.kind === 'attempt' && ids.includes(item.screen));
  if (!logs.length) return '<div class="evidence muted">아직 실행 기록이 없습니다.</div>';
  const rows = logs.map((item, index) => `<div>${esc(screenInfo(item.screen).label)} ${item.number || index + 1}번째 시도 — ${esc(item.detail || item.result || '실행 기록')} ${item.result === 'ok' ? '✓' : ''}</div>`).join('');
  return `<div class="evidence"><strong>최근 실행</strong><br>${esc(logs.at(-1).detail || logs.at(-1).result)}</div><details class="attempt-details"><summary>이 섹션의 시도 이력 ${logs.length}회</summary><div class="evidence">${rows}</div></details>`;
}

function evidenceScreens(field) {
  if (field.startsWith('N9') || field.startsWith('N20')) return ['N6_operate','N7','N8','N10','N11b','N12','N15_operate'];
  if (field.startsWith('N2_')) return [field === 'N2_observe' ? 'N2_operate' : 'N2_write'];
  if (field.startsWith('N13')) return ['N12','N13_observe'];
  if (field.startsWith('N15')) return ['N15_operate'];
  return [field.split('_')[0] + '_operate', field.split('_')[0]];
}

const COMIC_DATA = {
  C1: {
    src: './assets/comic-1.png',
    title: '신호는 망가집니다',
    intro: '점자로 찍은 편지가 망가지는 상황을 보고, 다음 활동에서 해결할 문제를 세워 봅니다.',
    alt: ['교실에서 학생이 점자 편지를 손끝으로 읽으며 웃고 있습니다.', '가방에 눌린 편지에서 점 하나가 평평해졌습니다.', '학생이 달라진 점자를 읽고 무슨 글자인지 몰라 고개를 갸웃합니다.', '학생이 편지를 들고 다시 보낼 수 없는 상황에서 어떻게 해야 할지 생각합니다.'],
    frames: [
      '학생이 점자 편지를 손끝으로 읽으며 웃습니다. “읽히네!”',
      '가방에 눌려 점 하나가 사라집니다.',
      '점 하나가 달라져 학생이 글자를 알아보지 못합니다.',
      '학생이 다시 보내 달라고 할 수 없는 상황에서 해결 방법을 생각합니다.'
    ],
    explanation: '신호가 오가는 길에는 늘 잡음이 있습니다. 점자처럼 다시 보낼 수 없는 경우도 있고, 우주 탐사선처럼 다시 보낼 수 있어도 시간이 아주 오래 걸리는 경우도 있습니다. 이번 시간에는 망가져도 알아채고, 고칠 수 있는 방법을 직접 설계합니다.'
  },
  C2: {
    src: './assets/comic-2.png',
    title: '여러 번 보내기',
    intro: '한 번 말하면 잘못 들을 수 있습니다. 같은 말을 여러 번 보내면 무엇을 비교할 수 있을까요?',
    alt: ['시끄러운 공사장에서 학생이 다른 학생에게 “3시!”라고 외칩니다.', '상대 학생이 잘못 들은 듯 머리를 긁으며 “2시?”라고 되묻습니다.', '처음 학생이 같은 말을 여러 번 외치고 상대 학생이 반복된 신호를 듣습니다.', '상대 학생이 1시·2시·3시라고 적힌 세 종이를 비교하며 생각하고, 말풍선에 “2시? 3시?”가 나타납니다.'],
    frames: [
      '시끄러운 공사장에서 A가 B에게 “3시!”라고 외칩니다.',
      'B가 잘못 들은 듯 “2시?”라고 되묻습니다.',
      'A가 같은 말을 여러 번 외칩니다.',
      'B가 1시·2시·3시라고 적힌 세 종이를 비교하며 “2시? 3시?”라고 생각합니다.'
    ],
    explanation: '같은 신호를 여러 번 보내면 받는 쪽에 비교할 근거가 생깁니다. 하지만 세 번 보내면 보낼 양도 세 배가 됩니다. 정확함과 비용 중 무엇을 택할지가 오늘의 문제입니다.'
  },
  C3: {
    src: './assets/comic-3.png',
    section: '4 어디가 뒤집혔나',
    title: '검사 점 붙이기',
    intro: '점 하나를 더 붙이는 것만으로 오류가 있는지 알 수 있습니다. 그 대신 어느 점인지는 알 수 없습니다.',
    alt: ['보내는 사람이 「검은 점은 항상 짝수 개」라는 규칙을 적어 둡니다.', '점이 홀수일 때 다른 색 점 하나를 더 찍어 짝수로 맞춥니다. 이 점을 검사 점이라고 합니다.', '받는 사람이 점을 세어 짝수인 것을 확인하고 고개를 끄덕입니다.', '다른 편지에서 점이 홀수인 것을 세고 눈을 크게 뜨며 어딘가 잘못됐다는 것을 알아챕니다.'],
    frames: [
      '보내는 사람이 규칙을 정합니다. “검은 점의 개수는 항상 짝수.”',
      '점이 홀수면 점 하나를 더 붙여 짝수로 맞춥니다. 이 점을 검사 점이라고 합니다.',
      '받는 사람이 세어 봅니다. “짝수네. 괜찮아.”',
      '다른 편지는 홀수입니다. “홀수야! 어딘가 잘못됐어.”'
    ],
    explanation: '점 하나를 더 붙이는 것만으로 오류가 있는지 알 수 있습니다. 대신 어느 점이 뒤집혔는지는 알 수 없습니다. 틀렸다는 사실만 알 수 있는 것입니다. 위치까지 알아내려면 무엇이 더 필요할까요?'
  },
  C4: {
    src: './assets/comic-4.png',
    section: '5 검사로 찾기',
    title: '스무고개',
    intro: '여덟 가지 중 하나를 고르는 문제입니다. 예·아니오 질문을 몇 번 하면 될까요?',
    alt: ['두 사람이 마주 앉아 카드 여덟 장을 뒤집어 놓습니다. 그중 한 장이 뽑혔습니다.', '“왼쪽 네 장 안에 있어?”라고 묻자 상대가 고개를 끄덕이고 카드 네 장이 남습니다.', '“그중 위 두 장 안에 있어?”라고 묻자 고개를 젓고 카드 두 장이 남습니다.', '“둘 중 왼쪽?”이라고 묻자 끄덕이고 카드 한 장만 남아 빛납니다.'],
    frames: [
      '여덟 장 중 한 장이 뽑혔습니다. 어느 것일까요?',
      '“왼쪽 네 장 안에 있어?” — 예. 네 장이 남습니다.',
      '“그중 위 두 장 안에 있어?” — 아니오. 두 장이 남습니다.',
      '“둘 중 왼쪽?” — 예. 한 장이 남습니다. 8 = 2 × 2 × 2'
    ],
    explanation: '신호에서 어느 자리가 뒤집혔는지 알아내는 것도 같은 문제입니다. 일곱 자리와 「아무 곳도 안 뒤집힘」까지 여덟 가지 중 하나를 고르는 것이니, 좋은 질문 세 번이면 됩니다. 어떤 질문을 해야 할지는 여러분이 직접 설계합니다.'
  }
};

function renderComic(id) {
  const comic = COMIC_DATA[id] || COMIC_DATA.C1;
  const script = comic.frames.map(frame => `<li>${esc(frame)}</li>`).join('');
  return `${heading(comic.section || '1 보내면 망가진다', comic.title, comic.intro)}
  <div class="screen-layout comic-layout">
    <div class="card comic-card">
      <figure class="comic-figure">
        <img class="comic-image" src="${esc(comic.src)}" alt="${esc(comic.alt.join(' '))}" onerror="this.hidden=true;this.nextElementSibling.hidden=false">
        <div class="comic-fallback" hidden><strong>그림을 불러오지 못했습니다.</strong><ol>${script}</ol></div>
      </figure>
    </div>
    <div class="card stack comic-explanation">
      <h3>옆 설명</h3>
      <p>${esc(comic.explanation)}</p>
      <details class="comic-script"><summary>컷별 대본 보기</summary><ol>${script}</ol></details>
      <p class="muted small" style="margin-bottom:0">이 만화는 다음 활동에서 해결할 문제를 세우기 위한 도입 자료입니다. 정답을 먼저 확정하지 않고, 다음 화면에서 직접 예측하고 시험합니다.</p>
    </div>
  </div>`;
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
      <ul class="check-list"><li>잡음을 직접 보고, 반복과 다수결을 비교합니다.</li><li>통신로를 설계하고 정확성과 전송량을 함께 살핍니다.</li><li>검사 비트와 질문 설계로 오류 위치를 찾아봅니다.</li><li>마지막에는 실제 시도와 생각의 변화를 제출합니다.</li></ul>
      <p class="muted small" style="margin-bottom:0">선택 활동은 언제든 활동 목록에서 포함하거나 건너뛸 수 있습니다.</p>
    </div>
  </div>`;
}

function renderN1() {
  return `${heading('1 보내면 망가진다', '망가진 점자 편지도 알아볼 수 있게 하려면?', '점자로 찍은 편지는 눌리거나 지워져도 다시 보낼 수 없습니다. 받는 사람이 글자가 망가진 것을 알아채고, 원래 글자를 되찾게 하려면 보내는 쪽에서 무엇을 바꿔야 할까요?')}
  <div class="card stack"><div class="notice">망가진 것을 알아채는 방법과 원래 글자를 되찾는 방법을 생각해 봅시다.</div><div class="writing-list">${writeBox('N1_thought', '지금 떠오르는 방법을 한 가지 적어 보세요.', 'reflect')}</div></div>`;
}

function noisePart() { return state.screenId === 'N2_write' ? 'b' : 'a'; }

function noiseSession(part = noisePart()) {
  const n2 = state.screens.N2;
  if (!n2.sessions) {
    // 옛 기록은 (가)로 옮긴다. 재전송 당시 오류율은 모르므로 10% 관찰 횟수로 소급하지 않는다.
    const built = messageCells(messageWord()).cells;
    const legacy = Array.isArray(n2.cells) && n2.cells.length === built.length && n2.cells.every((cell, i) => cell.type === built[i].type && cell.sym === built[i].sym);
    n2.sessions = { a: { rate: n2.rate ?? 10, sends: n2.sends || 0, atTen: 0, word: messageWord(), cells: legacy ? built.map((cell, i) => ({ ...cell, received: n2.cells[i].received || cell.bits })) : null } };
  }
  if (!n2.sessions[part]) n2.sessions[part] = { rate: part === 'a' ? 10 : 0, sends: 0, atTen: 0, word: messageWord(), cells: null };
  const session = n2.sessions[part];
  if (session.word !== messageWord()) Object.assign(session, { word: messageWord(), cells: null, atTen: 0 });
  if (!session.cells && session.word) session.cells = transmitCells(messageCells(session.word).cells, session.rate);
  return session;
}

function noiseEvidence(session) {
  const reading = readBrailleWord(session.word, session.cells || []);
  const changed = (session.cells || []).flatMap((cell, i) => cell.bits.flatMap((bit, j) => bit !== (cell.received || cell.bits)[j] ? [`${i + 1}번 칸 ${j + 1}번 점`] : []));
  return { reading, changed };
}

function noiseDisplayHtml(session) {
  const cells = session.cells || [];
  const { reading, changed } = noiseEvidence(session);
  const sent = `<div class="braille-cells">${cells.map(cell => `<div class="noise-cell"><div class="braille-cell" role="img" aria-label="${esc(JAMO_TYPE_LABEL[cell.type])} ${esc(cell.sym)}, ${dotLabel(cell.bits)}">${DOT_VIEW_ORDER.map(j => `<span class="braille-dot ${cell.bits[j] ? 'on' : ''}"></span>`).join('')}</div><span>${esc(cell.sym)}</span></div>`).join('')}</div>`;
  const received = `<div class="braille-cells">${cells.map((cell, i) => {
    const bits = cell.received || cell.bits;
    const flips = cell.bits.flatMap((bit, j) => bit !== bits[j] ? [j + 1] : []);
    return `<div class="noise-cell"><div class="braille-cell" role="img" aria-label="${i + 1}번 칸 ${esc(JAMO_TYPE_LABEL[cell.type])}, ${dotLabel(bits)}, ${flips.length ? flips.join('·') + '번 점 뒤집힘' : '뒤집힌 점 없음'}">${DOT_VIEW_ORDER.map(j => `<span class="braille-dot ${bits[j] ? 'on' : ''} ${bits[j] !== cell.bits[j] ? 'flipped' : ''}"></span>`).join('')}</div><span>${esc(reading.decodedCells[i])}</span></div>`;
  }).join('')}</div>`;
  return `<div class="noise-signals"><div class="braille-card"><strong>보낸 점자</strong>${sent}</div><div class="braille-card"><strong>받은 점자</strong>${received}</div></div>
  <div class="noise-reading" role="status" aria-live="polite"><strong>되읽은 결과: <output>${esc(reading.text)}</output></strong><span>${reading.failures.length ? esc(reading.failures.join(' · ')) : '초성·중성·종성 자리를 유지하여 받은 점형을 읽었습니다. 원래 낱말과 비교하세요.'}</span></div>
  <details class="noise-changes"><summary>뒤집힌 점 ${changed.length}개 · 점선 테두리로 표시</summary><p>${changed.length ? esc(changed.join(' / ')) : '뒤집힌 점이 없습니다.'}</p></details>`;
}

function noiseQuestionHtml(part, session) {
  if (part === 'a' && session.atTen < 3 && !state.writes.N2_observe) return `<p class="notice">이 낱말을 오류율 10%에서 ${session.atTen}/3번 다시 보냈습니다. 3번 보내면 질문 칸이 열립니다. 다음 쪽으로 이동할 수도 있습니다.</p>`;
  return writeBox(part === 'a' ? 'N2_observe' : 'N2_explain', part === 'a'
    ? '오류율을 바꾸지 않았는데 결과가 달라졌습니다. 왜 그럴까요?'
    : '내 낱말을 읽을 수 있는 한계는 몇 %인가요? 그렇게 정한 근거는?', part === 'a' ? 'observe' : 'explain');
}

function renderN2(part) {
  const session = noiseSession(part);
  const word = messageWord();
  const built = messageCells(word);
  const title = part === 'a' ? '같은 오류율인데 결과도 같을까?' : '내 낱말은 어디까지 읽을 수 있을까?';
  const instruction = part === 'a' ? '오류율을 10%에 두고 「같은 오류율로 다시 보내기」를 3번 이상 누르세요.' : '오류율을 0%부터 올려 가며 되읽은 결과를 보세요. 한 번의 결과로 한계를 정하기 어렵다면 같은 오류율에서 다시 보내 보세요.';
  return `${heading('1 보내면 망가진다 · ' + (part === 'a' ? '(가) 같은 오류율' : '(나) 읽기 한계'), title, instruction)}
  <div class="card stack noise-workspace">
    <div class="field noise-word-field"><label for="braille-word">점자로 보낼 낱말</label><input id="braille-word" type="text" maxlength="6" value="${esc(word)}" placeholder="이름이나 짧은 한글 낱말"></div>
    ${!word ? '<div class="notice">보낼 낱말을 입력하세요. 입력하면 점자와 오류율 조절 막대가 나타납니다.</div>' : `
    ${built.skipped.length ? `<div class="notice">${esc([...new Set(built.skipped)].join(', '))}: 이 앱의 점자표 지원 범위 밖입니다. 해당 글자는 ?로 표시합니다. 지원하는 자모만 보내며, 겹자모 규칙은 다루지 않습니다.</div>` : ''}
    <div id="noise-display">${noiseDisplayHtml(session)}</div>
    <div class="slider-wrap"><label for="noise-rate"><strong>오류율</strong> <output id="noise-rate-value">${session.rate}%</output></label><input id="noise-rate" type="range" min="0" max="30" value="${session.rate}"></div>
    <div class="button-row"><button id="resend-noise" class="primary-button" type="button" ${built.cells.length ? '' : 'disabled'}>같은 오류율로 다시 보내기</button><span id="noise-count" class="muted small">다시 보낸 횟수 ${session.sends}회</span></div>
    <div id="noise-question">${noiseQuestionHtml(part, session)}</div>`}
  </div>`;
}

function renderN2Operate() { return renderN2('a'); }
function renderN2Write() { return renderN2('b'); }

function renderN3() {
  const n3 = state.screens.N3;
  return `${heading('1 보내면 망가진다 · 예측', '몇 번 반복해서 보내면 더 잘 읽을 수 있을까?', '여러 번 보내는 방법을 시험해 봅시다. 실험 결과를 보기 전에 예측을 정합니다. 확정한 최초 응답은 나중에 바뀌지 않습니다.')}
  <div class="card stack"><div class="choice-grid">${['1회', '3회', '5회'].map(option => `<div class="choice"><input id="n3-${option}" name="n3" type="radio" value="${option}" ${n3.prediction === option ? 'checked' : ''} ${n3.locked ? 'disabled' : ''}><label for="n3-${option}">${option}</label></div>`).join('')}</div>${writeBox('N3_reason', '왜 그렇게 예상했나요?', 'predict', { locked: n3.locked })}<div class="button-row"><button id="confirm-n3" class="primary-button" type="button" ${n3.locked ? 'disabled' : ''}>예측 확정</button>${n3.locked ? '<span class="result ok">예측이 잠겼습니다.</span>' : ''}</div></div>`;
}

/* 신호 줄과 「내 답」 줄은 픽셀 단위로는 이미 맞아 있었지만, 열 번호가 없어
   어느 자리를 답하는 중인지 알 수 없었다. 375px에서는 8칸 중 5칸만 보이고
   가로로 밀어야 하므로 더 그렇다. 열 머리와 세로 줄무늬를 넣는다(명세서 §16). */
function colClass(index) { return index % 2 === 1 ? ' alt' : ''; }

function rowsHtml(rows, answer = [], editable = false, ties = []) {
  const width = (rows[0] || answer).length || 8;
  const head = `<div class="bit-row heads"><span class="row-label">자리</span>${Array.from({ length: width }, (_, c) => `<span class="col-head${colClass(c)}">${c + 1}</span>`).join('')}</div>`;
  const signals = rows.map((row, r) => `<div class="bit-row"><span class="row-label">${r + 1}번째로 받은 신호</span>${row.map((bit, c) => `<span class="bit${colClass(c)}" aria-label="${r + 1}번째로 받은 신호 ${c + 1}번째 ${bit}">${bit}</span>`).join('')}</div>`).join('');
  const mine = editable ? `<div class="bit-row answer"><span class="row-label">내 답</span>${answer.map((value, c) => `<button type="button" class="bit-button${colClass(c)} ${value === null ? 'empty' : 'selected'} ${ties.includes(c) ? 'tie' : ''}" data-majority-index="${c}" aria-label="${c + 1}번째 답 ${value === null ? '미선택' : value}">${value === null ? '·' : value}</button>`).join('')}</div>` : '';
  return `<p class="matrix-scroll-help muted small">8번째 자리까지 보려면 표를 가로로 밀어 보세요.</p><div class="bit-display">${head}${signals}${mine}</div>`;
}

/* 부분 갱신(명세서 §37) — 칸 하나를 눌렀다고 본문 전체를 다시 그리지 않는다.
   전체 render()는 보기가 바뀔 때만 부른다. */
function paintAnswerRow(answer, ties = []) {
  answer.forEach((value, index) => {
    const button = document.querySelector(`[data-majority-index="${index}"]`);
    if (!button) return;
    button.textContent = value === null ? '·' : String(value);
    button.classList.toggle('empty', value === null);
    button.classList.toggle('selected', value !== null);
    button.classList.toggle('tie', ties.includes(index));
    button.setAttribute('aria-label', `${index + 1}번째 답 ${value === null ? '미선택' : value}`);
  });
}

function setResult(id, className, text) {
  const node = document.getElementById(id);
  if (!node) return;
  node.className = `result ${className}`;
  node.textContent = text;
}

/* 3줄은 열마다 다수가 반드시 확정되어야 한다. 한 열에서 많아야 한 줄만
   뒤집는다. 동점은 N5의 몫이다(명세서 §36-3). */
function buildN4Rows() {
  const rand = studentRandom('N4');
  const base = MAJORITY_SOURCE;
  const rows = [base.slice(), base.slice(), base.slice()];
  base.forEach((_, c) => {
    const pick = Math.floor(rand() * 4);
    if (pick < 3) rows[pick][c] = 1 - rows[pick][c];
  });
  return rows;
}

function n4Rows() {
  const n4 = state.screens.N4;
  if (n4.exampleVersion === 1) return [[1,0,1,0,1,0,1,1],[1,0,0,0,1,1,1,1],[1,1,1,0,0,1,1,0]];
  if (!Array.isArray(n4.rows) || n4.rows.length !== 3) { n4.rows = buildN4Rows(); persist(); }
  return n4.rows;
}

function n4Verdict() {
  const rows = n4Rows();
  const answer = state.screens.N4.answer;
  const correct = rows[0].map((_, c) => rows.map(row => row[c]).filter(Boolean).length >= 2 ? 1 : 0);
  const chosen = answer.every(value => value !== null);
  return { chosen, success: chosen && answer.every((value, i) => value === correct[i]) };
}

function updateN4View() {
  const answer = state.screens.N4.answer;
  const { chosen, success } = n4Verdict();
  paintAnswerRow(answer);
  const restored = document.getElementById('n4-restored');
  if (restored) restored.innerHTML = restoredBraille(answer, success);
  setResult('n4-result', success ? 'ok' : chosen ? 'fail' : '',
    !chosen ? '8칸을 모두 선택해 보세요.' : success ? '✓ 각 열의 다수 값으로 복원했습니다.' : '아직 깨진 부분이 있습니다. 어느 열인지 직접 다시 살펴보세요.');
}

function updateN5View() {
  const n5 = state.screens.N5;
  const rows = repeatedRows(n5.count);
  const ties = columnTies(rows);
  const answer = n5Answer();
  const complete = answer.every(value => value !== null);
  const correct = majorityAnswers(rows);
  const success = complete && !ties.length && answer.every((value, i) => value === correct[i]);
  paintAnswerRow(answer, ties);
  setResult('n5-result', ties.length ? 'partial' : success ? 'ok' : complete ? 'fail' : '',
    ties.length ? `동점인 열이 ${ties.map(value => value + 1).join(', ')}번째에 있습니다. 한쪽을 다수라고 정하기 어렵습니다.`
      : !complete ? '내 답 행을 채워 보세요.'
      : success ? '이 반복 횟수에서는 모든 열을 정할 수 있습니다.'
      : '선택한 답과 각 열의 값을 다시 비교해 보세요.');
}

/* 횟수를 바꾸면 이전 답이 지워지던 것을 고친다(명세서 §16).
   3·4·5번 받았을 때의 답을 따로 보관하고, 돌아오면 그대로 되살린다. */
function n5Answer(count = state.screens.N5.count) {
  const n5 = state.screens.N5;
  if (!n5.answers || typeof n5.answers !== 'object') n5.answers = {};
  if (Array.isArray(n5.answer) && n5.answer.length === 8 && !n5.answers[n5.count]) n5.answers[n5.count] = n5.answer;
  if (!Array.isArray(n5.answers[count]) || n5.answers[count].length !== 8) n5.answers[count] = Array(8).fill(null);
  return n5.answers[count];
}

function renderN4() {
  const rows = n4Rows();
  const n4 = state.screens.N4;
  const { chosen, success } = n4Verdict();
  return `${heading('2 다수결', '겹쳐 놓고, 열마다 하나를 골라 보세요.', '세 번 받은 신호를 같은 자리끼리 비교해 내 답을 정합니다. 아래 점형은 선택에 따라 바로 바뀝니다.')}
  <div class="card stack">${rowsHtml(rows, n4.answer, true)}<div id="n4-restored">${restoredBraille(n4.answer, success)}</div><div id="n4-result" class="result ${success ? 'ok' : chosen ? 'fail' : ''}" role="status">${!chosen ? '8칸을 모두 선택해 보세요.' : success ? '✓ 각 열의 다수 값으로 복원했습니다.' : '아직 깨진 부분이 있습니다. 어느 열인지 직접 다시 살펴보세요.'}</div><div class="button-row"><button id="reset-n4" class="secondary-button" type="button">선택 다시 하기</button><button id="open-n4-guide" class="secondary-button" type="button">조작 안내</button></div></div>`;
}

function renderN5Operate() {
  const n5 = state.screens.N5;
  const rows = repeatedRows(n5.count);
  const ties = columnTies(rows);
  const answer = n5Answer();
  const complete = answer.every(value => value !== null);
  const hasTie = ties.length > 0;
  const correct = majorityAnswers(rows);
  const success = complete && !hasTie && answer.every((value, i) => value === correct[i]);
  return `${heading('2 다수결 · 조작', '반복 횟수를 내가 정하면 무엇이 달라질까?', '3번·4번·5번 받았을 때 중 하나를 골라 같은 방식으로 답을 정합니다. 횟수를 바꾸면 어떤 차이가 생기는지 비교해 보세요.')}
  <div class="card stack"><div class="choice-grid">${[3,4,5].map(count => `<div class="choice"><input id="n5-count-${count}" name="n5-count" type="radio" value="${count}" ${n5.count === count ? 'checked' : ''}><label for="n5-count-${count}">${count}번 받았을 때</label></div>`).join('')}</div>${rowsHtml(rows, answer, true, ties)}<div id="n5-result" class="result ${hasTie ? 'partial' : success ? 'ok' : complete ? 'fail' : ''}" role="status">${hasTie ? `동점인 열이 ${ties.map(value => value + 1).join(', ')}번째에 있습니다. 한쪽을 다수라고 정하기 어렵습니다.` : !complete ? '내 답 행을 채워 보세요.' : success ? '이 반복 횟수에서는 모든 열을 정할 수 있습니다.' : '선택한 답과 각 열의 값을 다시 비교해 보세요.'}</div><div class="button-row"><button id="reset-n5" class="secondary-button" type="button">답 다시 하기</button><button id="open-n5-guide" class="secondary-button" type="button">조작 안내</button></div></div>`;
}

/* 홀수 횟수에서는 절반 미만만 뒤집어 다수결이 항상 하나로 정해지게 하고,
   4번 받았을 때는 2:2 동점 열을 반드시 하나 만든다(명세서 §36-3). */
function buildRepeatedRows(count) {
  const rand = studentRandom('N5', count);
  const base = majoritySource('N5');
  const rows = Array.from({ length: count }, () => base.slice());
  const maxFlip = Math.floor((count - 1) / 2);
  base.forEach((_, c) => {
    const flips = Math.floor(rand() * (maxFlip + 1));
    const order = Array.from({ length: count }, (_, r) => r);
    for (let i = order.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    for (let i = 0; i < flips; i += 1) rows[order[i]][c] = 1 - rows[order[i]][c];
  });
  if (count === 4) {
    const tieCol = Math.floor(rand() * base.length);
    for (let r = 0; r < 4; r += 1) rows[r][tieCol] = r < 2 ? 0 : 1;
  }
  return rows;
}

function repeatedRows(count) {
  const n5 = state.screens.N5;
  if (!n5.rows || typeof n5.rows !== 'object') n5.rows = {};
  if (!Array.isArray(n5.rows[count]) || n5.rows[count].length !== count) { n5.rows[count] = buildRepeatedRows(count); persist(); }
  return n5.rows[count];
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
  const observedFour = (n5.observedCounts || []).includes(4);
  return `${heading('2 다수결 · 작성', '반복 횟수와 판단 방법을 돌아보세요.', `선택한 ${n5.count}번 받았을 때의 결과와 동점 여부가 근거로 남아 있습니다.`)}
  <div class="card stack"><div class="evidence">선택한 반복: ${n5.count}번 받았을 때 · 동점 열: ${columnTies(rows).length ? columnTies(rows).map(i => i + 1).join(', ') : '없음'}</div><div class="writing-list">${observedFour ? writeBox('N5_compare', '3번·5번 받았을 때와 4번 받았을 때의 판단에는 어떤 차이가 있었나요?', 'explain') : '<div class="notice">4번 받았을 때는 미관찰입니다. 반복 횟수 정하기로 돌아가 비교해 보세요.</div>' + writeBox('N5_compare', '선택한 횟수들을 비교하여 차이를 설명해 보세요.', 'explain')}</div>${evidenceFor(['N5_operate'])}</div>`;
}

function circuitBlockLabel(type) {
  return ({ message: '메시지 8비트', repeat3: '3번 반복', repeat5: '5번 반복', noise: '잡음 구간', majority: '다수결', parityEncode: '검사 비트 붙이기', parityCheck: '검사 비트 확인', receiver: '받은 메시지' })[type] || type;
}

/* 팔레트에 이름만 놓여 있어 블록이 무엇을 하는 것인지 알 수 없었다(명세서 §17-6 ①).
   각 블록이 하는 일만 한 줄로 적는다. 정답 순서는 적지 않는다(§13). */
const BLOCK_ROLE = {
  message: '보낼 8비트',
  repeat3: '같은 신호를 3번 보낸다',
  repeat5: '같은 신호를 5번 보낸다',
  noise: '여기를 지나며 일부 비트가 뒤집힌다',
  majority: '여러 번 받은 것 중 많은 쪽을 고른다',
  parityEncode: '1의 개수가 짝수가 되도록 검사 비트 1개를 붙인다',
  parityCheck: '1의 개수가 홀수면 오류가 있다고 알린다',
  receiver: '받는 쪽에 도착한 신호'
};

function circuitBlockRole(type) { return BLOCK_ROLE[type] || ''; }

function circuitNode(type, index, selected, fixed = false) {
  return `<div class="circuit-node ${fixed ? 'fixed' : ''} ${selected === index ? 'selected' : ''}" data-node-index="${index}" ${fixed ? '' : 'draggable="true"'} tabindex="0" role="button" aria-label="${esc(circuitBlockLabel(type))} 블록${fixed ? ', 고정' : ', 끌어서 순서를 바꿀 수 있습니다'}">
    <strong>${esc(circuitBlockLabel(type))}</strong><span class="node-role">${esc(circuitBlockRole(type))}</span>
    ${!fixed ? `<div class="node-actions"><button type="button" data-node-action="up" data-node-index="${index}" aria-label="앞으로 이동">←</button><button type="button" data-node-action="down" data-node-index="${index}" aria-label="뒤로 이동">→</button><button type="button" data-node-action="remove" data-node-index="${index}" aria-label="블록 삭제">삭제</button></div>` : ''}
  </div>`;
}

function circuitConfigFor(id) { return state.circuits[id] || state.circuits.N6; }

/* ── 통신로 시뮬레이션 (명세서 §6-2, §17-2) ───────────────────────────────
   블록을 왼쪽에서 오른쪽 순서로 신호 배열에 적용한다. 순서가 결과를 바꾼다.
   화면에 쓰는 모든 수치는 실제 난수 시행의 상대도수이며 상수를 쓰지 않는다. */
const TRIALS = 1000;
const SOURCE = [1, 0, 1, 1, 0, 0, 1, 0];
const SOURCE_BITS = SOURCE.length;
const MAX_SIGNAL_BITS = 4096;

/* 난수 없이 길이만 따라가며 최종 길이·전송량·구조 경고를 구한다. */
function analyzeCircuit(nodes) {
  let length = SOURCE_BITS;
  let groupSize = 1;
  let parityAttached = 0;
  let noiseBits = 0;
  const warnings = [];
  for (const type of nodes) {
    if (type === 'repeat3' || type === 'repeat5') {
      const k = type === 'repeat3' ? 3 : 5;
      length *= k;
      if (length > MAX_SIGNAL_BITS) return { canCompare: false, finalLength: length, noiseBits, warnings: [`중간 신호가 ${MAX_SIGNAL_BITS}비트를 넘습니다. 반복 블록을 줄여 시험해 보세요.`] };
      groupSize *= k;
    } else if (type === 'parityEncode') {
      length += 1;
      parityAttached += 1;
    } else if (type === 'noise') {
      noiseBits = length;
    } else if (type === 'majority') {
      if (groupSize <= 1) { warnings.push('다수결할 대상이 없습니다. 앞쪽에 반복 블록이 필요합니다.'); continue; }
      if (length % groupSize !== 0) return { canCompare: false, finalLength: length, noiseBits, warnings: ['반복 묶음의 크기와 신호 길이가 맞지 않습니다. 블록 순서를 확인해 보세요.'] };
      length = Math.floor(length / groupSize);
      groupSize = 1;
    } else if (type === 'parityCheck') {
      if (!parityAttached) { warnings.push('검사할 검사 비트가 없습니다. 앞쪽에 검사 비트 붙이기가 필요합니다.'); continue; }
      length -= 1;
      parityAttached -= 1;
    }
  }
  const canCompare = length === SOURCE_BITS;
  if (!canCompare) warnings.push(`최종 신호가 ${length}비트입니다. 원본 ${SOURCE_BITS}비트와 나란히 비교할 수 없습니다.`);
  return { canCompare, finalLength: length, noiseBits, warnings };
}

/* 파이프라인 1회 실행. mode 'noise'는 각 비트를 NOISE_RATE로, 'one'은 정확히 한 비트를 뒤집는다. */
/* 잡음이 없었다면 있어야 할 값과 어긋난 자리를 찾는다. */
function wrongIndexes(signal, origin) {
  const out = [];
  for (let i = 0; i < signal.length; i += 1) if (signal[i] !== origin[i]) out.push(i);
  return out;
}

/* steps 배열을 넘기면 한 번의 전송이 블록을 지나며 어떻게 바뀌는지 기록한다
   (명세서 §17-6 ②). 시뮬레이션과 같은 함수를 쓰므로 표시와 계산이 갈라지지
   않는다. 1000회 시행에서는 steps를 넘기지 않아 기록 비용이 들지 않는다. */
function runPipelineOnce(nodes, mode, steps = null) {
  let signal = SOURCE.slice();
  let origin = steps ? SOURCE.slice() : null;
  let groupSize = 1;
  let parityAttached = 0;
  let detected = false;
  if (steps) steps.push({ label: '보낼 신호', type: 'start', signal: signal.slice(), wrong: [], fixed: [], groupSize: 1 });
  for (const type of nodes) {
    let fixedHere = [];
    if (type === 'repeat3' || type === 'repeat5') {
      const k = type === 'repeat3' ? 3 : 5;
      const next = [];
      const nextOrigin = steps ? [] : null;
      for (let i = 0; i < signal.length; i += 1) for (let j = 0; j < k; j += 1) { next.push(signal[i]); if (steps) nextOrigin.push(origin[i]); }
      signal = next;
      if (steps) origin = nextOrigin;
      groupSize *= k;
    } else if (type === 'parityEncode') {
      signal = signal.concat([signal.reduce((sum, bit) => sum + bit, 0) % 2]);
      if (steps) origin = origin.concat([origin.reduce((sum, bit) => sum + bit, 0) % 2]);
      parityAttached += 1;
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
      const nextOrigin = steps ? [] : null;
      for (let i = 0; i + groupSize <= signal.length; i += groupSize) {
        let ones = 0;
        for (let j = 0; j < groupSize; j += 1) ones += signal[i + j];
        /* 짝수 반복은 동점이 생긴다. 다수결로 정할 수 없으므로 한쪽을 무작위로 고른다. */
        next.push(ones * 2 === groupSize ? (Math.random() < 0.5 ? 1 : 0) : (ones * 2 > groupSize ? 1 : 0));
        if (steps) {
          let hadError = false;
          for (let j = 0; j < groupSize; j += 1) if (signal[i + j] !== origin[i + j]) { hadError = true; break; }
          /* 묶음 안에 뒤집힌 비트가 있었는데 원래 값으로 돌아온 자리 = 다수결이 고친 자리 */
          if (hadError && next.at(-1) === origin[i]) fixedHere.push(next.length - 1);
          nextOrigin.push(origin[i]);
        }
      }
      signal = next;
      if (steps) origin = nextOrigin;
      groupSize = 1;
    } else if (type === 'parityCheck') {
      if (!parityAttached) continue;
      detected = signal.reduce((sum, bit) => sum + bit, 0) % 2 !== 0;
      signal = signal.slice(0, -1);
      if (steps) origin = origin.slice(0, -1);
      parityAttached -= 1;
    } else {
      continue;
    }
    if (steps) steps.push({ label: circuitBlockLabel(type), type, signal: signal.slice(), wrong: wrongIndexes(signal, origin), fixed: fixedHere, groupSize, detected: type === 'parityCheck' ? detected : undefined });
  }
  return { signal, detected };
}

/* 표본이 너무 길면 화면에 담을 수 없으므로 기록하지 않는다. */
const TRACE_MAX_BITS = 120;

function traceHtml(steps) {
  if (!Array.isArray(steps) || steps.length < 2) return '';
  const last = steps.at(-1);
  const same = last.signal.length === SOURCE_BITS && last.wrong.length === 0;
  const rows = steps.map((step, index) => {
    const bits = step.signal.map((bit, i) => {
      const cls = step.fixed.includes(i) ? ' fixed' : step.wrong.includes(i) ? ' flip' : '';
      const gap = step.groupSize > 1 && i > 0 && i % step.groupSize === 0 ? ' gap' : '';
      return `<span class="trace-bit${cls}${gap}">${bit}</span>`;
    }).join('');
    const notes = [`${step.signal.length}비트`];
    if (step.type === 'noise') notes.push(step.wrong.length ? `뒤집힌 자리 ${step.wrong.length}개` : '이번에는 뒤집히지 않았습니다');
    if (step.fixed.length) notes.push(`고친 자리 ${step.fixed.length}개`);
    if (step.type === 'parityCheck') notes.push(step.detected ? '홀수 · 오류 있음' : '짝수 · 이상 없음');
    return `<div class="trace-row" style="--i:${index}">
      <span class="trace-label">${index === 0 ? '' : '<span aria-hidden="true">↓ </span>'}${esc(step.label)}</span>
      <span class="trace-bits">${bits}</span>
      <span class="trace-note">${esc(notes.join(' · '))}</span>
    </div>`;
  }).join('');
  return `<div class="trace-box">
    <h3>한 번 보내 본 예</h3>
    <div class="trace">${rows}</div>
    <p class="trace-verdict ${same ? 'ok' : 'fail'}">${same ? '✓ 원본 8비트와 같습니다.' : '! 원본과 다릅니다.'}</p>
    <p class="muted small" style="margin:0">이건 <strong>한 번</strong> 보낸 예입니다. 위의 성공률은 ${TRIALS}번 보낸 결과이므로, 이 한 번이 성공해도 성공률은 낮을 수 있습니다.</p>
  </div>`;
}

/* 1000회 시행의 상대도수를 낸다. N10은 한 비트 오류를 강제로 넣어 탐지율을 본다. */
/* 「결과 읽는 법」 화면이 쓸 표본이다(명세서 §32-4 1번).
   1번째 시행은 신호 변형 표시와 **같은 시행**이어야 한다. 따로 한 번 더
   돌리면 「앞 화면에서 본 그 한 번」이 거짓이 된다. */
const SAMPLE_TRIALS = 5;

function simulateCircuit(nodes, stage) {
  const info = analyzeCircuit(nodes);
  if (!info.canCompare) return { ...info, ran: false };
  const mode = stage === 'N10' ? 'one' : 'noise';
  let exact = 0;
  let bitHits = 0;
  let detectHits = 0;
  const samples = [];
  let firstTrace = null;
  for (let t = 0; t < TRIALS; t += 1) {
    /* 1번째 시행만 변형 과정을 함께 기록한다. 나머지는 기록 비용이 들지 않는다. */
    const steps = t === 0 ? [] : null;
    const out = runPipelineOnce(nodes, mode, steps);
    if (t === 0) firstTrace = steps.some(step => step.signal.length > TRACE_MAX_BITS) ? null : steps;
    let same = 0;
    for (let i = 0; i < SOURCE_BITS; i += 1) if (out.signal[i] === SOURCE[i]) same += 1;
    bitHits += same;
    if (same === SOURCE_BITS) exact += 1;
    if (out.detected) detectHits += 1;
    if (t < SAMPLE_TRIALS) samples.push({ signal: out.signal.slice(0, SOURCE_BITS), same });
  }
  return {
    ...info,
    ran: true,
    trials: TRIALS,
    exact,
    bitHits,
    samples,
    trace: firstTrace,
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
  N10: ['조립 S4', '9비트로 보내되, 오류를 알아채는 방법을 설계해 보세요.', '전체 1의 개수가 짝수가 되도록 검사 비트를 하나 붙이고, 받은 뒤 1의 개수가 짝수인지 세어 봅니다. 이것을 검사라고 부릅니다. 9비트 이하로 보내 한 비트 오류를 알아채는 구조를 만들어 보세요.']
};

/* 목표가 안내문 한 문장으로만 지나가 실행 중에는 화면에서 사라졌다.
   목표와 실제를 나란히 놓아야 비교가 학습이 된다(명세서 §32-4 2번).
   N7 표에 비용 행을 넣지 않는다 — §33의 「N8의 전송량 제한을 예고하지 않는다」. */
const STAGE_GOALS = {
  N7: [{ key: 'accuracy', label: '정확함', goal: `${MESSAGE_GOAL}% 이상` }],
  N8: [{ key: 'accuracy', label: '정확함', goal: `${MESSAGE_GOAL}% 이상` }, { key: 'cost', label: '비용', goal: '24비트 이하' }],
  N10: [{ key: 'detect', label: '오류 탐지', goal: '100%' }, { key: 'cost9', label: '비용', goal: '9비트 이하' }]
};

function goalTableHtml(stage, last, stale) {
  const rows = STAGE_GOALS[stage];
  if (!rows) return '';
  const m = last && !stale ? last.metric : null;
  const cell = row => {
    if (!last) return { text: '— 아직 시험하지 않음', ok: null };
    if (stale) return { text: '구성이 바뀌었습니다 — 다시 시험해 보세요', ok: null };
    if (row.key === 'accuracy') return { text: `${m.messageSuccess.toFixed(1)}%`, ok: m.messageSuccess >= MESSAGE_GOAL };
    if (row.key === 'cost') return { text: `${m.bits}비트`, ok: m.bits <= 24 };
    if (row.key === 'cost9') return { text: `${m.bits}비트`, ok: m.bits <= 9 };
    return { text: `${m.detectRate.toFixed(1)}%`, ok: m.detectRate >= 100 };
  };
  return `<table class="goal-table"><caption class="sr-only">목표와 내 설계 비교</caption>
    <thead><tr><th></th><th>목표</th><th>내 설계</th></tr></thead>
    <tbody>${rows.map(row => {
      const got = cell(row);
      return `<tr><th scope="row">${esc(row.label)}</th><td>${esc(row.goal)}</td><td class="${got.ok === null ? 'pending' : got.ok ? 'met' : 'unmet'}">${esc(got.text)}${got.ok === null ? '' : got.ok ? ' ✓' : ' ✗'}</td></tr>`;
    }).join('')}</tbody></table>`;
}

/* 검사 비트는 C3 만화와 N10에서 처음 배운다. 배우지 않은 블록을 팔레트에
   놓아 두면 눌러 봐도 경고만 나온다(명세서 §32-4 3번).
   이미 놓인 블록은 그대로 두고 추가만 막는다. */
function paletteFor(stage) {
  return stage === 'N10'
    ? ['repeat3', 'repeat5', 'majority', 'parityEncode', 'parityCheck']
    : ['repeat3', 'repeat5', 'majority'];
}

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

  const palette = paletteFor(stage)
    .map(type => `<button type="button" data-add-block="${type}"><span class="palette-name">+ ${esc(circuitBlockLabel(type))}</span><span class="palette-role">${esc(circuitBlockRole(type))}</span></button>`).join('');

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
      <p class="muted small" style="margin:0">블록을 추가한 뒤 끌어서 옮기거나 ← → 로 순서를 바꿔 보세요. 연결은 왼쪽에서 오른쪽으로 읽습니다. 놓는 순서에 따라 결과가 달라집니다.</p>
      <div><h3 style="font-size:1rem">블록 팔레트</h3><div class="palette">${palette}</div></div>
    </div>
    ${goalTableHtml(stage, last, stale)}
    ${warnBox}
    <div>${resultBox}</div>
    ${last && !stale && last.trace ? traceHtml(last.trace) : ''}
    <div class="button-row">
      <button id="run-circuit" class="primary-button" type="button">${esc(runLabel)}</button>
      <button id="open-circuit-guide" class="secondary-button" type="button">조작 안내</button>
    </div>
  </div>`;
}

/* 성공률과 복원률이 N6에서 처음 나오는데 뜻이 어디에도 없었다. 두 수가 왜
   다른지도 알 수 없었다. 자기가 낸 1000번을 시행 5개와 합계 행으로 보여준다
   (명세서 §32-4 1번). 여기서 전송량 = 비용도 못 박는다. */
function renderN6Read() {
  const circuit = state.circuits.N6;
  const last = circuit?.lastResult;
  const m = last?.metric;
  const kicker = '3 통신로 설계 · 결과 읽는 법';

  if (!m || !Array.isArray(m.samples) || !m.samples.length) {
    return `${heading(kicker, '먼저 한 번 보내 보세요.', '앞 화면에서 통신로를 실행하면 그 결과로 수치를 어떻게 세었는지 함께 봅니다.')}
    <div class="card stack">
      <div class="notice">아직 실행 기록이 없습니다. 앞 화면에서 <strong>${esc(`${TRIALS}번 보내기`)}</strong>를 눌러 보세요.</div>
      <div class="button-row"><button id="back-to-n6" class="primary-button" type="button">앞 화면으로</button></div>
    </div>`;
  }

  const rows = m.samples.map((sample, index) => {
    const bits = sample.signal.map((bit, i) => `<span class="trace-bit${bit === SOURCE[i] ? '' : ' flip'}">${bit}</span>`).join('');
    const whole = sample.same === SOURCE_BITS;
    return `<tr class="${whole ? 'whole' : 'broken'}">
      <th scope="row">${index + 1}번째</th>
      <td><span class="trace-bits">${bits}</span></td>
      <td>${whole ? '전부 맞음' : `${SOURCE_BITS - sample.same}자리 틀림`}</td>
      <td>${sample.same}/${SOURCE_BITS}</td>
    </tr>`;
  }).join('');

  /* 두 수의 차이를 설명할 근거가 되는 줄을 찾는다. 틀린 줄이 없으면 안내를 바꾼다. */
  const brokenIndex = m.samples.findIndex(sample => sample.same !== SOURCE_BITS);
  const broken = brokenIndex >= 0 ? m.samples[brokenIndex] : null;

  return `${heading(kicker, '이 수는 어떻게 세었을까?', `앞 화면에서 ${TRIALS}번을 보냈습니다. 그 ${TRIALS}번을 어떻게 세어 두 수를 냈는지 봅니다.`)}
  <div class="card stack">
    <div class="table-wrap"><table class="count-table">
      <caption>${TRIALS}번 중 앞 ${m.samples.length}번</caption>
      <thead><tr><th>시행</th><th>받은 8비트</th><th>메시지</th><th>맞은 비트</th></tr></thead>
      <tbody>${rows}<tr class="ellipsis"><td colspan="4">⋮ (${TRIALS}번째까지)</td></tr></tbody>
      <tfoot>
        <tr><th scope="row">전부 맞은 횟수</th><td colspan="2">${m.exact}번 ÷ ${TRIALS}번</td><td><strong>${m.messageSuccess.toFixed(1)}%</strong></td></tr>
        <tr><th scope="row">맞은 비트 합계</th><td colspan="2">${m.bitHits}개 ÷ ${TRIALS * SOURCE_BITS}개</td><td><strong>${m.bitRecovery.toFixed(1)}%</strong></td></tr>
      </tfoot>
    </table></div>
    <div class="evidence">
      <strong>메시지 전체 성공률 ${m.messageSuccess.toFixed(1)}%</strong> · <strong>비트 복원률 ${m.bitRecovery.toFixed(1)}%</strong><br>
      ${broken
        ? `<span class="muted">${brokenIndex + 1}번째 줄을 보세요. 성공률에서는 <strong>0번</strong>으로, 복원률에서는 <strong>${broken.same}개</strong>로 세어집니다. 한 자리만 틀려도 메시지는 실패입니다. 그래서 두 수가 다릅니다.</span>`
        : '<span class="muted">앞 다섯 번은 모두 전부 맞았습니다. 한 자리만 틀려도 메시지는 실패로 세므로, 틀린 줄이 섞이면 성공률만 떨어집니다. 그래서 두 수가 다릅니다.</span>'}
    </div>
    <div class="reading">
      <p style="margin:0"><strong>전송량 ${m.bits}비트</strong> — 잡음 구간을 지나는 비트 수입니다. 많이 보낼수록 시간·전력·통신료가 듭니다. 이것이 <strong>비용</strong>입니다.</p>
      <p style="margin:8px 0 0">다음 화면부터 <strong>정확함(성공률)</strong>과 <strong>비용(전송량)</strong> 두 가지로 설계를 판단합니다.</p>
    </div>
    ${last.trace ? `<details class="attempt-details"><summary>1번째 시행을 자세히 보기</summary>${traceHtml(last.trace)}</details>` : ''}
  </div>`;
}

function renderN9() {
  const n3 = state.screens.N3;
  const circuitLogs = state.log.filter(item => ['N6_operate','N7','N8'].includes(item.screen) && item.kind === 'attempt');
  return `${heading('3 통신로 설계 · 비교', '가장 정확한 방법과 가장 합리적인 방법은 같은가?', '예측과 실제 실행을 나란히 보고, 정확성과 전송량 사이의 선택을 자신의 말로 설명합니다.')}
  <div class="card stack"><div class="evidence"><strong>${predictionEvidence('N3')}</strong><br>${esc(n3.prediction || '미작성')}<br><span class="muted">${esc(state.writes.N3_reason || '이유 미작성')}</span></div>${evidenceFor(['N6_operate','N7','N8'])}<div class="writing-list">${writeBox('N9_reflect', '가장 정확한 방법과 가장 합리적인 방법은 같은가? 오늘 실험에서 예를 들어 쓰시오.', 'reflect')}</div>${circuitLogs.length ? `<details class="attempt-details"><summary>최근 실행 구성 ${circuitLogs.length}회</summary><div class="evidence">${circuitLogs.slice(-6).map(item => `<div>${esc(item.detail || '')}</div>`).join('')}</div></details>` : ''}</div>`;
}

function resultIcon(result) { return result === 'ok' ? '✓' : result === 'partial' ? '△' : result === 'fail' ? '!' : '·'; }

/* 처음 보는 규칙으로 13칸을 한 번에 채우게 한 것이 무리였다. 한 줄로 먼저
   연습한 뒤 7×7로 간다(명세서 §18-1). */
function n11aRows() { return { example: state.parity.data[0], mine: state.parity.data[1] }; }

function parityOf(bits) { return bits.reduce((sum, bit) => sum + bit, 0) % 2; }

function n11aCorrect() {
  const answer = state.screens.N11a.answer;
  return answer !== null && answer === parityOf(n11aRows().mine);
}

function renderN11a() {
  const n11a = state.screens.N11a;
  const rows = n11aRows();
  const exampleOnes = rows.example.reduce((sum, bit) => sum + bit, 0);
  const mineOnes = rows.mine.reduce((sum, bit) => sum + bit, 0);
  const cell = (bit, extra = '') => `<span class="pbit${extra}">${bit}</span>`;
  const correct = n11aCorrect();
  return `${heading('4 어디가 뒤집혔나 · 검사 점 (가)', '검사 점 하나를 붙여 보세요.', '보내는 쪽은 「1의 개수가 항상 짝수」라는 규칙을 정했습니다. 홀수면 검사 점을 하나 붙여 짝수로 맞춥니다.')}
  <div class="card stack">
    <div class="parity-row-box">
      <div class="parity-row"><span class="prow-label">예시</span>${rows.example.map(bit => cell(bit)).join('')}<span class="prow-arrow" aria-hidden="true">→</span>${cell(parityOf(rows.example), ' check given')}</div>
      <p class="muted small" style="margin:0">1이 ${exampleOnes}개라 ${exampleOnes % 2 === 0 ? '이미 짝수입니다. 검사 점은 0' : '홀수입니다. 검사 점을 1로 붙여 짝수로 맞춥'}니다.</p>
    </div>
    <div class="parity-row-box">
      <div class="parity-row"><span class="prow-label">내 차례</span>${rows.mine.map(bit => cell(bit)).join('')}<span class="prow-arrow" aria-hidden="true">→</span><button type="button" id="n11a-cell" class="pbit check editable ${n11a.answer === null ? 'empty' : ''}" aria-label="검사 점 ${n11a.answer === null ? '미입력' : n11a.answer}">${n11a.answer === null ? '·' : n11a.answer}</button></div>
      <p class="muted small" style="margin:0">이 줄의 1을 세어 보고, 검사 점을 눌러 0 또는 1을 정하세요.</p>
    </div>
    <div id="n11a-result" class="result ${n11a.checked ? (correct ? 'ok' : 'fail') : ''}" role="status">${!n11a.checked ? '검사 점을 정하면 바로 확인합니다.' : correct ? `✓ 1이 ${mineOnes + n11a.answer}개, 짝수가 되었습니다.` : '아직 짝수가 아닙니다. 이 줄의 1을 다시 세어 보세요.'}</div>
  </div>`;
}

function renderN11b() {
  const grid = state.parity;
  const placedCount = grid.placed.length;
  const check = checkParityGrid();
  const badLines = grid.checked ? check.rowStatus.filter(good => !good).length + check.colStatus.filter(good => !good).length : 0;
  const ready = placedCount === 13;
  /* 「가로 1 확인」 칩이 입력할 때마다 알려 주어 학생이 세어 볼 이유가 없었다.
     「검사」를 누를 때만, 그것도 이상한 줄의 개수만 알려준다(명세서 §18-1). */
  return `${heading('4 어디가 뒤집혔나 · 검사 점 (나)', '격자 전체에 검사 점을 놓아 보세요.', '가로 6줄과 세로 6줄 모두 1이 짝수 개가 되도록 가장자리 13칸을 채웁니다. 맨 윗줄 한 칸은 예시로 채워 두었습니다. 다 채우면 「검사」를 누르세요.')}<div class="card stack"><div class="parity-grid" role="grid" aria-label="7 곱하기 7 검사 점 격자">${grid.values.map((row, r) => row.map((value, c) => { const edge = r === 0 || c === 0; const given = isParityGiven(r, c); const editable = edge && !given; const shown = edge ? value : grid.data[r - 1]?.[c - 1]; return `<button type="button" class="grid-cell ${editable ? 'parity editable' : ''} ${given ? 'given' : ''} ${shown === null ? 'empty' : ''} ${grid.checked && check.ok && edge ? 'good' : ''}" data-parity-cell="${r},${c}" aria-label="${r + 1}행 ${c + 1}열 ${shown === null ? '미입력' : shown}${given ? ', 예시' : ''}">${shown === null ? '·' : shown}</button>`; }).join('')).join('')}</div><div id="n11b-result" class="result ${grid.checked ? (check.ok ? 'ok' : 'fail') : ''}" role="status">${grid.checked ? (check.ok ? '✓ 가로와 세로가 모두 짝수입니다. 통과!' : `이상한 줄이 ${badLines}개 있습니다. 어느 줄인지는 직접 세어 찾아 보세요.`) : `검사 칸 ${placedCount}/13개를 정했습니다.${ready ? ' 「검사」를 눌러 확인하세요.' : ''}`}</div><div class="button-row"><button id="check-parity" class="primary-button" type="button" ${ready ? '' : 'disabled'}>검사</button><button id="reset-parity" class="secondary-button" type="button">전부 지우기</button></div></div>`;
}

function parityExpected() {
  const grid = state.parity;
  const expected = Array.from({ length: 7 }, () => Array(7).fill(null));
  for (let c = 1; c < 7; c += 1) expected[0][c] = grid.data.reduce((sum, row) => sum + row[c - 1], 0) % 2;
  for (let r = 1; r < 7; r += 1) expected[r][0] = grid.data[r - 1].reduce((sum, bit) => sum + bit, 0) % 2;
  /* 모서리는 전체 1의 개수와 짝이 맞아야 행·열 검사줄이 둘 다 짝수가 된다. */
  expected[0][0] = grid.data.reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0) % 2;
  return expected;
}

function checkParityGrid() {
  const grid = state.parity;
  const full = grid.values.map((row,r) => row.map((value,c) => r === 0 || c === 0 ? value : grid.data[r-1][c-1]));
  const even = values => values.every(value => value !== null) && values.reduce((a,b)=>a+b,0) % 2 === 0;
  const rowStatus = full.map(even);
  const colStatus = Array.from({length:7}, (_,c)=>even(full.map(row=>row[c])));
  const expected = parityExpected();
  const badCells = [];
  for(let r=0;r<7;r++) for(let c=0;c<7;c++) if((r===0||c===0) && grid.values[r][c] !== null && grid.values[r][c] !== expected[r][c]) badCells.push([r,c]);
  return { rowStatus, colStatus, ok: rowStatus.every(Boolean) && colStatus.every(Boolean), badCells };
}


/* seedKey를 주면 학번으로 정해진 위치를 쓴다. 같은 학생은 새로고침해도
   같은 문제를 보고, 교사는 학번만으로 재현할 수 있다(명세서 §36). */
function randomErrorBoard(errorCount = 1, seedKey = null) {
  const rand = seedKey ? studentRandom(seedKey) : Math.random;
  const base = state.parity.data.map(row => row.slice());
  const cells = [];
  let guard = 0;
  while (cells.length < errorCount && guard < 500) {
    guard += 1;
    const r = Math.floor(rand() * 6);
    const c = Math.floor(rand() * 6);
    if (cells.some(cell => cell[0] === r && cell[1] === c)) continue;
    /* 두 칸 오류는 행도 열도 겹치지 않아야 교차점이 넷이 된다(명세서 §36-3). */
    if (errorCount > 1 && cells.some(cell => cell[0] === r || cell[1] === c)) continue;
    cells.push([r, c]);
  }
  cells.forEach(([r, c]) => { base[r][c] = 1 - base[r][c]; });
  return { base, cells };
}

/* 자모 이름을 저장만 하고 화면에 한 번도 쓰지 않아, 학생은 0과 1이 36개
   깔린 판만 보고 있었다. 점자 수업인데 점자가 안 보였다(명세서 §32-4 5번).
   marks 에 [행, 열, 클래스]를 넘기면 그 칸에 표시를 더한다. */
function parityBoardHtml(board, chosen = null, correct = false, interactive = false, marks = []) {
  const checks = parityExpected();
  const labels = state.parity.labels || [];
  const markOf = (r, c) => marks.find(mark => mark[0] === r - 1 && mark[1] === c - 1)?.[2] || '';
  const head = `<span class="grid-head corner"></span>${Array.from({ length: 6 }, (_, c) => `<span class="grid-head">${c + 1}</span>`).join('')}<span class="grid-head">검사</span>`;
  const rows = Array.from({ length: 7 }, (_, r) => {
    const name = r === 0 ? '검사' : (labels[r - 1] || '·');
    const cells = Array.from({ length: 7 }, (_, c) => {
      const edge = r === 0 || c === 0;
      const bit = edge ? checks[r][c] : board[r - 1][c - 1];
      const selected = chosen && chosen[0] === r - 1 && chosen[1] === c - 1;
      const label = edge ? `검사 비트 ${r === 0 ? (c === 0 ? '모서리' : c + '열') : r + '행'}, ${bit}` : `${esc(name)} ${c}번 점, ${bit}`;
      const cls = `grid-cell ${edge ? 'parity' : ''} ${selected ? (correct ? 'good' : 'bad') : ''} ${markOf(r, c)}`;
      return interactive && !edge
        ? `<button type="button" class="${cls}" data-find-cell="${r - 1},${c - 1}" aria-label="${label}">${bit}</button>`
        : `<span class="${cls}" aria-label="${label}">${bit}</span>`;
    }).join('');
    /* 검사 줄(r=0)은 맨 아래가 아니라 맨 위에 있다. 이름을 그에 맞춘다. */
    return `<span class="grid-head row">${esc(r === 0 ? '검사' : name)}</span>${cells}`;
  }).join('');
  return `<div class="parity-wrap">
    <div class="parity-grid labelled" data-parity-board>
      <span class="sr-only">왼쪽은 자모 이름, 위는 점 번호입니다. 파란 칸은 보낼 때 붙인 검사 비트이며 뒤집히지 않습니다.</span>
      ${head}${rows}
    </div>
    ${receivedWordHtml(board)}
  </div>
  <p class="muted small" style="margin:0"><span class="legend-box parity"></span> 보낼 때 붙인 <strong>검사 비트</strong> — 여기는 뒤집히지 않았습니다 &nbsp; <span class="legend-box"></span> <strong>정보 칸</strong> — 이 중에서 뒤집혔습니다</p>`;
}

/* 받은 격자를 자모로 되읽는다. 뒤집힌 점이 다른 자모의 점형이 되면
   「읽을 수 없음」이 아니라 **엉뚱한 글자로 멀쩡히 읽힌다.** 그래서 보낸
   낱말과 나란히 놓는다 — 둘을 비교해야 무엇이 이상한지 보인다.
   학생은 N11b에서 검사 점을 놓은 보내는 쪽이므로 원래 낱말을 안다. */
function readJamo(bits) {
  for (const table of [BRAILLE.initial, BRAILLE.medial, BRAILLE.final]) {
    for (const [sym, dots] of Object.entries(table)) {
      if (dots.length && dotsToBits(dots).every((bit, i) => bit === bits[i])) return sym;
    }
  }
  return null;
}

function receivedWordHtml(board) {
  const sent = state.parity.labels || [];
  const read = board.map(readJamo);
  const same = read.every((sym, i) => sym && sym === sent[i]);
  return `<div class="received-word ${same ? 'ok' : 'broken'}">
    <div><strong>보낸 낱말</strong><div class="received-syms sent">${sent.map(sym => `<span>${esc(sym || '·')}</span>`).join('')}</div></div>
    <div><strong>받은 낱말</strong><div class="received-syms">${read.map((sym, i) => `<span class="${sym === sent[i] ? '' : 'unread'}">${esc(sym || '?')}</span>`).join('')}</div></div>
    <p class="muted small" style="margin:0">${same
      ? '두 줄이 같습니다. 제대로 도착했습니다.'
      : '두 줄이 다른 자리가 있습니다. <strong>?</strong> 는 점자표에 없는 점형이고, 빨간 자모는 <strong>읽히기는 하지만 다른 글자</strong>입니다.'}</p>
  </div>`;
}

/* 한 칸 찾기는 2판이면 방법이 굳는다(명세서 §32-4 6번). */
const N12_ROUNDS = 2;

function renderN12() {
  const n12 = state.screens.N12;
  if (!n12.board) n12.board = randomErrorBoard(1, `N12:${n12.round}`);
  const chosen = n12.guesses[n12.round];
  const correct = chosen && chosen[0]===n12.board.cells[0][0] && chosen[1]===n12.board.cells[0][1];
  return `${heading('4 어디가 뒤집혔나 · 한 칸 찾기', `뒤집힌 칸을 찾아 보세요 · ${N12_ROUNDS}문제 중 ${n12.round+1}번째`, '보내는 쪽은 검사 비트를 포함한 가로·세로의 1이 모두 짝수 개가 되도록 맞춰서 보냈습니다. 오는 길에 한 칸이 뒤집혔습니다. 어느 칸인지 찾아 누르세요.')}<div class="card stack">${parityBoardHtml(correct ? state.parity.data : n12.board.base, chosen, correct, true)}<div class="result ${chosen ? (correct ? 'ok' : 'fail') : ''}" role="status">${chosen ? (correct ? '✓ 찾았습니다. 낱말이 제대로 읽힙니다.' : '! 아직 아닙니다. 가로와 세로를 다시 살펴보세요.') : '검사할 칸을 하나 골라 보세요. 오른쪽 「받은 낱말」에 읽히지 않는 자리가 있습니다.'}</div><div class="button-row">${correct && n12.round < N12_ROUNDS - 1 ? '<button id="next-n12-round" class="primary-button" type="button">다음 문제</button>' : ''}<button id="reset-n12" class="secondary-button" type="button">고른 칸 지우기</button></div></div>`;
}


/* 두 칸이 뒤집히면 이상한 가로줄·세로줄이 각각 둘이 되어 교차점이 넷이 된다.
   그래서 한 곳을 확정할 수 없다. 학생이 직접 보도록 실제 줄 번호를 보여 준다. */
function parityOffLines(board) {
  const rows = [];
  const cols = [];
  for (let r = 0; r < 6; r += 1) {
    const base = state.parity.data[r].reduce((sum, bit) => sum + bit, 0) % 2;
    const now = board[r].reduce((sum, bit) => sum + bit, 0) % 2;
    if (base !== now) rows.push(r + 1);
  }
  for (let c = 0; c < 6; c += 1) {
    const base = state.parity.data.reduce((sum, row) => sum + row[c], 0) % 2;
    const now = board.reduce((sum, row) => sum + row[c], 0) % 2;
    if (base !== now) cols.push(c + 1);
  }
  return { rows, cols };
}

/* 문제는 바뀌는데 화면이 안 바뀌었다 — 36칸 중 2칸만 달라지고 요약 문장은
   매번 글자 하나까지 같았다. 교차점을 격자에 직접 표시하고, 몇 번 봤는지
   누적해 「매번 4군데」라는 불변량을 학생이 발견하게 한다(명세서 §32-4 7번).
   몇 칸이 뒤집혔는지는 알려주지 않는다 — 실제 받는 쪽도 모른다. */
function renderN13Observe() {
  if (!state.screens.N13) state.screens.N13 = { board: randomErrorBoard(2, 'N13:0'), shuffles: 0, seen: 1, revealed: false };
  const n13 = state.screens.N13;
  if (typeof n13.seen !== 'number') n13.seen = 1;
  const board = n13.board || randomErrorBoard(2, 'N13:0');
  const off = parityOffLines(board.base);
  const crossings = off.rows.length * off.cols.length;
  /* 이상한 가로줄과 세로줄이 만나는 칸 = 뒤집혔을 수 있는 후보 */
  const marks = [];
  off.rows.forEach(r => off.cols.forEach(c => marks.push([r - 1, c - 1, 'cross'])));
  if (n13.revealed) board.cells.forEach(([r, c]) => marks.push([r, c, 'actual']));

  return `${heading('4 어디가 뒤집혔나 · 두 칸 오류', '이번에는 몇 칸이 뒤집혔을까?', '몇 칸이 뒤집혔는지 알려주지 않습니다. 이상한 가로줄과 세로줄을 세어 짐작해 보세요.')}
  <div class="card stack">
    ${parityBoardHtml(board.base, null, false, false, marks)}
    <div class="axis-status">
      ${off.rows.length ? off.rows.map(n => `<span class="axis-pill bad">가로 ${n} 이상</span>`).join('') : '<span class="axis-pill">이상한 가로줄 없음</span>'}
      ${off.cols.length ? off.cols.map(n => `<span class="axis-pill bad">세로 ${n} 이상</span>`).join('') : '<span class="axis-pill">이상한 세로줄 없음</span>'}
    </div>
    <div class="evidence">이상한 가로줄 ${off.rows.length}개, 세로줄 ${off.cols.length}개 → 둘이 만나는 곳이 <strong>${crossings}군데</strong>입니다. 노란 칸이 그 ${crossings}군데입니다.
      ${n13.seen > 1 ? `<br><span class="muted">지금까지 <strong>${n13.seen}번</strong> 봤는데 <strong>매번 ${crossings}군데</strong>였습니다.</span>` : ''}
    </div>
    ${n13.revealed
      ? `<div class="notice">실제로 뒤집힌 곳은 <strong>${board.cells.map(([r, c]) => `${r + 1}행 ${c + 1}열`).join('</strong>과 <strong>')}</strong>입니다. ${crossings}군데 중 둘입니다. <strong>받는 쪽은 이 ${crossings}군데를 구별할 방법이 없습니다.</strong></div>`
      : '<div class="notice">노란 칸 중 어느 것이 실제로 뒤집혔는지 골라낼 수 있을까요?</div>'}
    <div class="button-row">
      <button id="reshuffle-n13" class="secondary-button" type="button">다른 두 칸이 뒤집힌 경우 보기</button>
      ${n13.revealed ? '' : '<button id="reveal-n13" class="secondary-button" type="button">실제로 어디였나?</button>'}
    </div>
  </div>`;
}

/* 가로줄 하나를 세는 것도 「이 묶음의 1이 짝수인가」라는 검사 한 번이었다.
   격자에서는 묶음이 행·열로 정해져 있었을 뿐이다(명세서 §32-4 9번). */
function renderN13Bridge() {
  const bridge = state.screens.N13_bridge || (state.screens.N13_bridge = { picked: null });
  const grid = state.parity;
  const picked = bridge.picked;
  /* 이 화면은 「보내는 쪽이 맞춰 보낸 원본」을 본다. 학생이 N11b에서 채운
     값이 아니라 올바른 검사 값을 쓴다 — 안 채웠으면 멀쩡한 줄도 홀수로
     보여 오류가 있는 것처럼 읽힌다. */
  const checks = parityExpected();

  const cells = Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => {
    const edge = r === 0 || c === 0;
    const bit = edge ? checks[r][c] : grid.data[r - 1][c - 1];
    const inPick = picked && ((picked.axis === 'row' && r === picked.index) || (picked.axis === 'col' && c === picked.index));
    return `<span class="grid-cell ${edge ? 'parity' : ''} ${inPick ? 'picked' : ''}">${bit}</span>`;
  }).join('')).join('');

  const buttons = [
    ...Array.from({ length: 6 }, (_, i) => ({ axis: 'row', index: i + 1, label: `가로 ${i + 1}줄` })),
    ...Array.from({ length: 6 }, (_, i) => ({ axis: 'col', index: i + 1, label: `세로 ${i + 1}줄` }))
  ].map(item => `<button type="button" class="axis-pick ${picked && picked.axis === item.axis && picked.index === item.index ? 'selected' : ''}" data-axis="${item.axis}" data-index="${item.index}">${item.label}</button>`).join('');

  let readout = '<p class="muted small" style="margin:0">줄 하나를 눌러 보세요. 그 줄을 센다는 것이 무엇을 확인하는 것인지 보여줍니다.</p>';
  if (picked) {
    const values = picked.axis === 'row'
      ? [...grid.data[picked.index - 1], checks[picked.index][0]]
      : [...grid.data.map(row => row[picked.index - 1]), checks[0][picked.index]];
    const ones = values.reduce((sum, bit) => sum + bit, 0);
    const even = ones % 2 === 0;
    readout = `<div class="evidence">
      <strong>${picked.axis === 'row' ? '가로' : '세로'} ${picked.index}줄</strong>의 정보 6칸과 검사 칸 1개<br>
      <span class="trace-bits">${values.map((bit, i) => `<span class="trace-bit${i === 6 ? ' fixed' : ''}">${bit}</span>`).join('')}</span><br>
      1의 개수를 세면 <strong>${ones}개</strong> → <strong>${even ? '짝수' : '홀수'}</strong>
      <br><span class="muted small">보내는 쪽이 모든 줄을 짝수로 맞춰 보냈으므로 여기서는 짝수가 나옵니다. 받는 쪽이 세어 <strong>홀수</strong>가 나오면 그 줄에 뒤집힌 자리가 있다는 뜻입니다.</span>
      <br><span class="muted small">검사 한 번의 결과는 짝수 아니면 홀수, <strong>둘 중 하나</strong>입니다.</span>
    </div>`;
  }

  return `${heading('5 검사로 찾기', '가로줄을 센다는 건 무엇을 확인하는 걸까?', '방금 쓴 격자를 다시 봅니다. 줄 하나를 세는 것이 곧 검사 한 번이었습니다.')}
  <div class="card stack">
    <div class="parity-grid" role="img" aria-label="7 곱하기 7 검사 점 격자">${cells}</div>
    <div class="axis-picks">${buttons}</div>
    ${readout}
  </div>
  <div class="card stack">
    <h3 style="margin:0;font-size:1rem">여기까지 온 길</h3>
    <ol class="bridge-steps">
      <li><strong>검사 비트 하나를 붙여 봤습니다.</strong> 오류가 있다는 건 알았지만 <strong>어느 자리인지는 몰랐습니다.</strong></li>
      <li><strong>그래서 격자로 갔습니다.</strong> 가로로 한 번, 세로로 한 번 묶어 교차점으로 찾았습니다. 위치를 <strong>(몇 행, 몇 열)</strong> 두 좌표로 말한 셈입니다.</li>
      <li><strong>대신 비쌌습니다.</strong> 한 칸씩 따로 검사하면 <strong>36번</strong>, 가로·세로로 묶으니 <strong>12번</strong>. 그래도 검사 칸을 <strong>13개</strong>나 붙였습니다.</li>
    </ol>
    <div class="notice">가로·세로는 <strong>격자 모양에 따라 정해진 묶음</strong>입니다. <strong>묶는 방법을 새로 설계하면</strong> 검사를 더 줄일 수 있을까요? 다음 화면부터 칸이 <strong>7개</strong>인 작은 신호로 알아봅니다.</div>
  </div>`;
}

function renderN13Write() {
  return `${heading('4 어디가 뒤집혔나 · 작성', '오류 위치를 찾는 방법과 한계를 설명해 보세요.', '한 칸을 찾았던 절차와 두 칸 오류에서 달라진 점을 구분해 적습니다.')}
  <div class="card stack"><div class="writing-list">${writeBox('N13_two', '두 칸이 뒤집히면 왜 하나의 위치를 확정하기 어려울까요?', 'explain')}</div>${evidenceFor(['N12'])}</div>`;
}

/* 신호도 여덟 가지도 검사도 전부 글로만 있어 찍을 수밖에 없었다.
   상황을 보여주고, 검사 한 번을 직접 해보게 한다(명세서 §32-4 10번).
   정답 묶음(1·3·5·7 등)은 여기에 적지 않는다 — N15에서 학생이 찾는다. */
const N14_BITS = 7;

function n14Signal() {
  const n14 = state.screens.N14;
  if (!Array.isArray(n14.signal) || n14.signal.length !== N14_BITS) {
    const rand = studentRandom('N14');
    n14.signal = Array.from({ length: N14_BITS }, () => (rand() < 0.5 ? 0 : 1));
    persist();
  }
  return n14.signal;
}

/* 여덟 가지 = 1~7번째가 뒤집힌 경우와 아무 곳도 안 뒤집힌 경우. */
function n14Cases() {
  const base = n14Signal();
  return Array.from({ length: 8 }, (_, k) => ({
    flipped: k < N14_BITS ? k : -1,
    label: k < N14_BITS ? `${k + 1}번째가 뒤집힘` : '아무 곳도 안 뒤집힘',
    signal: base.map((bit, i) => (i === k ? bit ^ 1 : bit))
  }));
}

function renderN14() {
  const n14 = state.screens.N14;
  if (!Array.isArray(n14.pick)) n14.pick = [];
  const base = n14Signal();
  const cases = n14Cases();
  const pick = n14.pick;

  const caseRows = cases.map(item => `<tr>
    <th scope="row">${esc(item.label)}</th>
    <td><span class="trace-bits">${item.signal.map((bit, i) => `<span class="trace-bit${i === item.flipped ? ' flip' : ''}">${bit}</span>`).join('')}</span></td>
  </tr>`).join('');

  const chips = base.map((_, i) => `<button type="button" class="number-chip ${pick.includes(i + 1) ? 'selected' : ''}" data-n14-pick="${i + 1}" aria-pressed="${pick.includes(i + 1)}">${i + 1}</button>`).join('');

  let split = '<p class="muted small" style="margin:0">칸을 몇 개 고른 뒤 「세어 보기」를 누르세요.</p>';
  if (n14.counted && pick.length) {
    const rows = cases.map(item => {
      const ones = pick.reduce((sum, number) => sum + item.signal[number - 1], 0);
      return { label: item.label, odd: ones % 2 === 1 };
    });
    const odd = rows.filter(row => row.odd).length;
    split = `<div class="evidence">
      <strong>${pick.join(' · ')}번째 칸</strong>을 골라 여덟 가지 각각에서 1의 개수를 세면 —
      <table class="split-table"><tbody>${rows.map(row => `<tr class="${row.odd ? 'odd' : 'even'}"><th scope="row">${esc(row.label)}</th><td>${row.odd ? '홀수' : '짝수'}</td></tr>`).join('')}</tbody></table>
      <strong>검사 한 번으로 여덟 가지가 두 무리로 갈렸습니다.</strong> 홀수 ${odd}가지 · 짝수 ${8 - odd}가지
    </div>`;
  }

  return `${heading('5 검사로 찾기 · 예측', '검사를 몇 번 하면 될까?', '신호 7자리를 보냅니다. 오는 길에 한 자리가 뒤집히거나, 아무 곳도 뒤집히지 않습니다.')}
  <div class="card stack">
    ${state.predicts.N14 ? `<div class="evidence">최초 응답: ${esc(state.predicts.N14.first.value)}번 · ${state.predicts.N14.first.beforeExperiment ? '실험 전 예측' : '실험을 본 뒤 기록'}</div>` : ''}
    <div>
      <p class="muted small" style="margin:0 0 6px">보낸 신호</p>
      <span class="trace-bits">${base.map(bit => `<span class="trace-bit">${bit}</span>`).join('')}</span>
      <span class="trace-bits" style="margin-left:10px">${base.map((_, i) => `<span class="col-head">${i + 1}</span>`).join('')}</span>
    </div>
    <p style="margin:0">받는 쪽은 신호만 가지고 있습니다. <strong>보낸 사람에게 물어볼 수 없습니다.</strong> 일어날 수 있는 일은 여덟 가지입니다.</p>
    <div class="table-wrap"><table class="case-table"><tbody>${caseRows}</tbody></table></div>
    <div class="notice">보내는 쪽은 <strong>미리 정한 규칙</strong>대로 검사 비트를 함께 붙여 보냅니다. 받는 쪽은 그것을 세어 봅니다. 만화 ③에서 본 그 방법입니다. 몇 칸을 골라 1의 개수를 세면 결과는 <strong>짝수 아니면 홀수</strong>, 둘 중 하나입니다.</div>
    <div>
      <p class="muted small" style="margin:0 0 6px">검사 한 번 해보기 — 묶을 칸을 고르세요</p>
      <div class="number-palette">${chips}</div>
      <div class="button-row"><button id="n14-count" class="secondary-button" type="button" ${pick.length ? '' : 'disabled'}>세어 보기</button><button id="n14-clear" class="secondary-button" type="button">고른 칸 지우기</button></div>
    </div>
    ${split}
  </div>
  <div class="card stack">
    <div class="reading"><p style="margin:0"><strong>한 칸씩 따로 검사하면</strong> 검사 <strong>7번</strong>, 검사 비트 <strong>7개</strong>로 위치를 정확히 찾습니다. 그런데 7자리를 보내려고 검사 비트를 7개나 붙였습니다.</p></div>
    <p style="margin:0"><strong>여러 자리를 묶어서 검사하면 더 적게 할 수 있을까요?</strong></p>
    <div class="choice-grid">${[2, 3, 4, 7].map(value => `<div class="choice"><input id="n14-${value}" name="n14" type="radio" value="${value}" ${n14.prediction === String(value) ? 'checked' : ''}><label for="n14-${value}">${value}번</label></div>`).join('')}</div>
    <div class="button-row"><button id="confirm-n14" class="primary-button" type="button">예측 기록</button>${n14.confirmed ? '<span class="result ok">예측이 기록되었습니다.</span>' : ''}</div>
  </div>`;
}

/* N14 재구성 때 함께 지워졌던 것을 되돌린다. 여덟 경우의 검사 결과 패턴. */
const N15_MIN_GROUPS = 1;
const N15_MAX_GROUPS = 4;

function n15Patterns() {
  const groups = state.screens.N15.groups;
  return Array.from({ length: 8 }, (_, errorCase) => {
    const values = groups.map(group => (errorCase === 0 ? 0 : (group.includes(errorCase) ? 1 : 0)));
    return { errorCase, values, pattern: values.join('') };
  });
}

/* 팔레트·개수 조절·상자 3개·8행 표가 동시에 나와 어디부터 손댈지 알 수
   없었다. 검사 묶음 1개에서 시작해 2 → 4 → 8갈래를 조작으로 겪게 한다
   (명세서 §32-4 12번, §19-3). */
function n15Stage() {
  const n15 = state.screens.N15;
  return Math.max(n15.unlocked || 1, n15.groups.length);
}

function renderN15Operate() {
  const n15 = state.screens.N15;
  const patterns = n15Patterns();
  const distinct = new Set(patterns.map(item => item.pattern)).size;
  const counts = patterns.reduce((map, item) => { map[item.pattern] = (map[item.pattern] || 0) + 1; return map; }, {});
  const duplicated = new Set(Object.keys(counts).filter(pattern => counts[pattern] > 1));
  const unique = duplicated.size === 0;
  const selected = n15.selected;
  const filled = n15.groups.filter(group => group.length).length;
  const unlocked = n15.unlocked || 1;
  const canAdd = n15.groups.length < N15_MAX_GROUPS && n15.groups.length < unlocked;

  /* 「구별할 수 있나?」를 누를 때마다 몇 갈래로 갈렸는지 알려주고, 모자라면
     검사를 하나 더 만들 수 있게 연다. 정답 개수는 말하지 않는다. */
  let verdict = '';
  if (n15.lastCheck) {
    const shown = n15.lastCheck;
    verdict = unique
      ? `<div class="result ok" role="status">${resultIcon('ok')} 여덟 가지가 모두 다른 결과를 냅니다. 구별할 수 있습니다.</div>`
      : `<div class="result partial" role="status">${resultIcon('partial')} 여덟 가지가 <strong>${shown}갈래</strong>로 갈렸습니다. 아직 하나씩 구별할 수 없습니다.${canAdd ? ' 검사를 하나 더 만들어 보세요.' : ''}</div>`;
  } else {
    verdict = '<div class="result" role="status">검사 묶음을 만든 뒤 「구별할 수 있나?」를 눌러 보세요.</div>';
  }

  const boxes = n15.groups.map((group, g) => `<div class="question-box" data-box="${g}" tabindex="0" role="group" aria-label="${g + 1}번 검사 묶음">
      <h3>${g + 1}번 검사</h3>
      <div class="chip-row">${group.length ? group.map(number => `<button type="button" class="number-chip in-box" data-remove="${g},${number}" aria-label="${g + 1}번 검사에서 ${number}번 빼기">${number} ×</button>`).join('') : '<span class="muted small">비어 있음</span>'}</div>
    </div>`).join('');

  const head = n15.groups.map((group, g) => `<th>${g + 1}번 검사 결과</th>`).join('');
  const body = patterns.map(item => `<tr class="${duplicated.has(item.pattern) ? 'duplicate' : 'unique'}">
      <td>${item.errorCase === 0 ? '아무 곳도 안 뒤집힘' : `${item.errorCase}번째 뒤집힘`}</td>
      ${item.values.map((value, g) => `<td>${n15.groups[g].length ? (value ? '홀수' : '짝수') : '검사 없음'}</td>`).join('')}
      <td><strong>${filled ? item.values.map((value, g) => (n15.groups[g].length ? value : '–')).join('') : '검사 없음'}</strong></td>
    </tr>`).join('');

  return `${heading('5 검사로 찾기 · 설계', '검사 묶음을 직접 만들어 보세요.', '어느 자리가 뒤집혔는지 알아내려면 무엇을 함께 세어야 할까요? 번호를 묶어 검사를 만들고 여덟 가지를 구별해 보세요.')}
  <div class="card stack">
    <div class="question-layout">
      <div class="question-controls">
        <ol class="question-steps">
          <li>검사 묶음에 번호를 넣어 <strong>첫 검사</strong>를 만드세요.</li>
          <li>「구별할 수 있나?」를 눌러 결과 패턴 표를 보세요.</li>
          <li>똑같은 줄이 있으면 <strong>묶음을 고치거나 검사를 더 만드세요.</strong></li>
        </ol>
        <p class="muted small">각 검사는 “이 묶음에서 1의 개수를 세면?”입니다. 보내는 쪽이 짝수로 맞춰 보냈으므로 <strong>홀수면 그 묶음 안에 뒤집힌 자리가 있습니다.</strong> 홀수는 1, 짝수는 0으로 적습니다. 한 번호를 여러 검사에 넣을 수 있습니다.</p>
        <div>
          <p class="muted small" style="margin:0 0 6px">번호 블록 — 끌어다 놓거나, 눌러서 고른 뒤 검사 묶음을 누르세요.</p>
          <div class="number-palette">${[1,2,3,4,5,6,7].map(number => `<button type="button" class="number-chip ${selected === number ? 'selected' : ''}" draggable="true" data-number="${number}" aria-pressed="${selected === number}" aria-label="${number}번 비트 블록">${number}</button>`).join('')}</div>
        </div>
        <div class="button-row">
          <button id="n15-fewer" class="secondary-button" type="button" ${n15.groups.length <= N15_MIN_GROUPS ? 'disabled' : ''}>검사 줄이기</button>
          <span class="muted small">검사 ${n15.groups.length}개</span>
          <button id="n15-more" class="secondary-button" type="button" ${canAdd ? '' : 'disabled'}>검사 늘리기</button>
        </div>
        ${canAdd ? '' : n15.groups.length >= N15_MAX_GROUPS ? '' : '<p class="muted small" style="margin:0">「구별할 수 있나?」를 눌러 지금 설계로 몇 갈래가 갈리는지 먼저 확인하세요.</p>'}
        <div class="three-column">${boxes}</div>
      </div>
      <div class="question-results">
        <p class="muted small">각 줄은 그 일이 일어났을 때 검사 결과가 어떻게 나오는지 보여줍니다. <strong>두 줄이 똑같으면 그 두 경우를 구별할 수 없습니다.</strong></p>
        <div class="table-wrap"><table class="pattern-table">
          <thead><tr><th>일어난 일</th>${head}<th>결과 패턴</th></tr></thead>
          <tbody>${body}</tbody>
        </table></div>
        ${verdict}
        <div class="button-row"><button id="check-n15" class="primary-button" type="button" ${filled ? '' : 'disabled'}>구별할 수 있나?</button><button id="reset-n15" class="secondary-button" type="button">검사 비우기</button><button id="open-n15-guide" class="secondary-button" type="button">조작 안내</button></div>
      </div>
    </div>
  </div>`;
}

function renderN15Write() {
  return `${heading('5 질문으로 찾기 · 작성', '질문 수를 바꾼 이유를 설명해 보세요.', '방금 만든 답 패턴 표와 실제 설계 변화가 근거로 남아 있습니다.')}
  <div class="card stack">${evidenceFor(['N15_operate'])}<div class="evidence">현재 검사 묶음: ${state.screens.N15.groups.map((group, i) => `${i + 1}번 검사 = ${group.length ? group.join(', ') : '없음'}`).join(' · ')}</div><div class="writing-list">${writeBox('N15_binary', '내 검사 결과를 홀수=1, 짝수=0으로 적어 붙여 읽으면 무엇이 되나요?', 'explain')}</div></div>`;
}

function renderN16() {
  const n16 = state.screens.N16;
  if (!n16.cases.length) n16.cases = [0, 1, 2].map(round => randomQuestionCase(`N16:${round}`));
  const target = n16.cases[n16.round];
  const guess = n16.guesses[n16.round];
  const matches=n15Patterns().filter(item=>item.pattern===questionPatternFor(target));
  const ambiguous=matches.length>1;
  const ok = !ambiguous && guess !== undefined && Number(guess) === target;
  return `${heading('5 질문으로 찾기 · 선택 활동', `내 질문으로 오류 위치 찾기 · ${n16.round + 1}/3판`, '앞에서 만든 질문 묶음의 답 패턴을 보고 실제 위치를 골라 봅니다.')}
  <div class="card stack"><div class="notice">이번 답 패턴: <strong>${questionPatternFor(target)}</strong></div><div class="choice-grid">${['없음',1,2,3,4,5,6,7].map((label, i) => { const value = i === 0 ? 0 : i; return `<div class="choice"><input id="n16-${value}" name="n16" type="radio" value="${value}" ${guess !== undefined && Number(guess) === value ? 'checked' : ''}><label for="n16-${value}">${label === '없음' ? '아무 곳도 안 뒤집힘' : `${label}번째 뒤집힘`}</label></div>`; }).join('')}</div><div class="result ${guess === undefined ? '' : ok ? 'ok' : 'fail'}" role="status">${ambiguous ? `이 패턴에 해당하는 일이 ${matches.length}개여서 위치를 확정할 수 없습니다. 질문 설계로 돌아가 묶음을 바꾸어 보세요.` : guess === undefined ? '답을 하나 골라 보세요.' : ok ? '맞았습니다.' : '다른 일의 답 패턴과 비교해 보세요.'}</div>${ok && n16.round < 2 ? '<button id="next-n16" class="primary-button" type="button">다음 판</button>' : ''}</div>`;
}

function randomQuestionCase(seedKey = null) { return Math.floor((seedKey ? studentRandom(seedKey) : Math.random)() * 8); }
function questionPatternFor(errorCase) { return n15PatternsFor(errorCase).join(''); }
function n15PatternsFor(errorCase) { return state.screens.N15.groups.map(group => errorCase === 0 ? 0 : group.includes(errorCase) ? 1 : 0); }

function hammingDistance(a, b) { return [...a].reduce((count, bit, index) => count + (bit !== b[index] ? 1 : 0), 0); }

function renderN17() {
  const n17 = state.screens.N17;
  const pairs = [];
  for (let i = 0; i < n17.codes.length; i += 1) for (let j = i + 1; j < n17.codes.length; j += 1) pairs.push({ a: i, b: j, distance: hammingDistance(n17.codes[i], n17.codes[j]) });
  const min = Math.min(...pairs.map(pair => pair.distance));
  const allGood = min >= 3;
  return `${heading('6 얼마나 멀어야 · 선택 활동', '서로 다른 부호를 얼마나 멀리 둘까?', '네 가지 신호에 6비트 부호를 배정하고, 두 부호 사이의 거리를 비교합니다.')}
  <div class="card stack">
    <div class="code-grid">${n17.codes.map((code, i) => `<div class="code-row"><strong>신호 ${i + 1}</strong><div class="code-cells">${[...code].map((bit, c) => `<button type="button" class="bit-button ${bit === '1' ? 'selected' : ''}" data-code-cell="${i},${c}" aria-label="신호 ${i + 1} ${c + 1}번째 자리 ${bit}">${bit}</button>`).join('')}</div></div>`).join('')}</div>
    <div class="table-wrap"><table><thead><tr><th>두 부호</th><th>거리</th></tr></thead><tbody>${pairs.map(pair => `<tr><td>${pair.a + 1} ↔ ${pair.b + 1}</td><td class="${pair.distance < 3 ? 'distance-bad' : 'distance-good'}">${pair.distance}</td></tr>`).join('')}</tbody></table></div>
    <div class="result ${allGood ? 'ok' : 'partial'}" role="status">${resultIcon(allGood ? 'ok' : 'partial')} ${allGood ? `최소 거리가 ${min}입니다. 이제 한 칸 오류를 시험해 보세요.` : `가장 가까운 두 부호의 거리가 ${min}입니다. 표를 보며 바꾸어 보세요.`}</div>
    <div class="button-row"><button id="test-code-error" class="primary-button" type="button">${n17.tested ? '다른 자리로 다시 시험' : '한 칸 오류 시험'}</button></div>
    ${n17.tested && n17.query && typeof n17.query.codeIndex === 'number' ? closestPanel(n17) : ''}
  </div>`;
}

function flipBit(code, index) { return [...code].map((bit, i) => (i === index ? (bit === '0' ? '1' : '0') : bit)).join(''); }

/* 오류가 난 값에서 가장 가까운 부호를 학생이 직접 고르게 한다(명세서 §20).
   최소 거리가 3보다 작으면 가장 가까운 부호가 여럿이 되어 되돌릴 수 없다. */
function closestPanel(n17) {
  const sent = n17.query.codeIndex;
  const received = flipBit(n17.codes[sent], n17.query.error);
  const rows = n17.codes.map((code, i) => ({ i, code, distance: hammingDistance(code, received) }));
  const best = Math.min(...rows.map(row => row.distance));
  const nearest = rows.filter(row => row.distance === best);
  const decided = n17.guess !== '' && n17.guess !== null && n17.guess !== undefined;
  const canCorrect = nearest.length === 1 && nearest[0].i === sent;
  const ok = decided && canCorrect && Number(n17.guess) === sent;
  return `<div class="evidence">
    <strong>받은 값 ${esc(received)}</strong><br>
    <span class="muted small">어느 신호를 보냈는지는 알려주지 않습니다. 거리를 보고 판단해 보세요.</span>
    <div class="table-wrap"><table><thead><tr><th>부호</th><th>값</th><th>받은 값과의 거리</th></tr></thead><tbody>${rows.map(row => `<tr><td>신호 ${row.i + 1}</td><td>${esc(row.code)}</td><td class="${row.distance === best ? 'distance-good' : ''}">${row.distance}</td></tr>`).join('')}</tbody></table></div>
    ${nearest.length > 1 ? `<span class="muted small">가장 가까운 부호가 ${nearest.length}개입니다. 어느 것으로 되돌려야 할지 정할 수 없습니다.</span>` : ''}
  </div>
  <p class="muted small" style="margin:0">원래 보낸 신호는 무엇이었을까요?</p>
  <div class="choice-grid">${n17.codes.map((code, i) => `<div class="choice"><input id="n17-guess-${i}" name="n17-guess" type="radio" value="${i}" ${decided && Number(n17.guess) === i ? 'checked' : ''}><label for="n17-guess-${i}">신호 ${i + 1}</label></div>`).join('')}</div>
  ${decided ? `<div class="result ${ok ? 'ok' : 'fail'}" role="status">${resultIcon(ok ? 'ok' : 'fail')} ${ok ? '맞았습니다. 가장 가까운 부호로 되돌리면 원래 신호가 나옵니다.' : !canCorrect ? '이 설계에서는 가장 가까운 부호만으로 원래 신호를 확정할 수 없습니다. 부호 사이의 거리를 늘려 보세요.' : '보낸 신호와 다릅니다. 거리 표를 다시 보세요.'}</div>` : ''}`;
}

function renderN18() {
  return `${heading('6 얼마나 멀어야 · 선택 활동', '거리와 오류 정정 능력을 연결해 보세요.', '앞에서 만든 부호와 다음 표를 보고, 최소 거리가 왜 중요한지 설명합니다.')}
  <div class="card stack"><div class="table-wrap"><table><thead><tr><th>최소 거리</th><th>탐지할 수 있는 오류</th><th>정정할 수 있는 오류</th></tr></thead><tbody><tr><td>1</td><td>없음</td><td>없음</td></tr><tr><td>2</td><td>1개</td><td>없음</td></tr><tr><td>3</td><td>2개</td><td>1개</td></tr></tbody></table></div><div class="writing-list">${writeBox('N18_reason', '거리가 3이면 왜 한 개의 오류를 고칠 수 있는지 쓰시오.', 'explain')}</div></div>`;
}

function renderN19() {
  return `${heading('7 닫기 · 선택 활동', '다시 보내기 어려운 곳에서는 무엇을 선택할까?', '마리너 9호의 사례를 읽고, 우리가 만든 통신로와 비교해 봅니다.')}
  <div class="card stack"><div class="reading"><p>1971년 화성 궤도에 들어간 마리너 9호는 흑백 사진을 보내려고 6비트를 32비트로 부풀려 보냈습니다. 다시 보내 달라고 요청하기 어려운 곳에서는 전송량보다 오류를 견디는 힘이 더 중요할 수 있습니다.</p><p style="margin-bottom:0">점자도 한 번 보낸 뒤 다시 확인하기 어려운 상황과 닮아 있습니다.</p></div>${writeBox('N19_mariner', '우리가 만든 통신로 중 마리너 9호에 가장 가까운 것은 어느 것인가요? 왜 그렇게 극단적으로 만들었을까요?', 'reflect')}</div>`;
}

/* 8비트 정보를 보내고 오류 1개를 고친다는 조건으로 환산한다(명세서 §6-3).
   활동에서 쓴 크기(6×6 격자, 7비트)와 다르므로 화면에 환산 사실을 적는다. */
function compareRows() {
  const logs = state.log.filter(item => item.kind === 'attempt' && item.attempt?.blocks);
  const real = (nodes, one = false) => {
    const item = [...logs].reverse().find(log => JSON.stringify(log.attempt.blocks) === JSON.stringify(nodes) && (one ? log.screen==='N10' : log.screen!=='N10'));
    return item?.detail || '미실행';
  };
  return [
    ['그냥 보내기','8비트','✗','✗','1',real(['message','noise','receiver'])],
    ['검사 비트 1개','9비트','1개','✗','2',real(['message','parityEncode','noise','parityCheck','receiver'],true)],
    ['해밍 (검사 4개)','12비트','○','1개','3',state.screens.N15.checked ? '검사 패턴 구별 완료 (7자리 활동)' : state.views.N15_operate ? '미해결' : '미실행'],
    ['2×4 격자 검사','15비트','○','1개','4',checkParityGrid().ok ? '검사 칸 배치 완료 (6×6 활동)' : state.views.N11b ? '미해결' : '미실행'],
    ['3번 반복 + 다수결','24비트','○','1개','3',real(['message','repeat3','noise','majority','receiver'])]
  ];
}


/* 표를 훑고 서술 칸으로 내려가면 끝이라 종합이 실제로 일어나지 않았다.
   읽는 표에서 채우는 표로 바꾼다(명세서 §32-4 13번, §22).
   보낼 정보는 다섯 줄 모두 8비트로 같다 — 「정보는 같고 보내는 양만
   다르다」가 열 하나로 드러난다. */
const COMPARE_METHODS = [
  {
    id: 'plain', name: '그냥 보내기', bits: 8, detect: false, fix: false, groups: 0,
    shape: [{ info: 8, check: 0 }],
    how: '검사 비트를 붙이지 않고 그대로 보냅니다. 뒤집혀도 알 방법이 없습니다.',
    where: '11번에서 해 본 방법'
  },
  {
    id: 'repeat3', name: '3번 반복', bits: 24, detect: true, fix: true, groups: null,
    shape: [{ info: 8, check: 0 }, { info: 8, check: 0 }, { info: 8, check: 0 }],
    how: '같은 8칸을 세 번 보내고, 열마다 많은 쪽을 고릅니다. 검사 비트를 붙이는 대신 정보를 통째로 복제합니다.',
    where: '8~10번에서 해 본 방법'
  },
  {
    id: 'parity1', name: '검사 비트 1개', bits: 9, detect: true, fix: false, groups: 1,
    shape: [{ info: 8, check: 1 }],
    how: '전체 1의 개수가 짝수가 되도록 비트 하나를 붙입니다. 받는 쪽은 1을 세어 홀수면 오류가 있다는 것을 압니다. 어느 자리인지는 모릅니다.',
    where: '17번에서 해 본 방법'
  },
  {
    id: 'grid', name: '격자 검사', bits: 15, detect: true, fix: true, groups: 7,
    shape: [{ info: 4, check: 1 }, { info: 4, check: 1 }, { info: 0, check: 5 }],
    how: '정보를 2×4로 늘어놓고 가로·세로가 각각 짝수가 되도록 검사 칸을 붙입니다. 이상한 가로줄과 세로줄이 만나는 곳이 뒤집힌 자리입니다.',
    where: '18~20번에서 해 본 방법'
  },
  {
    id: 'hamming', name: '해밍', bits: 12, detect: true, fix: true, groups: 4,
    shape: [{ info: 8, check: 4 }],
    how: '검사 묶음을 직접 설계해 붙입니다. 검사 결과를 이어 읽으면 뒤집힌 자리 번호가 그대로 나옵니다.',
    where: '24·25번에서 설계한 방법'
  }
];

function shapeHtml(shape) {
  return `<span class="shape">${shape.map(row => `<span class="shape-row">${'<span class="shape-cell info"></span>'.repeat(row.info)}${'<span class="shape-cell check"></span>'.repeat(row.check)}</span>`).join('')}</span>`;
}

function n20State() {
  const n20 = state.screens.N20 || (state.screens.N20 = {});
  if (!n20.answers || typeof n20.answers !== 'object') n20.answers = {};
  COMPARE_METHODS.forEach(method => {
    if (!n20.answers[method.id]) n20.answers[method.id] = { bits: '', detect: '', fix: '' };
  });
  return n20;
}

function n20Wrong() {
  const n20 = n20State();
  const wrong = [];
  COMPARE_METHODS.forEach(method => {
    const a = n20.answers[method.id];
    if (Number(a.bits) !== method.bits) wrong.push(`${method.id}.bits`);
    if (a.detect !== (method.detect ? 'O' : 'X')) wrong.push(`${method.id}.detect`);
    if (a.fix !== (method.fix ? 'O' : 'X')) wrong.push(`${method.id}.fix`);
  });
  return wrong;
}

function renderN20() {
  const n20 = n20State();
  const checked = Boolean(n20.checked);
  const wrong = n20Wrong();
  const passed = checked && wrong.length === 0;
  /* 통과하면 보낼 비트 순으로 다시 놓는다. 비용이 줄어드는 축이 드러난다. */
  const methods = passed ? [...COMPARE_METHODS].sort((a, b) => a.bits - b.bits) : COMPARE_METHODS;
  const showDistance = state.includeOptional;

  const rows = methods.map(method => {
    const a = n20.answers[method.id];
    const pick = (field, value) => `<select data-n20="${method.id}.${field}" aria-label="${esc(method.name)} ${field === 'detect' ? '알 수 있다' : '고칠 수 있다'}"><option value=""${a[field] ? '' : ' selected'}>—</option><option value="O"${a[field] === 'O' ? ' selected' : ''}>O</option><option value="X"${a[field] === 'X' ? ' selected' : ''}>X</option></select>`;
    return `<tr>
      <th scope="row"><button type="button" class="method-name" data-n20-info="${method.id}">${esc(method.name)} <span aria-hidden="true">ⓘ</span></button></th>
      <td>${shapeHtml([{ info: 8, check: 0 }])}</td>
      <td>${shapeHtml(method.shape)}</td>
      <td><input type="number" inputmode="numeric" min="1" max="99" data-n20="${method.id}.bits" value="${esc(a.bits)}" aria-label="${esc(method.name)} 필요한 비트"></td>
      <td>${pick('detect')}</td>
      <td>${pick('fix')}</td>
      ${showDistance ? `<td>${method.id === 'plain' ? 1 : method.id === 'parity1' ? 2 : method.id === 'grid' ? 4 : 3}</td>` : ''}
    </tr>`;
  }).join('');

  const open = n20.info ? COMPARE_METHODS.find(method => method.id === n20.info) : null;

  return `${heading('7 닫기 · 종합', '같은 8비트를 보내는데, 얼마나 더 보내야 할까?', '지나온 다섯 가지를 같은 조건으로 맞춰 정리합니다. 이름을 누르면 어떤 방법이었는지 다시 볼 수 있습니다.')}
  <div class="card stack">
    <div class="notice">오류를 <strong>없앨 수는 없습니다.</strong> 대신 오류가 생겨도 알아채고 고칠 수 있게 보냅니다. 아래 다섯 가지는 모두 <strong>정보 8비트</strong>를 지킵니다. 다른 것은 <strong>실제로 보내는 양</strong>입니다.</div>
    <div class="table-wrap"><table class="compare-table">
      <thead><tr><th>방식</th><th>보낼 정보</th><th>실제로 보내는 모양</th><th>필요한 비트</th><th>오류가 있다는 걸<br>알 수 있다</th><th>오류를 찾아<br>고칠 수 있다</th>${showDistance ? '<th>최소 거리</th>' : ''}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <p class="muted small" style="margin:0"><span class="shape-cell info"></span> 정보 &nbsp; <span class="shape-cell check"></span> 검사 비트 &nbsp;— 네모를 세어 「필요한 비트」를 채우세요.</p>
    ${open ? `<div class="info-pop"><button type="button" id="n20-info-close" class="info-close" aria-label="닫기">×</button><strong>${esc(open.name)}</strong><p style="margin:6px 0">${esc(open.how)}</p><p class="muted small" style="margin:0">검사 묶음 ${open.groups === null ? '없음 (정보를 복제)' : `${open.groups}개`} · ${esc(open.where)}<br>내 기록: ${esc(compareRecord(open.id))}</p></div>` : ''}
    <div class="button-row"><button id="check-n20" class="primary-button" type="button">검사</button><button id="reset-n20" class="secondary-button" type="button">전부 지우기</button></div>
    <div id="n20-result" class="result ${checked ? (passed ? 'ok' : 'fail') : ''}" role="status">${checked ? (passed ? '✓ 모두 맞습니다.' : `${COMPARE_METHODS.length * 3}칸 중 <strong>${wrong.length}칸</strong>이 다릅니다. 어느 칸인지는 직접 확인하세요.`) : '표를 채운 뒤 「검사」를 누르세요.'}</div>
    ${passed ? `<div class="reading">
      <p style="margin:0">적게 보내는 순서로 놓으면 — <strong>${methods.map(method => method.bits).join(' · ')}</strong></p>
      <p style="margin:8px 0 0"><strong>3번 반복만 방법이 다릅니다.</strong> 검사 비트를 붙이는 대신 정보를 통째로 세 번 보냅니다.</p>
      <p style="margin:6px 0 0">나머지 셋은 <strong>같은 방법</strong>입니다 — 정보에 검사 비트를 붙이고 묶음마다 1의 개수가 짝수인지 봅니다. 다른 건 <strong>묶음을 어떻게 정했느냐</strong>뿐입니다.</p>
      <ul style="margin:6px 0 0">
        <li>검사 비트 1개 → 묶음 <strong>1개</strong> → 있다는 것만 안다</li>
        <li>격자 검사 → 묶음 <strong>7개</strong>(행과 열) → 위치를 찾는다</li>
        <li>해밍 → 묶음 <strong>4개</strong>(직접 설계) → 위치를 찾는다. 더 싸다</li>
      </ul>
      <p style="margin:8px 0 0">7자리를 지키는 데 검사 <strong>3번</strong>이면 됐습니다. 정보를 8비트로 늘려도 검사는 <strong>4번</strong>이면 됩니다. <strong>정보가 두 배가 되어도 검사는 하나만 늘어납니다.</strong></p>
    </div>` : ''}
    ${evidenceFor(['N6_operate','N7','N8','N10','N11b','N12','N15_operate'])}
  </div>`;
}

/* ⓘ 창에 붙일 「내 기록」. 실제 실행 기록만 쓴다(명세서 §30). */
function compareRecord(id) {
  const logs = state.log.filter(item => item.kind === 'attempt' && item.attempt?.blocks);
  const real = (nodes, one = false) => {
    const item = [...logs].reverse().find(log => JSON.stringify(log.attempt.blocks) === JSON.stringify(nodes) && (one ? log.screen === 'N10' : log.screen !== 'N10'));
    return item?.detail || '미실행';
  };
  if (id === 'plain') return real(['message','noise','receiver']);
  if (id === 'repeat3') return real(['message','repeat3','noise','majority','receiver']);
  if (id === 'parity1') return real(['message','parityEncode','noise','parityCheck','receiver'], true);
  if (id === 'hamming') return state.screens.N15.checked ? '검사 패턴 구별 완료 (7자리 활동)' : state.views.N15_operate ? '미해결' : '미실행';
  return checkParityGrid().ok ? '검사 칸 배치 완료 (6×6 활동)' : state.views.N11b ? '미해결' : '미실행';
}

function submissionSummary() {
  const expected = WRITE_FIELDS.filter(([key])=>state.includeOptional || !['N18_reason','N19_mariner'].includes(key));
  const unfilled = expected.filter(([key])=>!String(state.writes[key]||'').trim()).map(([key])=>key);
  const statuses = SCREEN_ORDER.filter(screen=>!['N0','N21'].includes(screen.id)).map(screen=>{
    const logs = state.log.filter(item=>item.screen===screen.id && item.kind==='attempt');
    const stats = state.attemptStats[screen.id];
    let status = !state.views[screen.id]?.visited ? '미실행' : '관찰';
    const fields = expected.filter(([key])=>key.startsWith(screen.id.split('_')[0]+'_')).map(([key])=>key);
    if (['C1','C2','C3','C4','N6_read'].includes(screen.id)) status = state.views[screen.id]?.visited ? '읽음' : '미실행';
    const writing = screen.id.endsWith('_write') || ['N1','N3','N9','N18','N19','N20'].includes(screen.id);
    if (screen.id.startsWith('N2_')) {
      const key = screen.id === 'N2_operate' ? 'N2_observe' : 'N2_explain';
      status = unfilled.includes(key) ? '미작성' : '작성';
    }
    if(writing && !screen.id.startsWith('N2_')) status = fields.some(key=>unfilled.includes(key)) ? '미작성' : '작성';
    if(['N6_operate','N7','N8','N10'].includes(screen.id)) {
      const circuit=state.circuits[screen.id==='N6_operate'?'N6':screen.id];
      status=!circuit.lastResult ? '미실행' : circuit.lastResult.version!==circuit.version ? '변경 후 미실행' : circuit.lastResult.verdict==='ok' ? '해결' : '미해결';
    }
    if(screen.id==='N11a') status=state.screens.N11a.checked ? (n11aCorrect() ? '해결' : '미해결') : '미실행';
    if(screen.id==='N11b') status=state.parity.checked ? (checkParityGrid().ok ? '해결' : '미해결') : state.parity.placed.length > 1 ? '미제출' : '미실행';
    if(screen.id==='N15_operate') status=state.screens.N15.checked ? '해결' : logs.length ? '미해결' : '미실행';
    if(screen.id==='N4') status=state.screens.N4.checked ? state.screens.N4.answer.join('')===majoritySource().join('') ? '해결' : '미해결' : '미실행';
    if(screen.id==='N5_operate') status=state.screens.N5.checked ? state.screens.N5.ties.length ? '관찰' : n5Answer().every((v,i)=>v===majorityAnswers(repeatedRows(state.screens.N5.count))[i]) ? '해결' : '미해결' : '미실행';
    if(['N12','N16'].includes(screen.id)) {
      const game=state.screens[screen.id];
      const guess=game.guesses[game.round];
      const correct=screen.id==='N12' ? guess && game.board && guess[0]===game.board.cells[0][0] && guess[1]===game.board.cells[0][1] : guess!==undefined && Number(guess)===game.cases[game.round] && n15Patterns().filter(item=>item.pattern===questionPatternFor(game.cases[game.round])).length===1;
      const total = screen.id === 'N12' ? N12_ROUNDS : 3;
      status=game.round===total-1 && correct ? `해결 (${total}문제)` : logs.length ? `미해결 (${total}문제 중 ${game.round+1}번째)` : '미실행';
    }
    if(screen.id==='N17') {
      const codes=state.screens.N17.codes;
      const min=Math.min(...codes.flatMap((a,i)=>codes.slice(i+1).map(b=>hammingDistance(a,b))));
      status=logs.length ? min>=3 && state.screens.N17.guess!=='' && Number(state.screens.N17.guess)===state.screens.N17.query?.codeIndex ? '해결' : '미해결' : '미실행';
    }
    if(screen.optional && !state.includeOptional) status='건너뜀';
    return {id:screen.id,label:screen.label,status,attempts:stats?.count ?? logs.length,firstSuccess:stats?.firstSuccess ?? (logs.findIndex(item=>item.result==='ok')<0 ? null : logs.findIndex(item=>item.result==='ok')+1),hintLevel:state.hints[screen.id]||0};
  });
  return { statuses, unfilled, unresolved:statuses.filter(item=>item.status.startsWith('미해결') || item.status==='변경 후 미실행').length };
}


function renderN21() {
  const summary=submissionSummary();
  const sent=state.submitted.result==='ok' || state.submitted.result==='sent' || (state.submitted.at>0 && !state.submitted.result && !/실패|중단/.test(state.submitted.status));
  const failed=state.submitted.result==='fail' || /실패|중단/.test(state.submitted.status);
  return `${heading('7 닫기 · 제출','오늘의 탐구 기록을 제출하세요.','작성한 설명과 실제 실험 결과를 함께 제출합니다. 미작성·미해결 활동도 그대로 기록됩니다.')}<div class="card stack"><div class="two-column"><div class="evidence">미작성 문항 <strong>${summary.unfilled.length}개</strong></div><div class="evidence">미해결 활동 <strong>${summary.unresolved}개</strong></div></div><details class="attempt-details"><summary>활동별 상태 보기</summary><div class="evidence">${summary.statuses.map(item=>`<div>${esc(item.label)} · ${esc(item.status)}</div>`).join('')}</div></details><div id="submit-result" class="result ${failed?'fail':sent?'ok':''}" role="status">${esc(state.submitted.status || '제출 버튼을 누르면 탐구 기록 HTML이 만들어집니다.')}${state.submitted.code ? ` · 확인 코드 ${esc(state.submitted.code)}` : ''}</div><div class="button-row"><button id="submit-button" class="primary-button" type="button" ${submissionInFlight||sent?'disabled':''}>${submissionInFlight?'전송 중':sent?'이미 보냈습니다':failed?'다시 제출':'제출'}</button><button id="my-copy-button" class="secondary-button" type="button">내 기록 내려받기</button>${sent?'<button id="resubmit-button" class="secondary-button" type="button">다시 제출하기</button>':''}${failed?'<button id="download-button" class="secondary-button" type="button">전체 기록 파일로 저장</button>':''}</div><p class="muted small" style="margin:0">「제출」은 선생님께 보냅니다. 「내 기록 내려받기」는 <strong>내가 쓴 것과 조작 결과만</strong> 담긴 파일을 내 기기에 저장합니다.</p></div>`;
}


function bindScreen(id) {
  bindCommonWrites();
  if (id === 'N0') bindN0();
  if (id === 'N2_operate' || id === 'N2_write') bindN2();
  if (id === 'N3') bindN3();
  if (id === 'N4') bindN4();
  if (id === 'N5_operate') bindN5();
  if (['N6_operate','N7','N8','N10'].includes(id)) bindCircuit(id === 'N6_operate' ? 'N6' : id);
  $('#go-enter-sid')?.addEventListener('click', () => navTo('N0'));
  $('#back-to-n6')?.addEventListener('click', () => navTo('N6_operate'));
  $$('[data-axis]').forEach(button => button.addEventListener('click', () => {
    const bridge = state.screens.N13_bridge || (state.screens.N13_bridge = { picked: null });
    const axis = button.dataset.axis;
    const index = Number(button.dataset.index);
    bridge.picked = bridge.picked && bridge.picked.axis === axis && bridge.picked.index === index ? null : { axis, index };
    persist();
    render();
  }));
  $$('[data-n20]').forEach(field => field.addEventListener('change', () => {
    const [id, key] = field.dataset.n20.split('.');
    const n20 = n20State();
    n20.answers[id][key] = field.value;
    /* 칸을 고치면 이전 검사 결과는 이 답의 결과가 아니다(명세서 §14). */
    n20.checked = false;
    persist();
    render();
  }));
  $$('[data-n20-info]').forEach(button => button.addEventListener('click', () => {
    const n20 = n20State();
    n20.info = n20.info === button.dataset.n20Info ? null : button.dataset.n20Info;
    persist();
    render();
  }));
  $('#n20-info-close')?.addEventListener('click', () => { n20State().info = null; persist(); render(); });
  $('#check-n20')?.addEventListener('click', () => {
    const n20 = n20State();
    n20.checked = true;
    const wrong = n20Wrong();
    logEvent('attempt', 'N20', { detail: `종합표 검사 · 15칸 중 ${wrong.length}칸 다름`, attempt: { wrong: wrong.length, answers: JSON.parse(JSON.stringify(n20.answers)) } }, wrong.length ? 'fail' : 'ok');
    persist();
    render();
  });
  $('#reset-n20')?.addEventListener('click', () => { const n20 = n20State(); n20.answers = null; n20.checked = false; n20State(); persist(); render(); });
  if (id === 'N11a') bindN11a();
  if (id === 'N11b') bindN11b();
  if (id === 'N12') bindN12();
  if (id === 'N13_observe' && !state.screens.N13) { state.screens.N13 = { board: randomErrorBoard(2, 'N13:0'), shuffles: 0, seen: 1, revealed: false }; persist(); }
  $('#reveal-n13')?.addEventListener('click', () => { state.screens.N13.revealed = true; persist(); render(); });
  $('#reshuffle-n13')?.addEventListener('click', () => {
    state.screens.N13.shuffles = (state.screens.N13.shuffles || 0) + 1;
    state.screens.N13.seen = (state.screens.N13.seen || 1) + 1;
    state.screens.N13.revealed = false;
    state.screens.N13.board = randomErrorBoard(2, `N13:${state.screens.N13.shuffles}`);
    const off = parityOffLines(state.screens.N13.board.base);
    logEvent('attempt', 'N13_observe', { detail: `두 칸 오류 · 이상한 가로줄 ${off.rows.length}개, 세로줄 ${off.cols.length}개` }, 'observe');
    persist();
    render();
  });
  if (id === 'N14') bindN14();
  if (id === 'N15_operate') bindN15();
  if (id === 'N16') bindN16();
  if (id === 'N17') bindN17();
  if (id === 'N21') bindN21();
}

function bindCommonWrites(root = document) {
  $$('[data-write]', root).forEach(input => input.addEventListener('input', event => {
    const field = event.target.dataset.write;
    if (field==='N3_reason' && state.screens.N3.locked) return;
    state.writes[field] = event.target.value;
    state.writeMeta[field] = { at: Date.now(), runs: state.log.filter(item=>item.kind==='attempt' && evidenceScreens(field).includes(item.screen)).map(item=>({screen:item.screen, number:item.number, at:item.t})) };
    if (field==='N3_reason') recordPrediction('N3', false);
    logEvent('write', state.screenId, { field });
  }));
}

function predictionIsPrior(key) {
  const screens = key==='N3' ? ['N4','N5_operate','N6_operate','N7','N8'] : key==='N6' ? ['N6_operate','N7','N8'] : ['N15_operate','N16'];
  return !screens.some(id=>state.views[id]?.visited);
}

function recordPrediction(key, confirmed = false) {
  const value = state.screens[key].prediction || '';
  const reason = key==='N3' ? state.writes.N3_reason || '' : '';
  const previous = state.predicts[key];
  const record = { value, reason, at:Date.now(), beforeExperiment: predictionIsPrior(key) };
  if (!previous) state.predicts[key] = { first: record };
  if (confirmed && !state.predicts[key].confirmed) state.predicts[key].confirmed = record;
  state.predicts[key].latest = record;
  return record;
}

function predictionEvidence(key) {
  const prediction = state.predicts[key];
  const record = prediction?.confirmed || prediction?.latest || prediction?.first;
  if (!record) return '기록 시점 미확인';
  return (prediction?.confirmed ? '' : '미확정 · ') + (record.beforeExperiment ? '실험 전 예측' : '실험을 본 뒤 기록');
}


function bindN0() {
  $('#student-sid')?.addEventListener('input', e => updateStudentField('sid', e.target.value));
  $('#student-name')?.addEventListener('input', e => updateStudentField('name', e.target.value));
  $('#include-optional')?.addEventListener('change', e => { state.includeOptional = e.target.checked; persist(true); updateNavigation(); renderActivityMenu(); });
  $('#resume-button')?.addEventListener('click', () => { const target = resumeView === 'N0' ? 'N1' : resumeView; navTo(target); });
  $('#new-button')?.addEventListener('click', () => { if (hasResumeData() && !window.confirm('저장된 활동 기록을 지우고 새로 시작할까요?')) return; const student = { ...state.student }; resumeView = 'N0'; state = initialState(student.sid); state.student = student; persist(true); render(); });
}

function recordNoiseSample(action) {
  const session = noiseSession();
  if (!messageWord()) return;
  session.cells = transmitCells(messageCells(messageWord()).cells, session.rate);
  if (action === 'resend') {
    session.sends += 1;
    if (noisePart() === 'a' && session.rate === 10) session.atTen += 1;
  }
  const { reading, changed } = noiseEvidence(session);
  if (reading.failures.length) state.screens.N2.readFailures = (state.screens.N2.readFailures || 0) + 1;
  logEvent('attempt', state.screenId, {
    detail: `낱말 ${session.word} · 오류율 ${session.rate}% · 되읽기 ${reading.text} · ${reading.failures.join(' / ') || '판독 가능'} · 뒤집힌 점 ${changed.length}개 · 다시 보내기 ${session.sends}회 · 되읽기 실패 누적 ${state.screens.N2.readFailures || 0}회`,
    noise: { action, word: session.word, rate: session.rate, reading: reading.text, failures: reading.failures, changed, sends: session.sends, atTen: session.atTen, cells: session.cells.map(cell => ({ ...cell, bits: [...cell.bits], received: [...cell.received] })) }
  }, 'observe');
  persist();
}

function updateNoiseDisplay() {
  const session = noiseSession();
  const detailsOpen = $('.noise-changes')?.open;
  $('#noise-display').innerHTML = noiseDisplayHtml(session);
  if (detailsOpen) $('.noise-changes').open = true;
  $('#noise-rate-value').textContent = `${session.rate}%`;
  $('#noise-count').textContent = `다시 보낸 횟수 ${session.sends}회`;
  // 질문이 열린 뒤에는 textarea를 교체하지 않아 답과 커서 위치를 유지한다.
  if (!$('#noise-question [data-write]')) {
    $('#noise-question').innerHTML = noiseQuestionHtml(noisePart(), session);
    bindCommonWrites($('#noise-question'));
  }
}

function bindN2() {
  $('#braille-word')?.addEventListener('change', event => {
    if (messageWord() === event.target.value.trim()) return;
    state.screens.N2.word = event.target.value.trim();
    recordNoiseSample('word');
    persist();
    render();
  });
  $('#noise-rate')?.addEventListener('input', event => {
    noiseSession().rate = Number(event.target.value);
    recordNoiseSample('rate');
    updateNoiseDisplay();
  });
  $('#resend-noise')?.addEventListener('click', () => {
    recordNoiseSample('resend');
    updateNoiseDisplay();
  });
}

function bindN3() {
  $$('input[name="n3"]').forEach(input => input.addEventListener('change', e => { if (state.screens.N3.locked) return; state.screens.N3.prediction = e.target.value; recordPrediction('N3'); persist(); }));
  $('#confirm-n3')?.addEventListener('click', () => { if (!state.screens.N3.prediction) return; recordPrediction('N3', true); state.screens.N3.locked = true; logEvent('attempt', 'N3', { detail: `예측 ${state.screens.N3.prediction || '미선택'}` }, 'predict'); persist(true); render(); });
}

function bindN4() {
  $$('[data-majority-index]').forEach(button => button.addEventListener('click', () => { const i = Number(button.dataset.majorityIndex); const answer = state.screens.N4.answer; answer[i] = answer[i] === null ? 0 : 1 - answer[i]; state.screens.N4.checked = answer.every(value => value !== null); if (state.screens.N4.checked) logEvent('attempt', 'N4', { detail: `다수결 답 ${answer.join('')}` }, answer.join('') === majoritySource().join('') ? 'ok' : 'fail'); persist(); updateN4View(); }));
  $('#reset-n4')?.addEventListener('click', () => { state.screens.N4.answer = Array(8).fill(null); state.screens.N4.checked = false; persist(); updateN4View(); });
  $('#open-n4-guide')?.addEventListener('click', () => openGuide('N4', '내 답 행의 각 칸을 눌러 0, 1을 번갈아 선택할 수 있습니다.'));
}

function bindN5() {
  /* 횟수를 바꾸면 그 횟수의 답을 되살린다. 이전 답을 지우지 않는다(명세서 §16). */
  $$('input[name="n5-count"]').forEach(input => input.addEventListener('change', e => { const n5 = state.screens.N5; n5.count = Number(e.target.value); n5.observedCounts = [...new Set([...(n5.observedCounts || []), n5.count])]; logEvent('attempt', 'N5_operate', {detail: `${n5.count}번 받았을 때 관찰`, attempt: {count: n5.count}}, 'observe'); n5.ties = columnTies(repeatedRows(n5.count)); n5.checked = n5Answer().every(value => value !== null); persist(); render(); }));
  $$('[data-majority-index]').forEach(button => button.addEventListener('click', () => { const i = Number(button.dataset.majorityIndex); const n5 = state.screens.N5; const answer = n5Answer(); answer[i] = answer[i] === null ? 0 : 1 - answer[i]; n5.checked = answer.every(value => value !== null); n5.ties = columnTies(repeatedRows(n5.count)); if (n5.checked) logEvent('attempt', 'N5_operate', { detail: `${n5.count}번 받았을 때, 답 ${answer.join('')}` }, n5.ties.length ? 'partial' : answer.every((value,index)=>value===majorityAnswers(repeatedRows(n5.count))[index]) ? 'ok' : 'fail'); persist(); updateN5View(); }));
  $('#reset-n5')?.addEventListener('click', () => { const n5 = state.screens.N5; n5.answers[n5.count] = Array(8).fill(null); n5.checked = false; persist(); updateN5View(); });
  $('#open-n5-guide')?.addEventListener('click', () => openGuide('N5_operate', '먼저 반복 횟수를 고르고, 내 답 행의 각 열을 눌러 정하세요.'));
}

function bindCircuit(stage) {
  const circuit = circuitConfigFor(stage);
  $$('[data-add-block]').forEach(button => button.addEventListener('click', () => { const type = button.dataset.addBlock; if (!circuit.nodes.includes(type) || type === 'majority') circuit.nodes.splice(Math.max(1, circuit.nodes.length - 1), 0, type); else circuit.nodes.splice(Math.max(1, circuit.nodes.length - 1), 0, type); circuit.version += 1; persist(); render(); }));
  $$('[data-node-index]').forEach(node => node.addEventListener('click', event => { if (event.target.closest('[data-node-action]')) return; circuit.selected = Number(node.dataset.nodeIndex); persist(); render(); }));
  $$('[data-node-action]').forEach(button => button.addEventListener('click', () => { const index = Number(button.dataset.nodeIndex); const action = button.dataset.nodeAction; if (action === 'remove' && !['message','receiver'].includes(circuit.nodes[index])) circuit.nodes.splice(index, 1); if (action === 'up' && index > 1) [circuit.nodes[index - 1], circuit.nodes[index]] = [circuit.nodes[index], circuit.nodes[index - 1]]; if (action === 'down' && index < circuit.nodes.length - 2) [circuit.nodes[index + 1], circuit.nodes[index]] = [circuit.nodes[index], circuit.nodes[index + 1]]; circuit.version += 1; persist(); render(); }));
  $$('.circuit-node').forEach(node => node.addEventListener('keydown', event => { if (event.target !== node) return; if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); node.click(); } }));
  /* 끌어서 순서 바꾸기. 터치·키보드에서는 ← → 버튼이 같은 일을 한다(명세서 §13). */
  let dragFrom = null;
  $$('.circuit-node[draggable="true"]').forEach(node => {
    node.addEventListener('dragstart', event => { dragFrom = Number(node.dataset.nodeIndex); node.classList.add('dragging'); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(dragFrom)); });
    node.addEventListener('dragend', () => { node.classList.remove('dragging'); $$('.circuit-node').forEach(other => other.classList.remove('drop-target')); });
  });
  $$('.circuit-node').forEach(node => {
    node.addEventListener('dragover', event => { if (dragFrom === null) return; const to = Number(node.dataset.nodeIndex); if (to === 0 || to === circuit.nodes.length - 1) return; event.preventDefault(); node.classList.add('drop-target'); });
    node.addEventListener('dragleave', () => node.classList.remove('drop-target'));
    node.addEventListener('drop', event => {
      event.preventDefault();
      const to = Number(node.dataset.nodeIndex);
      if (dragFrom === null || to === dragFrom || to === 0 || to === circuit.nodes.length - 1) return;
      const [moved] = circuit.nodes.splice(dragFrom, 1);
      circuit.nodes.splice(to, 0, moved);
      circuit.version += 1;
      dragFrom = null;
      persist();
      render();
    });
  });
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
    circuit.lastResult = { version: circuit.version, verdict, detail, metric, blocks: circuit.nodes.slice(), trace: metric.trace };
    logEvent('attempt', viewId, { detail, attempt: { blocks: circuit.nodes.slice(), order: circuit.nodes.join(' > '), metric: { ...metric }, goal: STAGE_COPY[stage][2], version: circuit.version } }, verdict);
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
  $('#open-circuit-guide')?.addEventListener('click', () => openGuide(stage, '팔레트에서 블록을 고르면 통신로에 들어갑니다. 블록을 끌어 옮기거나 ← → 버튼으로 순서를 바꿔 보세요. 실행 후에도 다시 구성할 수 있습니다.'));
}

function bindN11a() {
  $('#n11a-cell')?.addEventListener('click', () => {
    const n11a = state.screens.N11a;
    n11a.answer = n11a.answer === null ? 0 : 1 - n11a.answer;
    n11a.checked = true;
    n11a.tries += 1;
    const ok = n11aCorrect();
    logEvent('attempt', 'N11a', { detail: `한 줄 검사 점 ${n11a.answer} · ${ok ? '짝수' : '홀수'}`, attempt: { answer: n11a.answer, correct: ok } }, ok ? 'ok' : 'fail');
    if (!ok) advanceHint('N11a');
    persist();
    render();
  });
}

function bindN11b() {
  $$('[data-parity-cell]').forEach(button => button.addEventListener('click', () => {
    const [r, c] = button.dataset.parityCell.split(',').map(Number);
    if (!(r === 0 || c === 0) || isParityGiven(r, c)) return;
    const grid = state.parity;
    const current = grid.values[r][c];
    grid.values[r][c] = current === null ? 0 : 1 - current;
    if (!grid.placed.some(cell => cell[0] === r && cell[1] === c) && grid.values[r][c] !== null) grid.placed.push([r, c]);
    if (grid.values[r][c] === null) grid.placed = grid.placed.filter(cell => cell[0] !== r || cell[1] !== c);
    /* 칸을 고치면 이전 검사 결과는 더 이상 이 배치의 결과가 아니다(명세서 §14). */
    grid.checked = false;
    persist();
    render();
  }));
  $('#check-parity')?.addEventListener('click', () => {
    const grid = state.parity;
    grid.check = checkParityGrid();
    grid.checked = true;
    const bad = grid.check.rowStatus.filter(good => !good).length + grid.check.colStatus.filter(good => !good).length;
    logEvent('attempt', 'N11b', { detail: grid.check.ok ? '13개 검사 칸 배치 완료 · 가로 세로 모두 짝수' : `이상한 줄 ${bad}개`, attempt: { badLines: bad } }, grid.check.ok ? 'ok' : 'fail');
    if (!grid.check.ok) advanceHint('N11b');
    persist();
    render();
  });
  $('#reset-parity')?.addEventListener('click', () => { state.parity = createParityGrid(studentId()); persist(); render(); });
}

function bindN12() { $$('[data-find-cell]').forEach(button => button.addEventListener('click', () => { const [r,c] = button.dataset.findCell.split(',').map(Number); if (r < 0 || c < 0) return; const n12 = state.screens.N12; const target = n12.board.cells[0]; const ok = r === target[0] && c === target[1]; n12.guesses[n12.round] = [r,c]; logEvent('attempt', 'N12', { detail: `${n12.round + 1}판 · 선택 ${r + 1}행 ${c + 1}열 · 실제 ${target[0] + 1}행 ${target[1] + 1}열 · ${ok ? '맞음' : '틀림'} · 힌트 ${state.hints.N12 || 0}단계`, attempt: { round: n12.round + 1, selected: [r + 1, c + 1], actual: [target[0] + 1, target[1] + 1], correct: ok, hintLevel: state.hints.N12 || 0 } }, ok ? 'ok' : 'fail'); if (!ok) advanceHint('N12'); mascotState = { mood: ok ? 'cheer' : (state.hints.N12 >= 2 ? 'worry' : 'tilt'), text: ok ? '찾았습니다. 같은 방법이 두 칸 오류에도 통할지 생각해 보세요.' : (HINTS.N12[state.hints.N12 - 1] || HINTS.N12[0]), open: true }; persist(); render(); })); $('#next-n12-round')?.addEventListener('click', () => { if (state.screens.N12.round >= N12_ROUNDS - 1) return; state.screens.N12.round += 1; state.screens.N12.board = randomErrorBoard(1, `N12:${state.screens.N12.round}`); persist(); render(); }); /* 같은 판을 다시 푸는 것이므로 문제는 그대로 두고 답만 비운다. */
  $('#reset-n12')?.addEventListener('click', () => { state.screens.N12.guesses[state.screens.N12.round] = undefined; persist(); render(); }); }

function bindN14() {
  $$('[data-n14-pick]').forEach(button => button.addEventListener('click', () => {
    const n14 = state.screens.N14;
    const number = Number(button.dataset.n14Pick);
    n14.pick = n14.pick.includes(number) ? n14.pick.filter(value => value !== number) : [...n14.pick, number].sort((a, b) => a - b);
    n14.counted = false;
    persist();
    render();
  }));
  $('#n14-count')?.addEventListener('click', () => {
    const n14 = state.screens.N14;
    n14.counted = true;
    logEvent('attempt', 'N14', { detail: `검사 한 번 해보기 · ${n14.pick.join('·')}번째`, attempt: { pick: n14.pick.slice() } }, 'observe');
    persist();
    render();
  });
  $('#n14-clear')?.addEventListener('click', () => { state.screens.N14.pick = []; state.screens.N14.counted = false; persist(); render(); });
  $$('input[name="n14"]').forEach(input => input.addEventListener('change', e => { state.screens.N14.prediction = e.target.value; recordPrediction('N14'); persist(); })); $('#confirm-n14')?.addEventListener('click', () => { if (!state.screens.N14.prediction) return; recordPrediction('N14', true); state.screens.N14.confirmed = true; logEvent('attempt', 'N14', { detail: `질문 수 예측 ${state.screens.N14.prediction || '미선택'}` }, 'predict'); persist(); render(); }); }

function bindN15() {
  const n15 = state.screens.N15;
  const addNumber = (boxIndex, number) => {
    const group = n15.groups[boxIndex];
    if (!group.includes(number)) n15.groups[boxIndex] = [...group, number].sort((a, b) => a - b);
    n15.checked = false;
    persist();
    render();
  };
  $$('[data-number]').forEach(chip => {
    const number = Number(chip.dataset.number);
    chip.addEventListener('click', () => { n15.selected = n15.selected === number ? null : number; persist(); render(); });
    chip.addEventListener('dragstart', event => { event.dataTransfer.effectAllowed = 'copy'; event.dataTransfer.setData('text/plain', String(number)); });
  });
  $$('[data-box]').forEach(box => {
    const boxIndex = Number(box.dataset.box);
    box.addEventListener('dragover', event => { event.preventDefault(); box.classList.add('drop-target'); });
    box.addEventListener('dragleave', () => box.classList.remove('drop-target'));
    box.addEventListener('drop', event => { event.preventDefault(); box.classList.remove('drop-target'); const number = Number(event.dataTransfer.getData('text/plain')); if (number >= 1 && number <= 7) addNumber(boxIndex, number); });
    box.addEventListener('click', event => { if (event.target.closest('[data-remove]')) return; if (n15.selected) addNumber(boxIndex, n15.selected); });
    box.addEventListener('keydown', event => { if (event.target === box && (event.key === 'Enter' || event.key === ' ') && n15.selected) { event.preventDefault(); addNumber(boxIndex, n15.selected); } });
  });
  $$('[data-remove]').forEach(chip => chip.addEventListener('click', event => {
    event.stopPropagation();
    const [boxIndex, number] = chip.dataset.remove.split(',').map(Number);
    n15.groups[boxIndex] = n15.groups[boxIndex].filter(value => value !== number);
    n15.checked = false;
    persist();
    render();
  }));
  $('#n15-more')?.addEventListener('click', () => { if (n15.groups.length < N15_MAX_GROUPS && n15.groups.length < (n15.unlocked || 1)) { n15.groups.push([]); n15.checked = false; persist(); render(); } });
  $('#n15-fewer')?.addEventListener('click', () => { if (n15.groups.length > N15_MIN_GROUPS) { n15.groups.pop(); n15.checked = false; persist(); render(); } });
  $('#check-n15')?.addEventListener('click', () => {
    const patterns = n15Patterns();
    const distinct = new Set(patterns.map(item => item.pattern)).size;
    const unique = distinct === 8;
    n15.checked = unique;
    n15.lastCheck = distinct;
    /* 모자라면 검사를 하나 더 만들 수 있게 연다. 2 → 4 → 8갈래를 겪는다. */
    if (!unique) n15.unlocked = Math.min(N15_MAX_GROUPS, Math.max(n15.unlocked || 1, n15.groups.length + 1));
    logEvent('attempt', 'N15_operate', { detail: `질문 ${n15.groups.length}개 · 묶음 ${n15.groups.map((group, i) => `Q${i + 1}=${group.join('') || '없음'}`).join(' ')} · 서로 다른 패턴 ${new Set(patterns.map(item => item.pattern)).size}개`, attempt: { groups: n15.groups.map(group => group.slice()), distinct: new Set(patterns.map(item => item.pattern)).size } }, unique ? 'ok' : 'fail');
    if (!unique) advanceHint('N15_operate');
    mascotState = { mood: unique ? 'cheer' : 'tilt', text: unique ? '모든 일이 서로 다른 답 패턴을 가졌어요.' : (HINTS.N15_operate[(state.hints.N15_operate || 1) - 1] || HINTS.N15_operate[0]), open: true };
    persist();
    render();
  });
  $('#reset-n15')?.addEventListener('click', () => { n15.groups = n15.groups.map(() => []); n15.selected = null; n15.checked = false; n15.lastCheck = null; persist(); render(); });
  $('#open-n15-guide')?.addEventListener('click', () => openGuide('N15_operate', '번호 블록을 끌어다 질문 상자에 넣거나, 번호를 누른 뒤 상자를 누르세요. 상자 안의 번호를 누르면 빠집니다. 질문 개수도 바꿀 수 있습니다.'));
}

function bindN16() { $$('input[name="n16"]').forEach(input => input.addEventListener('change', event => { const n16 = state.screens.N16; const target = n16.cases[n16.round]; const guess = Number(event.target.value); n16.guesses[n16.round] = guess; const ambiguous=n15Patterns().filter(item=>item.pattern===questionPatternFor(target)).length>1; const ok = !ambiguous && guess === target; logEvent('attempt', 'N16', { detail: `${n16.round + 1}판 · 답 패턴 ${questionPatternFor(target)} · 선택 ${guess === 0 ? '오류 없음' : `${guess}번`} · 실제 ${target === 0 ? '오류 없음' : `${target}번`} · ${ok ? '맞음' : '틀림'}`, attempt: { round: n16.round + 1, pattern: questionPatternFor(target), groups: state.screens.N15.groups.map(group=>group.slice()), guess, actual: target, correct: ok } }, ok ? 'ok' : 'fail'); persist(); render(); })); $('#next-n16')?.addEventListener('click', () => { state.screens.N16.round += 1; persist(); render(); }); }

function bindN17() {
  $$('[data-code-cell]').forEach(button => button.addEventListener('click', () => {
    const [row, col] = button.dataset.codeCell.split(',').map(Number);
    const chars = [...state.screens.N17.codes[row]];
    chars[col] = chars[col] === '0' ? '1' : '0';
    state.screens.N17.codes[row] = chars.join('');
    state.screens.N17.tested = false;
    state.screens.N17.guess = '';
    persist();
    render();
  }));
  $('#test-code-error')?.addEventListener('click', () => {
    const n17 = state.screens.N17;
    const rand = studentRandom('N17', n17.codes.join(''));
    n17.query = { codeIndex: Math.floor(rand() * n17.codes.length), error: Math.floor(rand() * 6) };
    n17.tested = true;
    n17.guess = '';
    const distances = [];
    for (let i = 0; i < n17.codes.length; i += 1) for (let j = i + 1; j < n17.codes.length; j += 1) distances.push(hammingDistance(n17.codes[i], n17.codes[j]));
    logEvent('attempt', 'N17', { detail: `최소 거리 ${Math.min(...distances)} · 신호 ${n17.query.codeIndex + 1}의 ${n17.query.error + 1}번째 자리에 오류` }, 'observe');
    persist();
    render();
  });
  $$('input[name="n17-guess"]').forEach(input => input.addEventListener('change', event => {
    const n17 = state.screens.N17;
    n17.guess = event.target.value;
    const received = flipBit(n17.codes[n17.query.codeIndex], n17.query.error);
    const distances = n17.codes.map(code => hammingDistance(code, received));
    const best = Math.min(...distances);
    const canCorrect = distances.filter(distance => distance === best).length === 1 && distances[n17.query.codeIndex] === best;
    const ok = canCorrect && Number(n17.guess) === n17.query.codeIndex;
    logEvent('attempt', 'N17', { detail: `받은 값 ${received} · 신호 ${Number(n17.guess) + 1} 선택 · 실제 신호 ${n17.query.codeIndex + 1}`, attempt: { received, guess: Number(n17.guess) + 1, actual: n17.query.codeIndex + 1 } }, ok ? 'ok' : 'fail');
    if (!ok) advanceHint('N17');
    mascotState = { mood: ok ? 'cheer' : 'tilt', text: ok ? '가장 가까운 부호로 되돌리면 원래 신호가 나옵니다.' : (HINTS.N17[(state.hints.N17 || 1) - 1] || HINTS.N17[0]), open: true };
    persist();
    render();
  }));
}

function bindN21() {
  $('#submit-button')?.addEventListener('click', submitWork);
  $('#download-button')?.addEventListener('click', () => downloadSubmission(false));
  $('#my-copy-button')?.addEventListener('click', () => { downloadSubmission(true); logEvent('nav', 'N21', { detail: '학생용 기록 내려받기' }); persist(); });
  $('#resubmit-button')?.addEventListener('click',()=>{ if(window.confirm('이미 보낸 기록이 있습니다. 현재 기록을 다시 제출할까요?')) { state.submitted={at:0,code:'',status:''}; submitWork(); } });
}


function openGuide(screen, text) { state.guideSeen[screen] = true; mascotState = { mood: 'idle', text, open: true }; logEvent('hint', screen, { detail: '조작 안내 열기' }, 'guide'); persist(); renderMascot(); }

function advanceHint(screen) {
  const current=state.hints[screen]||0;
  const attempts=state.attemptStats[screen]?.failures ?? state.log.filter(item=>item.screen===screen && item.kind==='attempt' && ['fail','partial'].includes(item.result)).length;
  const desired=attempts>=5?3:attempts>=3?2:attempts>=1?1:current;
  if(desired>current) { state.hints[screen]=desired; logEvent('hint',screen,{detail:`힌트 ${desired}단계`},'hint'); }
  return state.hints[screen]||0;
}

function hintMood(level) { return level>=3?'explain':level>=2?'worry':level>=1?'tilt':'idle'; }

function hintTextFor(screen, level) {
  if(screen==='N5_operate' && !(state.screens.N5.observedCounts||[]).includes(4)) return ['각 열의 0과 1 개수를 세어 보세요.','반복 횟수를 바꾸고 같은 방법으로 판단해 보세요.','여러 횟수에서 많은 쪽을 항상 하나로 고를 수 있는지 비교해 보세요.'][level-1];
  return (HINTS[screen]||[])[level-1] || '지금 필요한 조작을 찾아 보세요.';
}

function showFirstGuide(screen) {
  const guides={N4:['bits','.bit-display','내 답의 빈칸을 눌러 0 또는 1을 정하세요.'],N6_operate:['pipeline','.palette','팔레트에서 블록을 추가하고, 화살표로 순서를 바꾸어 시험해 보세요.'],N7:['pipeline','.palette','팔레트에서 블록을 추가하고 화살표로 순서를 바꾸어 보세요.'],N10:['pipeline','.palette','팔레트에서 블록을 추가하고 화살표로 순서를 바꾸어 보세요.'],N11b:['parity','.parity-grid','가장자리 검사 칸을 눌러 0 또는 1을 정하세요.'],N15_operate:['questions','.number-palette','번호를 고른 뒤 질문 상자를 누르세요. 상자 안의 번호를 누르면 빠집니다.']};
  const guide=guides[screen];
  if(!guide || state.guideSeen[`mode:${guide[0]}`]) return;
  state.guideSeen[`mode:${guide[0]}`]=true;
  $(guide[1])?.classList.add('guide-target');
  mascotState={mood:'idle',text:guide[2],open:true};
  logEvent('guide',screen,{detail:guide[2]},'guide');
}


function renderMascot() {
  let slot = $('.mascot-slot');
  if (!slot) { slot = document.createElement('div'); slot.className = 'mascot-slot'; $('.bottom-bar').insertBefore(slot, $('#screen-count')); }
  const last = [...state.log].reverse().find(item=>item.screen===state.screenId && item.kind==='attempt');
  const mood = mascotState.text ? mascotState.mood : last?.result==='ok' ? 'cheer' : hintMood(state.hints[state.screenId]||0);
  const level = state.hints[state.screenId] || 0;
  const fallback = hintTextFor(state.screenId, Math.max(1,level));
  const hintText = mascotState.text || fallback;
  /* 칸을 누를 때마다 이 자리를 다시 그리면 <img>가 새로 만들어져 화면 아래가
     번쩍인다. 내용이 실제로 바뀌었을 때만 다시 그린다(명세서 §37). */
  const signature = JSON.stringify([mood, hintText, state.screenId, level, Boolean(HINTS[state.screenId])]);
  if (slot.dataset.mascotSig !== signature) {
    slot.dataset.mascotSig = signature;
    slot.innerHTML = `<div class="mascot-bubble" aria-live="polite" hidden><p>${esc(hintText)}</p><div class="mascot-actions">${HINTS[state.screenId] && level < 3 ? '<button id="next-hint" type="button">다음 힌트</button>' : ''}<button id="close-mascot" type="button">닫기</button></div></div><button id="mascot-button" class="mascot-button" type="button"><span aria-hidden="true" class="mascot-fallback" hidden>?</span><img src="../../assets/mascot-${esc(mood)}.png" alt="" aria-hidden="true" onerror="this.hidden=true;this.previousElementSibling.hidden=false"></button>`;
    $('#mascot-button')?.addEventListener('click', () => { mascotState.open = !mascotState.open; renderMascot(); });
  }
  const bubble = slot.querySelector('.mascot-bubble');
  if (bubble) bubble.hidden = !mascotState.open;
  $('#mascot-button')?.setAttribute('aria-label', mascotState.open ? '힌트 닫기' : '힌트 열기');
  /* 말풍선은 하단 바에서 위로 펼쳐지므로 조작판·입력칸을 덮는다.
     학생이 본문을 만지기 시작하면 닫는다. 힌트는 캐릭터를 눌러 다시 연다. */
  if (!window.__mascotAutoClose) {
    window.__mascotAutoClose = true;
    const closeOnMainContent = event => {
      if (!mascotState.open) return;
      if (!event.target.closest || !event.target.closest('.main-content')) return;
      mascotState.open = false;
      renderMascot();
    };
    document.addEventListener('focusin', closeOnMainContent);
    document.addEventListener('pointerdown', closeOnMainContent, true);
  }
  $('#close-mascot')?.addEventListener('click', () => { mascotState.open = false; $$('.guide-target').forEach(node=>node.classList.remove('guide-target')); renderMascot(); });
  $('#next-hint')?.addEventListener('click', () => { const current = state.hints[state.screenId] || 0; const next = Math.min(3, current + 1); state.hints[state.screenId] = next; mascotState.text = hintTextFor(state.screenId,next); mascotState.mood = next >= 3 ? 'explain' : next >= 2 ? 'worry' : 'tilt'; logEvent('hint', state.screenId, { detail: `힌트 ${next}단계 직접 열기` }, 'hint'); persist(); renderMascot(); });
}

function createConfirmationCode() { const seed = `${state.student.sid}${state.student.name}${Date.now()}`; let hash = 0; for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 1000000; return String(hash).padStart(6, '0'); }

/* 출력물이 둘이다(명세서 §30-1). 제출본은 시도 요약과 전체 로그까지,
   학생 다운로드본은 자기가 쓴 것과 조작 결과만. 같은 생성기에서 섹션만
   달리 켠다 — 두 벌을 따로 만들면 갈라진다. */
function buildSubmissionHtml(forStudent = false) {
  const summary=submissionSummary();
  const writes=WRITE_FIELDS.map(([key,label])=>`<section><h3>${esc(label.replace('N3 ','반복 '))}</h3><p class="answer">${!state.includeOptional && ['N18_reason','N19_mariner'].includes(key) ? '건너뜀' : esc(state.writes[key]||'미작성')}</p></section>`).join('');
  const records=summary.statuses.map(item=>{
    const logs=state.log.filter(log=>log.screen===item.id && log.kind==='attempt');
    const circuit=state.circuits[item.id==='N6_operate'?'N6':item.id];
    const snapshot=circuit ? circuit.nodes.map(circuitBlockLabel).join(' → ') : item.id==='N15_operate' ? state.screens.N15.groups.map((group,i)=>`질문 ${i+1}: ${group.join(', ')||'없음'}`).join(' / ') : item.id==='N17' ? state.screens.N17.codes.join(' / ') : '';
    const noisePartId = item.id === 'N2_operate' ? 'a' : item.id === 'N2_write' ? 'b' : null;
    const noise = noisePartId && state.screens.N2.sessions?.[noisePartId];
    const noiseRecord = noise ? `<p>낱말 ${esc(noise.word)} · 오류율 ${noise.rate}% · 다시 보내기 ${noise.sends}회 · 10%에서 다시 보내기 ${noise.atTen}회 · 되읽기 ${esc(readBrailleWord(noise.word, noise.cells || []).text)} · 되읽기 실패 누적 ${state.screens.N2.readFailures || 0}회</p><p>보낸 점형: ${esc((noise.cells || []).map(cell => cell.bits.join('')).join(' / '))}<br>받은 점형: ${esc((noise.cells || []).map(cell => (cell.received || cell.bits).join('')).join(' / '))}</p>` : '';
    const bits=rows=>rows.map(row=>row.join('')).join(' / ');
    /* 학생마다 문제가 다르므로 제출물만 보고 채점할 수 있어야 한다(명세서 §36-2). */
    const problem=item.id==='N4' ? `<p>받은 신호: ${esc(bits(n4Rows()))}</p><p>내 답: ${esc(state.screens.N4.answer.map(v=>v===null?'·':v).join(''))}</p>`
      : item.id==='N5_operate' ? [3,4,5].map(count=>`<p>${count}번 받았을 때: ${esc(bits(repeatedRows(count)))}<br>내 답: ${esc(n5Answer(count).map(v=>v===null?'·':v).join(''))}</p>`).join('')
      : item.id==='N11a' ? `<p>내 줄: ${esc(n11aRows().mine.join(''))} · 검사 점: ${state.screens.N11a.answer===null?'미입력':state.screens.N11a.answer}</p>`
      : item.id==='N11b' ? `<p>격자 낱말: ${esc(state.parity.word||'수학공부')}</p>` : '';
    const grid=item.id==='N11b' ? `<table>${state.parity.values.map((row,r)=>'<tr>'+row.map((value,c)=>`<td>${r===0||c===0 ? value===null?'미입력':value : state.parity.data[r-1][c-1]}</td>`).join('')+'</tr>').join('')}</table>` : '';
    return `<section><h3>${esc(item.label)}${forStudent?'':` · ${esc(item.status)}`}</h3><p>${esc(snapshot)}</p>${problem}${grid}${noiseRecord}<p>${esc(logs.at(-1)?.detail||'실행 기록 없음')}</p></section>`;
  }).join('');
  const predictions=['N3','N14'].map(key=>{
    const prediction=state.predicts[key];
    const record=prediction?.confirmed||prediction?.latest||prediction?.first;
    return `<p>${{N3:'반복 횟수',N6:'통신로',N14:'질문 수'}[key]} · ${predictionEvidence(key)}: ${esc(record?.value||'미작성')} ${esc(record?.reason||'')}</p>`;
  }).join('');
  const tableRows=compareRows().map(row=>`<tr>${row.map(cell=>`<td>${esc(cell)}</td>`).join('')}</tr>`).join('');
  const stats=summary.statuses.map(item=>`<tr><td>${esc(item.label)}</td><td>${esc(item.status)}</td><td>${item.attempts}</td><td>${item.firstSuccess??'없음'}</td><td>${item.hintLevel}</td></tr>`).join('');
  const makeHtml=(logs, forStudent=false)=>`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>믿을 수 있게 보내기 제출 기록</title><style>@page{size:A4;margin:15mm}body{font-family:Arial,sans-serif;color:#202938;line-height:1.6}table{width:100%;border-collapse:collapse;margin:12px 0 24px}th,td{border:1px solid #ccc;padding:6px;text-align:left;overflow-wrap:anywhere}section{break-inside:avoid;border-top:1px solid #ddd;padding:8px 0}.answer{white-space:pre-wrap;overflow-wrap:anywhere}@media print{table{break-inside:avoid}}</style></head><body><h1>믿을 수 있게 보내기</h1><p>학번: ${esc(state.student.sid)} · 이름: ${esc(state.student.name)}<br>제출 시각: ${new Date(state.submitted.at||Date.now()).toLocaleString('ko-KR')} · 확인 코드: ${esc(state.submitted.code)}</p><p>과목: 수학 · 관련 단원: 이진법과 오류 정정<br>학습 목표: 반복·검사 비트·질문 설계를 비교하고 오류를 견디는 방법을 설명한다.</p><h2>예측 기록</h2>${predictions}<h2>쪽별 조작 기록</h2>${records}<h2>작성한 설명</h2>${writes}<h2>종합 비교표</h2><p>전송량은 정보 8비트 기준으로 환산한 비교값이며, 내 기록은 실제 활동에서 측정한 값입니다.</p><table><thead><tr><th>방식</th><th>전송량</th><th>탐지</th><th>정정</th><th>최소 거리</th><th>내 기록</th></tr></thead><tbody>${tableRows}</tbody></table>${forStudent?'':`<h2>시도 요약</h2><p>미작성 ${summary.unfilled.length}개 · 미해결 ${summary.unresolved}개</p><table><thead><tr><th>쪽</th><th>상태</th><th>시도 수</th><th>첫 성공 시도</th><th>힌트 단계</th></tr></thead><tbody>${stats}</tbody></table><details><summary>전체 로그 (${logs.length}/${state.log.length}건)</summary><table><thead><tr><th>시각</th><th>활동</th><th>상세</th><th>결과</th></tr></thead><tbody>${logs.map(item=>`<tr><td>${new Date(item.t).toLocaleString('ko-KR')}</td><td>${esc(screenInfo(item.screen).label)}</td><td>${esc(item.detail||item.field||item.kind)}</td><td>${esc(item.result)}</td></tr>`).join('')}</tbody></table></details>`}</body></html>`;
  let logs=state.log.slice();
  let html=makeHtml(logs, forStudent);
  while(new Blob([html]).size>500*1024 && logs.length>protectedLogEntries(logs).size) {
    logs=trimLogs(logs,Math.max(protectedLogEntries(logs).size,Math.floor(logs.length*.7)));
    html=makeHtml(logs, forStudent);
  }
  return html;
}


function downloadSubmission(forStudent = false) {
  const code = state.submitted.code || createConfirmationCode();
  state.submitted.code = code;
  const blob = new Blob([buildSubmissionHtml(forStudent)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${state.student.sid || '학번없음'}_${state.student.name || '이름없음'}_믿을수있게보내기${forStudent ? '' : '_전체기록'}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

async function submitWork() {
  if (submissionInFlight || ['ok','sent'].includes(state.submitted.result)) return;
  if (!state.student.sid.trim() || !state.student.name.trim()) { navTo('N0'); return; }
  submissionInFlight=true;
  const submissionState=state;
  const code=createConfirmationCode();
  state.submitted={at:0,code,status:'준비 중',result:'pending'};
  const html=buildSubmissionHtml();
  const body=new URLSearchParams({sid:state.student.sid,name:state.student.name,code,html});
  persist(true); render();
  const post=async mode=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),20000);
    try {
      const response=await fetch(SCRIPT_URL,{method:'POST',body,signal:controller.signal,...(mode?{mode}:{})});
      if(mode==='no-cors') return 'sent';
      const reply=(await response.text()).trim();
      if(!response.ok || reply!=='ok') return 'fail';
      return 'ok';
    } finally { clearTimeout(timer); }
  };
  let result='fail';
  try {
    if(SCRIPT_URL) {
      try { result=await post(); }
      catch(error) { try { result=await post('no-cors'); } catch(retryError) { result='fail'; } }
    }
  } finally {
    submissionInFlight=false;
    // A new session/import during an in-flight request must not inherit its outcome.
    if(state===submissionState) {
      state.submitted={at:result==='fail'?0:Date.now(),code,result,status:result==='ok'?'제출되었습니다.':result==='sent'?'보냈습니다. 확인 코드를 채팅에 남겨 주세요.':'전송에 실패했습니다. 다시 제출하거나 파일로 저장하세요.'};
      logEvent('submit','N21',{detail:state.submitted.status},result);
      persist(true); render();
    }
  }
}


document.addEventListener('DOMContentLoaded', () => {
  $('#prev-button').addEventListener('click', () => navigate(-1));
  $('#next-button').addEventListener('click', () => navigate(1));
  $('#menu-button').addEventListener('click', () => { const menu = $('#activity-menu'); menu.hidden = !menu.hidden; $('#menu-button').setAttribute('aria-expanded', String(!menu.hidden)); });
  $('#menu-close').addEventListener('click', () => { $('#activity-menu').hidden = true; $('#menu-button').setAttribute('aria-expanded', 'false'); });
  $('#export-code').addEventListener('click', () => { $('#progress-code').value = btoa(unescape(encodeURIComponent(JSON.stringify({...state,screenId:state.screenId==='N0'?resumeView:state.screenId})))); });
  $('#import-code').addEventListener('click', () => { try { const imported = JSON.parse(decodeURIComponent(escape(atob($('#progress-code').value.trim())))); if (!validateProgress(imported)) throw new Error('invalid state'); localStorage.setItem(STORAGE_KEY, JSON.stringify(imported)); state = loadState(); resumeView = state.screenId; $('#activity-menu').hidden = true; $('#menu-button').setAttribute('aria-expanded','false'); persist(true); render(); } catch (error) { $('#progress-code').value = '코드를 읽지 못했습니다.'; } });
  window.addEventListener('beforeunload', () => persist(true));
  window.addEventListener('pagehide', () => persist(true));
  document.addEventListener('visibilitychange', () => { if(document.visibilityState==='hidden') persist(true); });
  render();
});

window.SCREEN_ORDER = SCREEN_ORDER;
window.giftedNoisy = { getState: () => state, reset: () => { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(LOG_KEY); state = initialState(); resumeView = 'N0'; render(); } };
