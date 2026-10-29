/* ⑥·⑦ 그림 정의 (원고 06-projection.md, 07-gradient-descent.md, scripts/make_figures_06_07.py와 같은 수치) */
(function () {
  const F = (window.FIGS = window.FIGS || {});
  const { COL, Plot, Cam, surface, heightColor, polyline3, text, arrowPx } = window.PLOT;
  const box = (c, l = 50, t = 40, r = 20, b = 40) => ({ x: l, y: t, w: c.w - l - r, h: c.h - t - b });
  const D2 = [[1, 1], [2, 3]], D3 = [[1, 1], [2, 3], [3, 3]];
  const L = (a) => 0.5 * ((a - 1) ** 2 + (2 * a - 3) ** 2), dL = (a) => 5 * a - 7;
  const S = (a, b) => D3.reduce((s, [x, y]) => s + (y - a * x - b) ** 2, 0), M3 = (a, b) => S(a, b) / 3;
  const fmt = (v, d = 3) => (+v.toFixed(d)).toString().replace('-', '−');
  const V1 = [1, 2, 3], V2 = [1, 1, 1], Y3 = [1, 3, 3];
  const pred = (a, b) => V1.map((v, i) => a * v + b * V2[i]);
  function descend(eta, a0, n) { const p = [a0]; for (let k = 0; k < n; k++) p.push(p[k] - eta * dL(p[k])); return p; }
  function descend2(a, b, eta, n) { const p = [[a, b]]; for (let k = 0; k < n; k++) { const ga = D3.reduce((s, [x, y]) => s - 2 * x * (y - a * x - b), 0) / 3, gb = D3.reduce((s, [x, y]) => s - 2 * (y - a * x - b), 0) / 3; a -= eta * ga; b -= eta * gb; p.push([a, b]); } return p; }
  function rightAngle(P, p, u, w, s = 12) { const g = P.g, X = P.X(p[0]), Y = P.Y(p[1]); g.save(); g.strokeStyle = COL.axis; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X + u[0] * s, Y - u[1] * s); g.lineTo(X + (u[0] + w[0]) * s, Y - (u[1] + w[1]) * s); g.lineTo(X + w[0] * s, Y - w[1] * s); g.stroke(); g.restore(); }

  /* ---------- P01 만들 수 있는 것들 ---------- */
  F['p01-span'] = {
    canvases: [{ h: 380 }],
    controls: [{ buttons: 'm', items: [['화살표 하나', 'one'], ['화살표 둘', 'two']], value: 'one' }, { range: 'a', label: '(1, 2)의 배수 a', min: -0.5, max: 2, step: 0.05, value: 0.5, fmt: (v) => v.toFixed(2) }],
    readout: (s) => (s.v.m === 'one' ? `a(1, 2) = <b>(${fmt(s.v.a, 2)}, ${fmt(2 * s.v.a, 2)})</b> — 목표 (1, 3)에 닿지 않는다` : '1.5 × (1, 2) − 0.5 × (1, 0) = <b>(1, 3)</b>'),
    draw(st, [c]) {
      const P = Plot(c.g, box(c, 50, 20, 20, 40), [-0.8, 3.4], [-0.6, 4.4], { equal: true });
      P.frame({ xt: [0, 1, 2, 3], yt: [0, 1, 2, 3, 4] });
      P.seg(-0.3, -0.6, 2.2, 4.4, COL.exact, 1.6, [6, 5]);
      P.dot(1, 3, 8, COL.time); P.text(1, 3, '목표 (1, 3)', { size: 19, bold: true, col: COL.timeText, align: 'right', dx: -12 });
      if (st.v.m === 'one') { P.arrow(0, 0, st.v.a, 2 * st.v.a, COL.space, 3.5); P.dot(st.v.a, 2 * st.v.a, 6, COL.space); P.text(2.2, 4.4, '닿을 수 있는 곳: 직선 y = 2x', { size: 18, col: COL.muted, align: 'right', dy: 26 }); }
      else { P.arrow(0, 0, 1.5, 3, COL.space, 3.5); P.arrow(1.5, 3, 1, 3, COL.good, 3.5); P.arrow(0, 0, 1, 0, COL.good, 3); P.text(1, 0, '(1, 0)', { size: 18, col: COL.good, dy: 24 }); P.text(1.5, 3, '(1, 2)의 1.5배', { size: 18, col: COL.space, dx: 10 }); }
    },
  };

  /* ---------- P02 가장 가까운 점 = 수선의 발 ---------- */
  F['p02-foot'] = {
    canvases: [{ h: 400 }],
    controls: [{ range: 'a', label: '직선 위의 점 (a, 2a)', min: 0, max: 2.2, step: 0.01, value: 1, fmt: (v) => v.toFixed(2) }, { buttons: 'q', items: [['a = 1', 1], ['a = 2', 2], ['a = 7/5', 1.4]], act: (s, v) => { s.v.a = v; s.el.querySelector('[data-r=a]').value = v; } }],
    readout: (s) => { const d = Math.hypot(s.v.a - 1, 2 * s.v.a - 3); return `거리 <b>${d.toFixed(3)}</b>${Math.abs(s.v.a - 1.4) < 0.006 ? ' · 가장 가깝다: 연결선 기울기 −1/2, 직선 기울기 2 → 곱 −1' : ''}`; },
    draw(st, [c]) {
      const a = st.v.a, P = Plot(c.g, box(c, 50, 20, 20, 40), [-0.4, 3.2], [-0.3, 4.4], { equal: true });
      P.frame({ xt: [0, 1, 2, 3], yt: [0, 1, 2, 3, 4] });
      P.seg(-0.15, -0.3, 2.2, 4.4, COL.space, 3);
      P.seg(a, 2 * a, 1, 3, COL.time, 3);
      P.dot(a, 2 * a, 8, COL.time); P.dot(1, 3, 8, COL.ink);
      P.text(1, 3, '목표 (1, 3)', { size: 19, bold: true, align: 'right', dx: -12, dy: -6 });
      if (Math.abs(a - 1.4) < 0.006) { const n = Math.hypot(1, 2); rightAngle(P, [1.4, 2.8], [1 / n, 2 / n], [-0.4 / Math.sqrt(0.2), 0.2 / Math.sqrt(0.2)]); }
    },
  };

  /* ---------- P03 데이터 맞추기 = 같은 문제 ---------- */
  F['p03-same'] = {
    canvases: [{ h: 360 }, { h: 360 }],
    controls: [{ range: 'a', label: '기울기 a', min: 0.5, max: 2.2, step: 0.01, value: 0.8, fmt: (v) => v.toFixed(2) }, { buttons: 'q', items: [['1', 1], ['7/5', 1.4], ['2', 2]], act: (s, v) => { s.v.a = v; s.el.querySelector('[data-r=a]').value = v; } }],
    readout: (s) => { const a = s.v.a, e1 = 1 - a, e2 = 3 - 2 * a; return `세로 오차 ${fmt(e1, 2)}, ${fmt(e2, 2)} · 제곱의 합 <b>${(e1 * e1 + e2 * e2).toFixed(3)}</b> = 오른쪽 거리² <b>${(Math.hypot(a - 1, 2 * a - 3) ** 2).toFixed(3)}</b>`; },
    draw(st, [c, d]) {
      const a = st.v.a, P = Plot(c.g, box(c, 50, 36, 20, 40), [0, 2.6], [0, 4.4]);
      P.frame({ xt: [0, 1, 2], yt: [0, 1, 2, 3, 4], title: `데이터와 직선 y = ${a.toFixed(2)}x`, xl: 'x' });
      P.fn((x) => a * x, COL.space, 3.5);
      D2.forEach(([x, y]) => { P.seg(x, y, x, a * x, COL.time, 3); P.dot(x, y, 8, COL.ink); P.dot(x, a * x, 5, COL.space); });
      const Q = Plot(d.g, box(d, 50, 36, 20, 40), [-0.4, 3.2], [-0.3, 4.4], { equal: true });
      Q.frame({ xt: [0, 1, 2, 3], yt: [0, 1, 2, 3, 4], title: '예측값을 모은 점 (a, 2a)과 실제 (1, 3)' });
      Q.seg(-0.15, -0.3, 2.2, 4.4, COL.space, 2.5);
      Q.seg(a, 2 * a, 1, 3, COL.time, 3); Q.dot(a, 2 * a, 8, COL.space); Q.dot(1, 3, 8, COL.ink);
    },
  };

  /* ---------- 3차원 공용: 평면과 수선 ---------- */
  function planeScene(g, P, a, b, opt = {}) {
    for (let k = 0; k < 4; k++) { polyline3(g, P, [[k, 0, 0], [k, 3.5, 0]], '#e3e9f0', 1); polyline3(g, P, [[0, k, 0], [3.5, k, 0]], '#e3e9f0', 1); }
    [[[3.4, 0, 0], '첫째'], [[0, 4.4, 0], '둘째'], [[0, 0, 4.3], '셋째']].forEach(([v, s]) => { const [x1, y1] = P(...v), [x0, y0] = P(0, 0, 0); arrowPx(g, x0, y0, x1, y1, COL.axis, 1.6); text(g, x1 + 6, y1 - 4, s, { size: 17, col: COL.axis, bold: true }); });
    const pl = (x1, x3) => [x1, (x1 + x3) / 2, x3], m = 3.5;
    g.save(); g.globalAlpha = 0.16; g.fillStyle = COL.space; g.beginPath(); [pl(0, 0), pl(m, 0), pl(m, m), pl(0, m)].forEach((q, k) => { const [X, Y] = P(...q); k ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); g.fill(); g.restore();
    for (let k = 1; k < 4; k++) { polyline3(g, P, [pl(k, 0), pl(k, m)], '#9fb6cf', 0.8); polyline3(g, P, [pl(0, k), pl(m, k)], '#9fb6cf', 0.8); }
    const O = P(0, 0, 0);
    [[V1, COL.space], [V2, COL.good]].forEach(([v, col]) => { const [X, Y] = P(...v); arrowPx(g, O[0], O[1], X, Y, col, 3); });
    const p = pred(a, b);
    [Y3, p].forEach((q) => polyline3(g, P, [q, [q[0], q[1], 0]], COL.muted, 1, [3, 3]));
    polyline3(g, P, [p, Y3], COL.time, 3.2);
    const [px, py] = P(...p), [tx, ty] = P(...Y3);
    g.fillStyle = COL.space; g.beginPath(); g.arc(px, py, 7, 0, 7); g.fill();
    g.fillStyle = COL.ink; g.beginPath(); g.arc(tx, ty, 7, 0, 7); g.fill();
    if (!opt.small) text(g, tx + 10, ty - 8, '실제 (1, 3, 3)', { size: 18, bold: true });
    if (Math.abs(a - 1) < 0.006 && Math.abs(b - 1 / 3) < 0.006) {
      const e = Y3.map((v, i) => v - p[i]), ne = Math.hypot(...e), dv = [-1, 0, 1].map((v) => v / Math.SQRT2), z = 0.22;
      polyline3(g, P, [p.map((v, i) => v + z * e[i] / ne), p.map((v, i) => v + z * (e[i] / ne + dv[i])), p.map((v, i) => v + z * dv[i])], COL.axis, 1.5);
    }
  }
  const setAB = (s, a, b) => { s.v.a = a; s.v.b = b; const ra = s.el.querySelector('[data-r=a]'), rb = s.el.querySelector('[data-r=b]'); if (ra) ra.value = a; if (rb) rb.value = b; };

  /* ---------- P04 공간 속의 평면 ---------- */
  F['p04-plane'] = {
    canvases: [{ h: 420, flex: 0.8 }, { h: 420, flex: 1.4 }], rotate: true, az: 335, el: 25,
    controls: [{ range: 'a', label: 'a', min: 0, max: 2, step: 0.01, value: 0.5, fmt: (v) => v.toFixed(2) }, { range: 'b', label: 'b', min: -1, max: 1.5, step: 0.01, value: 1, fmt: (v) => v.toFixed(2) }, { button: 'best', label: '수선의 발로', act: (s) => setAB(s, 1, 1 / 3) }],
    readout: (s) => `오차 길이² = 세로 오차 제곱의 합 <b>${S(s.v.a, s.v.b).toFixed(3)}</b>`,
    draw(st, [c, d]) {
      const a = st.v.a, b = st.v.b, P = Plot(c.g, box(c, 44, 36, 16, 40), [0, 3.6], [0, 4.4]);
      P.frame({ xt: [0, 1, 2, 3], yt: [0, 1, 2, 3, 4], title: `y = ${a.toFixed(2)}x + ${b.toFixed(2)}`, xl: 'x' });
      P.fn((x) => a * x + b, COL.space, 3);
      D3.forEach(([x, y]) => { P.seg(x, y, x, a * x + b, COL.time, 3); P.dot(x, y, 7, COL.ink); });
      const C3 = Cam(d.w * 0.36, d.h * 0.72, Math.min(d.w, d.h) * 0.15, st.az, st.el3);
      planeScene(d.g, C3, a, b);
      text(d.g, d.w - 16, 28, '두 화살표가 만드는 평면 (끌어서 돌리기)', { size: 18, bold: true, align: 'right', col: COL.axis });
    },
  };

  /* ---------- 그릇: S(a, b) = Smin + ΔᵀMΔ ---------- */
  const EIG = (() => { const tr = 17, det = 6, l1 = (tr + Math.sqrt(tr * tr - 4 * det)) / 2, l2 = (tr - Math.sqrt(tr * tr - 4 * det)) / 2; let v1 = [6, l1 - 14]; const n = Math.hypot(...v1); v1 = v1.map((t) => t / n); return { l1, l2, v1, v2: [-v1[1], v1[0]] }; })();
  function bowl(g, P, scale, C = 2.5) {
    const { l1, l2, v1, v2 } = EIG, smin = S(1, 1 / 3);
    const at = (r, t) => { const p1 = r * Math.sqrt(C / l1) * Math.cos(t), p2 = r * Math.sqrt(C / l2) * Math.sin(t); return [1 + p1 * v1[0] + p2 * v2[0], 1 / 3 + p1 * v1[1] + p2 * v2[1], (smin + r * r * C) * scale]; };
    for (let a = -0.25; a <= 2.26; a += 0.5) polyline3(g, P, [[a, -2, 0], [a, 3, 0]], '#e3e9f0', 1);
    for (let b = -2; b <= 3.01; b += 0.5) polyline3(g, P, [[-0.25, b, 0], [2.25, b, 0]], '#e3e9f0', 1);
    polyline3(g, P, [[-0.25, -2, 0], [2.6, -2, 0]], COL.axis, 1.5); polyline3(g, P, [[-0.25, -2, 0], [-0.25, 3.4, 0]], COL.axis, 1.5);
    const [ax, ay] = P(2.7, -2, 0), [bx, by] = P(-0.25, 3.6, 0);
    text(g, Math.min(ax + 6, g.canvas.width / g.getTransform().a - 90), ay + 4, '기울기 a', { size: 18, bold: true }); text(g, Math.max(bx - 6, 74), by + 4, '절편 b', { size: 18, bold: true, align: 'right' });
    surface(g, P, 8, 40, (i, j) => at(i / 8, 2 * Math.PI * j / 40), (cz) => heightColor(Math.min(1, (cz / scale - smin) / C), 1), '#7b8794', 0.5);
    return smin * scale;
  }
  const bowlCam = (c, az, el, k = 1) => Cam(c.w / 2, c.h * 0.74, Math.min(c.w, c.h) * 0.34 * k, az, el, 1, 0.5, 0.28);

  /* ---------- P05 세 화면 동기화 ---------- */
  F['p05-bowl'] = {
    canvases: [{ h: 380 }, { h: 380 }, { h: 380 }], rotate: true, az: 215, el: 30,
    controls: [{ range: 'a', label: 'a', min: 0.3, max: 1.7, step: 0.01, value: 0.6, fmt: (v) => v.toFixed(2) }, { range: 'b', label: 'b', min: -1, max: 1.8, step: 0.01, value: 1.2, fmt: (v) => v.toFixed(2) }, { button: 'best', label: '바닥으로', go: true, act: (s) => setAB(s, 1, 1 / 3) }],
    readout: (s) => `거리² = 그릇의 높이 S <b>${S(s.v.a, s.v.b).toFixed(3)}</b>${Math.abs(s.v.a - 1) < 0.006 && Math.abs(s.v.b - 1 / 3) < 0.006 ? ' (가장 작다 2/3)' : ''}`,
    draw(st, [c, d, e]) {
      const a = st.v.a, b = st.v.b, at = Math.abs(a - 1) < 0.006 && Math.abs(b - 1 / 3) < 0.006;
      const P = Plot(c.g, box(c, 44, 40, 14, 40), [0, 3.6], [0, 4.4]);
      P.frame({ xt: [0, 1, 2, 3], yt: [0, 2, 4], title: '① 추세선', xl: 'x' });
      P.fn((x) => a * x + b, COL.space, 3); D3.forEach(([x, y]) => { P.seg(x, y, x, a * x + b, COL.time, 3); P.dot(x, y, 7, COL.ink); });
      planeScene(d.g, Cam(d.w * 0.33, d.h * 0.74, Math.min(d.w, d.h) * 0.14, st.az + 120, st.el3), a, b, { small: true });
      text(d.g, d.w / 2, 28, '② 평면 위의 예측점', { size: 19, bold: true, align: 'center', col: COL.space });
      const B = bowlCam(e, st.az, st.el3, 0.86), zb = bowl(e.g, B, 1);
      const [X, Y] = B(a, b, S(a, b)), [X0, Y0] = B(a, b, 0);
      e.g.save(); e.g.strokeStyle = COL.muted; e.g.setLineDash([3, 3]); e.g.beginPath(); e.g.moveTo(X, Y); e.g.lineTo(X0, Y0); e.g.stroke(); e.g.restore();
      if (at) { const q = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sa, sb]) => B(1 + sa * 0.2, 1 / 3 + sb * 0.5, zb)); e.g.save(); e.g.globalAlpha = 0.45; e.g.fillStyle = COL.space; e.g.beginPath(); q.forEach(([x, y], k) => (k ? e.g.lineTo(x, y) : e.g.moveTo(x, y))); e.g.closePath(); e.g.fill(); e.g.restore(); }
      e.g.fillStyle = at ? COL.good : COL.time; e.g.beginPath(); e.g.arc(X, Y, 8, 0, 7); e.g.fill();
      text(e.g, e.w / 2, 28, '③ 그릇 위의 높이 S(a, b)', { size: 19, bold: true, align: 'center', col: COL.timeText });
    },
  };

  /* ---------- G01 좋은 추세선: 오차의 제곱 = 넓이 ---------- */
  F['g01-good'] = {
    canvases: [{ h: 400 }, { h: 400 }],
    controls: [{ range: 'a', label: '기울기 a', min: 0.6, max: 2.2, step: 0.01, value: 1, fmt: (v) => v.toFixed(2) }, { buttons: 'q', items: [['1', 1], ['4/3', 4 / 3], ['7/5', 1.4], ['2', 2]], act: (s, v) => { s.v.a = v; s.el.querySelector('[data-r=a]').value = v; } }],
    readout: (s) => { const a = s.v.a, e1 = 1 - a, e2 = 3 - 2 * a; return `오차의 합 <b>${fmt(e1 + e2, 3)}</b> · 제곱의 합 <b>${(e1 * e1 + e2 * e2).toFixed(3)}</b> · 손실 L(a) <b>${L(a).toFixed(3)}</b>`; },
    draw(st, [c, d]) {
      const a = st.v.a, P = Plot(c.g, box(c, 44, 30, 14, 40), [0, 3.4], [0, 4.4], { equal: true });
      P.frame({ xt: [0, 1, 2, 3], yt: [0, 1, 2, 3, 4], xl: 'x' });
      P.fn((x) => a * x, COL.space, 3.5, 0, 2.6);
      D2.forEach(([x, y]) => { const yh = a * x, e = y - yh; P.rect(x, yh, x + Math.abs(e), y, 'rgba(217,130,43,.25)', COL.time, 1.5); P.seg(x, y, x, yh, COL.time, 3); P.dot(x, y, 8, COL.ink); });
      const Q = Plot(d.g, box(d, 56, 36, 20, 44), [0.6, 2.2], [-0.05, 1.3]);
      Q.frame({ xt: [1, 1.4, 2], yt: [0, 0.5, 1], xl: '기울기 a', title: '손실함수 L(a) = ½[(a − 1)² + (2a − 3)²]', tfs: 18 });
      Q.fn(L, COL.space, 3.5);
      Q.dot(a, L(a), 9, COL.time);
      if (Math.abs(a - 1.4) < 0.006) Q.text(1.4, 0.1, '가장 작다 (0.1)', { size: 18, bold: true, col: COL.good, dy: 30, align: 'center' });
    },
  };

  /* ---------- G02 학습률 비교 ---------- */
  const RATES = [[0.125, '다가간다', [-0.3, 2.3], 5.4], [0.3, '출렁이며 다가간다', [-0.3, 2.5], 5.4], [0.5, '튀어 나간다', [-2.4, 6.6], 60]];
  F['g02-rate'] = {
    canvases: [{ h: 360 }, { h: 360 }, { h: 360 }],
    controls: ['play', 'step', 'reset'], stepLabel: '한 번 고치기',
    init(st) { st.k = 0; }, step(st) { st.k = Math.min(st.k + 1, 6); },
    tick(st, d) { st.kf = (st.kf ?? st.k) + d * 1.2; st.k = Math.min(Math.floor(st.kf), 6); if (st.k >= 6) st.stop = true; },
    readout: (s) => `고친 횟수 <b>${s.k}</b> · a = ` + RATES.map(([eta]) => `<b>${fmt(descend(eta, 0, s.k)[s.k], 3)}</b>`).join(', '),
    draw(st, cs) {
      RATES.forEach(([eta, nm, xr, ym], j) => {
        const c = cs[j], P = Plot(c.g, box(c, 30, 40, 14, 40), xr, [-0.02 * ym, ym]);
        P.frame({ xt: j < 2 ? [0, 1.4, 2] : [-1.75, 0, 3.5, 6.125], title: `학습률 ${eta}: ${nm}`, tfs: 18, zero: false });
        P.fn(L, COL.exact, 2.5);
        const p = descend(eta, 0, st.k);
        for (let k = 0; k < st.k; k++) P.arrow(p[k], L(p[k]), p[k + 1], L(p[k + 1]), COL.time, 2.2);
        p.forEach((a, k) => P.dot(a, L(a), k === st.k ? 8 : 5, k === 0 ? COL.ink : COL.space));
      });
    },
  };

  /* ---------- G03 추세선이 점점 맞춰진다 ---------- */
  const G3 = descend(0.125, 0, 6);
  F['g03-learn'] = {
    canvases: [{ h: 360 }, { h: 360 }],
    controls: [{ button: 'one', label: '한 단계', go: true, act: (s) => { s.k = Math.min(s.k + 1, 6); fillTable(s); } }, { button: 'rs', label: '↺ 처음', act: (s) => { s.k = 0; fillTable(s); } }],
    init(st) { st.k = 0; fillTable(st); },
    readout: (s) => `고친 횟수 <b>${s.k}</b> · a = <b>${G3[s.k].toFixed(3)}</b> · 손실 <b>${L(G3[s.k]).toFixed(3)}</b>`,
    draw(st, [c, d]) {
      const P = Plot(c.g, box(c, 44, 36, 20, 40), [0, 2.6], [-0.2, 4.2]);
      P.frame({ xt: [0, 1, 2], yt: [0, 1, 2, 3, 4], title: '산점도와 추세선', xl: 'x', zero: false });
      P.fn((x) => 1.4 * x, COL.good, 1.6, 0, 2.6, 50, [6, 5]);
      for (let k = 0; k <= st.k; k++) { const t = k === st.k ? 0 : 0.7 - 0.5 * k / Math.max(1, st.k); P.fn((x) => G3[k] * x, k === st.k ? COL.bad : `rgba(176,58,46,${0.25 + 0.4 * (1 - t)})`, k === st.k ? 3.5 : 2, 0, 2.6, 50); }
      D2.forEach(([x, y]) => P.dot(x, y, 8, COL.space));
      const Q = Plot(d.g, box(d, 56, 36, 20, 44), [-0.2, 2.2], [0, 5.6]);
      Q.frame({ xt: [0, 0.875, 1.4, 2], yt: [0, 1, 2, 3, 4, 5], title: '손실함수와 경사하강 경로', xl: '기울기 a' });
      Q.fn(L, COL.axis, 2.5);
      for (let k = 0; k < st.k; k++) Q.arrow(G3[k], L(G3[k]), G3[k + 1], L(G3[k + 1]), COL.bad, 2);
      for (let k = 0; k <= st.k; k++) Q.dot(G3[k], L(G3[k]), k === st.k ? 9 : 5, k === st.k ? COL.bad : 'rgba(176,58,46,.5)');
    },
  };
  function fillTable(st) {
    const sec = st.el.closest('section'); if (!sec) return;
    sec.querySelectorAll('[data-gk]').forEach((td) => { const k = +td.dataset.gk; td.textContent = k <= st.k ? (td.dataset.row === 'a' ? G3[k].toFixed(3) : L(G3[k]).toFixed(3)) : ''; });
  }

  /* ---------- G04 계수가 둘이면: 그릇을 내려간다 ---------- */
  const G4 = descend2(0, 2, 0.15, 120);
  F['g04-bowl'] = {
    canvases: [{ h: 420, flex: 1.3 }, { h: 420 }], rotate: true, az: 215, el: 30,
    controls: ['play', 'step', 'reset'], stepLabel: '한 번 고치기',
    init(st) { st.k = 0; }, step(st) { st.k = Math.min(st.k + 1, 120); },
    tick(st, d) { st.kf = (st.kf ?? st.k) + d * (st.k < 12 ? 3 : 25); st.k = Math.min(Math.floor(st.kf), 120); if (st.k >= 120) st.stop = true; },
    readout: (s) => `고친 횟수 <b>${s.k}</b> · (a, b) = <b>(${G4[s.k][0].toFixed(3)}, ${G4[s.k][1].toFixed(3)})</b> · 손실 <b>${M3(...G4[s.k]).toFixed(3)}</b>`,
    draw(st, [c, d]) {
      const B = bowlCam(c, st.az, st.el3, 1.05);
      bowl(c.g, B, 1);   // 높이는 S(a, b) = 3 × 평균제곱오차 (P05와 같은 그릇)
      const pts = G4.slice(0, st.k + 1).map(([a, b]) => B(a, b, S(a, b)));
      c.g.save(); c.g.strokeStyle = COL.bad; c.g.lineWidth = 2.5; c.g.beginPath(); pts.forEach(([x, y], k) => (k ? c.g.lineTo(x, y) : c.g.moveTo(x, y))); c.g.stroke(); c.g.restore();
      pts.slice(0, 12).forEach(([x, y]) => { c.g.fillStyle = COL.bad; c.g.beginPath(); c.g.arc(x, y, 3.5, 0, 7); c.g.fill(); });
      const [x0, y0] = pts[0]; c.g.fillStyle = COL.ink; c.g.beginPath(); c.g.arc(x0, y0, 7, 0, 7); c.g.fill();
      text(c.g, c.w / 2, 28, '손실 L(a, b)의 그릇 위에서 걸어간 길 (끌어서 돌리기)', { size: 18, bold: true, align: 'center', col: COL.axis });
      const P = Plot(d.g, box(d, 44, 36, 20, 40), [0, 3.6], [0, 4.4]);
      P.frame({ xt: [0, 1, 2, 3], yt: [0, 1, 2, 3, 4], title: '추세선 y = ax + b', xl: 'x' });
      [0, 10, 30].filter((k) => k < st.k).forEach((k) => P.fn((x) => G4[k][0] * x + G4[k][1], 'rgba(176,58,46,.3)', 2));
      P.fn((x) => G4[st.k][0] * x + G4[st.k][1], COL.bad, 3.5);
      D3.forEach(([x, y]) => P.dot(x, y, 8, COL.space));
    },
  };

  window.U67 = {
    tests(near) {
      near(L(1), 0.5, 1e-12, 'G01 L(1)'); near(+L(4 / 3).toFixed(4), 0.1111, 1e-4, 'G01 L(4/3)'); near(+L(1.4).toFixed(6), 0.1, 1e-9, 'G01 L(7/5)');
      near(+descend(0.125, 0, 2)[2].toFixed(3), 1.203, 1e-9, 'G02 0.125 두 번'); near(descend(0.3, 0, 3)[3], 1.575, 1e-9, 'G02 0.3 세 번'); near(descend(0.5, 0, 3)[3], 6.125, 1e-9, 'G02 0.5 세 번');
      near(+L(G3[3]).toFixed(3), 0.114, 1e-9, 'G03 세 번 뒤 손실'); near(+L(G3[4]).toFixed(3), 0.102, 1e-9, 'G03 네 번 뒤 손실');
      near(+G4[120][0].toFixed(3), 0.991, 1e-9, 'G04 120번 뒤 a'); near(+G4[120][1].toFixed(3), 0.355, 1e-9, 'G04 120번 뒤 b');
      near(+S(1, 1 / 3).toFixed(6), 0.666667, 1e-6, 'P05 최솟값 2/3');
      near(14 * 1 + 6 / 3, 16, 1e-12, 'P04 정규방정식 1'); near(+Math.hypot(1.4 - 1, 2.8 - 3).toFixed(3), 0.447, 1e-9, 'P02 거리 0.447');
      near(descend(0.125, 2, 1)[1], 1.625, 1e-12, '확인 질문 7');
    },
  };
})();
