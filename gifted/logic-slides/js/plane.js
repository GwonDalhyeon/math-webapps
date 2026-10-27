/* 평면 부품 — 세션 B. 명세서 §7-5·§7-6, 규약 §7-7, 완료 기준 §12-5.
   마크업
   - <div class="pl-totable"> + fragment data-pl-step="1~4": 2-1 진리표의 행이 차례로 평면의 점으로 옮겨 간다(fig11)
   - <div class="pl-plane" data-id data-labels="0001" [data-edit="points"] [data-line="on"] [data-count="on"]>:
     좌표평면. 점을 눌러 ○ → ● → ○(data-edit), 두 곳을 누르거나 끌어 직선 하나 긋기(data-line), 시도 횟수(data-count)
   - <div class="pl-plane" data-id="xor-seg" data-labels="0110"> + fragment data-pl-step="1~4": 선분 ●–●, 선분 ○–○, 만나는 점, 보조 그림
   - <div class="pl-fold" data-from="n"> + fragment data-fold-step="1~7": 직선 A+B=1을 따라 원점 쪽 반을 접고, 자르고, 펼친다
   직선을 그으면 판정하지 않고 양쪽 반평면만 옅은 두 색으로 칠한다(D3). 직선이 점 위를 지나면 그 점에 테두리를 두른다.
   스타일은 css/plane.css, 저장 키는 gifted26_slides04_pl_<data-id>, 계산 부분은 window.PL(node 시험: tools/test_plane.cjs).
   그림 크기: 평면 viewBox 394(가로), 진리표→점 700, xor-seg 720, 접기 550. 그림 글자는 22, 누름 반지름은 28이므로
   평면은 화면 폭 330px 이상, 진리표→점은 590px 이상, 접기는 460px 이상으로 놓아야 글자 18px·누름 영역 44px를 지킨다. */
(function () {
  /* ---------------------------------------------------------------- 계산 (window.PL) */
  const LO = -0.5, HI = 1.5;                       // 그림 범위(학습지와 같다). 직선 A+B=1에 대해 대칭이다
  const POINTS = [[0, 0], [0, 1], [1, 0], [1, 1]];  // 점 순서: data-labels와 같다
  const EPS = 1e-9;                                // logic-circuit separationReport의 경계와 같다
  const SQUARE = [[LO, LO], [HI, LO], [HI, HI], [LO, HI]];
  const UPPER = [[LO, HI], [HI, HI], [HI, LO]];    // A+B >= 1 쪽
  const LOWER = [[LO, LO], [HI, LO], [LO, HI]];    // A+B <= 1 쪽(원점 쪽, 접혀 넘어가는 반)

  /* 직선은 aA + bB + c = 0, a² + b² = 1로 둔다(값 = 점과 직선 사이의 거리에 부호를 붙인 것).
     b > 0이 되게 방향을 맞춰, 같은 직선이면 끝점 순서와 상관없이 같은 쪽이 같은 색이 된다 */
  const orient = (L) => (L.b < -EPS || (Math.abs(L.b) <= EPS && L.a < 0) ? { a: -L.a, b: -L.b, c: -L.c } : L);
  const lineThrough = (p, q) => {
    const a = p[1] - q[1], b = q[0] - p[0], n = Math.hypot(a, b);
    if (n < 1e-12) return null;
    return orient({ a: a / n, b: b / n, c: -(a * p[0] + b * p[1]) / n });
  };
  const lineSum = (k) => ({ a: Math.SQRT1_2, b: Math.SQRT1_2, c: -k * Math.SQRT1_2 });   // 직선 A+B=k
  const value = (L, p) => L.a * p[0] + L.b * p[1] + L.c;
  /* 점이 직선의 어느 쪽인가: 1, -1, 직선 위면 0. tol을 주지 않으면 separationReport와 같은 기준이다.
     화면에서는 tol = 점의 반지름(ON_TOL)을 써서, 그린 점에 직선이 걸치면 「점 위를 지난다」로 본다 */
  const sideOf = (L, p, tol = EPS) => { const s = value(L, p); return Math.abs(s) < tol ? 0 : s > 0 ? 1 : -1; };
  const sides = (L, tol) => POINTS.map((p) => sideOf(L, p, tol));

  /* 다각형을 직선의 한쪽(sign 쪽, 직선 위 포함)만 남기고 자른다 */
  const clip = (poly, L, sign) => {
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
  };
  const halves = (L) => [clip(SQUARE, L, 1), clip(SQUARE, L, -1)];   // [값 > 0 쪽, 값 < 0 쪽]
  /* 직선이 그림 범위 안에서 지나는 두 끝 */
  const segmentIn = (L, lo = LO, hi = HI) => {
    const d = [L.b, -L.a], o = [-L.a * L.c, -L.b * L.c];
    let t0 = -Infinity, t1 = Infinity;
    for (let k = 0; k < 2; k++) {
      if (Math.abs(d[k]) < 1e-12) { if (o[k] < lo || o[k] > hi) return null; continue; }
      const u = (lo - o[k]) / d[k], v = (hi - o[k]) / d[k];
      t0 = Math.max(t0, Math.min(u, v)); t1 = Math.min(t1, Math.max(u, v));
    }
    if (t0 > t1) return null;
    return [[o[0] + d[0] * t0, o[1] + d[1] * t0], [o[0] + d[0] * t1, o[1] + d[1] * t1]];
  };

  /* 접기: 직선 A+B=1에 대한 대칭은 (a, b) → (1-b, 1-a)(교사용 4-3 참고) */
  const reflect = (p) => [1 - p[1], 1 - p[0]];
  const reflectLine = (L) => orient({ a: -L.b, b: -L.a, c: L.a + L.b + L.c });
  /* 원점 쪽 점 (a, b)를 접는 선 둘레로 t(라디안)만큼 넘긴 3차원 위치 [x, y, z](build_figures_04.py의 _rotate_flap) */
  const rotateFlap = (a, b, t) => {
    const fa = (a - b + 1) / 2, fb = (b - a + 1) / 2;   // 접는 선 위로 내린 수선의 발
    const va = a - fa, vb = b - fb, r = Math.hypot(va, vb), c = Math.cos(t);
    return [fa + va * c, fb + vb * c, r * Math.sin(t)];
  };
  /* 위에서 본 모습(학습지 fig18과 같은 시점): 원점 쪽 반의 점만 넘어간다 */
  const foldAt = (p, t) => (p[0] + p[1] < 1 - 1e-12 ? rotateFlap(p[0], p[1], t).slice(0, 2) : p);
  const FOLD_CUT = lineSum(1.5);                    // 4-3 (1) 예시 직선
  /* 다 접은 채로 cut을 따라 두 겹을 함께 자르면, 펼쳤을 때 잘린 자리는 cut과 그것을 접는 선에 대해 옮긴 직선이다 */
  const cutLines = (cut) => [cut, reflectLine(cut)];
  /* 잘린 뒤의 조각(펼친 평면의 좌표): 남는 위쪽 반·원점 쪽 반, 떨어져 나가는 두 귀퉁이 */
  const foldPieces = (cut = FOLD_CUT) => {
    const mid = [0.5, 0.5], m = reflectLine(cut), su = sideOf(cut, mid), sf = sideOf(m, mid);
    return {
      upperKeep: clip(UPPER, cut, su), upperCut: clip(UPPER, cut, -su),
      flapKeep: clip(LOWER, m, sf), flapCut: clip(LOWER, m, -sf),
      band: clip(clip(SQUARE, cut, su), m, sf),     // 펼쳤을 때 남는 띠
    };
  };

  const PL = {
    LO, HI, POINTS, EPS, SQUARE, UPPER, LOWER, FOLD_CUT,
    ON_TOL: 0,                                      // 점의 반지름(그림 단위 → 평면 단위), 아래에서 정한다
    lineThrough, lineSum, value, sideOf, sides, clip, halves, segmentIn,
    reflect, reflectLine, rotateFlap, foldAt, cutLines, foldPieces,
  };

  /* ---------------------------------------------------------------- 그리기 도우미 */
  const U = 170;          // 평면 1의 길이(그림 단위)
  const R = 12;           // 점 반지름
  const HIT = 28;         // 누름 반지름: 그림이 0.79배 이상이면 지름 44px 이상
  const FS = 22;          // 그림 글자
  PL.ON_TOL = R / U;
  const f1 = (v) => Math.round(v * 10) / 10;
  const mapper = (x0, y0, u = U) => ({
    X: (a) => f1(x0 + (a - LO) * u), Y: (b) => f1(y0 + (HI - b) * u),
    inv: (x, y) => [LO + (x - x0) / u, HI - (y - y0) / u],
  });
  const pts = (M, poly) => poly.map((p) => `${M.X(p[0])},${M.Y(p[1])}`).join(' ');
  const txt = (x, y, s, { cls = '', anchor = 'middle', size = FS, op } = {}) =>
    `<text class="pl-t pl-halo ${cls}" x="${f1(x)}" y="${f1(y)}" font-size="${size}" text-anchor="${anchor}" dominant-baseline="central"${op != null ? ` opacity="${op}"` : ''}>${s}</text>`;
  const v = (s) => `<tspan class="pl-v">${s}</tspan>`;   // 문자 A, B: 세리프 기울임
  const dot = (x, y, filled, extra = '') => `<circle class="pl-dot${filled ? ' on' : ''}" cx="${f1(x)}" cy="${f1(y)}" r="${R}"${extra}/>`;
  const coord = (p) => `(${p[0]}, ${p[1]})`;

  /* 축·눈금(학습지 plane_body와 같은 배치) */
  const axes = (M, ticks = true) => {
    const x0 = M.X(0), y0 = M.Y(0), xr = M.X(HI), yt = M.Y(HI);
    return `<g class="pl-axes">
      <line x1="${M.X(LO)}" y1="${y0}" x2="${xr + 8}" y2="${y0}"/><polygon points="${xr + 18},${y0} ${xr + 6},${y0 - 6} ${xr + 6},${y0 + 6}"/>
      <line x1="${x0}" y1="${M.Y(LO)}" x2="${x0}" y2="${yt - 8}"/><polygon points="${x0},${yt - 18} ${x0 - 6},${yt - 6} ${x0 + 6},${yt - 6}"/>
      <line x1="${M.X(1)}" y1="${y0 - 5}" x2="${M.X(1)}" y2="${y0 + 5}"/><line x1="${x0 - 5}" y1="${M.Y(1)}" x2="${x0 + 5}" y2="${M.Y(1)}"/>
    </g>${txt(xr + 12, y0 + 24, v('A'), { size: 26 })}${txt(x0 - 22, yt - 8, v('B'), { size: 26 })}${txt(x0 - 15, y0 + 21, v('O'))}`
      + (ticks ? `${txt(M.X(1), y0 + 30, '1')}${txt(x0 - 20, M.Y(1), '1', { anchor: 'end' })}` : '');
  };
  const paper = (M) => `<rect class="pl-paper" x="${M.X(LO)}" y="${M.Y(HI)}" width="${(HI - LO) * U}" height="${(HI - LO) * U}"/>`;
  /* 좌표 이름표: 점의 오른쪽 위 */
  const coordLabel = (M, p, op) => txt(M.X(p[0]) + 15, M.Y(p[1]) - 19, coord(p), { anchor: 'start', op });

  /* 누른 위치 → SVG 좌표(reveal.js가 화면을 늘이고 줄여도 맞게 getScreenCTM으로 바꾼다) */
  const svgPoint = (svg, ev) => {
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return [p.x, p.y];
  };

  /* 저장: 그 기기의 브라우저에만 남는다 */
  const KEY = 'gifted26_slides04_pl_';
  const load = (id) => { try { return JSON.parse(localStorage.getItem(KEY + id)) || null; } catch (e) { return null; } };
  const save = (id, data) => { try { localStorage.setItem(KEY + id, JSON.stringify(data)); } catch (e) { /* 저장 못 해도 화면은 돈다 */ } };
  const clearAll = () => {
    try { Object.keys(localStorage).filter((k) => k.startsWith(KEY)).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* 무시 */ }
  };

  /* 단계: 화면 안에서 보이는 fragment 중 가장 큰 값 */
  const stepOf = (slide, attr) => Math.max(0, ...[...slide.querySelectorAll(`.fragment.visible[${attr}]`)].map((f) => +f.getAttribute(attr) || 0));
  /* 화면이 바뀌어 들어온 경우에는 움직이지 않고 그 단계의 모습으로 바로 맞춘다 */
  const jumpTo = (el, fn) => { el.classList.add('pl-jump'); fn(); void el.getBoundingClientRect(); requestAnimationFrame(() => el.classList.remove('pl-jump')); };

  /* ---------------------------------------------------------------- 좌표평면 (4-1, 4-2) */
  const PW = 394, PH = 394;
  const PM = mapper(14, 40);
  const planes = [];

  function mountPlane(el) {
    const id = el.dataset.id || 'plane';
    if (id === 'xor-seg') return mountSeg(el);
    const st = {
      el, id,
      labels: el.dataset.labels || '0000',
      edit: el.dataset.edit === 'points',
      lineOn: el.dataset.line === 'on',
      countOn: el.dataset.count === 'on',
      marks: null, line: null, count: 0, pending: null, press: null,
    };
    st.init = () => { st.marks = (st.edit ? '0000' : st.labels).split('').map(Number); st.line = null; st.count = 0; st.pending = null; };
    st.init();
    const saved = load(id);
    if (saved) {
      if (st.edit && /^[01]{4}$/.test(saved.marks || '')) st.marks = saved.marks.split('').map(Number);
      if (st.lineOn && saved.line && lineThrough(saved.line.p, saved.line.q)) st.line = saved.line;
      st.count = +saved.count || 0;
    }
    el.innerHTML = `<svg viewBox="0 0 ${PW} ${PH}" role="img" aria-label="좌표평면">
      ${paper(PM)}<g class="pl-fill"></g>${axes(PM)}<g class="pl-live"></g></svg>`
      + (st.lineOn ? `<div class="pl-bar"><button type="button" class="pl-btn" data-pl-act="clear">지우기</button>`
        + `<span class="pl-count"></span></div>` : '');
    st.svg = el.querySelector('svg');
    if (st.lineOn) {
      el.querySelector('[data-pl-act="clear"]').addEventListener('click', (ev) => {
        ev.stopPropagation();
        st.line = null; st.pending = null; store(st); drawPlane(st);
      });
    }
    if (st.lineOn || st.edit) bindPlane(st);
    planes.push(st);
    drawPlane(st);
  }

  const store = (st) => save(st.id, { marks: st.marks.join(''), line: st.line, count: st.count });

  function drawPlane(st) {
    const L = st.line && lineThrough(st.line.p, st.line.q);
    const sd = L ? sides(L, PL.ON_TOL) : [1, 1, 1, 1];
    let fill = '', live = '';
    if (L) {
      const [pa, pb] = halves(L);
      fill = `<polygon class="pl-side-a" points="${pts(PM, pa)}"/><polygon class="pl-side-b" points="${pts(PM, pb)}"/>`;
      const s = segmentIn(L);
      if (s) live += `<line class="pl-line" x1="${PM.X(s[0][0])}" y1="${PM.Y(s[0][1])}" x2="${PM.X(s[1][0])}" y2="${PM.Y(s[1][1])}"/>`;
    }
    POINTS.forEach((p, i) => {
      if (sd[i] === 0) live += `<circle class="pl-ring" cx="${PM.X(p[0])}" cy="${PM.Y(p[1])}" r="${R + 8}"/>`;
      live += dot(PM.X(p[0]), PM.Y(p[1]), st.marks[i] === 1);
      live += coordLabel(PM, p);
    });
    if (st.pending) live += `<circle class="pl-pending" cx="${PM.X(st.pending[0])}" cy="${PM.Y(st.pending[1])}" r="9"/>`;
    if (st.line) ['p', 'q'].forEach((k) => { live += `<circle class="pl-handle" cx="${PM.X(st.line[k][0])}" cy="${PM.Y(st.line[k][1])}" r="13"/>`; });
    st.svg.querySelector('.pl-fill').innerHTML = fill;
    st.svg.querySelector('.pl-live').innerHTML = live;
    if (st.countOn) st.el.querySelector('.pl-count').textContent = `시도 ${st.count}`;
  }

  const clampP = (p) => [Math.min(HI, Math.max(LO, p[0])), Math.min(HI, Math.max(LO, p[1]))];
  const MIN_LEN = 0.12;   // 두 끝이 이보다 가까우면 직선을 정하지 않는다
  const far = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) >= MIN_LEN;

  /* 누르기·끌기: 손잡이 끌기 > 점 누르기(data-edit) > 빈 곳 누르기·끌기(직선 긋기) */
  function bindPlane(st) {
    const svg = st.svg;
    svg.addEventListener('pointerdown', (ev) => {
      if (ev.button > 0) return;
      const [x, y] = svgPoint(svg, ev);
      const matrix = svg.getScreenCTM(), scale = matrix ? Math.hypot(matrix.a, matrix.b) : 1;
      const radius = Math.max(HIT, 22 / (scale || 1));
      const near = (p) => Math.hypot(PM.X(p[0]) - x, PM.Y(p[1]) - y) <= radius;
      let kind = null, which = null;
      if (st.line) which = ['p', 'q'].filter((k) => near(st.line[k])).sort((a, b) =>
        Math.hypot(PM.X(st.line[a][0]) - x, PM.Y(st.line[a][1]) - y) - Math.hypot(PM.X(st.line[b][0]) - x, PM.Y(st.line[b][1]) - y))[0] || null;
      if (which) kind = 'handle';
      else if (st.edit && POINTS.findIndex(near) >= 0) { kind = 'point'; which = POINTS.findIndex(near); }
      else if (st.lineOn && !st.line) {
        const p = PM.inv(x, y);
        if (p[0] < LO || p[0] > HI || p[1] < LO || p[1] > HI) return;
        kind = 'draw';
      }
      if (!kind) return;
      ev.preventDefault();
      ev.stopPropagation();
      svg.setPointerCapture(ev.pointerId);
      st.press = { kind, which, id: ev.pointerId, x, y, start: clampP(PM.inv(x, y)), moved: false,
        beforeLine: st.line ? { p: st.line.p.slice(), q: st.line.q.slice() } : null,
        beforePending: st.pending ? st.pending.slice() : null };
    });
    svg.addEventListener('pointermove', (ev) => {
      const pr = st.press;
      if (!pr || pr.id !== ev.pointerId) return;
      const [x, y] = svgPoint(svg, ev);
      if (Math.hypot(x - pr.x, y - pr.y) > 10) pr.moved = true;
      if (!pr.moved) return;
      const p = clampP(PM.inv(x, y));
      if (pr.kind === 'handle') {
        const other = st.line[pr.which === 'p' ? 'q' : 'p'];
        if (far(p, other)) { st.line[pr.which] = p; drawPlane(st); }
      } else if (pr.kind === 'draw' && far(p, pr.start)) {
        st.pending = null; st.line = { p: pr.start, q: p }; pr.drawing = true; drawPlane(st);
      }
    });
    const end = (ev, cancel) => {
      const pr = st.press;
      if (!pr || pr.id !== ev.pointerId) return;
      st.press = null;
      if (cancel) { st.line = pr.beforeLine; st.pending = pr.beforePending; drawPlane(st); return; }
      const p = clampP(PM.inv(...svgPoint(svg, ev)));
      if (pr.kind === 'point' && !pr.moved) {
        st.marks[pr.which] = 1 - st.marks[pr.which];
      } else if (pr.kind === 'draw') {
        if (pr.drawing) st.count++;
        else if (!pr.moved) {
          if (st.pending && far(st.pending, p)) { st.line = { p: st.pending, q: p }; st.pending = null; st.count++; }
          else st.pending = p;
        }
      }
      store(st);
      drawPlane(st);
    };
    svg.addEventListener('pointerup', (ev) => end(ev, false));
    svg.addEventListener('pointercancel', (ev) => end(ev, true));
  }

  /* ---------------------------------------------------------------- 4-2 (2) 선분 (xor-seg) */
  function mountSeg(el) {
    const marks = (el.dataset.labels || '0110').split('').map(Number);
    const M = PM;
    const seg = (p, q, cls, k) => `<line class="${cls} pl-k" data-k="${k}" x1="${M.X(p[0])}" y1="${M.Y(p[1])}" x2="${M.X(q[0])}" y2="${M.Y(q[1])}"/>`;
    const on = POINTS.filter((p, i) => marks[i] === 1), off = POINTS.filter((p, i) => marks[i] === 0);
    /* 보조 그림(단계 4): 직선 하나의 같은 쪽에 있는 두 점을 이은 선분은 그 직선을 건너지 않는다 */
    const I = mapper(452, 72, 125);
    const L = lineThrough([-0.5, 0.95], [1.5, 0.25]);
    const [ha, hb] = halves(L), s = segmentIn(L);
    const A2 = [[-0.15, 1.2], [0.95, 1.05]], B2 = [[0.15, 0.05], [1.2, -0.15]];
    const inset = `<g class="pl-k" data-k="4">
      <polygon class="pl-side-a" points="${pts(I, ha)}"/><polygon class="pl-side-b" points="${pts(I, hb)}"/>
      <rect class="pl-frame" x="${I.X(LO)}" y="${I.Y(HI)}" width="${2 * 125}" height="${2 * 125}"/>
      <line class="pl-line" x1="${I.X(s[0][0])}" y1="${I.Y(s[0][1])}" x2="${I.X(s[1][0])}" y2="${I.Y(s[1][1])}"/>
      <line class="pl-seg" x1="${I.X(A2[0][0])}" y1="${I.Y(A2[0][1])}" x2="${I.X(A2[1][0])}" y2="${I.Y(A2[1][1])}"/>
      <line class="pl-seg off" x1="${I.X(B2[0][0])}" y1="${I.Y(B2[0][1])}" x2="${I.X(B2[1][0])}" y2="${I.Y(B2[1][1])}"/>
      ${A2.map((p) => dot(I.X(p[0]), I.Y(p[1]), true)).join('')}${B2.map((p) => dot(I.X(p[0]), I.Y(p[1]), false)).join('')}</g>`;
    const mid = [0.5, 0.5];
    el.innerHTML = `<svg viewBox="0 0 720 ${PH}" role="img" aria-label="좌표평면과 선분">
      ${paper(M)}${axes(M)}
      ${seg(on[0], on[1], 'pl-seg', 1)}${seg(off[0], off[1], 'pl-seg off', 2)}
      ${POINTS.map((p, i) => dot(M.X(p[0]), M.Y(p[1]), marks[i] === 1) + coordLabel(M, p)).join('')}
      <g class="pl-k" data-k="3"><circle class="pl-ring" cx="${M.X(0.5)}" cy="${M.Y(0.5)}" r="11"/>
        ${txt(M.X(0.5) + 22, M.Y(0.5), '(0.5, 0.5)', { anchor: 'start' })}</g>
      ${inset}</svg>`;
    el._pl = { kind: 'step', attr: 'data-pl-step' };
  }

  /* ---------------------------------------------------------------- 진리표 → 점 (to-plane, fig11) */
  const ROWS = [[0, 0, 0], [0, 1, 1], [1, 0, 0], [1, 1, 0]];   // 2-1 회로 (NOT A) AND B
  function mountTotable(el) {
    const cw = 80, rh = 52, tx = 10, ty = 67;
    const M = mapper(320, 40);
    let s = `<svg viewBox="0 0 700 ${PH}" role="img" aria-label="진리표와 좌표평면">${paper(M)}${axes(M)}`;
    ROWS.forEach((r, i) => { s += `<rect class="pl-rowhi pl-k" data-k="${i + 1}" data-only="1" x="${tx - 3}" y="${ty + (i + 1) * rh - 3}" width="${3 * cw + 6}" height="${rh + 6}" rx="6"/>`; });
    [[v('A'), ''], [v('B'), ''], ['출력', ' pl-b']].forEach(([h, b], j) => {
      s += `<rect class="pl-th" x="${tx + j * cw}" y="${ty}" width="${cw}" height="${rh}"/>${txt(tx + j * cw + cw / 2, ty + rh / 2, h, { cls: `pl-thv${b}`, size: j < 2 ? 26 : 22 })}`;
    });
    ROWS.forEach((r, i) => r.forEach((val, j) => {
      s += `<rect class="pl-td" x="${tx + j * cw}" y="${ty + (i + 1) * rh}" width="${cw}" height="${rh}"/>${txt(tx + j * cw + cw / 2, ty + (i + 1.5) * rh, val, { size: 24 })}`;
    }));
    /* 점은 출력 칸에서 출발해 평면의 자리로 옮겨 간다 */
    ROWS.forEach((r, i) => {
      const sx = tx + 2.5 * cw, sy = ty + (i + 1.5) * rh, gx = M.X(r[0]), gy = M.Y(r[1]);
      s += `<g class="pl-tok" data-k="${i + 1}" data-from="${sx},${sy}" data-to="${gx},${gy}" style="transform: translate(${sx}px, ${sy}px)">${dot(0, 0, r[2] === 1)}</g>`;
      s += `<g class="pl-k pl-late" data-k="${i + 1}">${coordLabel(M, r)}</g>`;
    });
    el.innerHTML = `${s}</svg>`;
    el._pl = { kind: 'step', attr: 'data-pl-step' };
  }

  /* 단계에 맞춰 보이기(.on)와 점 옮기기 */
  function setStep(el, step) {
    el.querySelectorAll('.pl-k').forEach((g) => {
      const k = +g.dataset.k;
      g.classList.toggle('on', g.dataset.only ? k === step : k <= step);
    });
    el.querySelectorAll('.pl-tok').forEach((g) => {
      const on = +g.dataset.k <= step;
      const [x, y] = g.dataset[on ? 'to' : 'from'].split(',');
      g.classList.toggle('on', on);
      g.style.transform = `translate(${x}px, ${y}px)`;
    });
  }

  /* ---------------------------------------------------------------- 접기·펼치기 (4-3) */
  const D = Math.PI / 180;
  /* 단계별 모습: theta 접은 각, line 예시 직선, cut 자른 조각이 떨어져 나간 정도, fin 두 직선과 띠 */
  const FOLD = [
    { theta: 0, line: 0, cut: 0, fin: 0 },          // 0 펼친 평면과 접는 선(학습지 ①)
    { theta: 55 * D, line: 0, cut: 0, fin: 0 },     // 1 접기 시작
    { theta: 130 * D, line: 0, cut: 0, fin: 0 },    // 2 반쯤(학습지 ②)
    { theta: 180 * D, line: 0, cut: 0, fin: 0 },    // 3 다 접음(학습지 ③): ○ 두 점이 겹친다
    { theta: 180 * D, line: 1, cut: 0, fin: 0 },    // 4 예시 직선 A+B=1.5
    { theta: 180 * D, line: 1, cut: 1, fin: 0 },    // 5 두 겹을 함께 자른다
    { theta: 0, line: 1, cut: 1, fin: 0 },          // 6 펼친다
    { theta: 0, line: 1, cut: 1, fin: 1 },          // 7 두 직선과 띠(학습지 ④)
  ];
  PL.FOLD = FOLD;
  const FM = mapper(24, 64);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  function drawFold(el, s) {
    const M = FM, t = s.theta, P = (p) => `${M.X(p[0])},${M.Y(p[1])}`;
    /* 종이의 변. 펼쳐 있을 때는 접는 선 위의 변을 빼서 접는 선이 점선으로 보이게 하고, 접기 시작하면 접힌 변이 된다 */
    const flat = t < 0.01;
    const edges = (poly, proj = (p) => p) => `<path class="pl-edge" d="${poly.map((p, i) => {
      const q = poly[(i + 1) % poly.length];
      if (flat && Math.abs(p[0] + p[1] - 1) < 1e-9 && Math.abs(q[0] + q[1] - 1) < 1e-9) return '';
      const a = proj(p), b = proj(q);
      return `M${M.X(a[0])} ${M.Y(a[1])}L${M.X(b[0])} ${M.Y(b[1])}`;
    }).join('')}"/>`;
    const cut = s.cut > 0, pc = foldPieces();
    const upper = cut ? pc.upperKeep : UPPER, flap = cut ? pc.flapKeep : LOWER;
    const back = Math.cos(t) < 0;                   // 반 넘게 넘어가면 뒷면(회색)이 보인다
    let g = '';
    if (s.fin > 0) {
      /* 떨어져 나간 귀퉁이 자리와 ○ 자리(점선), 띠 */
      g += `<g opacity="${s.fin}"><polygon class="pl-ghost" points="${pts(M, pc.upperCut)}"/><polygon class="pl-ghost" points="${pts(M, pc.flapCut)}"/>
        <circle class="pl-ghost" cx="${M.X(0)}" cy="${M.Y(0)}" r="${R}"/><circle class="pl-ghost" cx="${M.X(1)}" cy="${M.Y(1)}" r="${R}"/></g>`;
    }
    g += `<polygon class="pl-paper" points="${pts(M, upper)}"/>${edges(upper)}`;
    /* 원점 쪽 반이 있던 자리(학습지 ②의 점선) */
    const ghostOp = clamp01(Math.min(t / 0.3, (Math.PI - t) / 0.3));
    if (ghostOp > 0) g += `<g opacity="${f1(ghostOp)}"><polygon class="pl-ghost" points="${pts(M, flap)}"/><circle class="pl-ghost" cx="${M.X(0)}" cy="${M.Y(0)}" r="${R}"/></g>`;
    g += `<polygon class="pl-paper${back ? ' back' : ''}" points="${flap.map((p) => P(foldAt(p, t))).join(' ')}"/>${edges(flap, (p) => foldAt(p, t))}`;
    if (s.fin > 0) g += `<g opacity="${s.fin}"><polygon class="pl-band" points="${pts(M, pc.band)}"/>${axes(M, false)}</g>`;
    /* 접는 선 */
    g += `<line class="pl-crease" x1="${M.X(LO)}" y1="${M.Y(HI)}" x2="${M.X(HI)}" y2="${M.Y(LO)}"/>`;
    /* 예시 직선(위쪽 반 위)과, 자른 뒤에는 원점 쪽 반의 잘린 자리 */
    const [c1, c2] = cutLines(FOLD_CUT).map((L) => segmentIn(L));
    if (s.line > 0) g += `<line class="pl-cutline" opacity="${s.line}" x1="${M.X(c1[0][0])}" y1="${M.Y(c1[0][1])}" x2="${M.X(c1[1][0])}" y2="${M.Y(c1[1][1])}"/>`;
    if (cut) { const a = foldAt(c2[0], t), b = foldAt(c2[1], t); g += `<line class="pl-cutline" x1="${M.X(a[0])}" y1="${M.Y(a[1])}" x2="${M.X(b[0])}" y2="${M.Y(b[1])}"/>`; }
    /* 접는 방향(학습지 ①의 화살표) */
    const arrowOp = cut ? 0 : clamp01(1 - t / 0.25);
    if (arrowOp > 0) {
      const p0 = [M.X(-0.05), M.Y(-0.3)], c = [M.X(-0.45), M.Y(0.95)], p1 = [M.X(0.75), M.Y(1.05)];
      const ang = Math.atan2(p1[1] - c[1], p1[0] - c[0]), h = 15, bx = p1[0] - h * Math.cos(ang), by = p1[1] - h * Math.sin(ang);
      const nx = -Math.sin(ang) * h * 0.45, ny = Math.cos(ang) * h * 0.45;
      g += `<g opacity="${f1(arrowOp)}"><path class="pl-arrow" d="M ${f1(p0[0])} ${f1(p0[1])} Q ${f1(c[0])} ${f1(c[1])} ${f1(bx)} ${f1(by)}"/>
        <polygon class="pl-arrowhead" points="${f1(p1[0])},${f1(p1[1])} ${f1(bx + nx)},${f1(by + ny)} ${f1(bx - nx)},${f1(by - ny)}"/></g>`;
    }
    /* 점: ● 두 점은 접는 선 위라 제자리, ○ (0, 0)은 접히는 반과 함께 움직인다 */
    g += dot(M.X(0), M.Y(1), true) + dot(M.X(1), M.Y(0), true);
    if (!cut) { const m = foldAt([0, 0], t); g += dot(M.X(1), M.Y(1), false) + dot(M.X(m[0]), M.Y(m[1]), false); }
    /* 자른 귀퉁이(두 겹)가 떨어져 나간다 */
    if (s.cut > 0 && s.cut < 1) {
      const d = s.cut * 0.4 * Math.SQRT1_2, mv = (p) => [p[0] + d, p[1] + d];
      g += `<g opacity="${f1(1 - s.cut)}"><polygon class="pl-paper back" points="${pts(M, pc.upperCut.map(mv))}"/>${edges(pc.upperCut.map(mv))}${dot(M.X(1 + d), M.Y(1 + d), false)}</g>`;
    }
    /* 좌표 이름표(학습지 ①·③과 같은 자리) */
    const lab00 = cut ? 0 : clamp01(1 - t / 0.4), lab11 = lab00;
    const both = cut ? 0 : clamp01((t - (Math.PI - 0.4)) / 0.4), side = cut ? 1 : both;
    if (lab00 > 0) g += txt(M.X(0) + 14, M.Y(0) + 22, '(0, 0)', { anchor: 'start', op: f1(lab00) });
    if (lab11 > 0) g += txt(M.X(1), M.Y(1) + 30, '(1, 1)', { op: f1(lab11) });
    if (both > 0) g += txt(M.X(1), M.Y(1) - 26, '(0, 0)과 (1, 1)', { op: f1(both) });
    if (side > 0) g += txt(M.X(0) - 14, M.Y(1) - 16, '(0, 1)', { anchor: 'end', op: f1(side) }) + txt(M.X(1) + 14, M.Y(0) + 22, '(1, 0)', { anchor: 'start', op: f1(side) });
    if (s.fin > 0) {
      g += txt(M.X(1.0), M.Y(1.32), `${v('A')} + ${v('B')} = 1.5`, { op: s.fin });
      g += txt(M.X(1.0), M.Y(LO) + 26, `${v('A')} + ${v('B')} = 0.5`, { op: s.fin });
    }
    el.querySelector('.pl-live').innerHTML = g;
  }

  function mountFold(el) {
    el.innerHTML = '<svg viewBox="0 0 550 456" role="img" aria-label="평면 접기"><g class="pl-live"></g></svg>';
    const from = +el.dataset.from || 0;
    el._pl = { kind: 'fold', from, step: from, now: { ...FOLD[from] }, raf: 0 };
    drawFold(el, el._pl.now);
  }

  /* 지금 모습에서 목표 단계의 모습으로 옮겨 간다(값을 함께 보간) */
  function foldTo(el, step, jump) {
    const st = el._pl, goal = FOLD[step];
    st.step = step;
    cancelAnimationFrame(st.raf);
    if (jump) { st.now = { ...goal }; drawFold(el, st.now); return; }
    const from = { ...st.now }, t0 = performance.now(), dur = 1200;
    const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
    const tick = (now) => {
      const k = ease(Math.min(1, (now - t0) / dur));
      Object.keys(goal).forEach((key) => { st.now[key] = from[key] + (goal[key] - from[key]) * k; });
      /* 자르기를 되돌릴 때 귀퉁이가 다 돌아오면 자르기 전 모습 */
      if (goal.cut === 0 && k === 1) st.now.cut = 0;
      drawFold(el, st.now);
      if (k < 1) st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);
  }

  /* ---------------------------------------------------------------- 부품 등록 */
  let lastSlide = null;
  const part = {
    name: 'plane',
    mount(root) {
      root.querySelectorAll('.pl-plane').forEach(mountPlane);
      root.querySelectorAll('.pl-totable').forEach(mountTotable);
      root.querySelectorAll('.pl-fold').forEach(mountFold);
      root.querySelectorAll('.pl-plane, .pl-totable, .pl-fold').forEach((el) => el.setAttribute('data-prevent-swipe', ''));
    },
    sync(slide) {
      const jump = slide !== lastSlide;
      lastSlide = slide;
      planes.forEach((st) => { if (st.pending && !slide.contains(st.el)) { st.pending = null; drawPlane(st); } });
      slide.querySelectorAll('.pl-plane, .pl-totable, .pl-fold').forEach((el) => {
        const st = el._pl;
        if (!st) return;
        if (st.kind === 'step') {
          const step = stepOf(slide, st.attr);
          if (jump) jumpTo(el, () => setStep(el, step)); else setStep(el, step);
        } else {
          const step = Math.min(FOLD.length - 1, Math.max(st.from, stepOf(slide, 'data-fold-step')));
          if (jump || step !== st.step) foldTo(el, step, jump);
        }
      });
    },
    reset() {
      clearAll();
      planes.forEach((st) => { st.init(); st.press = null; drawPlane(st); });
    },
  };

  if (typeof window !== 'undefined') {
    window.PL = PL;
    (window.PARTS = window.PARTS || []).push(part);
  }
  if (typeof module === 'object') module.exports = PL;
})();
