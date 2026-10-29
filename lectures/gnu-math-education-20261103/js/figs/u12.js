/* ①·② 그림 정의 (원고 01-wave-model.md, 02-second-derivative.md와 같은 식·수치) */
(function () {
  const F = (window.FIGS = window.FIGS || {});
  const { COL, Plot, Cam, surface, heightColor, polyline3, text, arrowPx } = window.PLOT;
  const W = window.Wave1D;
  const PI = Math.PI;
  const box = (c, l = 60, t = 40, r = 24, b = 44) => ({ x: l, y: t, w: c.w - l - r, h: c.h - t - b });

  /* 줄 그리기: 묶인 끝, 줄, 선택적으로 이름표 */
  function string(P, f, col = COL.space, lw = 4) {
    P.fn(f, col, lw, 0, 1, 300);
    P.dot(0, 0, 6, COL.axis); P.dot(1, 0, 6, COL.axis);
  }

  /* ---------- W03 사진과 블랙박스 기록 ---------- */
  const XM = 0.65;
  F['w03-record'] = {
    canvases: [{ h: 250 }, { h: 220 }], stack: true,
    controls: ['play', 'step', 'reset'], speed: 0.3, tmax: 2.5, stepDt: 0.05,
    readout: (s) => `시각 <b>t = ${s.t.toFixed(2)}</b>`,
    draw(st, [a, b]) {
      const P = Plot(a.g, box(a, 60, 34, 24, 34), [-0.02, 1.02], [-0.75, 0.75]);
      P.frame({ xt: [0, 0.5, XM, 1], xtl: ['0', '0.5', '표식', '1'], yt: [-0.5, 0, 0.5], title: '사진: 지금 줄 전체' });
      P.fn((x) => W.uShake(x, st.t), COL.space, 4, 0, 1);
      P.dot(0, W.shakeG(st.t), 7, COL.time); P.dot(1, 0, 6, COL.axis);
      P.seg(XM, -0.75, XM, 0.75, COL.faint, 1.5, [5, 5]);
      P.dot(XM, W.uShake(XM, st.t), 9, COL.bad);
      const Q = Plot(b.g, box(b, 60, 34, 24, 40), [0, 2.5], [-0.75, 0.75]);
      Q.frame({ xt: [0, 0.5, 1, 1.5, 2, 2.5], yt: [-0.5, 0, 0.5], title: '블랙박스: 표식의 높이 기록', xl: '' });
      Q.fn((t) => W.uShake(XM, t), COL.bad, 3, 0, Math.max(st.t, 1e-6), 400);
      Q.seg(st.t, -0.75, st.t, 0.75, COL.muted, 1.5, [4, 4]);
      Q.text(2.5, -0.75, '시간 →', { size: 17, col: COL.muted, align: 'right', dy: -6 });
    },
  };

  /* ---------- W04 휜 조각에 걸리는 힘 ---------- */
  F['w04-force'] = {
    canvases: [{ h: 380 }],
    controls: [{ range: 'k', label: '휜 정도', min: 0, max: 1, step: 0.05, value: 0, fmt: (v) => v.toFixed(2) }],
    readout: (s) => { const k = s.v.k; return `합친 힘 <b>${(2 * k / Math.hypot(1, k)).toFixed(2)}</b> × 당기는 힘`; },
    draw(st, [c]) {
      const k = st.v.k, P = Plot(c.g, { x: 40, y: 20, w: c.w - 80, h: c.h - 40 }, [-2.2, 2.2], [-1.6, 1.3], { equal: true });
      const y = (x) => 0.5 * k * (1 - x * x);
      P.fn(y, COL.space, 6, -1, 1);
      P.dot(-1, 0, 6, COL.axis); P.dot(1, 0, 6, COL.axis);
      const n = Math.hypot(1, k), L = 0.9;
      P.arrow(-1, 0, -1 - L / n, -k * L / n, COL.space, 3.5);
      P.arrow(1, 0, 1 + L / n, -k * L / n, COL.space, 3.5);
      P.text(-1 - L / n, -k * L / n, '당기는 힘', { size: 18, col: COL.space, align: 'center', dy: 26 });
      P.text(1 + L / n, -k * L / n, '당기는 힘', { size: 18, col: COL.space, align: 'center', dy: 26 });
      const F2 = 2 * k / n * L;
      if (F2 > 0.02) { P.arrow(0, y(0), 0, y(0) - F2, COL.ink, 4); P.text(0, y(0) - F2, '합친 힘', { size: 19, bold: true, align: 'left', dx: 10, dy: 6 }); }
      else P.text(0, 0.25, '곧은 조각: 위아래로 상쇄', { size: 19, align: 'center', col: COL.muted });
    },
  };

  /* ---------- C01 기울기가 바뀌는 빠르기 ---------- */
  F['c01-slope'] = {
    canvases: [{ h: 360 }, { h: 360 }],
    controls: [{ buttons: 'a', label: 'a', items: [['1', 1], ['0', 0], ['−1', -1]], value: 1 }, { range: 'x0', label: '접점 x', min: -1.5, max: 1.5, step: 0.05, value: -0.8, fmt: (v) => v.toFixed(2) }],
    readout: (s) => `기울기 <b>${(2 * s.v.a * s.v.x0 + 0.5).toFixed(2)}</b> · 기울기가 바뀌는 빠르기 <b>${2 * s.v.a}</b>`,
    draw(st, [c, d]) {
      const a = st.v.a, x0 = st.v.x0, f = (x) => a * x * x + 0.5 * x + 0.2, m = 2 * a * x0 + 0.5;
      const P = Plot(c.g, box(c, 50, 36), [-1.7, 1.7], [-2.6, 3.2]);
      P.frame({ xt: [-1, 0, 1], yt: [-2, 0, 2], title: `y = ${a === 0 ? '' : a === 1 ? 'x² + ' : '−x² + '}0.5x + 0.2` });
      P.fn(f, COL.space, 4);
      P.fn((x) => f(x0) + m * (x - x0), COL.time, 2.5, x0 - 0.7, x0 + 0.7);
      P.dot(x0, f(x0), 7, COL.time);
      const Q = Plot(d.g, box(d, 50, 36), [-1.7, 1.7], [-3, 3.6]);
      Q.frame({ xt: [-1, 0, 1], yt: [-2, 0, 2], title: '접선의 기울기' });
      Q.fn((x) => 2 * a * x + 0.5, COL.time, 4);
      Q.dot(x0, m, 7, COL.time);
    },
  };

  /* ---------- C02 확대하면 포물선 ---------- */
  const fC = (x) => Math.sin(2 * x) + 0.4 * x, dC = (x) => 2 * Math.cos(2 * x) + 0.4, ddC = (x) => -4 * Math.sin(2 * x);
  F['c02-zoom'] = {
    canvases: [{ h: 380 }],
    controls: [{ buttons: 'z', label: '확대', items: [['1배', 1], ['2배', 2], ['4배', 4], ['8배', 8]], value: 1 }],
    readout: (s) => { const r = 1.2 / s.v.z; let m = 0; for (let i = 0; i <= 200; i++) { const x = 0.4 - r + 2 * r * i / 200; m = Math.max(m, Math.abs(fC(x) - par(x))); } return `보이는 범위에서 두 곡선의 가장 큰 차이 <b>${window.PLOT.sci(m, 1)}</b>`; },
    draw(st, [c]) {
      const r = 1.2 / st.v.z, x0 = 0.4;
      const P = Plot(c.g, box(c, 40, 30, 30, 30), [x0 - r, x0 + r], [fC(x0) - r * 0.8, fC(x0) + r * 0.8], { equal: true });
      P.frame({ title: `점 x = ${x0} 둘레를 ${st.v.z}배로 확대` });
      P.fn(par, COL.time, 3, x0 - r, x0 + r, 200, [8, 6]);
      P.fn(fC, COL.space, 4, x0 - r, x0 + r);
      P.dot(x0, fC(x0), 7, COL.ink);
      P.text(x0 + r * 0.95, fC(x0) - r * 0.7, '파랑: 곡선  주황 점선: 그 점에 맞춘 포물선', { size: 17, align: 'right', col: COL.muted });
    },
  };
  function par(x) { const x0 = 0.4; return fC(x0) + dC(x0) * (x - x0) + 0.5 * ddC(x0) * (x - x0) ** 2; }

  /* ---------- C03 이웃의 평균과 비교 ---------- */
  F['c03-average'] = {
    canvases: [{ h: 300 }, { h: 300 }, { h: 300 }],
    draw(st, cs) {
      const cases = [['봉우리', (x) => 1 - x * x, '가운데 > 양옆 평균 → 위로 볼록'], ['곧은 곳', (x) => 0.3 * x + 0.5, '가운데 = 양옆 평균 → 휘지 않음'], ['골짜기', (x) => x * x, '가운데 < 양옆 평균 → 아래로 볼록']];
      cases.forEach(([nm, f, msg], i) => {
        const c = cs[i], P = Plot(c.g, box(c, 24, 36, 24, 50), [-1.3, 1.3], [-0.4, 1.4]);
        P.frame({ title: nm, zero: false });
        P.fn(f, COL.space, 4);
        const h = 0.8, avg = (f(-h) + f(h)) / 2;
        P.seg(-h, f(-h), h, f(h), COL.exact, 2, [6, 5]);
        [-h, h].forEach((x) => P.dot(x, f(x), 7, COL.space));
        P.dot(0, f(0), 8, COL.ink);
        P.ring(0, avg, 8, COL.time);
        text(c.g, c.w / 2, c.h - 16, msg, { size: 18, align: 'center', col: COL.axis });
      });
    },
  };

  /* ---------- C04 위로 던진 공: 높이·속도·가속도 ---------- */
  const hB = (t) => 2 * t - t * t, vB = (t) => 2 - 2 * t;
  F['c04-ball'] = {
    canvases: [{ w: 230, h: 440 }, { h: 440 }],
    controls: ['play', 'step', 'reset'], speed: 0.35, tmax: 2, stepDt: 0.1, pauseAt: [1],
    readout: (s) => `t = <b>${s.t.toFixed(2)}</b> · 속도 <b>${vB(s.t).toFixed(2).replace('-', '−')}</b> · 가속도 <b>−2</b>`,
    draw(st, [a, b]) {
      const P = Plot(a.g, { x: 20, y: 30, w: a.w - 40, h: a.h - 60 }, [-1, 1], [-0.1, 1.25]);
      P.frame({ title: '공', zero: false, box: false, bg: false });
      P.seg(-0.6, 0, 0.6, 0, COL.axis, 2);
      const y = hB(st.t);
      P.dot(-0.15, y, 16, '#5b7fa6');
      const v = vB(st.t);
      if (Math.abs(v) > 0.03) P.arrowPx(0.15, y, 0, v * 55, COL.vel, 4);
      P.arrowPx(0.5, y, 0, -60, COL.time, 4);
      P.text(0.15, y, '속도', { size: 17, col: COL.vel, align: 'center', dy: v > 0 ? 22 : -18 });
      P.text(0.5, y, '가속도', { size: 17, col: COL.timeText, align: 'center', dy: -6 - (-60) + 18 });
      const top = { x: 70, y: 36, w: b.w - 100, h: 160 }, bot = { x: 70, y: 252, w: b.w - 100, h: 150 };
      const H = Plot(b.g, top, [0, 2], [0, 1.15]);
      H.frame({ xt: [0, 0.5, 1, 1.5, 2], yt: [0, 0.5, 1], title: '높이 (시간으로 한 번 미분 → 속도)', fs: 16, tfs: 18 });
      H.fn(hB, COL.space, 3.5, 0, Math.max(st.t, 1e-6));
      H.seg(st.t, 0, st.t, 1.15, COL.muted, 1.4, [4, 4]);
      if (st.t >= 1) H.text(1, 1, '속도 0', { size: 17, align: 'center', dy: -10, col: COL.ink, bold: true });
      const V = Plot(b.g, bot, [0, 2], [-2.3, 2.3]);
      V.frame({ xt: [0, 0.5, 1, 1.5, 2], yt: [-2, 0, 2], title: '속도 (한 번 더 미분 → 가속도)', fs: 16, tfs: 18 });
      V.fn(vB, COL.vel, 3.5, 0, Math.max(st.t, 1e-6));
      V.seg(st.t, -2.3, st.t, 2.3, COL.muted, 1.4, [4, 4]);
      if (st.t > 0.3) V.text(st.t, vB(st.t), '기울기 −2 = 가속도', { size: 17, col: COL.timeText, dx: 10, dy: -10, halo: true });
    },
  };

  /* ---------- C04 시간–공간 순환: 모양 → 가속도 → 바뀐 모양 ---------- */
  F['c04-cycle'] = {
    canvases: [{ h: 340, flex: 1.5 }, { h: 340 }],
    controls: ['play', 'reset'], speed: 0.2,
    readout: (s) => `t = <b>${s.t.toFixed(2)}</b>`,
    draw(st, [a, b]) {
      const P = Plot(a.g, box(a, 30, 36, 24, 30), [-0.03, 1.03], [-1.6, 1.6]);
      P.frame({ title: 'sin πx 모양 줄과 각 점의 가속도', zero: true });
      const u = (x) => W.uSine(1, x, st.t);
      for (let i = 1; i < 12; i++) { const x = i / 12, acc = -PI * PI * u(x); P.arrowPx(x, u(x), 0, acc * 5.2, COL.time, 3); }
      string(P, u);
      const g = b.g, cx = b.w / 2, cy = b.h / 2 + 8, R = Math.min(b.w, b.h) * 0.33;
      const labs = [['공간의 모양', COL.space], ['가속도', COL.timeText], ['시간이 흘러', COL.timeText], ['바뀐 모양', COL.space]];
      const k = st.played ? Math.floor(st.t * 10) % 4 : -1;
      labs.forEach(([s, col], i) => {
        const ang = -PI / 2 + i * PI / 2, x = cx + R * Math.cos(ang), y = cy + R * Math.sin(ang);
        g.save(); g.fillStyle = i === k ? '#fff3df' : '#fff'; g.strokeStyle = i === k ? COL.time : '#b8c4d2'; g.lineWidth = i === k ? 3 : 1.5;
        g.beginPath(); g.roundRect(x - 78, y - 22, 156, 44, 10); g.fill(); g.stroke(); g.restore();
        text(g, x, y + 7, s, { size: 19, bold: true, col, align: 'center' });
        const a2 = ang + PI / 2, x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
        const mx = (x + x2) / 2 + (cx - (x + x2) / 2) * -0.35, my = (y + y2) / 2 + (cy - (y + y2) / 2) * -0.35;
        arrowPx(g, x + (mx - x) * 0.55, y + (my - y) * 0.55, mx + (x2 - mx) * 0.45, my + (y2 - my) * 0.45, i === k ? COL.time : '#9fb3c8', 2.5);
      });
      text(g, cx, 22, '되풀이된다', { size: 18, col: COL.muted, align: 'center' });
    },
  };

  /* ---------- C05 사인 모양: 가속도가 높이에 비례 + 용수철 추 ---------- */
  F['c05-sine'] = {
    canvases: [{ h: 330 }, { h: 330 }],
    controls: ['play', 'reset'], speed: 0.18,
    readout: (s) => `t = <b>${s.t.toFixed(2)}</b>`,
    draw(st, cs) {
      [1, 2].forEach((n, i) => {
        const c = cs[i], P = Plot(c.g, { x: 20, y: 40, w: c.w - 130, h: c.h - 70 }, [-0.03, 1.03], [-1.5, 1.5]);
        P.frame({ title: `sin ${n === 1 ? '' : n}πx (${n === 1 ? '반 주기' : '한 주기'}): 꼭대기 가속도 ${n === 1 ? '9.9' : '39.5'}`, tfs: 19 });
        const u = (x) => W.uSine(n, x, st.t);
        for (let j = 1; j < 16; j++) { const x = j / 16; P.seg(x, 0, x, u(x), COL.faint, 1.5, [3, 3]); const acc = -((n * PI) ** 2) * u(x); P.arrowPx(x, u(x), 0, acc * 2.0, COL.time, 2.6); }
        string(P, u);
        const g = c.g, sx = c.w - 60, y0 = P.Y(0), yy = P.Y(Math.cos(n * PI * st.t));
        g.save(); g.strokeStyle = COL.axis; g.lineWidth = 2; g.beginPath(); g.moveTo(sx - 20, 40); g.lineTo(sx + 20, 40); g.stroke();
        g.strokeStyle = '#7b8794'; g.lineWidth = 2; g.beginPath(); g.moveTo(sx, 40);
        for (let z = 1; z <= 16; z++) g.lineTo(sx + (z % 2 ? 10 : -10), 40 + (yy - 52) * z / 16);
        g.lineTo(sx, yy - 12); g.stroke();
        g.fillStyle = '#5b7fa6'; g.fillRect(sx - 14, yy - 12, 28, 24);
        g.strokeStyle = COL.faint; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(sx - 26, y0); g.lineTo(sx + 26, y0); g.stroke(); g.restore();
        text(g, sx, c.h - 10, '용수철 추', { size: 16, col: COL.muted, align: 'center' });
      });
    },
  };

  /* ---------- C05 일자로 펴진 순간 ---------- */
  F['c05-flat'] = {
    canvases: [{ h: 360 }],
    controls: ['play', 'step', 'reset'], speed: 0.2, tmax: 2, stepDt: 1 / 12, pauseAt: [0.5, 1.5],
    readout: (s) => `t = <b>${s.t.toFixed(2)}</b>${Math.abs(s.t - 0.5) < 1e-6 || Math.abs(s.t - 1.5) < 1e-6 ? ' · 일자인 순간: 가속도 0, 속도는 가장 크다' : ''}`,
    draw(st, [c]) {
      const P = Plot(c.g, box(c, 30, 36, 30, 30), [-0.03, 1.03], [-1.5, 1.5]);
      P.frame({ title: 'sin πx 줄의 각 점의 속도(회색 화살표)' });
      const u = (x) => W.uSine(1, x, st.t), ut = (x) => -PI * Math.sin(PI * x) * Math.sin(PI * st.t);
      for (let j = 1; j < 14; j++) { const x = j / 14; P.arrowPx(x, u(x), 0, ut(x) * 26, COL.vel, 3); }
      string(P, u);
    },
  };

  F['c05-frames'] = {
    canvases: [{ h: 260 }, { h: 260 }, { h: 260 }],
    draw(st, cs) {
      [[0, '놓는 순간: 모든 점이 멈춰 있다'], [0.5, '일자로 펴진 순간: 모든 점이 가장 빠르다'], [1, '반대쪽 끝: 다시 모든 점이 멈춘다']].forEach(([t, msg], i) => {
        const c = cs[i], P = Plot(c.g, { x: 16, y: 20, w: c.w - 32, h: c.h - 70 }, [-0.03, 1.03], [-1.5, 1.5]);
        P.frame({});
        const u = (x) => W.uSine(1, x, t), ut = (x) => -PI * Math.sin(PI * x) * Math.sin(PI * t);
        for (let j = 1; j < 10; j++) { const x = j / 10; if (Math.abs(ut(x)) > 0.01) P.arrowPx(x, u(x), 0, ut(x) * 18, COL.vel, 2.6); }
        string(P, u);
        text(c.g, c.w / 2, c.h - 20, msg, { size: 17, align: 'center', col: COL.axis });
      });
    },
  };

  /* ---------- C06 높이가 아니라 모양 ---------- */
  const uxx = (f, x, h = 1e-3) => (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
  F['c06-same'] = {
    canvases: [{ h: 300 }, { h: 300 }],
    draw(st, cs) {
      [['가운데가 이웃보다 높다', (x) => 0.8 - 0.6 * (x - 0.5) ** 2 * 4], ['가운데가 이웃보다 낮다', (x) => 0.8 + 0.6 * (x - 0.5) ** 2 * 4]].forEach(([nm, f], i) => {
        const c = cs[i], P = Plot(c.g, box(c, 50, 36, 20, 30), [0, 1], [-0.1, 1.6]);
        P.frame({ yt: [0, 0.8], title: nm });
        P.fn(f, COL.space, 4);
        P.seg(0.5, 0, 0.5, 0.8, COL.faint, 1.5, [4, 4]);
        P.dot(0.5, 0.8, 8, COL.time);
        P.arrowPx(0.5, 0.8, 0, i ? 60 : -60, COL.time, 4);
        P.text(0.5, 0.8, '가속도', { size: 18, col: COL.timeText, dx: 12, dy: i ? -30 : 40 });
      });
    },
  };
  F['c06-bump'] = {
    canvases: [{ h: 360 }],
    controls: ['play', 'step', 'reset'], speed: 0.12, tmax: 0.5, stepDt: 0.02,
    readout: (s) => `t = <b>${s.t.toFixed(2)}</b>`,
    draw(st, [c]) {
      const P = Plot(c.g, box(c, 50, 30, 24, 40), [0, 0.8], [-0.15, 1.15]);
      P.frame({ xt: [0, 0.2, 0.35, 0.5, 0.8], yt: [0, 0.3, 1] });
      const f = (x) => W.uBump(x, st.t);
      for (let j = 0; j <= 40; j++) {
        const x = 0.16 + j * 0.0095, a = uxx(f, x);
        if (Math.abs(a) > 3) P.arrowPx(x, f(x), 0, Math.max(-70, Math.min(70, a * 0.16)), COL.time, 2.6);
      }
      P.fn(f, COL.space, 4, 0, 0.8);
      if (st.t === 0) { P.text(0.39, 1, '꼭대기: 아래로', { size: 19, col: COL.timeText, dy: 6 }); P.text(0.245, 0.5, '기슭: 위로', { size: 19, col: COL.timeText, align: 'right' }); }
    },
  };

  /* ---------- C07 출렁이는 면 ---------- */
  function ripple(n, r) {
    const h = 1 / n, R0 = 0.15, u0 = [], r2 = r * r;
    for (let i = 0; i <= n; i++) { u0.push([]); for (let j = 0; j <= n; j++) { const d = Math.hypot(i * h - 0.5, j * h - 0.5); u0[i].push(d < R0 ? Math.cos(PI * d / (2 * R0)) ** 4 : 0); } }
    const lap = (u, i, j) => u[i + 1][j] + u[i - 1][j] + u[i][j + 1] + u[i][j - 1] - 4 * u[i][j];
    const u1 = u0.map((row, i) => row.map((v, j) => (i && j && i < n && j < n ? v + 0.5 * r2 * lap(u0, i, j) : 0)));
    return { n, dt: r * h, prev: u0, cur: u1, k: 1, u0, step() { const { prev, cur } = this; const nx = cur.map((row, i) => row.map((v, j) => (i && j && i < n && j < n ? 2 * v - prev[i][j] + r2 * lap(cur, i, j) : 0))); this.prev = cur; this.cur = nx; this.k++; } };
  }
  F['c07-membrane'] = {
    canvases: [{ h: 440 }], rotate: true, az: 230, el: 28,
    controls: [{ buttons: 'm', items: [['사인 모양 면', 'sine'], ['가운데만 볼록', 'ripple']], value: 'sine', act: (st) => { st.t = 0; st.R = ripple(48, 0.5); } }, 'play', 'reset'],
    init(st) { st.R = ripple(48, 0.5); },
    tick(st, d) {
      if (st.v.m === 'sine') { st.t += d * 0.35; return; }
      const target = Math.min(st.t + d * 0.08, 0.32);
      while (st.R.k * st.R.dt < target - 1e-9) st.R.step();
      st.t = target; if (st.t >= 0.32) st.stop = true;
    },
    readout: (s) => (s.v.m === 'ripple' && s.t > 0 ? `t = <b>${s.t.toFixed(2)}</b> · 세로 4배로 그림` : `t = <b>${s.t.toFixed(2)}</b>`),
    draw(st, [c]) {
      const P = Cam(c.w / 2, c.h / 2 + 30, Math.min(c.w, c.h) * 0.62, st.az, st.el3);
      if (st.v.m === 'sine') {
        const m = 22, z = (i, j) => Math.sin(PI * i / m) * Math.sin(PI * j / m) * Math.cos(Math.SQRT2 * PI * st.t) * 0.45;
        surface(c.g, P, m, m, (i, j) => [i / m - 0.5, j / m - 0.5, z(i, j)], (cz) => heightColor(cz, 0.45));
      } else {
        const U = st.t > 0 ? st.R.cur : st.R.u0, n = st.R.n, s = 2, sc = st.t > 0 ? 1.6 : 0.4;
        surface(c.g, P, n / s, n / s, (i, j) => [i * s / n - 0.5, j * s / n - 0.5, U[i * s][j * s] * sc], (cz) => heightColor(cz, 0.3));
      }
      text(c.g, 16, c.h - 14, '끌어서 돌려 볼 수 있다', { size: 17, col: COL.muted });
    },
  };

  /* ---------- C08 말안장 모양은 움직이지 않는다 ---------- */
  F['c08-saddle'] = {
    canvases: [{ h: 420 }, { h: 420 }], rotate: true, az: 215, el: 26,
    controls: [{ check: 'cuts', label: '단면 보기', value: false }, 'play', 'reset'], speed: 0.3,
    readout: (s) => `t = <b>${s.t.toFixed(2)}</b>`,
    draw(st, [a, b]) {
      const m = 20, k = 4 * 0.42;
      const Pa = Cam(a.w / 2, a.h / 2 + 30, Math.min(a.w, a.h) * 0.66, st.az, st.el3);
      const zs = (x, y) => k * ((x) ** 2 - (y) ** 2);
      surface(a.g, Pa, m, m, (i, j) => [i / m - 0.5, j / m - 0.5, zs(i / m - 0.5, j / m - 0.5)], (cz) => heightColor(cz, 0.42));
      if (st.v.cuts) {
        const xs = Array.from({ length: 41 }, (_, i) => i / 40 - 0.5);
        polyline3(a.g, Pa, xs.map((x) => [x, 0, zs(x, 0)]), COL.space, 4);
        polyline3(a.g, Pa, xs.map((y) => [0, y, zs(0, y)]), COL.time, 4);
        const [X, Y] = Pa(0, 0, 0);
        arrowPx(a.g, X - 8, Y, X - 8, Y - 50, COL.space, 3.5); arrowPx(a.g, X + 8, Y, X + 8, Y + 50, COL.time, 3.5);
        text(a.g, 16, 60, '가로: 아래로 볼록 → 위로', { size: 18, col: COL.space, bold: true });
        text(a.g, 16, 86, '세로: 위로 볼록 → 아래로', { size: 18, col: COL.timeText, bold: true });
        text(a.g, 16, 112, '합 0 → 가속도 0', { size: 18, bold: true });
      }
      text(a.g, a.w / 2, 28, '말안장 모양 (테두리를 이 모양으로 고정)', { size: 19, bold: true, align: 'center', col: COL.axis });
      const Pb = Cam(b.w / 2, b.h / 2 + 30, Math.min(b.w, b.h) * 0.66, st.az, st.el3);
      const zd = (i, j) => Math.sin(PI * i / m) * Math.sin(PI * j / m) * Math.cos(Math.SQRT2 * PI * st.t) * 0.42;
      surface(b.g, Pb, m, m, (i, j) => [i / m - 0.5, j / m - 0.5, zd(i, j)], (cz) => heightColor(cz, 0.42));
      text(b.g, b.w / 2, 28, '비교: 볼록한 면 sin πx sin πy', { size: 19, bold: true, align: 'center', col: COL.axis });
    },
  };
})();
