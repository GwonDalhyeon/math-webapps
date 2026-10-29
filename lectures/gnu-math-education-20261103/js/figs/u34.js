/* ③·④ 그림 정의 (원고 03-discretization.md, 04-methods.md, scripts/make_figures*.py와 같은 계산) */
(function () {
  const F = (window.FIGS = window.FIGS || {});
  const { COL, Plot, text, arrowPx } = window.PLOT;
  const W = window.Wave1D;
  const PI = Math.PI;
  const box = (c, l = 60, t = 40, r = 24, b = 44) => ({ x: l, y: t, w: c.w - l - r, h: c.h - t - b });
  const sinp = (x) => Math.sin(PI * x);

  /* 삼중대각 풀이(소거). 계산량은 미지수 개수에 비례 */
  function thomas(lo, di, up, d) {
    const n = d.length, cp = new Array(n).fill(0), dp = new Array(n).fill(0);
    cp[0] = up[0] / di[0]; dp[0] = d[0] / di[0];
    for (let i = 1; i < n; i++) { const m = di[i] - lo[i] * cp[i - 1]; cp[i] = i < n - 1 ? up[i] / m : 0; dp[i] = (d[i] - lo[i] * dp[i - 1]) / m; }
    const x = new Array(n).fill(0); x[n - 1] = dp[n - 1];
    for (let i = n - 2; i >= 0; i--) x[i] = dp[i] - cp[i] * x[i + 1];
    return x;
  }
  const d2 = (u) => u.map((v, i) => (i === 0 || i === u.length - 1 ? 0 : u[i + 1] - 2 * v + u[i - 1]));
  /* 암시적 방법: 휜 정도를 조금 전·지금·다음의 1:2:1 평균으로(원고 M03) */
  function implicit(N, r, steps, f) {
    const u0 = Array.from({ length: N + 1 }, (_, i) => f(i / N)); u0[0] = u0[N] = 0;
    const q = r * r / 4, n = N - 1;
    const lo = [0, ...new Array(n - 1).fill(-q)], di = new Array(n).fill(1 + 2 * q), up = [...new Array(n - 1).fill(-q), 0];
    const D = d2(u0);
    const hist = [u0, [0, ...thomas(lo, di, up, u0.slice(1, N).map((v, k) => v + q * D[k + 1])), 0]];
    for (let s = 1; s < steps; s++) {
      const a = hist[hist.length - 2], b = hist[hist.length - 1];
      const Ds = d2(a.map((v, i) => v + 2 * b[i]));
      hist.push([0, ...thomas(lo, di, up, b.slice(1, N).map((v, k) => 2 * v - a[k + 1] + q * Ds[k + 1])), 0]);
    }
    return hist;
  }
  window.U34 = { thomas, implicit };

  /* ---------- F01 점 몇 개로 기억하기 ---------- */
  F['f01-points'] = {
    canvases: [{ h: 380 }],
    controls: [{ buttons: 'N', label: '점의 개수', items: [['7', 7], ['13', 13], ['25', 25], ['49', 49]], value: 7 }],
    readout: (s) => `간격 <b>1/${s.v.N - 1}</b>`,
    draw(st, [c]) {
      const N = st.v.N - 1, P = Plot(c.g, box(c, 60, 30, 30, 44), [-0.02, 1.02], [-0.1, 1.15]);
      P.frame({ xt: [0, 0.5, 1], yt: [0, 0.5, 1], xl: '위치', xlAt: 'top' });
      P.fn(sinp, COL.exact, 2.4, 0, 1, 300, [7, 6]);
      for (let i = 0; i <= N; i++) {
        const x = i / N, y = sinp(x);
        P.dot(x, y, N > 30 ? 5 : 7, i === 0 || i === N ? COL.axis : COL.space);
        if (N === 6 && i > 0 && i < N) P.text(x, y, ['0.5', '0.866', '1', '0.866', '0.5'][i - 1], { size: 19, align: 'center', dy: -14, col: COL.space, bold: true });
      }
    },
  };

  /* ---------- F02 두 평균기울기 ---------- */
  F['f02-slopes'] = {
    canvases: [{ h: 380 }],
    draw(st, [c]) {
      const P = Plot(c.g, box(c, 60, 24, 300, 44), [0.3, 1.7], [0, 2.6]);
      P.frame({ xt: [0.5, 1, 1.5], yt: [0.25, 1, 2.25], xl: 'x' });
      P.fn((x) => x * x, COL.exact, 2.4);
      P.seg(0.5, 0.25, 1, 1, COL.space, 4); P.seg(1, 1, 1.5, 2.25, COL.time, 4);
      P.seg(0.5, 1.25, 1.5, 1.25, COL.exact, 1.6, [6, 5]); P.ring(1, 1.25, 7, COL.exact);
      [[0.5, 0.25], [1, 1], [1.5, 2.25]].forEach(([x, y]) => P.dot(x, y, 7, COL.ink));
      P.text(0.75, 0.62, '평균기울기 1.5', { size: 19, col: COL.space, bold: true, dx: 6, dy: 24 });
      P.text(1.25, 1.62, '평균기울기 2.5', { size: 19, col: COL.timeText, bold: true, dx: -150, dy: -14 });
      P.text(0.55, 1.25, '양옆 평균 1.25', { size: 17, col: COL.muted, dy: -8 });
      const x0 = c.w - 280, g = c.g;
      [['① 평균기울기 1.5, 2.5', COL.ink], ['② 기울기가 늘어난 빠르기', COL.ink], ['    (2.5 − 1.5) ÷ 0.5 = 2', COL.ink], ['③ 두 번 미분한 값 2와 같다', COL.good], ['가운데 1은 양옆 평균 1.25보다', COL.muted], ['0.25 낮다 → 아래로 볼록', COL.muted]]
        .forEach(([s, col], i) => text(g, x0, 60 + i * 34, s, { size: 19, col, bold: i < 4 }));
    },
  };

  /* ---------- F02 Taylor: 오차는 h²에 비례 ---------- */
  const errAt = (h) => Math.abs((Math.sin(1 + h) - 2 * Math.sin(1) + Math.sin(1 - h)) / (h * h) + Math.sin(1));
  F['f02-taylor'] = {
    canvases: [{ h: 250 }],
    controls: [{ buttons: 'h', label: '간격 h', items: [['0.4', 0.4], ['0.2', 0.2], ['0.1', 0.1], ['0.05', 0.05]], value: 0.4 }],
    readout: (s) => { const e = errAt(s.v.h), e2 = errAt(s.v.h * 2); return `y = sin x, x = 1에서 오차 <b>${window.PLOT.sci(e, 2)}</b>` + (s.v.h < 0.4 ? ` · 앞 칸의 <b>${(e / e2).toFixed(3)}</b>배` : ''); },
    draw(st, [c]) {
      const hs = [0.4, 0.2, 0.1, 0.05], L = Math.log10;
      const P = Plot(c.g, box(c, 90, 26, 30, 50), [L(0.04), L(0.5)], [L(1e-4), L(0.03)]);
      P.frame({ xt: hs.map(L), xtl: hs.map(String), yt: [-4, -3, -2].map((v) => v), ytl: ['0.0001', '0.001', '0.01'], xl: '간격 h (로그 눈금)' });
      P.path(hs.map(L), hs.map((h) => L(errAt(h))), COL.space, 2.5);
      hs.forEach((h) => P.dot(L(h), L(errAt(h)), h === st.v.h ? 10 : 6, h === st.v.h ? COL.time : COL.space));
      P.text(L(0.1), L(errAt(0.1)), 'h가 절반 → 오차 약 1/4', { size: 18, col: COL.timeText, dx: 14, dy: 26, bold: true });
    },
  };

  /* ---------- F04 공간–시간 격자와 십자 도식 ---------- */
  const XN = 12, XR = 0.5, XROWS = 8;
  const XH = W.leapfrog(XN, XR, XROWS, sinp);
  function xtDraw(st, g, c, opt) {
    const P = Plot(g, { x: 70, y: 18, w: c.w - 100, h: c.h - 60 }, [-0.5, XN + 0.5], [-0.5, XROWS + 0.5]);
    text(g, 70 + (c.w - 100) / 2, c.h - 10, '위치 (아래첨자 i) →', { size: 18, col: COL.space, align: 'center', bold: true });
    g.save(); g.translate(26, c.h / 2); g.rotate(-PI / 2); text(g, 0, 0, '시각 (위첨자 n) →', { size: 18, col: COL.timeText, align: 'center', bold: true }); g.restore();
    const known = (n, i) => n <= 1 || i === 0 || i === XN || (opt.done(n, i));
    for (let n = 0; n <= XROWS; n++) for (let i = 0; i <= XN; i++) {
      if (known(n, i)) { const v = XH[n][i], t = Math.max(-1, Math.min(1, v)); P.dot(i, n, 8, t >= 0 ? `rgba(47,93,138,${0.25 + 0.75 * t})` : `rgba(217,130,43,${0.25 + 0.75 * -t})`, '#fff', 1.5); }
      else P.dot(i, n, 4, '#cfd8e3', null);
    }
    if (opt.cur) {
      const [n, i] = opt.cur;
      P.seg(i - 1, n - 1, i + 1, n - 1, COL.space, 6); P.seg(i, n - 2, i, n, COL.time, 6);
      [[i - 1, n - 1], [i + 1, n - 1]].forEach(([a, b]) => P.dot(a, b, 9, COL.space));
      P.dot(i, n - 2, 9, COL.time); P.dot(i, n - 1, 10, COL.space, COL.time, 3);
      P.ring(i, n, 11, COL.time, 4);
    }
    return P;
  }
  const order = []; for (let n = 2; n <= XROWS; n++) for (let i = 1; i < XN; i++) order.push([n, i]);
  F['f04-stencil'] = {
    canvases: [{ h: 140 }, { h: 270 }], stack: true,
    controls: ['play', { button: 'pt', label: '한 점', act: (s) => { s.k = Math.min(s.k + 1, order.length); } }, { button: 'row', label: '한 줄', act: (s) => { s.k = Math.min((Math.floor(s.k / (XN - 1)) + 1) * (XN - 1), order.length); } }, 'reset'],
    init(st) { st.k = 0; },
    tick(st, d) { st.kf = (st.kf || st.k) + d * 9; st.k = Math.min(Math.floor(st.kf), order.length); if (st.k >= order.length) st.stop = true; },
    readout: (s) => { const rows = 1 + Math.floor(s.k / (XN - 1)); return `계산한 시각 <b>n = ${rows}</b> (t = ${rows}/24)`; },
    draw(st, [a, b]) {
      const done = new Set(order.slice(0, st.k).map(([n, i]) => n * 100 + i));
      const rows = 1 + Math.floor(st.k / (XN - 1));
      const P = Plot(a.g, { x: 70, y: 14, w: a.w - 100, h: a.h - 28 }, [-0.5, XN + 0.5], [-1.2, 1.2]);
      P.fn((x) => W.uSine(1, x / XN, rows / 24), COL.exact, 2, 0, XN, 200, [6, 5]);
      P.path(XH[rows].map((_, i) => i), XH[rows], COL.space, 3.5);
      XH[rows].forEach((v, i) => P.dot(i, v, 6, COL.space));
      text(a.g, a.w - 30, 30, `지금 줄 모양 (n = ${rows})`, { size: 18, align: 'right', col: COL.axis, bold: true });
      xtDraw(st, b.g, b, { done: (n, i) => done.has(n * 100 + i), cur: st.k < order.length ? order[st.k] : null });
    },
  };
  F['f04-notation'] = {
    canvases: [{ h: 340 }],
    draw(st, [c]) {
      const P = xtDraw(st, c.g, c, { done: () => false });
      P.ring(5, 3, 12, COL.ink, 3);
      P.text(5, 3, 'u₅³: 위치 i = 5, 시각 n = 3', { size: 19, bold: true, dx: 18, dy: -10, halo: true });
    },
  };

  /* ---------- F05 손으로 한 걸음 / 12걸음 ---------- */
  const F5 = W.leapfrog(6, 0.5, 12, sinp);
  const hand0 = [0, 0.5, 0.866, 1, 0.866, 0.5, 0], hand1 = hand0.map((v, i) => (i === 0 || i === 6 ? 0 : v + 0.125 * (hand0[i + 1] - 2 * v + hand0[i - 1])));
  F['f05-hand'] = {
    canvases: [{ h: 300 }],
    draw(st, [c]) {
      const P = Plot(c.g, box(c, 50, 20, 20, 40), [-0.02, 1.02], [-0.05, 1.12]);
      P.frame({ xt: [0, 0.5, 1], yt: [0, 0.5, 1] });
      const xs = hand0.map((_, i) => i / 6);
      P.path(xs, hand0, COL.exact, 2); xs.forEach((x, i) => P.dot(x, hand0[i], 6, COL.exact));
      if (st.frag >= 1) { P.path(xs, hand1, COL.time, 3); xs.forEach((x, i) => P.dot(x, hand1[i], 7, COL.time)); }
      text(c.g, c.w - 24, 34, st.frag >= 1 ? '회색: 처음, 주황: 한 걸음 뒤' : '회색: 처음', { size: 18, align: 'right', col: COL.muted });
    },
  };
  F['f05-steps'] = {
    canvases: [{ h: 380 }],
    controls: ['play', 'step', 'reset'], stepLabel: '한 걸음',
    init(st) { st.k = 0; },
    step(st) { st.k = Math.min(st.k + 1, 12); },
    tick(st, d) { st.kf = (st.kf ?? st.k) + d * 2.5; st.k = Math.min(Math.floor(st.kf), 12); if (st.k >= 12) st.stop = true; },
    readout: (s) => `걸음 <b>${s.k}</b> (t = ${s.k}/12) · 가운데 점 <b>${F5[s.k][3].toFixed(4).replace('-', '−')}</b> · 정확한 값 ${Math.cos(PI * s.k / 12).toFixed(4).replace('-', '−')}`,
    draw(st, [c]) {
      const P = Plot(c.g, box(c, 50, 24, 24, 40), [-0.02, 1.02], [-1.15, 1.15]);
      P.frame({ xt: [0, 0.5, 1], yt: [-1, 0, 1], xl: '위치', xlAt: 'top' });
      P.fn((x) => W.uSine(1, x, st.k / 12), COL.exact, 2.4, 0, 1, 200, [7, 6]);
      const xs = F5[0].map((_, i) => i / 6);
      P.path(xs, F5[st.k], COL.space, 3.5); xs.forEach((x, i) => P.dot(x, F5[st.k][i], 7, COL.space));
      text(c.g, c.w - 30, 44, '점: 계산, 점선: 정확한 해', { size: 18, align: 'right', col: COL.muted });
    },
  };

  /* ---------- F06 식을 모르는 모양도 계산 ---------- */
  const F6 = [12, 48].map((N) => ({ N, H: W.leapfrog(N, 0.5, N, W.bump) }));   // t = 1/2까지: 걸음 = N
  F['f06-compare'] = {
    canvases: [{ h: 340 }, { h: 340 }],
    controls: ['play', 'step', 'reset'], speed: 0.12, tmax: 0.5, stepDt: 1 / 24,
    readout: (s) => F6.map(({ N, H }) => { const k = Math.min(N, Math.round(s.t / (0.5 / N))), t = k * 0.5 / N; let e = 0; H[k].forEach((v, i) => { e = Math.max(e, Math.abs(v - W.uBump(i / N, t))); }); return `점 ${N + 1}개 가장 큰 차이 <b>${e.toFixed(3)}</b>`; }).join(' · '),
    draw(st, cs) {
      F6.forEach(({ N, H }, j) => {
        const c = cs[j], k = Math.min(N, Math.round(st.t / (0.5 / N))), t = k * 0.5 / N;
        const P = Plot(c.g, box(c, 40, 36, 16, 34), [-0.02, 1.02], [-0.75, 1.1]);
        P.frame({ xt: [0, 0.5, 1], yt: j ? [] : [-0.5, 0, 0.5, 1], title: `점 ${N + 1}개, t = ${t.toFixed(2)}` });
        P.fn((x) => W.uBump(x, t), COL.exact, 2.6, 0, 1, 400);
        H[k].forEach((v, i) => P.dot(i / N, v, N > 20 ? 4 : 6, COL.space));
      });
    },
  };

  /* ---------- M01 이웃을 더 많이 쓰면 ---------- */
  function runMode(N, five) {
    const dt = 1 / 2400, h = 1 / N, r2 = (dt / h) ** 2, T = 4, every = 24;
    const f = (x) => Math.sin(3 * PI * x);
    const lap = (u) => u.map((v, i) => {
      if (i === 0 || i === N) return 0;
      if (!five) return u[i + 1] - 2 * v + u[i - 1];
      const g = (k) => (k < 0 ? -u[-k] : k > N ? -u[2 * N - k] : u[k]);
      return (-g(i + 2) + 16 * g(i + 1) - 30 * v + 16 * g(i - 1) - g(i - 2)) / 12;
    });
    let a = Array.from({ length: N + 1 }, (_, i) => f(i / N)); a[0] = a[N] = 0;
    const L0 = lap(a); let b = a.map((v, i) => v + 0.5 * r2 * L0[i]);
    const snaps = [a.slice()];
    for (let s = 1; s <= T / dt; s++) {
      if (s % every === 0) snaps.push(b.slice());
      const L = lap(b), c = b.map((v, i) => 2 * v - a[i] + r2 * L[i]); a = b; b = c;
    }
    return snaps;   // 0.01 간격
  }
  let M1 = null;
  F['m01-neighbors'] = {
    canvases: [{ h: 320 }, { h: 320 }],
    controls: ['play', 'reset'], speed: 0.6, tmax: 4,
    init() { if (!M1) M1 = { three: runMode(12, false), five: runMode(12, true) }; },
    readout: (s) => { const k = Math.round(s.t * 100); return `t = <b>${s.t.toFixed(2)}</b> · x = 1/6 높이: 3점 <b>${M1.three[k][2].toFixed(2)}</b>, 5점 <b>${M1.five[k][2].toFixed(3)}</b>, 정확 ${W.uSine(3, 1 / 6, k / 100).toFixed(3)}`; },
    draw(st, [a, b]) {
      const k = Math.round(st.t * 100), t = k / 100;
      const P = Plot(a.g, box(a, 40, 36, 16, 34), [-0.02, 1.02], [-1.25, 1.25]);
      P.frame({ xt: [0, 0.5, 1], yt: [-1, 0, 1], title: `시각 ${t.toFixed(2)}의 모양` });
      P.fn((x) => W.uSine(3, x, t), COL.exact, 2.4);
      M1.three[k].forEach((v, i) => P.dot(i / 12, v, 6, COL.space));
      M1.five[k].forEach((v, i) => P.dot(i / 12, v, 5, COL.time));
      const Q = Plot(b.g, box(b, 40, 36, 16, 34), [Math.max(0, t - 1), Math.max(1, t)], [-1.25, 1.25]);
      Q.frame({ yt: [-1, 0, 1], title: 'x = 1/6인 점의 높이 기록 (지난 시간 1만큼)' });
      const ts = [], e = [], th = [], fv = [];
      for (let j = Math.max(0, k - 100); j <= k; j++) { ts.push(j / 100); e.push(W.uSine(3, 1 / 6, j / 100)); th.push(M1.three[j][2]); fv.push(M1.five[j][2]); }
      Q.path(ts, e, COL.exact, 2.4); Q.path(ts, th, COL.space, 3); Q.path(ts, fv, COL.time, 2.4, [6, 4]);
      text(b.g, b.w - 20, b.h - 12, '회색: 정확, 파랑: 이웃 3점, 주황: 이웃 5점', { size: 17, align: 'right', col: COL.muted });
    },
  };

  /* ---------- M02 용수철 추: 지금만 vs ③의 방법 ---------- */
  const DT = 0.1, NS = 126;
  const SP = (() => {
    const eu = [[1, 0]]; for (let k = 0; k < NS; k++) { const [x, v] = eu[k]; eu.push([x + DT * v, v - DT * x]); }
    const lf = [1, 1 - DT * DT / 2]; for (let k = 1; k < NS; k++) lf.push(2 * lf[k] - lf[k - 1] - DT * DT * lf[k]);
    const lv = lf.map((x, k) => (k === 0 ? 0 : k === NS ? (lf[k] - lf[k - 1]) / DT : (lf[k + 1] - lf[k - 1]) / (2 * DT)));
    return { eu, lf, lv };
  })();
  F['m02-spring'] = {
    canvases: [{ h: 340, flex: 1.6 }, { h: 340 }],
    controls: ['play', 'step', 'reset'], stepLabel: '한 걸음 (0.1)',
    init(st) { st.k = 0; },
    step(st) { st.k = Math.min(st.k + 1, NS); },
    tick(st, d) { st.kf = (st.kf ?? st.k) + d * 14; const k0 = st.k; st.k = Math.min(Math.floor(st.kf), NS); if (k0 < 63 && st.k >= 63) { st.k = 63; st.kf = 63; st.stop = true; } if (st.k >= NS) st.stop = true; },
    readout: (s) => `걸음 <b>${s.k}</b> · 지금만 쓰는 방법의 진폭 <b>${Math.hypot(...SP.eu[s.k]).toFixed(2)}배</b>${s.k === 63 ? ' (한 주기)' : s.k === 126 ? ' (두 주기)' : ''}`,
    draw(st, [a, b]) {
      const k = st.k, ts = Array.from({ length: k + 1 }, (_, j) => j * DT);
      const P = Plot(a.g, box(a, 50, 30, 46, 66), [0, NS * DT], [-2.1, 2.1]);
      P.frame({ xt: [0, 2 * PI, 4 * PI], xtl: ['0', '한 주기', '두 주기'], yt: [-2, -1, 0, 1, 2], title: '위치' });
      P.fn(Math.cos, COL.exact, 2.4, 0, Math.max(k * DT, 1e-6));
      P.path(ts, SP.eu.slice(0, k + 1).map((p) => p[0]), COL.bad, 3);
      P.path(ts, SP.lf.slice(0, k + 1), COL.space, 3, [7, 5]);
      const Q = Plot(b.g, box(b, 50, 30, 20, 44), [-2.1, 2.1], [-2.1, 2.1], { equal: true });
      Q.frame({ xt: [-1, 0, 1], yt: [-1, 0, 1], title: '위치–속도 평면', xl: '위치', yl: '속도', ylo: 36 });
      Q.fn((x) => Math.sqrt(Math.max(0, 1 - x * x)), COL.exact, 2, -1, 1); Q.fn((x) => -Math.sqrt(Math.max(0, 1 - x * x)), COL.exact, 2, -1, 1);
      Q.path(SP.eu.slice(0, k + 1).map((p) => p[0]), SP.eu.slice(0, k + 1).map((p) => p[1]), COL.bad, 2.6);
      Q.path(SP.lf.slice(0, k + 1), SP.lv.slice(0, k + 1), COL.space, 2.6, [6, 4]);
      text(a.g, a.w - 20, a.h - 8, '회색: 정확, 빨강: 지금의 정보만, 파랑 점선: ③의 방법', { size: 18, align: 'right', col: COL.muted });
    },
  };

  /* ---------- M03 하나씩 vs 한꺼번에 ---------- */
  F['m03-system'] = {
    canvases: [{ h: 300 }, { h: 300 }],
    controls: ['play', 'reset'],
    init(st) { st.k = 0; },
    tick(st, d) { st.kf = (st.kf ?? st.k) + d * 3; st.k = Math.min(st.kf, 7); if (st.k >= 7) st.stop = true; },
    draw(st, [a, b]) {
      const N = 6;
      [['③의 방법: 하나씩 바로 계산', a, false], ['한꺼번에 푸는 방법: 다음 값끼리 엮임', b, true]].forEach(([title, c, imp]) => {
        const P = Plot(c.g, { x: 90, y: 50, w: c.w - 120, h: c.h - 80 }, [-0.5, N + 0.5], [-0.5, 2.5]);
        text(c.g, c.w / 2, 30, title, { size: 20, bold: true, align: 'center', col: imp ? COL.timeText : COL.space });
        ['조금 전', '지금', '다음'].forEach((s, n) => text(c.g, 80, P.Y(n) + 6, s, { size: 18, align: 'right', col: COL.axis, bold: true }));
        for (let n = 0; n < 3; n++) for (let i = 0; i <= N; i++) P.dot(i, n, n < 2 ? 7 : 5, n < 2 ? COL.space : '#cfd8e3', null);
        if (!imp) {
          const lit = Math.min(Math.floor(st.k), 5);
          for (let i = 1; i <= lit; i++) P.dot(i, 2, 9, COL.time);
          if (lit < 5 && st.k > 0) { const i = lit + 1; P.seg(i - 1, 1, i, 2, COL.space, 2); P.seg(i + 1, 1, i, 2, COL.space, 2); P.seg(i, 0, i, 2, COL.muted, 2, [4, 4]); }
        } else if (st.k >= 1) {
          P.seg(1, 2, 5, 2, COL.time, 5);
          for (let i = 1; i <= 5; i++) { if (st.k >= 2) P.dot(i, 2, 9, COL.time); else P.ring(i, 2, 9, COL.time); }
          if (st.k < 2) P.text(3, 2, '연립방정식', { size: 19, bold: true, align: 'center', dy: -18, col: COL.timeText });
        }
      });
    },
  };

  /* ---------- M04 걸음을 너무 크게 잡으면 ---------- */
  const big = {};
  function blow(r) {
    if (big[r]) return big[r];
    const N = 48, steps = Math.round(0.5 / (r / N));
    const ex = W.leapfrog(N, r, steps, W.bump).map((u) => Math.max(...u.map(Math.abs)));
    const im = implicit(N, r, steps, W.bump).map((u) => Math.max(...u.map(Math.abs)));
    return (big[r] = { ex, im, dt: r / N });
  }
  F['m04-cfl'] = {
    canvases: [{ h: 330 }, { h: 330 }],
    controls: [{ buttons: 'r', label: 'r = cΔt/h', items: [['0.5', 0.5], ['0.9', 0.9], ['1.1', 1.1], ['1.5', 1.5]], value: 0.5, act: (s) => { s.t = 0; } }, 'play', 'reset'],
    speed: 0.1, tmax: 0.5,
    readout: (s) => { const B = blow(s.v.r), k = Math.min(B.ex.length - 1, Math.floor(s.t / B.dt)); return `가장 높은 점: ③의 방법 <b>${B.ex[k] > 1e4 ? window.PLOT.sci(B.ex[k], 1) : B.ex[k].toFixed(2)}</b> · 한꺼번에 <b>${B.im[k].toFixed(2)}</b>`; },
    draw(st, [a, b]) {
      const r = st.v.r, g = a.g, dx = 44, cx = a.w / 2, top = 70, bot = 220;
      text(g, cx, 32, `한 걸음에 파동이 가는 칸 수 r = ${r}`, { size: 20, bold: true, align: 'center', col: r > 1 ? COL.bad : COL.good });
      g.save(); g.fillStyle = 'rgba(217,130,43,.22)'; g.beginPath(); g.moveTo(cx, top); g.lineTo(cx - r * dx, bot); g.lineTo(cx + r * dx, bot); g.closePath(); g.fill(); g.restore();
      for (let j = -3; j <= 3; j++) { [top, bot].forEach((y) => { g.fillStyle = '#cfd8e3'; g.beginPath(); g.arc(cx + j * dx, y, 4, 0, 7); g.fill(); }); }
      [-1, 0, 1].forEach((j) => { arrowPx(g, cx + j * dx, bot, cx, top + 10, COL.space, 2); g.fillStyle = COL.space; g.beginPath(); g.arc(cx + j * dx, bot, 8, 0, 7); g.fill(); });
      if (r > 1) [-2, 2].forEach((j) => { g.strokeStyle = COL.bad; g.lineWidth = 3; g.beginPath(); g.arc(cx + j * dx, bot, 10, 0, 7); g.stroke(); text(g, cx + j * dx, bot + 32, '놓친 정보', { size: 17, col: COL.bad, align: 'center', bold: true }); });
      g.fillStyle = COL.time; g.beginPath(); g.arc(cx, top, 9, 0, 7); g.fill();
      text(g, cx + 16, top - 8, '새 값', { size: 17, col: COL.timeText, bold: true });
      text(g, 30, top + 5, '다음', { size: 17, bold: true }); text(g, 30, bot + 5, '지금', { size: 17, bold: true });
      text(g, cx, a.h - 16, r > 1 ? '영향 범위가 이웃 밖으로 넘친다' : '영향 범위가 이웃 안에 있다', { size: 19, bold: true, align: 'center', col: r > 1 ? COL.bad : COL.good });
      const B = blow(r), k = Math.min(B.ex.length - 1, Math.floor(st.t / B.dt));
      const P = Plot(b.g, box(b, 70, 36, 30, 50), [0, 0.5], [-0.5, 9.5]);
      P.frame({ xt: [0, 0.25, 0.5], yt: [0, 3, 6, 9], ytl: ['1', '1000', '100만', '10억'], title: '줄에서 가장 높은 점의 높이 (로그 눈금)', xl: '시간' });
      const ts = B.ex.slice(0, k + 1).map((_, j) => j * B.dt);
      P.path(ts, B.ex.slice(0, k + 1).map((v) => Math.log10(Math.max(v, 1e-3))), COL.bad, 3);
      P.path(ts, B.im.slice(0, k + 1).map((v) => Math.log10(Math.max(v, 1e-3))), COL.space, 3, [7, 5]);
      text(b.g, P.x + 12, P.y + 24, '빨강: ③의 방법', { size: 18, col: COL.bad }); text(b.g, P.x + 12, P.y + 48, '파랑 점선: 한꺼번에 푸는 방법', { size: 18, col: COL.space });
    },
  };
})();
