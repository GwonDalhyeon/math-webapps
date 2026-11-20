/* 「퍼셉트론, 직선으로 판단하다」 계산 시험 — 제작 명세서 §9 */
const test = require('node:test');
const assert = require('node:assert/strict');
const PG = require('../gifted/perceptron/geom.js');

const T = PG.TARGETS;
let seed = 12345;
const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const randPoint = () => [PG.LO + rand() * (PG.HI - PG.LO), PG.LO + rand() * (PG.HI - PG.LO)];

test('AND·OR은 예시 직선으로 나뉘고, XOR은 무작위 직선 2만 개 중 하나도 없다', () => {
  assert.equal(PG.judgeLine(PG.lineSum(1.5), T.AND).ok, true);
  assert.equal(PG.judgeLine(PG.lineSum(0.5), T.OR).ok, true);
  assert.equal(PG.judgeLine(PG.lineSum(1.5), T.OR).ok, false);
  let xor = 0;
  for (let i = 0; i < 20000; i++) {
    const L = PG.lineThrough(randPoint(), randPoint());
    if (L && PG.judgeLine(L, T.XOR).ok) xor++;
  }
  assert.equal(xor, 0);
});

test('나눔은 7가지만 나오고 대각선 나눔(6)은 나오지 않는다', () => {
  const keys = new Set();
  for (let i = 0; i < 20000; i++) {
    const L = PG.lineThrough(randPoint(), randPoint());
    if (!L) continue;
    const s = PG.sides(L);
    if (s.includes(0)) continue;
    keys.add(PG.partKey(s));
  }
  assert.deepEqual([...keys].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 7]);
  assert.equal(PG.PART_KEYS.length, 8);
  assert.deepEqual(PG.partGroups(6), [[1, 2], [0, 3]]);
});

test('점 위 통과와 잘못된 쪽에 남은 점', () => {
  const r = PG.judgeLine(PG.lineSum(1), T.XOR);
  assert.equal(r.reason, 'onPoint');
  assert.deepEqual(r.onPoints, [1, 2]);
  /* 세로 직선 A = 0.5: 왼쪽 (0,0)○ (0,1)●, 오른쪽 (1,0)● (1,1)○ → 한 쪽마다 하나씩 어긋남 */
  const v = PG.lineThrough([0.5, -0.4], [0.5, 1.4]);
  const w = PG.judgeLine(v, T.XOR);
  assert.equal(w.ok, false);
  assert.equal(w.wrong.length, 2);
  /* A+B=1.5: (1,1)만 따로. XOR에서 어긋난 점은 (1,1) 하나가 아니라 ●쪽 기준으로 보면 (0,0) 또는 (1,1) */
  const u = PG.judgeLine(PG.lineSum(1.5), T.XOR);
  assert.equal(u.wrong.length, 1);
});

test('대칭: (0,0)↔(1,1), A+B=k → A+B=2-k, 두 번이면 제자리', () => {
  assert.deepEqual(PG.reflect([0, 0]), [1, 1]);
  assert.deepEqual(PG.reflect([0, 1]), [0, 1]);
  for (const k of [0.3, 0.7, 1.2, 1.5, 1.8]) {
    const M = PG.reflectLine(PG.lineSum(k));
    assert.ok(Math.abs(PG.parallelK(M) - (2 - k)) < 1e-9);
  }
  const L = PG.lineThrough([0.2, 1.3], [1.4, 0.9]);
  const back = PG.reflectLine(PG.reflectLine(L));
  for (const key of ['a', 'b', 'c']) assert.ok(Math.abs(back[key] - L[key]) < 1e-9);
});

test('접기 판정과 펼친 조각(나란하지 않은 직선 포함)', () => {
  assert.equal(PG.foldJudge(PG.lineSum(1.5)).ok, true);
  assert.equal(PG.foldJudge(PG.lineSum(1.0)).reason, 'onPoint');
  assert.equal(PG.foldJudge(PG.lineSum(1.8)).ok, true);
  assert.equal(PG.foldJudge(PG.lineThrough([0.5, -0.4], [0.5, 1.4])).reason, 'splitBlack');
  const cases = [PG.lineSum(1.5), PG.lineSum(1.3), PG.lineThrough([1.25, 0.5], [0.4, 1.3]), PG.lineThrough([1.5, 0.5], [0.2, 1.4])];
  for (const L of cases) {
    assert.equal(PG.foldJudge(L).ok, true);
    const u = PG.unfold(L);
    const keep = PG.area(u.upperKeep) + PG.area(u.flapKeep), cut = PG.area(u.upperCut) + PG.area(u.flapCut);
    assert.ok(Math.abs(keep + cut - 4) < 1e-9, '넓이 합 = 정사각형 넓이');
    const inKeep = (p) => PG.inside(u.upperKeep, p) || PG.inside(u.flapKeep, p);
    assert.ok(inKeep([0, 1]) && inKeep([1, 0]), '● 두 점은 남는다');
    assert.ok(!inKeep([0, 0]) && !inKeep([1, 1]), '○ 두 점은 잘려 나간다');
    assert.equal(u.cutSegments.length, 2);
    /* 잘린 자리: 첫째는 위쪽 반, 둘째는 원점 쪽 반 */
    for (const p of u.cutSegments[0]) assert.ok(p[0] + p[1] >= 1 - 1e-9);
    for (const p of u.cutSegments[1]) assert.ok(p[0] + p[1] <= 1 + 1e-9);
  }
});

test('기준 c: OR은 0≤c<1, AND는 1≤c<2, XOR은 없다', () => {
  const ok = (target) => Array.from({ length: 31 }, (_, i) => i - 5).filter((c10) => PG.matches(c10, target) === 4);
  assert.deepEqual(ok(T.OR), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(ok(T.AND), [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  assert.deepEqual(ok(T.XOR), []);
  assert.equal(PG.matches(10, T.OR), 2);
  assert.equal(PG.cOnPoint(0) && PG.cOnPoint(10) && !PG.cOnPoint(5), true);
  assert.deepEqual(PG.POINTS.map((p) => PG.bandOut(5, 15, p)), T.XOR);
  const best = Math.max(...Array.from({ length: 31 }, (_, i) => PG.matches(i - 5, T.XOR)));
  assert.equal(best, 3);
});

test('식 해석: 괄호 규칙과 진리표', () => {
  const tk = (s) => s.split(' ');
  assert.equal(PG.parseExpr(tk('A AND NOT B OR C')).error, 'mix');
  const r = PG.parseExpr(tk('( A AND NOT B ) OR C'));
  assert.ok(r.ast);
  const tab = PG.exprTable(r.ast, 3);
  assert.equal(tab.length, 8);
  assert.equal(tab.filter((v) => v).length, 5);
  assert.deepEqual(PG.exprTable(PG.parseExpr(tk('NOT ( A OR B )')).ast, 2), [1, 0, 0, 0]);
  assert.deepEqual(PG.exprTable(PG.parseExpr(tk('A AND B AND C')).ast, 3), [0, 0, 0, 0, 0, 0, 0, 1]);
  assert.equal(PG.parseExpr(tk('( A AND B')).error, 'paren');
  assert.equal(PG.parseExpr(tk('A AND')).error, 'dangling');
  assert.equal(PG.parseExpr(tk('A B')).error, 'adjacent');
  assert.equal(PG.parseExpr([]).error, 'empty');
  assert.equal(PG.parseExpr(tk('A AND B )')).error, 'paren');
  assert.equal(PG.astText(r.ast), '(A AND NOT B) OR C');
});

test('회로: XOR 회로와 판단 장치 회로, 순서 검사', () => {
  assert.deepEqual(PG.circuitTable(PG.XOR_CIRCUIT, 2), T.XOR);
  assert.deepEqual(PG.circuitTable(PG.BAND_CIRCUIT, 2), T.XOR);
  const bad = { inputs: ['A', 'B'], gates: [{ id: 'G1', type: 'AND', inputs: ['A', 'G2'] }, { id: 'G2', type: 'OR', inputs: ['A', 'B'] }], output: 'G2' };
  assert.equal(PG.circuitCheck(bad).error, 'order');
  assert.equal(PG.circuitCheck({ inputs: ['A'], gates: [{ id: 'G1', type: 'NOT', inputs: [''] }], output: 'G1' }).error, 'emptyInput');
  const mine = { inputs: ['A', 'B', 'C'], gates: [{ id: 'G1', type: 'NOT', inputs: ['B'] }, { id: 'G2', type: 'AND', inputs: ['A', 'G1'] }, { id: 'G3', type: 'OR', inputs: ['G2', 'C'] }], output: 'G3' };
  assert.deepEqual(PG.circuitTable(mine, 3), PG.exprTable(PG.parseExpr('( A AND NOT B ) OR C'.split(' ')).ast, 3));
});

test('직선 찾기: AND·OR은 멈추고 XOR은 200바퀴 동안 멈추지 않는다', () => {
  const run = (target, maxEpoch) => {
    let s = PG.learnInit();
    while (!s.done && s.epoch < maxEpoch) s = PG.learnStep(s, target).state;
    return s;
  };
  const a = run(T.AND, 50), o = run(T.OR, 50), x = run(T.XOR, 200);
  assert.equal(a.done, true);
  assert.equal(o.done, true);
  assert.equal(x.done, false);
  assert.ok(a.epoch <= 20 && o.epoch <= 20);
  for (const s of [a, o]) assert.ok(PG.learnLine(s), '멈춘 상태에 직선이 있다');
  assert.ok(PG.judgeLine(PG.learnLine(a), T.AND, 1e-9).ok);
  assert.ok(PG.judgeLine(PG.learnLine(o), T.OR, 1e-9).ok);
});

test('숫자 입력: 0.5, .5, 1/2', () => {
  assert.equal(PG.parseNumber('0.5'), 0.5);
  assert.equal(PG.parseNumber('.5'), 0.5);
  assert.equal(PG.parseNumber('1/2'), 0.5);
  assert.equal(PG.parseNumber(' 1 / 2 '), 0.5);
  assert.equal(PG.parseNumber('abc'), null);
  assert.equal(PG.parseNumber(''), null);
});
