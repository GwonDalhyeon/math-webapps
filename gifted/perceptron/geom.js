/* 「퍼셉트론, 직선으로 판단하다」 — 화면과 무관한 계산.
   제작 명세서: lesson-design/gifted/퍼셉트론직선으로판단하다_웹앱_결과물/01_제작_명세서.md §5
   브라우저에서는 window.PG, node에서는 module.exports(시험: tests/perceptron.test.cjs). */
(function (root) {
  'use strict';

  const LO = -0.5, HI = 1.5;
  /* 점 순서는 진리표 행 순서와 같다: (0,0), (0,1), (1,0), (1,1) */
  const POINTS = [[0, 0], [0, 1], [1, 0], [1, 1]];
  const TOL = 0.08;            // 그린 점의 반지름(평면 단위). 이만큼 가까우면 「점 위를 지난다」
  const EPS = 1e-9;
  const SQUARE = [[LO, LO], [HI, LO], [HI, HI], [LO, HI]];
  const UPPER = [[LO, HI], [HI, HI], [HI, LO]];     // A+B >= 1 쪽(접어도 그대로 있는 반)
  const LOWER = [[LO, LO], [HI, LO], [LO, HI]];     // A+B <= 1 쪽(접혀 넘어가는 반)

  const TARGETS = {
    AND: [0, 0, 0, 1],
    OR: [0, 1, 1, 1],
    XOR: [0, 1, 1, 0],
    NOT_A_AND_B: [0, 1, 0, 0],  // 2-1 회로(밝다 센서등): NOT A AND B
    NOT_A: [1, 1, 0, 0]         // 한 걸음 더(P23): A만 보고 뒤집기. B는 상관없음
  };

  /* ------------------------------------------------------------ 직선 */
  /* 직선은 aA + bB + c = 0, a² + b² = 1. 방향을 b > 0(같으면 a > 0)으로 맞춘다 */
  const orient = (L) => (L.b < -EPS || (Math.abs(L.b) <= EPS && L.a < 0) ? { a: -L.a, b: -L.b, c: -L.c } : L);
  function lineThrough(p, q) {
    const a = p[1] - q[1], b = q[0] - p[0], n = Math.hypot(a, b);
    if (n < 0.02) return null;
    return orient({ a: a / n, b: b / n, c: -(a * p[0] + b * p[1]) / n });
  }
  const lineSum = (k) => ({ a: Math.SQRT1_2, b: Math.SQRT1_2, c: -k * Math.SQRT1_2 });   // A + B = k
  const value = (L, p) => L.a * p[0] + L.b * p[1] + L.c;
  function sideOf(L, p, tol = EPS) { const s = value(L, p); return Math.abs(s) <= tol ? 0 : s > 0 ? 1 : -1; }
  const sides = (L, tol = TOL) => POINTS.map((p) => sideOf(L, p, tol));

  /* 네 점을 두 무리로 나눈 방법. +쪽 점의 비트 mask를 min(mask, 15 - mask)로 접어 쪽 이름을 없앤다.
     8가지: 0(한쪽에 모두), 1·2·4·7(한 점), 3·5(이웃한 두 점), 6(대각선 두 점 = XOR 모양) */
  function partKey(sideArr) {
    let mask = 0;
    sideArr.forEach((s, i) => { if (s > 0) mask |= (1 << i); });
    return Math.min(mask, 15 - mask);
  }
  const PART_KEYS = [0, 1, 2, 4, 7, 3, 5, 6];
  function partGroups(key) {
    const a = [], b = [];
    POINTS.forEach((p, i) => ((key >> i) & 1 ? a : b).push(i));
    return [a, b];          // a: key에 든 점, b: 나머지
  }

  function judgeLine(L, labels, tol = TOL) {
    if (!L) return { ok: false, reason: 'none' };
    const s = sides(L, tol);
    const onPoints = s.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
    if (onPoints.length) return { ok: false, reason: 'onPoint', onPoints, sides: s };
    const ones = s.filter((_, i) => labels[i] === 1), zeros = s.filter((_, i) => labels[i] === 0);
    const sideOne = ones.length ? ones[0] : -zeros[0];
    const ok = ones.every((v) => v === sideOne) && zeros.every((v) => v === -sideOne);
    return { ok, reason: ok ? 'ok' : 'mixed', sides: s, key: partKey(s), wrong: ok ? [] : wrongPoints(s, labels) };
  }

  /* 잘못된 쪽에 남은 점: 「+쪽이 ●, -쪽이 ○」와 그 반대 가운데 어긋난 점이 적은 쪽으로 보고, 어긋난 점을 고른다.
     어긋난 수가 같으면 ●가 더 많이 모인 쪽을 ● 쪽으로 본다 */
  function wrongPoints(s, labels) {
    const miss = (plusLabel) => s.map((v, i) => (labels[i] !== (v > 0 ? plusLabel : 1 - plusLabel) ? i : -1)).filter((i) => i >= 0);
    const m1 = miss(1), m0 = miss(0);
    if (m1.length !== m0.length) return m1.length < m0.length ? m1 : m0;
    const blackPlus = s.filter((v, i) => v > 0 && labels[i] === 1).length;
    const blackMinus = s.filter((v, i) => v < 0 && labels[i] === 1).length;
    return blackPlus >= blackMinus ? m1 : m0;
  }

  /* ------------------------------------------------------------ 다각형 */
  function clip(poly, L, sign) {
    const out = [];
    poly.forEach((p, i) => {
      const q = poly[(i + 1) % poly.length];
      const sp = sign * value(L, p), sq = sign * value(L, q);
      if (sp >= -1e-12) out.push(p);
      if ((sp > 1e-12 && sq < -1e-12) || (sp < -1e-12 && sq > 1e-12)) {
        const t = sp / (sp - sq);
        out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    });
    return out;
  }
  function area(poly) {
    let s = 0;
    poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length]; s += p[0] * q[1] - q[0] * p[1]; });
    return Math.abs(s) / 2;
  }
  function inside(poly, p) {      // 볼록 다각형 안(경계 포함)
    if (poly.length < 3) return false;
    let sign = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const cr = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
      if (Math.abs(cr) < 1e-12) continue;
      if (!sign) sign = Math.sign(cr); else if (Math.sign(cr) !== sign) return false;
    }
    return true;
  }
  /* 직선이 그림 범위 안에서 지나는 두 끝 */
  function segmentIn(L, poly = SQUARE) {
    const d = [L.b, -L.a], o = [-L.a * L.c, -L.b * L.c];
    let t0 = -Infinity, t1 = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      /* 변 a→b의 안쪽(볼록 다각형, 반시계 여부와 무관하게 무게중심 쪽) */
      const n = [-(b[1] - a[1]), b[0] - a[0]];
      const cen = poly.reduce((s, p) => [s[0] + p[0] / poly.length, s[1] + p[1] / poly.length], [0, 0]);
      const sgn = Math.sign(n[0] * (cen[0] - a[0]) + n[1] * (cen[1] - a[1])) || 1;
      const num = sgn * (n[0] * (o[0] - a[0]) + n[1] * (o[1] - a[1]));
      const den = sgn * (n[0] * d[0] + n[1] * d[1]);
      if (Math.abs(den) < 1e-12) { if (num < 0) return null; continue; }
      const t = -num / den;
      if (den > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
    }
    if (!(t0 < t1 - 1e-9)) return null;
    return [[o[0] + d[0] * t0, o[1] + d[1] * t0], [o[0] + d[0] * t1, o[1] + d[1] * t1]];
  }

  /* ------------------------------------------------------------ 접기 (직선 A+B=1) */
  const reflect = (p) => [1 - p[1], 1 - p[0]];
  const reflectLine = (L) => orient({ a: -L.b, b: -L.a, c: L.a + L.b + L.c });
  /* 다 접은 그림: ● (0,1)·(1,0)은 접힌 선 위, ○ (0,0)은 (1,1)에 겹친다 */
  function foldJudge(L, tol = TOL) {
    if (!L) return { ok: false, reason: 'none' };
    const s1 = sideOf(L, [0, 1], tol), s2 = sideOf(L, [1, 0], tol), s3 = sideOf(L, [1, 1], tol);
    if (!s1 || !s2 || !s3) return { ok: false, reason: 'onPoint', onPoints: [[0, 1], [1, 0], [1, 1]].filter((p, i) => ![s1, s2, s3][i]) };
    if (s1 !== s2) return { ok: false, reason: 'splitBlack' };
    if (s3 === s1) return { ok: false, reason: 'sameSide' };
    return { ok: true, reason: 'ok' };
  }
  /* 접은 채 L을 따라 두 겹을 함께 자르고 펼친 모습. 남는 종이 = (위쪽 반 ∩ L의 ● 쪽) ∪ (원점 쪽 반 ∩ 옮긴 직선의 ● 쪽).
     두 반평면의 교집합으로 계산하면 나란하지 않은 직선(V 모양)에서 틀리므로 반쪽마다 따로 자른다 */
  function unfold(L) {
    const M = reflectLine(L);
    const su = sideOf(L, [0, 1]), sf = sideOf(M, [0, 1]);
    const upperKeep = clip(UPPER, L, su), upperCut = clip(UPPER, L, -su);
    const flapKeep = clip(LOWER, M, sf), flapCut = clip(LOWER, M, -sf);
    const cutSegments = [segmentIn(L, UPPER), segmentIn(M, LOWER)].filter(Boolean);
    return { upperKeep, upperCut, flapKeep, flapCut, cutSegments, mirror: M };
  }
  /* 직선이 A+B=k 꼴(접는 선과 나란함)이면 k */
  function parallelK(L) {
    if (!L || Math.abs(L.a - L.b) > 1e-6) return null;
    return -L.c / L.a;
  }
  /* 원점 쪽 반의 점을 접는 선 둘레로 t(라디안)만큼 넘긴 위치를 위에서 본 것 */
  function foldAt(p, t) {
    if (p[0] + p[1] >= 1 - 1e-12) return p;
    const fa = (p[0] - p[1] + 1) / 2, fb = (p[1] - p[0] + 1) / 2;
    const c = Math.cos(t);
    return [fa + (p[0] - fa) * c, fb + (p[1] - fb) * c];
  }

  /* ------------------------------------------------------------ 기준 c (10배 정수로 다룬다) */
  const thresholdOut = (c10, p) => (10 * (p[0] + p[1]) > c10 ? 1 : 0);
  const outputs = (c10) => POINTS.map((p) => thresholdOut(c10, p));
  const matches = (c10, target) => outputs(c10).filter((v, i) => v === target[i]).length;
  const cOnPoint = (c10) => c10 === 0 || c10 === 10 || c10 === 20;
  /* 두 칸막이: A+B > lo 이고, A+B > hi 는 아니다 */
  const bandOut = (lo10, hi10, p) => (thresholdOut(lo10, p) === 1 && thresholdOut(hi10, p) === 0 ? 1 : 0);

  /* ------------------------------------------------------------ 가중치 (10배 정수) */
  const weightOut = (w1, w2, t, p) => (w1 * p[0] + w2 * p[1] > t ? 1 : 0);   // 모두 정수(10배)
  function weightLine(w1, w2, t) {     // w1 A + w2 B = t (10배 정수) → 직선
    const n = Math.hypot(w1, w2);
    if (n === 0) return null;
    return orient({ a: w1 / n, b: w2 / n, c: -t / n });
  }

  /* ------------------------------------------------------------ 식 해석 */
  const VARS = ['A', 'B', 'C'];
  function parseExpr(tokens) {
    if (!tokens || !tokens.length) return { error: 'empty' };
    let i = 0;
    const peek = () => tokens[i];
    function parseTerm() {
      const t = peek();
      if (t === undefined) throw { code: 'dangling' };
      if (t === 'NOT') { i++; return { op: 'NOT', arg: parseTerm() }; }
      if (VARS.includes(t)) { i++; return { v: t }; }
      if (t === '(') {
        i++;
        const e = parseSeq();
        if (peek() !== ')') throw { code: 'paren' };
        i++;
        return e;
      }
      if (t === ')') throw { code: 'paren' };
      throw { code: 'dangling' };
    }
    function parseSeq() {
      let left = parseTerm();
      let opSeen = null;
      while (peek() === 'AND' || peek() === 'OR') {
        const op = tokens[i++];
        if (opSeen && opSeen !== op) throw { code: 'mix' };
        opSeen = op;
        if (peek() === undefined || peek() === ')') throw { code: 'dangling' };
        left = { op, l: left, r: parseTerm() };
      }
      const t = peek();
      if (t !== undefined && t !== ')') throw { code: VARS.includes(t) || t === '(' || t === 'NOT' ? 'adjacent' : 'dangling' };
      return left;
    }
    try {
      const ast = parseSeq();
      if (i < tokens.length) return { error: tokens[i] === ')' ? 'paren' : 'adjacent' };
      return { ast };
    } catch (e) {
      if (e && e.code) return { error: e.code };
      throw e;
    }
  }
  function evalAst(ast, env) {
    if (ast.v) return env[ast.v];
    if (ast.op === 'NOT') return 1 - evalAst(ast.arg, env);
    const l = evalAst(ast.l, env), r = evalAst(ast.r, env);
    return ast.op === 'AND' ? (l & r) : (l | r);
  }
  function usedVars(ast, set = new Set()) {
    if (!ast) return set;
    if (ast.v) set.add(ast.v);
    if (ast.arg) usedVars(ast.arg, set);
    if (ast.l) { usedVars(ast.l, set); usedVars(ast.r, set); }
    return set;
  }
  function rows(n) {
    const out = [];
    for (let m = 0; m < (1 << n); m++) out.push(Array.from({ length: n }, (_, k) => (m >> (n - 1 - k)) & 1));
    return out;
  }
  function envOf(vals) { const env = {}; vals.forEach((v, k) => { env[VARS[k]] = v; }); return env; }
  function exprTable(ast, n) { return rows(n).map((vals) => evalAst(ast, envOf(vals))); }
  function astText(ast, top = true) {
    if (ast.v) return ast.v;
    if (ast.op === 'NOT') return 'NOT ' + astText(ast.arg, false);
    const s = astText(ast.l, false) + ' ' + ast.op + ' ' + astText(ast.r, false);
    return top ? s : '(' + s + ')';
  }

  /* ------------------------------------------------------------ 회로 */
  /* circuit = { inputs: ['A','B'], gates: [{id:'G1', type:'AND'|'OR'|'NOT'|'TH', inputs:['A','G1'], c10?}], output: 'G2' }
     게이트는 앞선 게이트만 입력으로 받는다(순환 없음). TH는 판단 장치 A+B > c (입력 둘) */
  function circuitCheck(circuit) {
    if (!circuit || !circuit.gates) return { error: 'empty' };
    const known = new Set(circuit.inputs);
    for (const g of circuit.gates) {
      const need = g.type === 'NOT' ? 1 : 2;
      if (!g.inputs || g.inputs.length < need || g.inputs.slice(0, need).some((x) => !x)) return { error: 'emptyInput', gate: g.id };
      if (g.inputs.slice(0, need).some((x) => !known.has(x))) return { error: 'order', gate: g.id };
      known.add(g.id);
    }
    if (!circuit.output) return { error: 'noOutput' };
    if (!known.has(circuit.output)) return { error: 'noOutput' };
    return { ok: true };
  }
  function circuitValues(circuit, env) {
    const val = { ...env };
    for (const g of circuit.gates) {
      const x = val[g.inputs[0]], y = val[g.inputs[1]];
      if (g.type === 'NOT') val[g.id] = 1 - x;
      else if (g.type === 'AND') val[g.id] = x & y;
      else if (g.type === 'OR') val[g.id] = x | y;
      else if (g.type === 'TH') val[g.id] = 10 * (x + y) > g.c10 ? 1 : 0;
    }
    val.OUT = val[circuit.output];
    return val;
  }
  function circuitTable(circuit, n) {
    const chk = circuitCheck(circuit);
    if (chk.error) return null;
    return rows(n).map((vals) => circuitValues(circuit, envOf(vals)).OUT);
  }
  const XOR_CIRCUIT = {
    inputs: ['A', 'B'],
    gates: [
      { id: 'G1', type: 'OR', inputs: ['A', 'B'] },
      { id: 'G2', type: 'AND', inputs: ['A', 'B'] },
      { id: 'G3', type: 'NOT', inputs: ['G2'] },
      { id: 'G4', type: 'AND', inputs: ['G1', 'G3'] }
    ],
    output: 'G4'
  };
  const BAND_CIRCUIT = {
    inputs: ['A', 'B'],
    gates: [
      { id: 'T1', type: 'TH', c10: 5, inputs: ['A', 'B'] },
      { id: 'T2', type: 'TH', c10: 15, inputs: ['A', 'B'] },
      { id: 'G3', type: 'NOT', inputs: ['T2'] },
      { id: 'G4', type: 'AND', inputs: ['T1', 'G3'] }
    ],
    output: 'G4'
  };

  /* ------------------------------------------------------------ 내 장치 설계: 상황 카드 (03 §3-3) */
  /* 조건마다 내부 id가 있고, 목표 판단 fn은 조건 id로 정한다. 학생이 A·B·C에 놓는 순서와 무관하다 */
  const SCENARIOS = [
    { id: 'door', name: '자동문', goal: '사람이 지나갈 때만 문을 열어 준다', out1: '문을 연다', out0: '문을 닫아 둔다',
      sentence: '앞이나 뒤에 사람이 있으면 문을 연다. 단, 잠금 모드이면 열지 않는다.',
      conds: [{ id: 'front', yes: '앞에 사람이 있다', no: '앞에 사람이 없다' }, { id: 'back', yes: '뒤에 사람이 있다', no: '뒤에 사람이 없다' },
        { id: 'lock', yes: '잠금 모드다', no: '잠금 모드가 아니다' }, { id: 'dark', yes: '밖이 어둡다', no: '밖이 어둡지 않다', extra: true }],
      fn: (v) => (v.front | v.back) & (1 - v.lock) },
    { id: 'plant', name: '화분 물주기', goal: '화분에 필요할 때만 물을 준다', out1: '물을 준다', out0: '물을 주지 않는다',
      sentence: '흙이 말랐고 물통에 물이 있으면 물을 준다. 단, 비가 오면 주지 않는다.',
      conds: [{ id: 'dry', yes: '흙이 말랐다', no: '흙이 마르지 않았다' }, { id: 'rain', yes: '비가 온다', no: '비가 오지 않는다' },
        { id: 'tank', yes: '물통에 물이 있다', no: '물통에 물이 없다' }, { id: 'window', yes: '화분이 창가에 있다', no: '화분이 창가에 있지 않다', extra: true }],
      fn: (v) => v.dry & (1 - v.rain) & v.tank },
    { id: 'light', name: '현관 조명', goal: '필요할 때 현관을 밝혀 준다', out1: '불을 켠다', out0: '불을 끈다',
      sentence: '어둡고 사람이 움직이면 불을 켠다. 또, 수동 스위치를 켜면 언제나 불을 켠다.',
      conds: [{ id: 'move', yes: '사람이 움직인다', no: '사람이 움직이지 않는다' }, { id: 'dark', yes: '주변이 어둡다', no: '주변이 어둡지 않다' },
        { id: 'manual', yes: '수동 스위치가 켜져 있다', no: '수동 스위치가 꺼져 있다' }, { id: 'door', yes: '문이 열려 있다', no: '문이 닫혀 있다', extra: true }],
      fn: (v) => (v.move & v.dark) | v.manual }
  ];
  const scenarioById = (id) => SCENARIOS.find((s) => s.id === id) || null;
  const neededConds = (sc) => sc.conds.filter((c) => !c.extra).map((c) => c.id);
  /* 고른 조건이 맞는가: 필요한 조건을 모두, 필요 없는 조건 없이(순서 자유) */
  function assignOk(sc, assign) {
    const need = neededConds(sc), got = (assign || []).filter(Boolean);
    return got.length === need.length && need.every((id) => got.includes(id));
  }
  /* assign: A·B·C 순서의 조건 id. 진리표 행 순서는 exprTable과 같다(이진수 순서) */
  function scenarioTable(sc, assign) {
    return rows(assign.length).map((vals) => { const env = {}; assign.forEach((id, k) => { env[id] = vals[k]; }); return sc.fn(env); });
  }

  /* ------------------------------------------------------------ 블록 회로판 → 회로 (03 §3-3) */
  /* board = { blocks: [{id, type, x, y}], wires: [{from, to, port}] }. from: 입력 이름(A·B·C) 또는 블록 id, to: 블록 id 또는 'OUT' */
  const portsOf = (type) => (type === 'NOT' ? 1 : 2);
  /* from에서 나가는 선을 to에 이으면 순환이 생기는가(to에서 출발해 from에 닿으면 순환) */
  function wouldCycle(board, from, to) {
    if (from === to) return true;
    const seen = new Set(), stack = [to];
    while (stack.length) {
      const x = stack.pop();
      if (x === from) return true;
      if (seen.has(x)) continue;
      seen.add(x);
      board.wires.forEach((w) => { if (w.from === x) stack.push(w.to); });
    }
    return false;
  }
  function boardCircuit(board, inputs) {
    const blocks = board.blocks || [], wires = board.wires || [];
    if (!blocks.length) return { error: 'empty' };
    const src = (id, port) => { const w = wires.find((x) => x.to === id && x.port === port); return w ? w.from : ''; };
    const outW = wires.find((w) => w.to === 'OUT');
    const gatesById = {};
    blocks.forEach((b) => { gatesById[b.id] = { id: b.id, type: b.type, inputs: Array.from({ length: portsOf(b.type) }, (_, k) => src(b.id, k)) }; });
    for (const g of Object.values(gatesById)) if (g.inputs.some((x) => !x)) return { error: 'emptyInput', gate: g.id };
    if (!outW) return { error: 'noOutput' };
    /* 앞선 것만 입력으로 받도록 순서를 정한다(위상 정렬) */
    const done = new Set(inputs), order = [];
    let guard = 0;
    while (order.length < blocks.length && guard++ < 50) {
      blocks.forEach((b) => { const g = gatesById[b.id]; if (!done.has(g.id) && g.inputs.every((x) => done.has(x))) { order.push(g); done.add(g.id); } });
    }
    if (order.length < blocks.length) return { error: 'cycle' };
    const circuit = { inputs: inputs.slice(), gates: order, output: outW.from };
    const chk = circuitCheck(circuit);
    return chk.error ? { error: chk.error } : { circuit };
  }

  /* ------------------------------------------------------------ 식 입력 커서 (03 §3-3) */
  function tokenEdit(tokens, cursor, op) {
    const t = tokens.slice();
    let c = Math.max(0, Math.min(t.length, cursor));
    if (op === 'LEFT') c = Math.max(0, c - 1);
    else if (op === 'RIGHT') c = Math.min(t.length, c + 1);
    else if (op === 'BACK') { if (c > 0) { t.splice(c - 1, 1); c -= 1; } }
    else if (op === 'CLEAR') { t.length = 0; c = 0; }
    else if (t.length < 40) { t.splice(c, 0, op); c += 1; }
    return { tokens: t, cursor: c };
  }

  /* ------------------------------------------------------------ 접기 입체로 보기 (03 §3-5) */
  /* 원점 쪽 반의 점을 접는 선 둘레로 t만큼 들어 올린 3차원 위치 [a, b, z]. 다 접으면 gap만큼 위에 놓인다 */
  function fold3(p, t, gap = 0) {
    if (p[0] + p[1] >= 1 - 1e-12) return [p[0], p[1], 0];
    const fa = (p[0] - p[1] + 1) / 2, fb = (p[1] - p[0] + 1) / 2;
    const d = Math.hypot(p[0] - fa, p[1] - fb), c = Math.cos(t);
    return [fa + (p[0] - fa) * c, fb + (p[1] - fb) * c, d * Math.sin(t) + gap * (1 - c) / 2];
  }
  /* 보는 방향: yaw(종이 면 안에서 돌리기), pitch(앞으로 기울이기, 0이면 위에서 본 모습). 중심 (0.5, 0.5, 0).
     돌려 준 값 [x, y, depth]는 평면 단위이고 x, y는 위에서 볼 때 (a, b)와 같다. depth가 클수록 보는 사람 쪽 */
  function view3(P, yaw, pitch) {
    const x = P[0] - 0.5, y = P[1] - 0.5, z = P[2];
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const x1 = x * cy - y * sy, y1 = x * sy + y * cy;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    return [x1 + 0.5, y1 * cp + z * sp + 0.5, -y1 * sp + z * cp];
  }

  /* ------------------------------------------------------------ 직선 찾기(퍼셉트론 학습) — 100배 정수 */
  const LEARN_START = { w1: 30, w2: -20, t: 40 };
  const LEARN_RATE = 25;
  function learnInit() { return { ...LEARN_START, idx: 0, epoch: 0, errorsThisEpoch: 0, lastEpochErrors: null, done: false, steps: 0 }; }
  /* 한 점을 보고, 틀렸으면 직선을 옮긴다. 한 바퀴(네 점)를 틀림 없이 돌면 done */
  function learnStep(s, target) {
    const p = POINTS[s.idx];
    const y = s.w1 * p[0] + s.w2 * p[1] > s.t ? 1 : 0;
    const want = target[s.idx];
    const n = { ...s, steps: s.steps + 1 };
    let moved = false;
    if (y !== want) {
      const d = LEARN_RATE * (want - y);
      n.w1 += d * p[0]; n.w2 += d * p[1]; n.t -= d;
      n.errorsThisEpoch += 1; moved = true;
    }
    n.idx = (s.idx + 1) % 4;
    if (n.idx === 0) {
      n.epoch += 1;
      n.lastEpochErrors = n.errorsThisEpoch;
      if (n.errorsThisEpoch === 0) n.done = true;
      n.errorsThisEpoch = 0;
    }
    return { state: n, point: s.idx, output: y, want, moved };
  }
  function learnLine(s) { return weightLine(s.w1, s.w2, s.t); }

  /* ------------------------------------------------------------ 입력 해석 */
  function parseNumber(text) {
    const s = String(text || '').trim().replace(/\s+/g, '');
    if (!s) return null;
    const frac = s.match(/^(-?\d+)\/(\d+)$/);
    if (frac) { const d = Number(frac[2]); return d ? Number(frac[1]) / d : null; }
    if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
    return Number(s);
  }

  const PG = {
    LO, HI, POINTS, TOL, SQUARE, UPPER, LOWER, TARGETS, PART_KEYS,
    lineThrough, lineSum, value, sideOf, sides, partKey, partGroups, judgeLine, wrongPoints,
    clip, area, inside, segmentIn,
    reflect, reflectLine, foldJudge, unfold, parallelK, foldAt,
    thresholdOut, outputs, matches, cOnPoint, bandOut,
    weightOut, weightLine,
    parseExpr, evalAst, usedVars, rows, exprTable, astText,
    circuitCheck, circuitValues, circuitTable, XOR_CIRCUIT, BAND_CIRCUIT,
    learnInit, learnStep, learnLine, LEARN_START, LEARN_RATE,
    SCENARIOS, scenarioById, neededConds, assignOk, scenarioTable,
    portsOf, wouldCycle, boardCircuit, tokenEdit, fold3, view3,
    parseNumber
  };
  if (typeof module === 'object' && module.exports) module.exports = PG;
  if (root) root.PG = PG;
})(typeof window !== 'undefined' ? window : null);
