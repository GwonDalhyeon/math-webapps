/* 회로 부품 — 세션 A. 명세서 §7-0~§7-4, 규약 §7-7, 완료 기준 §12-4.
   마크업: lc-switch, lc-read(data-id, data-fix, data-mode), data-live, data-expr-step, lc-board, lc-battle, lc-pick, lc-check, rowmark.
   스타일은 css/circuit.css, 저장 키는 gifted26_slides04_lc_…, 계산 부분은 window.LC로 내놓는다(node 시험: tools/test_circuit.cjs).

   1. 계산(LC): logic-circuit 앱(math-webapps/gifted/logic-circuit)의 회로 모델·위상정렬 평가·순환 검사·식 유도를 옮겼다.
      식 유도는 학습지 표기로 고쳤다: NOT이 문자에 걸리고 다른 게이트의 입력이면 (NOT A), 식에 걸리면 NOT (A AND B).
   2. 그리기: SVG(viewBox). 선은 가로·세로로 꺾고, 게이트는 영어 이름이 적힌 둥근 상자. 색은 css/circuit.css의 클래스로만 준다.
   3. 부품: 읽기용 회로(학습지 좌표 그대로) → 회로판 → 대결판 → 두 회로 비교·확인표·행 표시. */
(function () {
  'use strict';

  /* ================================================================ 1. 계산 (window.LC) */

  const GATE_FN = {
    NOT: (v) => (v[0] === 1 ? 0 : 1),
    AND: (v) => (v[0] === 1 && v[1] === 1 ? 1 : 0),
    OR: (v) => (v[0] === 1 || v[1] === 1 ? 1 : 0),
  };
  const ARITY = { NOT: 1, AND: 2, OR: 2, IN: 0, OUT: 1 };

  /* 회로 모델(logic-circuit과 같다): {nodes: [{id, type, inputs}], inputs: ['A', 'B'], output: 'OUT'}
     gates: [{id, type, inputs: [출처 id 또는 null]}], out: 출력에 이은 출처 id(없으면 null) */
  function mk(inputs, gates, out) {
    return {
      nodes: inputs.map((id) => ({ id, type: 'IN', inputs: [] }))
        .concat(gates.map((g) => ({ id: g.id, type: g.type, inputs: g.inputs.slice() })))
        .concat([{ id: 'OUT', type: 'OUT', inputs: [out == null ? null : out] }]),
      inputs: inputs.slice(),
      output: 'OUT',
    };
  }

  /* 위상정렬로 값을 앞에서 뒤로 전한다. 이어지지 않은 입력은 0으로 본다. 순환이면 오류 */
  function evaluate(c, vals) {
    const by = {}, indeg = {}, deps = {};
    c.nodes.forEach((n) => { by[n.id] = n; deps[n.id] = []; });
    c.nodes.forEach((n) => {
      indeg[n.id] = n.inputs.filter((x) => x != null).length;
      n.inputs.forEach((s) => { if (s != null) deps[s].push(n.id); });
    });
    const ready = c.nodes.filter((n) => indeg[n.id] === 0).map((n) => n.id);
    const v = {};
    let done = 0;
    while (ready.length) {
      const n = by[ready.pop()];
      if (n.type === 'IN') v[n.id] = vals && vals[n.id] != null ? vals[n.id] : 0;
      else if (n.type === 'OUT') v[n.id] = n.inputs[0] != null ? v[n.inputs[0]] : 0;
      else v[n.id] = GATE_FN[n.type](n.inputs.map((x) => (x != null ? v[x] : 0)));
      done++;
      deps[n.id].forEach((d) => { if (--indeg[d] === 0) ready.push(d); });
    }
    if (done !== c.nodes.length) throw new Error('circuit has a cycle');
    return v;
  }

  /* 화면의 값 보기: 미연결 입력에서 나온 값은 0으로 확정하지 않는다.
     완성된 회로의 계산은 evaluate와 같고, 미정 선은 null로 남긴다. */
  function evaluateKnown(c, vals) {
    const by = Object.fromEntries(c.nodes.map((n) => [n.id, n])), memo = {}, active = new Set();
    const get = (id) => {
      if (id == null || !by[id]) return null;
      if (Object.prototype.hasOwnProperty.call(memo, id)) return memo[id];
      if (active.has(id)) throw new Error('circuit has a cycle');
      const n = by[id];
      if (n.type === 'IN') return (memo[id] = vals && vals[id] === 1 ? 1 : 0);
      active.add(id);
      const ins = n.inputs.map(get);
      const v = ins.length !== ARITY[n.type] || ins.some((x) => x == null) ? null
        : n.type === 'OUT' ? ins[0] : GATE_FN[n.type](ins);
      active.delete(id);
      return (memo[id] = v);
    };
    c.nodes.forEach((n) => get(n.id));
    return memo;
  }

  /* 진리표: 입력이 k개면 2^k행, (0,…,0)부터 이진수 순서. 행마다 모든 선의 값(vals)을 함께 준다 */
  function truthTable(c) {
    const k = c.inputs.length, rows = [];
    for (let i = 0; i < 1 << k; i++) {
      const bits = c.inputs.map((_, j) => (i >> (k - 1 - j)) & 1);
      const sw = {};
      c.inputs.forEach((id, j) => { sw[id] = bits[j]; });
      const vals = evaluate(c, sw);
      rows.push({ bits, out: vals[c.output], vals });
    }
    return rows;
  }
  /* 한 선(기본은 출력)의 값을 진리표 순서로 이은 글자. 예: AND → '0001' */
  const column = (c, id) => truthTable(c).map((r) => r.vals[id == null ? c.output : id]).join('');

  /* edge.from의 출력을 edge.to의 입력에 이으면 순환이 생기는가(from이 이미 to에 기대고 있는가) */
  function wouldCreateCycle(c, edge) {
    const by = {}, seen = {};
    c.nodes.forEach((n) => { by[n.id] = n; });
    const dependsOn = (id, target) => {
      if (id === target) return true;
      if (seen[id]) return false;
      seen[id] = true;
      const n = by[id];
      return !!n && n.inputs.some((x) => x != null && dependsOn(x, target));
    };
    return dependsOn(edge.from, edge.to);
  }

  /* 게이트·출력의 입력이 모두 이어졌는가(logic-circuit의 gradeCircuit 빈 입력 검사) */
  const isComplete = (c) => c.nodes.every((n) => n.type === 'IN' || n.inputs.length === ARITY[n.type] && n.inputs.every((x) => x != null));
  const gateCount = (c) => c.nodes.filter((n) => n.type !== 'IN' && n.type !== 'OUT').length;

  /* 회로 → 식(학습지 표기). 다른 게이트의 입력이 되는 식은 괄호로 묶는다.
     NOT 문자 → 'NOT A'(입력이 되면 '(NOT A)'), NOT 식 → 'NOT (A AND B)'(입력이 되어도 그대로). 빈 입력은 '?' */
  function deriveExpr(c) {
    const by = {};
    c.nodes.forEach((n) => { by[n.id] = n; });
    const go = (id, sub, path) => {
      const n = id == null ? null : by[id];
      if (!n || path.includes(id)) return '?';
      const p = path.concat(id);
      if (n.type === 'IN') return n.id;
      if (n.type === 'OUT') return go(n.inputs[0], false, p);
      if (n.type === 'NOT') {
        const x = n.inputs[0] == null ? null : by[n.inputs[0]];
        if (!x || x.type === 'IN') { const s = 'NOT ' + go(n.inputs[0], true, p); return sub ? `(${s})` : s; }
        return `NOT (${go(n.inputs[0], false, p)})`;
      }
      const s = `${go(n.inputs[0], true, p)} ${n.type} ${go(n.inputs[1], true, p)}`;
      return sub ? `(${s})` : s;
    };
    return go(c.output, false, []);
  }

  /* 식 → 구문 나무 → 진리표 (회로와 따로 계산해 대조하는 데 쓴다). NOT은 바로 뒤의 문자·괄호에 걸린다 */
  function parseExpr(str) {
    const t = str.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').trim().split(/\s+/).filter(Boolean);
    let i = 0;
    const bin = () => {
      let l = unary();
      while (t[i] === 'AND' || t[i] === 'OR' || t[i] === 'XOR') { const op = t[i++]; l = { op, l, r: unary() }; }
      return l;
    };
    const unary = () => (t[i] === 'NOT' ? (i++, { op: 'NOT', x: unary() }) : prim());
    const prim = () => {
      const s = t[i++];
      if (s === '(') { const e = bin(); if (t[i++] !== ')') throw new Error('parse: )'); return e; }
      if (!/^[A-Z]$/.test(s || '')) throw new Error('parse: ' + s);
      return { op: 'VAR', name: s };
    };
    const e = bin();
    if (i !== t.length) throw new Error('parse: 남은 글자');
    return e;
  }
  function evalExpr(e, env) {
    switch (e.op) {
      case 'VAR': return env[e.name];
      case 'NOT': return 1 - evalExpr(e.x, env);
      case 'AND': return evalExpr(e.l, env) & evalExpr(e.r, env);
      case 'OR': return evalExpr(e.l, env) | evalExpr(e.r, env);
      case 'XOR': return evalExpr(e.l, env) ^ evalExpr(e.r, env);
    }
    throw new Error('bad expr');
  }
  function exprColumn(str, inputs) {
    const e = parseExpr(str), k = inputs.length;
    let s = '';
    for (let i = 0; i < 1 << k; i++) {
      const env = {};
      inputs.forEach((id, j) => { env[id] = (i >> (k - 1 - j)) & 1; });
      s += evalExpr(e, env);
    }
    return s;
  }

  /* 층 배치(logic-circuit의 CIRCUIT.layout을 그림용으로 고침): 층 = 입력에서 가장 먼 거리, 줄 = 출처 높이의 평균.
     o: {inY(i, n), gx0, gx1(게이트 칸 범위), y0, y1, gap(같은 층 게이트 사이 최소 간격), outX}. 결과: id → {x, y} */
  function arrange(st, o) {
    const g = {}, layer = {};
    st.gates.forEach((x) => { g[x.id] = x; });
    const lay = (id, path) => {
      if (layer[id] != null) return layer[id];
      if (!g[id] || path.includes(id)) return 0;
      const ins = g[id].inputs.filter((x) => x != null);
      return (layer[id] = 1 + (ins.length ? Math.max(...ins.map((x) => lay(x, path.concat(id)))) : 0));
    };
    st.gates.forEach((x) => lay(x.id, []));
    const L = Math.max(0, ...Object.values(layer));
    const pos = {}, mid = (o.y0 + o.y1) / 2;
    st.inputs.forEach((id, i) => { pos[id] = { x: 0, y: o.inY(i, st.inputs.length) }; });
    for (let k = 1; k <= L; k++) {
      const x = o.gx0 + (k - 0.5) * (o.gx1 - o.gx0) / L;
      const ids = st.gates.filter((q) => layer[q.id] === k).map((q) => {
        const ys = q.inputs.filter((s) => s != null && pos[s]).map((s) => pos[s].y);
        return { id: q.id, y: ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : mid };
      }).sort((a, b) => a.y - b.y);
      for (let i = 1; i < ids.length; i++) ids[i].y = Math.max(ids[i].y, ids[i - 1].y + o.gap);
      const over = ids.length ? ids[ids.length - 1].y - o.y1 : 0;
      if (over > 0) ids.forEach((q) => { q.y -= over; });
      for (let i = 0; i < ids.length; i++) ids[i].y = Math.max(ids[i].y, i ? ids[i - 1].y + o.gap : o.y0);
      ids.forEach((q) => { pos[q.id] = { x, y: q.y }; });
    }
    pos.OUT = { x: o.outX, y: st.out != null && pos[st.out] ? pos[st.out].y : mid };
    return { pos, L };
  }

  /* 회로판 상태: {inputs, allowed, max, gates: [{id, type, inputs, x, y}], out, vals, seq}. 순수 함수만 둔다(시험 대상) */
  const Board = {
    create(o) {
      return { inputs: o.inputs.slice(), allowed: o.allowed.slice(), max: o.max == null ? null : o.max, gates: [], out: null, vals: {}, seq: 0 };
    },
    circuit: (s) => mk(s.inputs, s.gates, s.out),
    count: (s) => s.gates.length,
    gate: (s, id) => s.gates.find((g) => g.id === id) || null,
    canAdd: (s, type) => s.allowed.includes(type) && ARITY[type] != null && (s.max == null || s.gates.length < s.max),
    add(s, type, x, y) {
      if (!Board.canAdd(s, type)) return null;
      const id = 'g' + ++s.seq;
      s.gates.push({ id, type, inputs: new Array(ARITY[type]).fill(null), x: x || 0, y: y || 0 });
      return id;
    },
    /* from의 출력 → to의 입력(port). to가 'OUT'이면 출력 전구. 결과: 'ok' | 'cycle' | 'invalid' */
    connect(s, from, to, port) {
      const src = s.inputs.includes(from) || Board.gate(s, from);
      const dst = to === 'OUT' ? 'OUT' : Board.gate(s, to);
      if (!src || !dst) return 'invalid';
      if (dst !== 'OUT' && !(port >= 0 && port < dst.inputs.length)) return 'invalid';
      if (from === to) return 'cycle';
      if (dst !== 'OUT' && wouldCreateCycle(Board.circuit(s), { from, to })) return 'cycle';
      if (dst === 'OUT') s.out = from; else dst.inputs[port] = from;
      return 'ok';
    },
    disconnect(s, to, port) {
      if (to === 'OUT') { s.out = null; return; }
      const g = Board.gate(s, to);
      if (g && g.inputs[port] !== undefined) g.inputs[port] = null;
    },
    remove(s, id) {
      s.gates = s.gates.filter((g) => g.id !== id);
      s.gates.forEach((g) => { g.inputs = g.inputs.map((x) => (x === id ? null : x)); });
      if (s.out === id) s.out = null;
    },
    toggle(s, id) { s.vals[id] = s.vals[id] ? 0 : 1; },
    isEmpty: (s) => !s || s.gates.length === 0 && s.out == null,
    /* 저장해 둔 상태를 읽을 때: 모양이 맞지 않거나 순환이 있으면 버린다 */
    clean(s, o) {
      try {
        if (!s || !Array.isArray(s.gates) || !Array.isArray(s.inputs) || s.inputs.join() !== o.inputs.join()) return null;
        const ids = new Set(s.inputs);
        const gates = s.gates.filter((g) => g && ARITY[g.type] && g.type !== 'IN' && g.type !== 'OUT' && /^g\d+$/.test(g.id) && !ids.has(g.id) && ids.add(g.id))
          .map((g) => ({ id: g.id, type: g.type, inputs: new Array(ARITY[g.type]).fill(null).map((_, i) => (Array.isArray(g.inputs) && ids.has(g.inputs[i]) ? g.inputs[i] : null)), x: +g.x || 0, y: +g.y || 0 }));
        gates.forEach((g) => { g.inputs = g.inputs.map((x) => (ids.has(x) ? x : null)); });
        const r = Object.assign(Board.create(o), { gates, out: ids.has(s.out) ? s.out : null, teacher: !!s.teacher });
        s.inputs.forEach((k) => { r.vals[k] = s.vals && s.vals[k] ? 1 : 0; });
        r.seq = Math.max(0, ...gates.map((g) => +g.id.slice(1)));
        evaluate(Board.circuit(r), r.vals);   // 순환이면 여기서 오류 → 버림
        return r;
      } catch (e) { return null; }
    },
  };

  /* 학습지 읽기용 회로의 연결(그림 좌표는 아래 READ_FIG). 1-2의 직렬·병렬은 스위치 회로라 AND·OR 게이트 하나로 본다 */
  const READ_CIRCUITS = {
    series: { inputs: ['A', 'B'], gates: [{ id: 'g', type: 'AND', inputs: ['A', 'B'] }], out: 'g' },
    parallel: { inputs: ['A', 'B'], gates: [{ id: 'g', type: 'OR', inputs: ['A', 'B'] }], out: 'g' },
    'q2-1': { inputs: ['A', 'B'], gates: [{ id: 'n1', type: 'NOT', inputs: ['A'] }, { id: 'g', type: 'AND', inputs: ['n1', 'B'] }], out: 'g' },
    'q2-2a': { inputs: ['A', 'B', 'C'], gates: [{ id: 'g1', type: 'AND', inputs: ['A', 'B'] }, { id: 'g2', type: 'OR', inputs: ['g1', 'C'] }], out: 'g2' },
    'q2-2b': { inputs: ['A', 'B', 'C'], gates: [{ id: 'g1', type: 'OR', inputs: ['B', 'C'] }, { id: 'g2', type: 'AND', inputs: ['A', 'g1'] }], out: 'g2' },
  };
  const readCircuit = (id) => { const r = READ_CIRCUITS[id]; return r ? mk(r.inputs, r.gates, r.out) : null; };

  /* 교사 제시 회로(명세서 §7-3): (A AND C) OR (B AND C). 회로판 좌표까지 넣은 상태 */
  function teacherBoard(o) {
    const s = Board.create(o);
    s.gates = [
      { id: 'g1', type: 'AND', inputs: ['A', 'C'], x: 250, y: 110 },
      { id: 'g2', type: 'AND', inputs: ['B', 'C'], x: 250, y: 270 },
      { id: 'g3', type: 'OR', inputs: ['g1', 'g2'], x: 420, y: 190 },
    ];
    s.out = 'g3'; s.seq = 3; s.teacher = true;
    return s;
  }

  const LC = { GATE_FN, ARITY, mk, evaluate, evaluateKnown, truthTable, column, wouldCreateCycle, isComplete, gateCount, deriveExpr, parseExpr, evalExpr, exprColumn, arrange, Board, READ_CIRCUITS, readCircuit, teacherBoard };

  if (typeof module === 'object' && module.exports) module.exports = LC;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  window.LC = LC;

  /* ================================================================ 2. SVG 조각 */

  const f1 = (n) => Math.round(n * 10) / 10;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tx = (x, y, s, size, cls, anchor) =>
    `<text x="${f1(x)}" y="${f1(y)}" font-size="${size}" text-anchor="${anchor || 'middle'}" dominant-baseline="central"${cls ? ` class="${cls}"` : ''}>${s}</text>`;
  /* 문자 A, B, C만 세리프 기울임(lc-v)으로 쓴 한 줄 */
  const rich = (str) => esc(str).split(/\b([A-C])\b/).map((p, i) => (i % 2 ? `<tspan class="lc-v">${p}</tspan>` : p)).join('');
  const richHTML = (str) => esc(str).split(/\b([A-C])\b/).map((p, i) => (i % 2 ? `<i class="lc-vi">${p}</i>` : p)).join('');
  const vcls = (v) => (v == null ? 'lc-w' : `lc-w v${v}`);
  const poly = (pts, v) => `<polyline class="${vcls(v)}" points="${pts.map((p) => p.map(f1).join(',')).join(' ')}"/>`;
  const gateBox = (x, y, name, w, h, font) =>
    `<g class="lc-g"><rect x="${f1(x - w / 2)}" y="${f1(y - h / 2)}" width="${w}" height="${h}" rx="${Math.round(h / 4)}"/>${tx(x, y + 1, name, font, 'lc-gn')}</g>`;
  const dot = (x, y, r, cls) => `<circle class="${cls || 'lc-dot'}" cx="${f1(x)}" cy="${f1(y)}" r="${r}"/>`;
  /* 선 위의 값 표시: 흰 바탕 둥근 칸에 0·1 (1은 --on, 0은 --off). fix: 고정한 입력(테두리 굵게) */
  const badge = (x, y, v, fix) =>
    `<g class="lc-bd ${v == null ? 'unknown' : `v${v}`}${fix ? ' fix' : ''}"><rect x="${f1(x - 14)}" y="${f1(y - 14)}" width="28" height="28" rx="7"/>${tx(x, y + 1, v == null ? '?' : v, 20)}</g>`;
  /* 전구(학습지 bulb: 원 + X). on이면 켜진 색과 빛살 */
  function bulb(x, y, r, on) {
    const d = r * 0.7071;
    let s = `<g class="lc-bulb${on === 1 ? ' on' : on === 0 ? ' off' : ''}"><circle cx="${x}" cy="${y}" r="${r}"/>` +
      `<path d="M${f1(x - d)} ${f1(y - d)}L${f1(x + d)} ${f1(y + d)}M${f1(x - d)} ${f1(y + d)}L${f1(x + d)} ${f1(y - d)}"/>`;
    if (on === 1) {
      s += '<path class="lc-ray" d="';
      for (let k = 0; k < 8; k++) {
        const a = (k + 0.5) * Math.PI / 4, c = Math.cos(a), sn = Math.sin(a);
        s += `M${f1(x + c * (r + 5))} ${f1(y + sn * (r + 5))}L${f1(x + c * (r + 12))} ${f1(y + sn * (r + 12))}`;
      }
      s += '"/>';
    }
    return s + '</g>';
  }
  /* 가로·세로로 꺾은 선: 출처 (x1, y1)에서 들어갈 곳 (x2, y2)까지. bend는 세로로 내려가는 x(들어갈 곳 앞) */
  function orth(x1, y1, x2, y2, bend) {
    if (Math.abs(y1 - y2) < 0.5 && x2 > x1) return { d: `M${f1(x1)} ${f1(y1)}H${f1(x2)}`, xb: x2 };
    if (x2 - x1 >= 12) {
      const xb = Math.max(x1 + 8, Math.min(bend == null ? (x1 + x2) / 2 : bend, x2 - 6));
      return { d: `M${f1(x1)} ${f1(y1)}H${f1(xb)}V${f1(y2)}H${f1(x2)}`, xb };
    }
    /* 뒤로 가는 선: 오른쪽으로 나갔다가 돌아 들어온다 */
    const ym = Math.abs(y1 - y2) > 70 ? (y1 + y2) / 2 : Math.max(y1, y2) + 52;
    return { d: `M${f1(x1)} ${f1(y1)}H${f1(x1 + 14)}V${f1(ym)}H${f1(x2 - 14)}V${f1(y2)}H${f1(x2)}`, xb: x1 + 14 };
  }
  /* 한 출처에서 여러 갈래로 나뉘는 곳에 점(학습지 fig02 (다)) */
  function junctions(wires) {
    const by = {};
    wires.forEach((w) => { (by[w.src] = by[w.src] || []).push(w); });
    let s = '';
    Object.values(by).forEach((ws) => {
      if (ws.length < 2) return;
      const bent = ws.filter((w) => Math.abs(w.y1 - w.y2) >= 0.5);
      const far = Math.max(...ws.map((w) => (Math.abs(w.y1 - w.y2) < 0.5 ? w.x2 : w.xb)));
      const xs = new Set(bent.filter((w) => w.xb < far - 0.5).map((w) => f1(w.xb)));
      xs.forEach((x) => { s += dot(x, ws[0].y1, 4.5, 'lc-jn'); });
      /* 같은 세로선에서 갈라지면(같은 쪽으로 가는 두 갈래) 가까운 쪽 끝에 점 */
      const byX = {};
      bent.forEach((w) => { const k = `${f1(w.xb)}:${w.y2 > w.y1 ? 1 : 0}`; (byX[k] = byX[k] || []).push(w); });
      Object.values(byX).forEach((g) => {
        if (g.length < 2) return;
        g.sort((p, q) => Math.abs(p.y2 - p.y1) - Math.abs(q.y2 - q.y1)).slice(0, -1).forEach((w) => { s += dot(w.xb, w.y2, 4.5, 'lc-jn'); });
      });
    });
    return s;
  }
  const svgPoint = (svg, ev) => {
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  const hitRadius = (svg) => {
    const m = svg.getScreenCTM(), scale = m ? Math.hypot(m.a, m.b) : 1;
    return Math.max(22, 22 / (scale || 1));
  };
  const CIRC = ['①', '②', '③', '④'];

  /* 저장: 이 기기의 브라우저에만 남는다(명세서 §4). 사생활 보호 모드 등에서 막히면 저장 없이 동작한다 */
  const KEY = 'gifted26_slides04_lc_';
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(KEY + k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* 저장 못 함 */ } },
    clear() {
      try { Object.keys(localStorage).filter((k) => k.startsWith(KEY)).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* 저장 못 함 */ }
    },
  };

  /* ================================================================ 3. 읽기용 회로 (§7-1) */

  /* 학습지 그림 좌표(build_figures_04.py fig01·03·04·09·16). 글자는 화면에서 18px 이상이 되게 학습지보다 조금 키웠다.
     wires: [출처, 꺾은선], badges: 값을 띄울 자리(선 위), hits는 data-live 단계에서 누르는 입력 */
  const GT = 21, TT = 23;   // 게이트 이름, 입력 이름 글자 크기
  const READ_FIG = {
    'q2-1': {
      vb: '0 0 440 150', label: '2-1 회로',
      terms: { A: [40, 45], B: [40, 115] },
      gates: { n1: [132, 45], g: [302, 80] },
      wires: [['A', [[40, 45], [93, 45]]], ['n1', [[171, 45], [240, 45], [240, 65], [263, 65]]],
        ['B', [[40, 115], [240, 115], [240, 95], [263, 95]]], ['g', [[341, 80], [372, 80]]]],
      badges: { A: [66, 45], n1: [186, 45], B: [140, 115], g: [356, 80] },
      texts: [[205, 25, '①']], out: [380, 80],
    },
    'q2-2a': {
      vb: '0 0 440 170', label: '도어락 회로 (가)',
      terms: { A: [40, 35], B: [40, 85], C: [40, 145] },
      gates: { g1: [142, 60], g2: [302, 105] },
      wires: [['A', [[40, 35], [80, 35], [80, 50], [103, 50]]], ['B', [[40, 85], [80, 85], [80, 70], [103, 70]]],
        ['g1', [[181, 60], [240, 60], [240, 90], [263, 90]]], ['C', [[40, 145], [240, 145], [240, 120], [263, 120]]],
        ['g2', [[341, 105], [372, 105]]]],
      badges: { A: [60, 35], B: [60, 85], C: [140, 145], g1: [210, 60], g2: [356, 105] },
      texts: [], out: [380, 105],
    },
    'q2-2b': {
      vb: '0 0 440 170', label: '잘못 이은 회로 (나)',
      terms: { A: [40, 35], B: [40, 95], C: [40, 145] },
      gates: { g1: [142, 120], g2: [302, 65] },
      wires: [['A', [[40, 35], [240, 35], [240, 50], [263, 50]]], ['B', [[40, 95], [80, 95], [80, 110], [103, 110]]],
        ['C', [[40, 145], [80, 145], [80, 130], [103, 130]]], ['g1', [[181, 120], [240, 120], [240, 80], [263, 80]]],
        ['g2', [[341, 65], [372, 65]]]],
      badges: { A: [140, 35], B: [60, 95], C: [60, 145], g1: [210, 120], g2: [356, 65] },
      texts: [], out: [380, 65],
    },
  };
  /* 1-2 스위치 회로(fig01). 선 조각마다 무리(all: 직렬 한 줄, c: 병렬 공통, a·b: 병렬 갈래)를 붙여, 전기가 흐르는 무리만 --on으로 칠한다 */
  const SW_FIG = {
    series: {
      vb: '0 0 320 210', label: '(가) 직렬 회로',
      flow: (v) => ({ all: v.A && v.B }), lit: (v) => v.A && v.B,
      segs: [['all', [[40, 50], [90, 50]]], ['all', [[130, 50], [170, 50]]], ['all', [[210, 50], [280, 50], [280, 90]]],
        ['all', [[280, 120], [280, 160], [40, 160], [40, 110]]], ['all', [[40, 100], [40, 50]]]],
      sws: [{ id: 'A', x1: 90, x2: 130, y: 50, g: 'all' }, { id: 'B', x1: 170, x2: 210, y: 50, g: 'all' }],
      bulb: [280, 105], bat: [40, 100], dots: [], name: [160, 192, '(가)'],
    },
    parallel: {
      vb: '330 0 320 210', label: '(나) 병렬 회로',
      flow: (v) => ({ c: v.A || v.B, a: v.A, b: v.B }), lit: (v) => v.A || v.B,
      segs: [['c', [[370, 52], [415, 52]]], ['c', [[565, 52], [610, 52], [610, 90]]], ['c', [[610, 120], [610, 160], [370, 160], [370, 110]]],
        ['c', [[370, 100], [370, 52]]],
        ['a', [[415, 52], [415, 30], [470, 30]]], ['a', [[510, 30], [565, 30], [565, 52]]],
        ['b', [[415, 52], [415, 75], [470, 75]]], ['b', [[510, 75], [565, 75], [565, 52]]]],
      sws: [{ id: 'A', x1: 470, x2: 510, y: 30, g: 'a' }, { id: 'B', x1: 470, x2: 510, y: 75, g: 'b' }],
      bulb: [610, 105], bat: [370, 100], dots: [[415, 52], [565, 52]], name: [490, 192, '(나)'],
    },
  };
  /* 논리식 그림(fig16): 게이트 셋, 단계(data-expr-step) 1~3마다 출력선에 식이 붙는다 */
  const EXPR_FIG = {
    vb: '0 0 960 120', label: '게이트의 출력선에 붙는 식',
    parts: [
      { ox: 0, gate: 'AND', expr: 'A AND B' },
      { ox: 330, gate: 'OR', expr: 'A OR B' },
      { ox: 660, gate: 'NOT', expr: 'NOT A' },
    ],
  };

  const term = (x, y, name) => dot(x, y, 4.5, 'lc-term') + tx(x - 18, y, name, TT, 'lc-v');
  function switchLever(x1, x2, y, closed, v) {
    const e = closed ? [x2, y] : [x2 - 4, y - 16];
    return `<line class="${vcls(v)} lc-lever" x1="${x1}" y1="${y}" x2="${e[0]}" y2="${e[1]}"/>` + dot(x1, y, 3.5, 'lc-term') + dot(x2, y, 3.5, 'lc-term');
  }

  function drawSwitchCircuit(f, live, vals) {
    const fl = live ? f.flow(vals) : null;
    const v = (g) => (fl ? (fl[g] ? 1 : 0) : null);
    let s = '';
    f.segs.forEach(([g, pts]) => { s += poly(pts, v(g)); });
    f.sws.forEach((w) => {
      s += switchLever(w.x1, w.x2, w.y, live && vals[w.id] === 1, v(w.g));
      s += tx(w.x1 - 11, w.y - 13, w.id, 22, 'lc-v');
    });
    f.dots.forEach(([x, y]) => { s += dot(x, y, 3.5, 'lc-term'); });
    const [bx, by] = f.bat;
    s += `<path class="lc-bat" d="M${bx - 16} ${by}H${bx + 16}"/><path class="lc-bat lc-bat2" d="M${bx - 8} ${by + 10}H${bx + 8}"/>`;
    s += bulb(f.bulb[0], f.bulb[1], 15, live ? (f.lit(vals) ? 1 : 0) : null);
    s += tx(f.name[0], f.name[1], f.name[2], 22);
    if (live) f.sws.forEach((w) => { s += `<rect class="lc-hit" data-in="${w.id}" x="${w.x1 - 22}" y="${w.y - 36}" width="${w.x2 - w.x1 + 34}" height="46"/>`; });
    return s;
  }

  function drawGateCircuit(id, f, live, vals, fix) {
    const r = READ_CIRCUITS[id];
    const val = live ? evaluate(readCircuit(id), vals) : null;
    let s = '';
    f.wires.forEach(([src, pts]) => { s += poly(pts, val ? val[src] : null); });
    r.gates.forEach((g) => { const [x, y] = f.gates[g.id]; s += gateBox(x, y, g.type, 78, 42, GT); });
    r.inputs.forEach((k) => { const [x, y] = f.terms[k]; s += term(x, y, k); });
    f.texts.forEach(([x, y, t]) => { s += tx(x, y, t, GT); });
    s += tx(f.out[0], f.out[1], '출력', GT, '', 'start');
    if (val) {
      Object.keys(f.badges).forEach((k) => { const [x, y] = f.badges[k]; s += badge(x, y, val[k], fix[k] != null); });
      r.inputs.forEach((k) => {
        if (fix[k] != null) return;
        const [x, y] = f.terms[k];
        s += `<rect class="lc-hit" data-in="${k}" x="${x - 40}" y="${y - 25}" width="78" height="50"/>`;
      });
    }
    return s;
  }

  function drawExpr(step) {
    let s = '';
    EXPR_FIG.parts.forEach((p, i) => {
      const o = p.ox;
      if (p.gate === 'NOT') {
        s += poly([[o + 40, 65], [o + 85, 65]]) + poly([[o + 163, 65], [o + 193, 65]]);
        s += gateBox(o + 124, 65, 'NOT', 78, 42, GT) + term(o + 40, 65, 'A');
      } else {
        s += poly([[o + 40, 40], [o + 75, 40], [o + 75, 55], [o + 100, 55]]) + poly([[o + 40, 90], [o + 75, 90], [o + 75, 75], [o + 100, 75]]);
        s += poly([[o + 178, 65], [o + 208, 65]]);
        s += gateBox(o + 139, 65, p.gate, 78, 42, GT) + term(o + 40, 40, 'A') + term(o + 40, 90, 'B');
      }
      const x = p.gate === 'NOT' ? o + 201 : o + 216;
      s += `<text x="${x}" y="66" font-size="22" text-anchor="start" dominant-baseline="central" class="lc-ex${i < step ? ' show' : ''}">${rich(p.expr)}</text>`;
    });
    return s;
  }

  function drawSwitchPart(closed) {
    const v = closed ? 1 : 0;
    let s = poly([[16, 40], [108, 40]], v) + poly([[192, 40], [284, 40]], v);
    const e = closed ? [192, 40] : [184, 8];
    s += `<line class="${vcls(v)} lc-lever" x1="108" y1="40" x2="${e[0]}" y2="${e[1]}"/>` + dot(108, 40, 4.5, 'lc-term') + dot(192, 40, 4.5, 'lc-term');
    s += tx(150, 84, closed ? '닫힘 → 1' : '열림 → 0', 24, 'lc-strong');
    s += tx(150, 114, closed ? '이어져서 전기가 흐른다' : '끊겨서 전기가 흐르지 않는다', 20);
    return s + '<rect class="lc-hit" x="0" y="0" width="300" height="130"/>';
  }

  const parts = { reads: [], switches: [], boards: {}, boardEls: [], battles: {}, picks: [], checks: [], views: [], rowmarks: [] };

  function mountSwitch(el) {
    el.setAttribute('data-prevent-swipe', '');
    el.innerHTML = '<svg class="lc-svg" viewBox="0 0 300 130" role="img" aria-label="스위치 열림과 닫힘"></svg>';
    const svg = el.firstChild, w = { closed: false };
    w.draw = () => { svg.innerHTML = drawSwitchPart(w.closed); };
    w.reset = () => { w.closed = false; w.draw(); };
    svg.addEventListener('click', (ev) => { ev.stopPropagation(); w.closed = !w.closed; w.draw(); });
    w.draw();
    parts.switches.push(w);
  }

  function mountRead(el) {
    const id = el.dataset.id;
    const kind = SW_FIG[id] ? 'sw' : READ_FIG[id] ? 'gate' : id === 'expr16' ? 'expr' : null;
    if (!kind) { console.warn('[circuit] 모르는 data-id:', id); return; }
    const fig = kind === 'sw' ? SW_FIG[id] : kind === 'gate' ? READ_FIG[id] : EXPR_FIG;
    const fix = {};
    (el.dataset.fix || '').split(/[,\s]+/).forEach((p) => { const m = /^([A-C])=([01])$/.exec(p); if (m) fix[m[1]] = +m[2]; });
    el.setAttribute('data-prevent-swipe', '');
    el.innerHTML = `<svg class="lc-svg" viewBox="${fig.vb}" role="img" aria-label="${esc(fig.label)}"></svg>`;
    const svg = el.firstChild;
    const inputs = kind === 'expr' ? [] : (READ_CIRCUITS[id] || READ_CIRCUITS.series).inputs;
    const r = { el, id, kind, live: false, step: 0, vals: {} };
    r.init = () => { inputs.forEach((k) => { r.vals[k] = fix[k] != null ? fix[k] : 0; }); };
    r.draw = () => {
      svg.innerHTML = kind === 'sw' ? drawSwitchCircuit(fig, r.live, r.vals)
        : kind === 'gate' ? drawGateCircuit(id, fig, r.live, r.vals, fix) : drawExpr(r.step);
      const side = hitRadius(svg) * 2;
      svg.querySelectorAll('rect.lc-hit').forEach((hit) => {
        const w = +hit.getAttribute('width'), h = +hit.getAttribute('height');
        hit.setAttribute('x', +hit.getAttribute('x') - Math.max(0, side - w) / 2);
        hit.setAttribute('y', +hit.getAttribute('y') - Math.max(0, side - h) / 2);
        hit.setAttribute('width', Math.max(w, side)); hit.setAttribute('height', Math.max(h, side));
      });
    };
    r.setLive = (on) => { if (kind === 'expr' || on === r.live) return; r.live = on; r.init(); r.draw(); };
    r.setStep = (n) => { if (kind !== 'expr' || n === r.step) return; r.step = n; r.draw(); };
    r.reset = () => { r.live = false; r.step = 0; r.init(); r.draw(); };
    svg.addEventListener('click', (ev) => {
      const h = ev.target.closest && ev.target.closest('[data-in]');
      if (!h || !r.live) return;
      ev.stopPropagation();
      const k = h.dataset.in;
      if (fix[k] != null) return;
      r.vals[k] = r.vals[k] ? 0 : 1;
      r.draw();
    });
    r.init();
    r.draw();
    parts.reads.push(r);
  }

  /* ================================================================ 4. 회로판 (§7-2) */

  const listOf = (s) => (s || '').split(/[,\s]+/).filter(Boolean);
  const clone = (x) => JSON.parse(JSON.stringify(x));

  /* 회로판 좌표(viewBox 640×380). 화면에서 폭 560px 이상이면 글자 18px·누름 영역 44px 이상이 된다 */
  const BW = 640, BH = 380, GW = 100, GH = 76, PDY = 19;
  const inY = (i, n) => BH / 2 + (i - (n - 1) / 2) * (n <= 2 ? 140 : 110);
  const OUT_Y = BH / 2, OUT_PX = BW - 108, BULB_X = BW - 46, IN_PX = 104;
  const clampX = (x) => Math.max(175, Math.min(470, x));
  const clampY = (y) => Math.max(44, Math.min(BH - 44, y));
  const portIn = (g, p) => ({ x: g.x - GW / 2, y: ARITY[g.type] === 1 ? g.y : g.y + (p ? PDY : -PDY) });
  const portOut = (s, id) => {
    const g = Board.gate(s, id);
    return g ? { x: g.x + GW / 2, y: g.y } : { x: IN_PX, y: inY(s.inputs.indexOf(id), s.inputs.length) };
  };
  const portXY = (s, h) => (h.kind === 'out' ? portOut(s, h.id) : h.id === 'OUT' ? { x: OUT_PX, y: OUT_Y } : portIn(Board.gate(s, h.id), h.port));
  const safeEval = (s) => { try { return evaluateKnown(Board.circuit(s), s.vals); } catch (e) { return null; } };

  function boardWires(s) {
    const ws = [];
    const add = (src, to, port, b, bend) => {
      const a = portOut(s, src), r = orth(a.x, a.y, b.x, b.y, bend);
      ws.push({ src, to, port, x1: a.x, y1: a.y, x2: b.x, y2: b.y, d: r.d, xb: r.xb });
    };
    s.gates.forEach((g) => g.inputs.forEach((src, p) => { if (src != null) { const b = portIn(g, p); add(src, g.id, p, b, b.x - 18 - 12 * p); } }));
    if (s.out != null) add(s.out, 'OUT', 0, { x: OUT_PX, y: OUT_Y }, OUT_PX - 18);
    return ws;
  }

  /* 누른 곳 찾기: 입력 단자(값 바꾸기·출력 포트), 출력 전구(입력 포트), 게이트(왼쪽 = 입력 포트, 오른쪽 = 출력 포트, 가운데 = 몸통) */
  function boardHit(s, p, radius = 22) {
    /* reveal 확대율과 무관하게 포트의 누름 반지름을 실제 화면 22px 이상으로 유지한다.
       가까운 두 입력의 누름 영역이 겹치면 더 가까운 포트를 고른다. */
    const ports = s.inputs.map((id, i) => ({ kind: 'out', id, x: IN_PX, y: inY(i, s.inputs.length) }));
    ports.push({ kind: 'in', id: 'OUT', port: 0, x: OUT_PX, y: OUT_Y });
    s.gates.forEach((g) => {
      g.inputs.forEach((_, port) => ports.push({ kind: 'in', id: g.id, port, ...portIn(g, port) }));
      ports.push({ kind: 'out', id: g.id, x: g.x + GW / 2, y: g.y });
    });
    const near = ports.map((q) => ({ ...q, distance: Math.hypot(q.x - p.x, q.y - p.y) }))
      .filter((q) => q.distance <= radius).sort((a, b) => a.distance - b.distance)[0];
    if (near) return near;
    const n = s.inputs.length;
    for (let i = 0; i < n; i++) {
      if (Math.abs(p.y - inY(i, n)) >= 30) continue;
      if (p.x < 94) return { kind: 'toggle', id: s.inputs[i] };
      if (p.x < 132) return { kind: 'out', id: s.inputs[i] };
    }
    if (p.x > OUT_PX - 22 && Math.abs(p.y - OUT_Y) < 56) return { kind: 'in', id: 'OUT', port: 0 };
    for (let j = s.gates.length - 1; j >= 0; j--) {
      const g = s.gates[j];
      if (Math.abs(p.x - g.x) > GW / 2 + 22 || Math.abs(p.y - g.y) > GH / 2 + 8) continue;
      if (p.x < g.x - 22) return { kind: 'in', id: g.id, port: ARITY[g.type] === 1 || p.y < g.y ? 0 : 1 };
      if (p.x > g.x + 22) return { kind: 'out', id: g.id };
      return { kind: 'body', id: g.id };
    }
    return null;
  }
  const sameHit = (a, b) => a && b && a.kind === b.kind && a.id === b.id && (a.port || 0) === (b.port || 0);

  function freeSpot(s) {
    for (const x of [210, 340, 465]) for (const y of [70, 160, 250, 330]) if (s.gates.every((g) => Math.hypot(g.x - x, g.y - y) > 80)) return { x, y };
    return { x: 340, y: 190 };
  }
  /* 「정리」: 층 배치로 게이트를 옮긴다(입력·출력 자리는 그대로) */
  function tidy(s) {
    const { pos } = arrange(s, { inY, gx0: 140, gx1: 520, y0: 50, y1: BH - 50, gap: 92, outX: OUT_PX });
    s.gates.forEach((g) => { g.x = clampX(pos[g.id].x); g.y = clampY(pos[g.id].y); });
  }

  function boardInner(ui) {
    const s = ui.st, val = ui.vals ? safeEval(s) : null, n = s.inputs.length, a = ui.armed;
    const ws = boardWires(s);
    const fed = new Set(ws.map((w) => w.src));
    const pd = (x, y, on, armed) => `<circle class="lc-port${on ? ' on' : ''}${armed ? ' armed' : ''}" cx="${f1(x)}" cy="${f1(y)}" r="${armed ? 10 : 7}"/>`;
    let o = `<rect class="lc-frame${ui.del ? ' del' : ''}" x="1" y="1" width="${BW - 2}" height="${BH - 2}" rx="14"/>`;
    ws.forEach((w) => { o += `<path class="${vcls(val ? val[w.src] : null)}" d="${w.d}"/>`; });
    o += junctions(ws);
    s.inputs.forEach((k, i) => {
      const y = inY(i, n), v = s.vals[k] ? 1 : 0;
      o += tx(20, y, k, 30, 'lc-v') + `<rect class="lc-tg" x="38" y="${y - 24}" width="48" height="48" rx="9"/>` + tx(62, y + 1, v, 26, 'lc-strong');
      o += `<path class="${vcls(val ? v : null)}" d="M86 ${y}H${IN_PX}"/>` + pd(IN_PX, y, fed.has(k), sameHit(a, { kind: 'out', id: k }));
    });
    s.gates.forEach((g) => {
      o += `<g class="lc-bg${ui.del ? ' del' : ''}">${gateBox(g.x, g.y, g.type, GW, GH, 26)}</g>`;
      g.inputs.forEach((src, p) => { const q = portIn(g, p); o += pd(q.x, q.y, src != null, sameHit(a, { kind: 'in', id: g.id, port: p })); });
      o += pd(g.x + GW / 2, g.y, fed.has(g.id), sameHit(a, { kind: 'out', id: g.id }));
    });
    o += `<path class="${vcls(val ? val.OUT : null)}" d="M${OUT_PX} ${OUT_Y}H${BULB_X - 24}"/>` + bulb(BULB_X, OUT_Y, 24, val ? val.OUT : null);
    o += pd(OUT_PX, OUT_Y, s.out != null, sameHit(a, { kind: 'in', id: 'OUT', port: 0 })) + tx(BULB_X, OUT_Y + 50, val && val.OUT == null ? '출력 ?' : '출력', 22);
    if (val) s.gates.forEach((g) => { o += badge(g.x + GW / 2 + 20, g.y, val[g.id]); });
    if (ui.del) ws.forEach((w) => { o += `<path class="lc-whit" data-to="${w.to}" data-port="${w.port}" d="${w.d}"/>`; });
    if (ui.rubber) o += `<line class="lc-rub" x1="${f1(ui.rubber.x1)}" y1="${f1(ui.rubber.y1)}" x2="${f1(ui.rubber.x2)}" y2="${f1(ui.rubber.y2)}"/>`;
    o += tx(BW - 14, 24, `게이트 ${s.gates.length}${s.max != null ? ` / ${s.max}` : ''}`, 22, 'lc-cnt', 'end');
    if (ui.msg) o += tx(16, BH - 20, esc(ui.msg), 20, 'lc-msg', 'start');
    return o;
  }

  /* 회로판 하나(lc-board, 대결판 편집 화면이 함께 쓴다). opt.onChange(state): 회로가 바뀔 때마다(저장은 부르는 쪽이) */
  function BoardUI(host, st, opt) {
    host.classList.add('lc-board');
    host.setAttribute('data-prevent-swipe', '');
    host.innerHTML = `<div class="lc-tools">${st.allowed.map((t) => `<button type="button" data-add="${t}">+ ${t}</button>`).join('')}` +
      '<span class="lc-gap"></span><button type="button" data-t="del" aria-pressed="false">지우기</button>' +
      '<button type="button" data-t="undo">되돌리기</button><button type="button" data-t="tidy">정리</button>' +
      '<button type="button" data-t="clear">모두 지우기</button><button type="button" data-t="vals" aria-pressed="false">값 보기</button></div>' +
      `<svg class="lc-svg lc-bsvg" viewBox="0 0 ${BW} ${BH}" role="img" aria-label="회로판"></svg>`;
    const svg = host.querySelector('svg'), btn = (q) => host.querySelector(q);
    const ui = { st, armed: null, del: false, vals: false, rubber: null, msg: '', down: null };
    let undo = [], msgT = 0;

    function render() {
      svg.innerHTML = boardInner(ui);
      host.querySelectorAll('[data-add]').forEach((b) => { b.disabled = !Board.canAdd(ui.st, b.dataset.add); });
      btn('[data-t=del]').setAttribute('aria-pressed', String(ui.del));
      btn('[data-t=vals]').setAttribute('aria-pressed', String(ui.vals));
      btn('[data-t=undo]').disabled = !undo.length;
      btn('[data-t=clear]').disabled = Board.isEmpty(ui.st);
      btn('[data-t=tidy]').disabled = !ui.st.gates.length;
    }
    const snap = () => { undo.push(JSON.stringify(ui.st)); if (undo.length > 80) undo.shift(); };
    const changed = () => { if (opt.onChange) opt.onChange(ui.st); render(); };
    const say = (m) => {
      ui.msg = m;
      clearTimeout(msgT);
      msgT = setTimeout(() => { ui.msg = ''; render(); }, 2600);
    };

    host.querySelector('.lc-tools').addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      ev.stopPropagation();
      if (b.disabled) return;
      ui.armed = null;
      const t = b.dataset.t;
      if (b.dataset.add) {
        const p = freeSpot(ui.st), before = JSON.stringify(ui.st);
        if (Board.add(ui.st, b.dataset.add, p.x, p.y)) { undo.push(before); changed(); }
        return;
      }
      if (t === 'del') ui.del = !ui.del;
      else if (t === 'vals') ui.vals = !ui.vals;
      else if (t === 'undo' && undo.length) { const vals = ui.st.vals; ui.st = Object.assign(JSON.parse(undo.pop()), { vals }); changed(); return; }
      else if (t === 'tidy') { snap(); tidy(ui.st); changed(); return; }
      else if (t === 'clear') { snap(); ui.st.gates = []; ui.st.out = null; ui.del = false; changed(); return; }
      render();
    });

    const link = (o, i) => {
      const r = Board.connect(clone(ui.st), o.id, i.id, i.port);
      if (r === 'ok') { snap(); Board.connect(ui.st, o.id, i.id, i.port); changed(); return; }
      say(r === 'cycle' ? '되돌아오는 길은 이을 수 없습니다' : '이을 수 없습니다');
      render();
    };
    function tap(h) {
      const s = ui.st;
      if (ui.del) {
        if (!h) return;
        if (h.kind === 'body') { snap(); Board.remove(s, h.id); changed(); }
        else if (h.kind === 'wire' || h.kind === 'in' && (h.id === 'OUT' ? s.out != null : Board.gate(s, h.id).inputs[h.port] != null)) {
          snap(); Board.disconnect(s, h.id, h.port); changed();
        }
        return;
      }
      if (!h || h.kind === 'body' || h.kind === 'wire') { if (ui.armed) { ui.armed = null; render(); } return; }
      if (h.kind === 'toggle') { Board.toggle(s, h.id); changed(); return; }
      const a = ui.armed;
      if (a && a.kind !== h.kind) { ui.armed = null; if (a.kind === 'out') link(a, h); else link(h, a); return; }
      ui.armed = sameHit(a, h) ? null : h;
      render();
    }

    svg.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      const p = svgPoint(svg, ev);
      let h = boardHit(ui.st, p, hitRadius(svg));
      const w = ev.target.closest && ev.target.closest('[data-to]');
      if (w && (!h || h.kind === 'body')) h = { kind: 'wire', id: w.dataset.to, port: +w.dataset.port };
      ui.down = { p, h, moved: false, id: ev.pointerId };
      if (h && h.kind === 'body' && !ui.del) {
        const g = Board.gate(ui.st, h.id);
        ui.down.off = { x: g.x - p.x, y: g.y - p.y };
        ui.down.before = JSON.stringify(ui.st);
      }
      try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* 무시 */ }
    });
    svg.addEventListener('pointermove', (ev) => {
      const d = ui.down;
      if (!d || ev.pointerId !== d.id) return;
      const p = svgPoint(svg, ev);
      if (!d.moved && Math.hypot(p.x - d.p.x, p.y - d.p.y) > 8) d.moved = true;
      if (!d.moved || ui.del || !d.h) return;
      if (d.off) {
        const g = Board.gate(ui.st, d.h.id);
        g.x = clampX(p.x + d.off.x);
        g.y = clampY(p.y + d.off.y);
        render();
      } else if (d.h.kind === 'out' || d.h.kind === 'in') {
        const q = portXY(ui.st, d.h);
        ui.rubber = { x1: q.x, y1: q.y, x2: p.x, y2: p.y };
        render();
      }
    });
    const up = (ev, cancel) => {
      const d = ui.down;
      if (!d || ev.pointerId !== d.id) return;
      ui.down = null;
      ui.rubber = null;
      if (cancel) {
        if (d.before) Object.assign(ui.st, JSON.parse(d.before));
        render(); return;
      }
      if (!d.moved) { tap(d.h); return; }
      if (d.off) { undo.push(d.before); changed(); return; }
      if (d.h && !ui.del && (d.h.kind === 'out' || d.h.kind === 'in')) {
        const e = boardHit(ui.st, svgPoint(svg, ev), hitRadius(svg));
        if (e && (e.kind === 'out' || e.kind === 'in') && e.kind !== d.h.kind) { ui.armed = null; if (d.h.kind === 'out') link(d.h, e); else link(e, d.h); return; }
      }
      render();
    };
    svg.addEventListener('pointerup', (ev) => up(ev, false));
    svg.addEventListener('pointercancel', (ev) => up(ev, true));
    svg.addEventListener('click', (ev) => ev.stopPropagation());

    return {
      render,
      get st() { return ui.st; },
      /* 다른 화면으로 가면 값 보기·지우기·고른 포트를 끈다(돌아왔을 때 답이 먼저 보이지 않게) */
      quiet() {
        if (!ui.vals && !ui.del && !ui.armed) return;
        ui.vals = false; ui.del = false; ui.armed = null; render();
      },
      replace(s) { ui.st = s; undo = []; ui.armed = null; ui.del = false; ui.vals = false; render(); },
    };
  }

  function boardOpts(el) {
    return { inputs: listOf(el.dataset.inputs || 'A,B'), allowed: listOf(el.dataset.gates || 'AND,OR,NOT'), max: el.dataset.max ? +el.dataset.max : null };
  }
  function mountBoard(el) {
    const id = el.dataset.id || 'board', o = boardOpts(el);
    const b = { id, el, o };
    b.ui = BoardUI(el, Board.clean(store.get('board_' + id), o) || Board.create(o), {
      onChange: (s) => { store.set('board_' + id, s); refreshFrom(id); },
    });
    b.ui.render();
    parts.boards[id] = b;
  }
  /* 다른 부품(lc-check, lc-view)이 읽는 회로판 상태. 같은 페이지에 없으면 저장한 것을 읽는다 */
  function boardState(id) {
    if (parts.boards[id]) return parts.boards[id].ui.st;
    const s = store.get('board_' + id);
    return s && Array.isArray(s.inputs) ? Board.clean(s, { inputs: s.inputs, allowed: s.allowed || [], max: s.max }) : null;
  }

  /* ================================================================ 5. 회로 그림(자동 배치): 대결판 칸, 두 회로 비교, 확인표 옆 */

  /* 칸 크기별 치수. 글자(font, tfont)는 화면 크기 그대로(viewBox = 칸의 CSS 크기)라 보이는 크기와 같다 */
  const CELL = { W: 300, H: 228, labX: 12, inX: 30, gx0: 46, gx1: 262, outX: 268, bulbX: 284, br: 11, y0: 30, y1: 198, gw: 58, gh: 36, font: 19, tfont: 22, gap: 44 };
  const BIG = { W: 470, H: 280, labX: 16, inX: 40, gx0: 60, gx1: 410, outX: 418, bulbX: 446, br: 16, y0: 40, y1: 240, gw: 88, gh: 52, font: 25, tfont: 28, gap: 66 };

  function schem(s, m) {
    if (!s) return '';
    const n = s.inputs.length;
    const iy = (i) => m.y0 + (m.y1 - m.y0) * (i + 0.5) / n;
    const { pos, L } = arrange(s, { inY: iy, gx0: m.gx0, gx1: m.gx1, y0: m.y0, y1: m.y1, gap: m.gap, outX: m.outX });
    const gw = Math.min(m.gw, L ? (m.gx1 - m.gx0) / L - 24 : m.gw), gh = m.gh;
    const outP = (id) => (Board.gate(s, id) ? { x: pos[id].x + gw / 2, y: pos[id].y } : { x: m.inX, y: pos[id].y });
    const inP = (g, p) => ({ x: pos[g.id].x - gw / 2, y: ARITY[g.type] === 1 ? pos[g.id].y : pos[g.id].y + (p ? 1 : -1) * gh / 4 });
    const ws = [];
    const add = (src, b, p) => { const a = outP(src), r = orth(a.x, a.y, b.x, b.y, b.x - gh * 0.25 - p * gh * 0.2); ws.push({ src, x1: a.x, y1: a.y, x2: b.x, y2: b.y, d: r.d, xb: r.xb }); };
    s.gates.forEach((g) => g.inputs.forEach((src, p) => { if (src != null) add(src, inP(g, p), p); }));
    const oy = pos.OUT.y;
    if (s.out != null) add(s.out, { x: m.outX, y: oy }, 0);
    let o = ws.map((w) => `<path class="lc-w" d="${w.d}"/>`).join('') + junctions(ws);
    o += `<path class="lc-w" d="M${m.outX} ${f1(oy)}H${m.bulbX - m.br}"/>` + bulb(m.bulbX, f1(oy), m.br, null);
    s.inputs.forEach((k, i) => { o += dot(m.inX, iy(i), 4, 'lc-term') + tx(m.labX, iy(i), k, m.tfont, 'lc-v'); });
    s.gates.forEach((g) => {
      o += gateBox(pos[g.id].x, pos[g.id].y, g.type, f1(gw), gh, m.font);
      g.inputs.forEach((src, p) => { if (src == null) { const q = inP(g, p); o += `<circle class="lc-port" cx="${f1(q.x)}" cy="${f1(q.y)}" r="4"/>`; } });
    });
    return o;
  }

  /* ================================================================ 6. 대결판 (§7-3) */

  const emptyBattle = () => ({ cells: [null, null, null, null], extra: null, pick: null });
  function loadBattle(id, o) {
    const sv = store.get('battle_' + id) || {};
    return {
      cells: [0, 1, 2, 3].map((i) => (Array.isArray(sv.cells) ? Board.clean(sv.cells[i], o) : null)),
      extra: Board.clean(sv.extra, o),
      pick: Array.isArray(sv.pick) && sv.pick.length === 2 ? sv.pick.map((k) => (k == null ? null : String(k))) : null,
    };
  }
  const saveBattle = (B) => store.set('battle_' + B.id, Object.assign({ target: B.target, o: B.o }, B.st));
  /* 대결판 상태. 같은 페이지에 lc-battle이 없으면 저장한 것으로 만든다(그리기는 하지 않는다) */
  function getBattle(id) {
    if (parts.battles[id]) return parts.battles[id];
    const sv = store.get('battle_' + id);
    if (!sv || !sv.o) return null;
    return { id, el: null, o: sv.o, target: sv.target || '', st: loadBattle(id, sv.o) };
  }
  const cellName = (s, i) => `${s && s.teacher ? '교사 제시' : '모둠'} ${CIRC[i]}`;

  function renderBattle(B) {
    const el = B.el, n = B.o.inputs.length;
    el.querySelectorAll('.lc-cell').forEach((c, i) => {
      const s = B.st.cells[i];
      c.querySelector('.lc-cell-h').innerHTML = `<b>${cellName(s, i)}</b><span>${s ? `게이트 ${s.gates.length}개` : ''}</span>`;
      c.classList.toggle('empty', !s);
      c.querySelector('svg').innerHTML = s ? schem(s, CELL) : tx(CELL.W / 2, CELL.H / 2 - 16, '+', 48, 'lc-hint') + tx(CELL.W / 2, CELL.H / 2 + 30, '눌러서 회로 넣기', 20, 'lc-hint');
    });
    /* 비교표: 출력 칸은 닫아 둔다(D5). 회로가 바뀐 열만 다시 닫는다 */
    const tb = el.querySelector('tbody');
    const opened = new Set([...tb.querySelectorAll('td.tap.open')].map((td) => td.dataset.k));
    const cols = B.st.cells.map((s) => {
      if (!s) return null;
      const c = Board.circuit(s);
      return { col: column(c), done: isComplete(c) };
    });
    const sig = cols.map((x) => (x ? x.col + x.done : ''));
    let h = '';
    for (let r = 0; r < 1 << n; r++) {
      h += '<tr>' + B.o.inputs.map((_, j) => `<td>${(r >> (n - 1 - j)) & 1}</td>`).join('') + `<td class="lc-goal">${B.target[r] || ''}</td>`;
      cols.forEach((x, i) => {
        if (!x) { h += '<td class="lc-none"></td>'; return; }
        const v = x.done ? x.col[r] : '?', k = `${r}:${i}`;
        const keep = opened.has(k) && B.sig && B.sig[i] === sig[i];
        h += `<td class="tap${x.done && v !== B.target[r] ? ' lc-diff' : ''}${keep ? ' open' : ''}" data-k="${k}"><span class="a">${v}</span></td>`;
      });
      h += '</tr>';
    }
    tb.innerHTML = h;
    B.sig = sig;
  }

  function closeEditor(B) {
    if (!B.ov) return;
    B.ov.remove();
    B.ov = null;
  }
  function openEditor(B, i) {
    if (B.ov) return;
    const sec = B.el.closest('section') || document.body;
    const ov = document.createElement('div');
    ov.className = 'lc-ov';
    ov.setAttribute('data-prevent-swipe', '');
    ov.innerHTML = `<div class="lc-ov-h"><b>${cellName(B.st.cells[i], i)} 회로</b><button type="button" class="lc-done">완료</button></div><div></div>`;
    sec.appendChild(ov);
    B.ov = ov;
    const ui = BoardUI(ov.lastElementChild, B.st.cells[i] ? clone(B.st.cells[i]) : Board.create(B.o), {
      onChange: (s) => { B.st.cells[i] = Board.isEmpty(s) ? null : s; saveBattle(B); renderBattle(B); },
    });
    ui.render();
    ov.querySelector('.lc-done').addEventListener('click', (ev) => { ev.stopPropagation(); closeEditor(B); refreshPicks(true); });
  }

  function mountBattle(el) {
    const id = el.dataset.id || 'battle';
    const o = { inputs: listOf(el.dataset.inputs || 'A,B,C'), allowed: listOf(el.dataset.gates || 'AND,OR'), max: el.dataset.max ? +el.dataset.max : null };
    const B = { id, el, o, target: el.dataset.target || '', st: loadBattle(id, o), ov: null, sig: null };
    el.setAttribute('data-prevent-swipe', '');
    el.innerHTML = `<div class="lc-bt-grid">${[0, 1, 2, 3].map((i) =>
      `<div class="lc-cell" data-i="${i}" role="button" tabindex="0"><div class="lc-cell-h"></div><svg class="lc-svg" viewBox="0 0 ${CELL.W} ${CELL.H}"></svg></div>`).join('')}</div>` +
      `<table class="tt compact lc-bt-t"><thead><tr>${o.inputs.map((k) => `<th>$${k}$</th>`).join('')}<th>목표</th>${CIRC.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody></tbody></table>`;
    el.querySelector('.lc-bt-grid').addEventListener('click', (ev) => {
      const c = ev.target.closest('.lc-cell');
      if (!c) return;
      ev.stopPropagation();
      openEditor(B, +c.dataset.i);
    });
    parts.battles[id] = B;
    saveBattle(B);
    renderBattle(B);
  }

  /* ================================================================ 7. 두 회로 비교(lc-pick), 확인표(lc-check), 회로 보기(lc-view) */

  function candidates(B) {
    const cs = [];
    const add = (s, key, name) => {
      const c = Board.circuit(s);
      cs.push({ key, s, name, n: s.gates.length, ok: isComplete(c) && column(c) === B.target, expr: deriveExpr(c) });
    };
    B.st.cells.forEach((s, i) => { if (s) add(s, String(i), cellName(s, i)); });
    if (B.st.extra) add(B.st.extra, 'x', '교사 제시');
    return cs;
  }
  /* 게이트 수가 다른 두 회로: 목표와 같은 회로 가운데 가장 적은 것과, 그와 게이트 수가 다른 것. 교사가 고른 것이 있으면 그것 */
  function pickPair(B) {
    const cs = candidates(B), by = (k) => cs.find((c) => c.key === k) || null;
    if (B.st.pick) return { cs, pair: B.st.pick.map(by) };
    const good = cs.filter((c) => c.ok), pool = (good.length ? good : cs).slice().sort((x, y) => x.n - y.n);
    const a = pool[0] || null;
    return { cs, pair: [a, a ? pool.find((c) => c.n !== a.n) || null : null] };
  }
  const hasTeacher = (B) => !!B.st.extra || B.st.cells.some((s) => s && s.teacher);

  function mountPick(el) {
    const P = { el, from: el.dataset.from || 'battle', sig: null };
    el.setAttribute('data-prevent-swipe', '');
    el.innerHTML = `<div class="lc-pk-row">${[0, 1].map((j) =>
      `<div class="lc-pk" data-j="${j}"><div class="lc-pk-h"></div><svg class="lc-svg" viewBox="0 0 ${BIG.W} ${BIG.H}"></svg><div class="lc-pk-e"></div></div>`).join('')}</div>` +
      '<div class="lc-pk-tools"><button type="button" class="lc-teach"></button><span class="lc-pk-ch"></span></div>';
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      ev.stopPropagation();
      const B = getBattle(P.from);
      if (!B) return;
      if (b.classList.contains('lc-teach')) {
        if (hasTeacher(B)) {
          B.st.extra = null;
          B.st.cells = B.st.cells.map((s) => (s && s.teacher ? null : s));
          B.st.pick = null;
        } else {
          const t = teacherBoard(B.o), i = B.st.cells.indexOf(null);
          if (i >= 0) { B.st.cells[i] = t; B.st.pick = null; }
          else {
            const left = pickPair(B).pair[0];
            B.st.extra = t;
            B.st.pick = [left ? left.key : null, 'x'];
          }
        }
      } else if (b.dataset.j != null) {
        const { pair } = pickPair(B), keys = pair.map((c) => (c ? c.key : null));
        keys[+b.dataset.j] = b.dataset.k;
        B.st.pick = keys;
      }
      saveBattle(B);
      if (B.el) renderBattle(B);
      refreshPicks(true);
    });
    parts.picks.push(P);
    P.refresh = (force) => {
      const B = getBattle(P.from);
      const { cs, pair } = B ? pickPair(B) : { cs: [], pair: [null, null] };
      const sig = JSON.stringify([pair.map((c) => c && [c.key, c.s]), cs.map((c) => c.key), B && hasTeacher(B)]);
      if (!force && sig === P.sig) return;
      P.sig = sig;
      el.querySelectorAll('.lc-pk').forEach((box, j) => {
        const c = pair[j];
        box.classList.toggle('empty', !c);
        box.querySelector('.lc-pk-h').innerHTML = c
          ? `<b>${c.name}</b><span>게이트 <span class="tap lc-n"><span class="a">${c.n}</span></span>개</span>` : '';
        box.querySelector('svg').innerHTML = c ? schem(c.s, BIG) : '';
        box.querySelector('.lc-pk-e').innerHTML = c ? `<span class="tap lc-ex"><span class="a">${richHTML(c.expr)}</span></span>` : '';
      });
      const t = el.querySelector('.lc-teach');
      t.textContent = B && hasTeacher(B) ? '교사 제시 회로 빼기' : '교사 제시 회로';
      t.setAttribute('aria-pressed', String(!!(B && hasTeacher(B))));
      /* 교사가 칸을 바꿔 고르는 단추: 왼쪽 그림·오른쪽 그림마다 후보 칸 */
      el.querySelector('.lc-pk-ch').innerHTML = cs.length < 2 ? '' : [0, 1].map((j) =>
        `<span class="lc-ch">${j ? '오른쪽' : '왼쪽'} ${cs.map((c) => `<button type="button" data-j="${j}" data-k="${c.key}" aria-pressed="${!!pair[j] && pair[j].key === c.key}">${c.key === 'x' ? '교사' : CIRC[+c.key]}</button>`).join('')}</span>`).join('');
    };
    P.refresh(true);
  }
  function refreshPicks(force) { parts.picks.forEach((P) => P.refresh(force)); }

  function mountCheck(el) {
    const from = el.dataset.from, target = el.dataset.target || '';
    const st = boardState(from), inputs = parts.boards[from] ? parts.boards[from].o.inputs : st ? st.inputs : ['A', 'B'];
    const goal = target === '0110' && inputs.join() === 'A,B' ? '$A$ XOR $B$' : '목표';
    el.classList.add('tt');
    el.innerHTML = `<thead><tr>${inputs.map((k) => `<th>$${k}$</th>`).join('')}<th>내 회로의<br>출력</th><th>${goal}</th><th>같은가</th></tr></thead><tbody></tbody>`;
    const C = { el, from, sig: null };
    C.refresh = (force) => {
      const s = boardState(from), c = s && !Board.isEmpty(s) ? Board.circuit(s) : null;
      const col = c ? column(c) : null, done = !!c && isComplete(c);
      const sig = JSON.stringify([col, done]);
      if (!force && sig === C.sig) return;
      C.sig = sig;
      const n = inputs.length;
      let h = '';
      for (let r = 0; r < 1 << n; r++) {
        const v = done ? col[r] : '?', same = done ? (v === target[r] ? '○' : '×') : '?';
        h += '<tr>' + inputs.map((_, j) => `<td>${(r >> (n - 1 - j)) & 1}</td>`).join('') +
          `<td class="tap${done && v !== target[r] ? ' lc-diff' : ''}"><span class="a">${v}</span></td><td>${target[r] || ''}</td><td class="tap"><span class="a">${same}</span></td></tr>`;
      }
      el.querySelector('tbody').innerHTML = h;
    };
    C.refresh(true);
    parts.checks.push(C);
  }

  /* 회로판의 회로를 자동 배치로 다시 그린다(덧붙인 부품: 3-3 확인표 옆에 3-2의 회로를 보일 때) */
  function mountView(el) {
    const V = { el, from: el.dataset.from, sig: null };
    el.innerHTML = `<svg class="lc-svg" viewBox="0 0 ${BIG.W} ${BIG.H}" role="img" aria-label="회로판의 회로"></svg>`;
    V.refresh = (force) => {
      const s = boardState(V.from), sig = JSON.stringify(s && [s.gates, s.out]);
      if (!force && sig === V.sig) return;
      V.sig = sig;
      el.firstChild.innerHTML = s && !Board.isEmpty(s) ? schem(s, BIG) : '';
    };
    V.refresh(true);
    parts.views.push(V);
  }
  function refreshFrom(id) {
    parts.checks.concat(parts.views).forEach((x) => { if (x.from === id) x.refresh(); });
  }

  /* ================================================================ 8. 행 표시(rowmark, §7-4): 행을 누르면 ○, 다시 누르면 지움 */

  function mountRowmark(t) {
    t.setAttribute('data-prevent-swipe', '');
    t.addEventListener('click', (ev) => {
      const tr = ev.target.closest('tr');
      if (!tr || ev.target.closest('.tap') || tr.querySelector('th') || !t.contains(tr)) return;
      ev.stopPropagation();
      t.style.setProperty('--lc-roww', tr.offsetWidth + 'px');
      tr.classList.toggle('lc-mk');
    });
    parts.rowmarks.push(t);
  }

  /* ================================================================ 9. 부품 등록 */

  const part = {
    name: 'circuit',
    /* 시작할 때 한 번: root 안의 lc- 요소를 찾아 그린다(회로판·대결판을 먼저: 확인표·비교가 그 상태를 읽는다) */
    mount(root) {
      root.querySelectorAll('.lc-switch').forEach(mountSwitch);
      root.querySelectorAll('.lc-read').forEach(mountRead);
      root.querySelectorAll('.lc-board').forEach(mountBoard);
      root.querySelectorAll('.lc-battle').forEach(mountBattle);
      root.querySelectorAll('.lc-pick').forEach(mountPick);
      root.querySelectorAll('table.lc-check').forEach(mountCheck);
      root.querySelectorAll('.lc-view').forEach(mountView);
      root.querySelectorAll('table.rowmark').forEach(mountRowmark);
    },
    /* 화면·단계가 바뀔 때마다: slide 안의 .fragment.visible에 맞춘다(뒤로 넘겨 fragment가 숨으면 학습지 그림으로 돌아간다) */
    sync(slide) {
      const live = new Set();
      let step = 0;
      slide.querySelectorAll('.fragment.visible[data-live]').forEach((f) => listOf(f.dataset.live).forEach((x) => live.add(x)));
      slide.querySelectorAll('.fragment.visible[data-expr-step]').forEach((f) => { step = Math.max(step, +f.dataset.exprStep || 0); });
      parts.reads.forEach((r) => {
        const here = slide.contains(r.el);
        r.setLive(here && live.has(r.id));
        if (here) r.setStep(step);
      });
      Object.values(parts.boards).forEach((b) => { if (!slide.contains(b.el)) b.ui.quiet(); });
      Object.values(parts.battles).forEach((B) => { if (B.ov && !slide.contains(B.el)) { closeEditor(B); refreshPicks(); } });
      parts.picks.concat(parts.checks, parts.views).forEach((x) => { if (slide.contains(x.el)) x.refresh(); });
    },
    /* 「이 수업 기록 지우기」: 저장한 회로를 지우고 처음 상태로 */
    reset() {
      store.clear();
      parts.switches.forEach((w) => w.reset());
      parts.reads.forEach((r) => r.reset());
      Object.values(parts.boards).forEach((b) => b.ui.replace(Board.create(b.o)));
      Object.values(parts.battles).forEach((B) => { closeEditor(B); B.st = emptyBattle(); B.sig = null; saveBattle(B); renderBattle(B); });
      parts.picks.concat(parts.checks, parts.views).forEach((x) => x.refresh(true));
      parts.rowmarks.forEach((t) => t.querySelectorAll('tr.lc-mk').forEach((tr) => tr.classList.remove('lc-mk')));
    },
  };

  (window.PARTS = window.PARTS || []).push(part);
})();
