/* 「퍼셉트론, 직선으로 판단하다」 한 화면 배치 측정(02_화면배치_검토).
   브라우저 콘솔에서: eval(await (await fetch('/tests/perceptron-layout.js')).text()); await perceptronLayout.run()
   결과: 보기마다 내용 맨 아래가 하단 바 위로 넘치는 px(0 이하면 한 화면에 들어옴). before = 처음, after = 활동을 끝낸 상태.
   측정이 끝나면 저장 기록을 지운다. */
window.perceptronLayout = (() => {
  const long = '두 점의 합이 같은데 출력이 다르기 때문에 기준 하나로는 나눌 수 없다고 생각합니다.';
  function fill() {
    const S = state.screens;
    state.student = { school: '시험', sid: '1', name: '가' }; state.includeOptional = true;
    S.P1.tables = { AND: [0, 0, 0, 1], OR: [0, 1, 1, 1], NOT: [1, 0], XOR: [0, 1, 1, 0] };
    Object.assign(S.P2, { inputs: 3, tokens: '( A AND NOT B ) OR C'.split(' '), exprTokens: '( A AND NOT B ) OR C'.split(' '), exprOk: true, match: 'yes', view: 'table',
      gates: [{ id: 'G1', type: 'NOT', inputs: ['B', ''] }, { id: 'G2', type: 'AND', inputs: ['A', 'G1'] }, { id: 'G3', type: 'OR', inputs: ['G2', 'C'] }], output: 'G3', checked: true, circuitOk: true, diffRows: [] });
    Object.assign(state.writes, { P2_device: '화분 자동 물주기', P2_inA: '흙이 말랐다', P2_inB: '밤이다', P2_inC: '버튼을 눌렀다' });
    S.P3.table = [0, 1, 1, 0]; Object.assign(S.P4, { sel: 17, guess: '141', tried: true }); S.P5.step = 4; state.predicts.P5 = { confirmed: { value: { AND: 'yes', OR: 'yes', XOR: 'unsure' } } };
    S.P6.and = { marks: [0, 0, 0, 1], line: { p: [0.2, 1.3], q: [1.3, 0.2] } }; S.P6.or = { marks: [0, 1, 1, 1], line: { p: [-0.3, 0.7], q: [0.7, -0.3] } };
    S.P7.history = [{ p: [0.2, 1.3], q: [1.3, 0.2] }, { p: [0.5, -0.4], q: [0.5, 1.4] }, { p: [-0.4, 0.5], q: [1.4, 0.5] }, { p: [-0.3, 0.7], q: [0.7, -0.3] }];
    S.P7.line = S.P7.history[3]; S.P7.parts = [7, 3, 5, 1]; S.P8.choice = 'no';
    Object.assign(S.P9, { black: [1, 2], white: [0, 3], x: '0.5', y: '0.5', ok: true, tried: true, explain: 3 }); S.P10.step = 2;
    Object.assign(S.P11, { line: { p: [1.25, 0.5], q: [0.4, 1.3] }, ok: true, cut: true, open: true, count: '2', countOk: true });
    state.predicts.P12 = { confirmed: { value: '둘 다 두 단계로 판단한다.' } };
    Object.assign(S.P15, { sel: 3, guess: 1, rows: { 0: { guess: 0 }, 1: { guess: 0 }, 2: { guess: 0 }, 3: { guess: 1 } }, right: [3], same: 'same' });
    state.predicts.P16 = { confirmed: { value: '0.5' } }; Object.assign(S.P16, { c10: 5, found: [3, 5], rangeChoice: 'a' });
    Object.assign(S.P18, { picked: [1, 2], pickOk: true, same: 'same', blank1: 'OR', blank2: 'AND', band: [0, 1, 1, 0], xor: [0, 1, 1, 0], tableOk: true });
    S.P21.links = { 0: 0, 1: 0, 2: 1, 3: 2, 4: 3 };
    ['P2_sentence', 'P8_reason', 'P12_answer', 'P16_sentence', 'P17_reason', 'P19_line', 'P20_reflect', 'P21_sentence'].forEach((k) => { state.writes[k] = long; });
  }
  function measure() {
    const out = {};
    for (const s of activeScreens()) {
      navTo(s.id);
      const bar = document.querySelector('.bottom-bar').getBoundingClientRect().height;
      const b = document.querySelector('#screen-root').getBoundingClientRect().bottom + window.scrollY;
      out[s.id] = Math.round(b + 20 - (innerHeight - bar));
    }
    return out;
  }
  async function run() {
    state = initialState(); state.student = { school: '시험', sid: '1', name: '가' }; state.includeOptional = true;
    const before = measure(); fill(); const after = measure();
    const wide = activeScreens().map((s) => { navTo(s.id); return document.documentElement.scrollWidth > innerWidth + 1 ? s.id : null; }).filter(Boolean);
    state = initialState(); await new Promise((r) => setTimeout(r, 500)); localStorage.removeItem(STORAGE_KEY);
    return { vp: [innerWidth, innerHeight], before, after, overflowX: wide };
  }
  return { fill, measure, run };
})();
