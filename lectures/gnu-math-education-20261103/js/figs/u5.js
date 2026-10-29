/* ⑤ 그림 정의 (원고 05-matrices.md, scripts/make_figures_04_05.py와 같은 수치) */
(function () {
  const F = (window.FIGS = window.FIGS || {});
  const { COL, Plot, text } = window.PLOT;
  const box = (c, l = 50, t = 40, r = 20, b = 40) => ({ x: l, y: t, w: c.w - l - r, h: c.h - t - b });
  const DIAG = '#f6d9b8', NB = '#cfdeee';

  /* 칸 그림: n × n, entry(i, j) → 값. sel 행을 강조 */
  function cells(g, x0, y0, n, cs, entry, o = {}) {
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = entry(i, j);
      g.fillStyle = v === 0 ? '#fff' : i === j ? DIAG : NB;
      if (o.full && v !== 0) g.fillStyle = `rgba(47,93,138,${0.15 + 0.85 * Math.min(1, Math.abs(v) / o.full)})`;
      g.fillRect(x0 + j * cs, y0 + i * cs, cs, cs);
      if (cs >= 8) { g.strokeStyle = '#e1e7ee'; g.lineWidth = 0.6; g.strokeRect(x0 + j * cs, y0 + i * cs, cs, cs); }
      if (o.vals && cs >= 30) text(g, x0 + (j + 0.5) * cs, y0 + (i + 0.5) * cs + 7, v === 0 ? '0' : String(v).replace('-', '−'), { size: 19, align: 'center', col: v === 0 ? COL.muted : COL.ink, bold: v !== 0 });
    }
    if (o.sel !== undefined && o.sel !== null) { g.strokeStyle = COL.time; g.lineWidth = 3; g.strokeRect(x0 - 2, y0 + o.sel * cs - 2, n * cs + 4, cs + 4); }
    g.strokeStyle = COL.axis; g.lineWidth = 1.6;
    const h = n * cs;
    [[x0 - 6, 1], [x0 + h + 6, -1]].forEach(([x, s]) => { g.beginPath(); g.moveTo(x + 6 * s, y0 - 3); g.quadraticCurveTo(x - 6 * s, y0 + h / 2, x + 6 * s, y0 + h + 3); g.stroke(); });
  }
  const tri = (i, j) => (i === j ? 2 : Math.abs(i - j) === 1 ? -1 : 0);
  const lap2 = (m) => (i, j) => { if (i === j) return 4; const [a, b] = [Math.floor(i / m), i % m], [c, d] = [Math.floor(j / m), j % m]; return Math.abs(a - c) + Math.abs(b - d) === 1 ? -1 : 0; };
  const ginv = (n) => (i, j) => (Math.min(i, j) + 1) * (n + 1 - (Math.max(i, j) + 1)) / (n + 1);   // 삼중대각 A(대각 2, 옆 −1)의 역행렬

  /* ---------- L01 처진 줄과 행렬 방정식 ---------- */
  F['l01-sag'] = {
    canvases: [{ h: 360, flex: 1.2 }, { h: 360 }],
    controls: [{ range: 'w', label: '무게', min: 0, max: 1.5, step: 0.1, value: 1, fmt: (v) => v.toFixed(1) }],
    init(st) { st.sel = null; },
    onclick(st, ci, x) { if (ci === 0) { const xv = (x - 50) / (st.cv[0].clientWidth - 70) * 1.1 - 0.05, k = Math.round(xv * 4); st.sel = k >= 1 && k <= 3 ? k - 1 : null; } else st.sel = null; },
    readout: (s) => `처진 깊이 <b>${[1.5, 2, 1.5].map((d) => (d * s.v.w).toFixed(2)).join(', ')}</b>${s.sel !== null ? ` · ${s.sel + 1}번 점의 식이 행렬의 ${s.sel + 1}번째 줄` : ' · 점을 누르면 그 점의 식이 강조된다'}`,
    draw(st, [a, b]) {
      const w = st.v.w, dep = [0, 1.5 * w, 2 * w, 1.5 * w, 0];
      const P = Plot(a.g, box(a, 50, 40, 20, 30), [-0.05, 1.05], [-3.2, 0.5]);
      P.frame({ title: '고르게 무게를 건 줄이 처진 채 멈춘 모양', zero: false });
      P.seg(-0.05, 0, 1.05, 0, COL.grid, 1);
      P.fn((x) => -8 * w * x * (1 - x), COL.exact, 2, 0, 1, 100, [6, 5]);
      for (let i = 0; i < 4; i++) P.seg(i / 4, -dep[i], (i + 1) / 4, -dep[i + 1], COL.space, 4);
      for (let i = 1; i < 4; i++) { P.arrowPx(i / 4, -dep[i], 0, -30, COL.muted, 2); P.dot(i / 4, -dep[i], st.sel === i - 1 ? 11 : 8, COL.time); P.text(i / 4, -dep[i], `u${'₁₂₃'[i - 1]} = ${dep[i].toFixed(2)}`, { size: 18, bold: true, align: 'center', dy: 46 }); }
      P.dot(0, 0, 6, COL.axis); P.dot(1, 0, 6, COL.axis);
      const g = b.g, cs = 54, x0 = 30, y0 = 90;
      text(g, b.w / 2, 40, '행렬 방정식  A u = b', { size: 21, bold: true, align: 'center', col: COL.axis });
      cells(g, x0, y0, 3, cs, tri, { vals: true, sel: st.sel });
      const vx = x0 + 3 * cs + 30;
      ['u₁', 'u₂', 'u₃'].forEach((s, i) => text(g, vx + 22, y0 + (i + 0.5) * cs + 7, s, { size: 20, bold: true, align: 'center', col: COL.timeText }));
      text(g, vx + 70, y0 + 1.5 * cs + 8, '=', { size: 26, bold: true, align: 'center' });
      [0, 1, 2].forEach((i) => text(g, vx + 120, y0 + (i + 0.5) * cs + 7, w.toFixed(1), { size: 20, bold: true, align: 'center' }));
      text(g, x0 + 1.5 * cs, y0 + 3 * cs + 34, 'A (계수 행렬)', { size: 18, bold: true, align: 'center' });
      text(g, b.w / 2, b.h - 20, '주황: 자기 자신, 파랑: 바로 옆 점', { size: 17, align: 'center', col: COL.muted });
    },
  };

  /* ---------- L02 0이 대부분인 행렬 ---------- */
  F['l02-sparse'] = {
    canvases: [{ h: 420, flex: 1.4 }, { h: 420 }],
    controls: [{ buttons: 'kind', items: [['줄', 'line'], ['면', 'plane']], value: 'line', act: (s) => { s.sel = null; } },
      { range: 'n', label: '크기', min: 3, max: 8, step: 1, value: 4, fmt: (v) => v }],
    init(st) { st.sel = null; },
    onclick(st, ci, x, y) { if (ci !== 0) return; const L = st.lay; if (!L) return; const i = Math.floor((y - L.y0) / L.cs); st.sel = i >= 0 && i < L.N ? i : null; },
    readout: (s) => { const N = s.v.kind === 'line' ? s.v.n * 6 + 1 : s.v.n ** 2, nz = s.v.kind === 'line' ? 3 * N - 2 : N + 4 * s.v.n * (s.v.n - 1); return `${N} × ${N}: 0이 아닌 칸 <b>${nz}</b> / ${N * N} (<b>${(100 * nz / N / N).toFixed(1)}%</b>) · 줄 999 × 999면 2995 / 998001 (0.3%)`; },
    draw(st, [a, b]) {
      const line = st.v.kind === 'line', m = st.v.n, N = line ? m * 6 + 1 : m * m, ent = line ? tri : lap2(m);
      const cs = Math.min(18, Math.floor((a.h - 60) / N)), x0 = (a.w - N * cs) / 2, y0 = 40;
      st.lay = { cs, x0, y0, N };
      text(a.g, a.w / 2, 26, `${line ? '줄' : '면'}: ${N} × ${N} 행렬 (0이 아닌 칸만 칠함)`, { size: 20, bold: true, align: 'center', col: COL.axis });
      cells(a.g, x0, y0, N, cs, ent, { vals: false, sel: st.sel });
      const g = b.g;
      if (line) {
        const P = Plot(g, { x: 20, y: 60, w: b.w - 40, h: 120 }, [-0.5, N + 0.5], [-1, 1]);
        text(g, b.w / 2, 34, '줄 위의 점들', { size: 20, bold: true, align: 'center', col: COL.axis });
        P.seg(0, 0, N + 1, 0, COL.space, 2);
        for (let i = 1; i <= N; i++) P.dot(i, 0, st.sel === i - 1 ? 8 : 4, st.sel !== null && Math.abs(st.sel - (i - 1)) <= 1 ? COL.time : COL.space);
      } else {
        const sp = Math.min(46, (b.w - 60) / m), ox = (b.w - sp * (m - 1)) / 2, oy = 80;
        text(g, b.w / 2, 34, `면: ${m} × ${m} 격자 (점 번호)`, { size: 20, bold: true, align: 'center', col: COL.axis });
        for (let k = 0; k < N; k++) {
          const r = Math.floor(k / m), q = k % m, x = ox + q * sp, y = oy + r * sp;
          const on = st.sel !== null && ent(st.sel, k) !== 0;
          g.fillStyle = on ? (k === st.sel ? COL.time : COL.space) : '#fff'; g.strokeStyle = COL.space; g.lineWidth = 1.5;
          g.beginPath(); g.arc(x, y, 13, 0, 7); g.fill(); g.stroke();
          text(g, x, y + 6, String(k + 1), { size: 15, align: 'center', col: on ? '#fff' : COL.ink, bold: true });
        }
      }
      text(g, b.w / 2, b.h - 40, '왼쪽 행렬의 줄을 누르면', { size: 17, align: 'center', col: COL.muted });
      text(g, b.w / 2, b.h - 16, '그 점과 이어진 이웃이 강조된다', { size: 17, align: 'center', col: COL.muted });
    },
  };

  /* ---------- L05 한 점을 누르면 줄 전체가 처진다 = A⁻¹의 한 열 ---------- */
  F['l05-inverse'] = {
    canvases: [{ h: 330, flex: 1.3 }, { h: 330 }],
    controls: [{ range: 'n', label: '행렬 크기', min: 3, max: 40, step: 1, value: 7, fmt: (v) => v }],
    init(st) { st.j = 3; },
    onclick(st, ci, x) { if (ci !== 0) return; const k = Math.round((x - 40) / (st.cv[0].clientWidth - 60) * 8) - 1; if (k >= 0 && k < 7) st.j = k; },
    readout: (s) => { const n = s.v.n; return `${n} × ${n}: A의 0 아닌 칸 <b>${3 * n - 2}</b>, A⁻¹의 0 아닌 칸 <b>${n * n}</b>`; },
    draw(st, [a, b]) {
      const n = 7, G = ginv(n), col = Array.from({ length: n }, (_, i) => G(i, st.j));
      const P = Plot(a.g, box(a, 40, 40, 20, 30), [0, 8], [-2.2, 0.6]);
      P.frame({ title: `${st.j + 1}번 점을 누르면 줄 전체가 처진다 (점을 눌러 바꾸기)`, zero: false });
      const xs = [0, ...col.map((_, i) => i + 1), 8], ys = [0, ...col.map((v) => -v), 0];
      P.path(xs, ys, COL.space, 4);
      xs.forEach((x, i) => P.dot(x, ys[i], i === st.j + 1 ? 10 : 6, i === st.j + 1 ? COL.time : COL.space));
      P.arrowPx(st.j + 1, -col[st.j], 0, -40, COL.time, 3.5);
      P.text(4, -2.05, '처진 깊이 = A⁻¹의 한 열(0이 하나도 없다)', { size: 18, align: 'center', col: COL.axis });
      const N = st.v.n, cs = Math.min(9, Math.floor((b.w - 60) / (2 * N))), y0 = 60, gap = 30, x1 = (b.w - (2 * N * cs + gap)) / 2;
      text(b.g, x1 + N * cs / 2, 40, 'A', { size: 20, bold: true, align: 'center' });
      text(b.g, x1 + N * cs + gap + N * cs / 2, 40, 'A⁻¹', { size: 20, bold: true, align: 'center' });
      cells(b.g, x1, y0, N, cs, tri, {});
      cells(b.g, x1 + N * cs + gap, y0, N, cs, ginv(N), { full: (N + 1) / 4 });
    },
  };

  /* ---------- L03 추측하고 고치기 ---------- */
  function jac(u) { const p = [0, ...u, 0]; return [1, 2, 3].map((i) => (p[i - 1] + p[i + 1]) / 2 + 0.5); }
  const resid = (u) => Math.max(Math.abs(2 * u[0] - u[1] - 1), Math.abs(-u[0] + 2 * u[1] - u[2] - 1), Math.abs(-u[1] + 2 * u[2] - 1));
  F['l03-jacobi'] = {
    canvases: [{ h: 330 }, { h: 330 }],
    controls: [{ button: 'it', label: '한 번 더 고치기', go: true, act: (s) => { if (s.hist.length < 13) s.hist.push(jac(s.hist[s.hist.length - 1])); } }, 'reset'],
    init(st) { st.hist = [[0, 0, 0]]; },
    readout: (s) => { const u = s.hist[s.hist.length - 1]; return `고친 횟수 <b>${s.hist.length - 1}</b> · 추측 (${u.map((v) => v.toFixed(3)).join(', ')})`; },
    draw(st, [a, b]) {
      const u = st.hist[st.hist.length - 1];
      const P = Plot(a.g, box(a, 50, 40, 20, 30), [-0.05, 1.05], [-2.3, 0.3]);
      P.frame({ title: '지금 추측(파랑)과 답(점선)', yt: [-2, -1, 0] });
      P.path([0, 0.25, 0.5, 0.75, 1], [0, -1.5, -2, -1.5, 0], COL.exact, 2, [6, 5]);
      P.path([0, 0.25, 0.5, 0.75, 1], [0, ...u.map((v) => -v), 0], COL.space, 4);
      u.forEach((v, i) => P.dot((i + 1) / 4, -v, 8, COL.space));
      const Q = Plot(b.g, box(b, 50, 40, 20, 40), [-0.5, 12.5], [0, 1.1]);
      Q.frame({ title: '세 식 가운데 가장 크게 어긋난 정도', xt: [0, 4, 8, 12], yt: [0, 0.5, 1], xl: '고친 횟수' });
      st.hist.forEach((h, k) => Q.rect(k - 0.35, 0, k + 0.35, resid(h), COL.time, null));
    },
  };

  /* ---------- L04 사인 모양은 특별한 방향 ---------- */
  const A5 = (v) => v.map((x, i) => 2 * x - (v[i - 1] || 0) - (v[i + 1] || 0));
  F['l04-eigen'] = {
    canvases: [{ h: 320 }],
    controls: [{ buttons: 'v', items: [['사인 모양을 넣으면', 'sine'], ['평평한 모양을 넣으면', 'flat']], value: 'sine' }],
    readout: (s) => (s.v.v === 'sine' ? '나온 벡터 = <b>0.268</b> × 넣은 벡터 (같은 모양)' : '나온 벡터는 양 끝만 남은 <b>다른 모양</b>'),
    draw(st, [c]) {
      const v = st.v.v === 'sine' ? [0.5, Math.sqrt(3) / 2, 1, Math.sqrt(3) / 2, 0.5] : [1, 1, 1, 1, 1], Av = A5(v);
      const P = Plot(c.g, box(c, 50, 30, 20, 40), [0, 6], [-0.1, 1.15]);
      P.frame({ xt: [1, 2, 3, 4, 5], yt: [0, 0.5, 1] });
      const xs = [0, 1, 2, 3, 4, 5, 6];
      P.path(xs, [0, ...v, 0], COL.exact, 3); v.forEach((y, i) => P.dot(i + 1, y, 7, COL.exact));
      P.path(xs, [0, ...Av, 0], COL.time, 3.5); Av.forEach((y, i) => P.dot(i + 1, y, 8, COL.time));
      text(c.g, c.w - 24, 30, '회색: 넣은 벡터, 주황: 행렬을 곱해 나온 벡터', { size: 18, align: 'right', col: COL.muted });
    },
  };

  /* ---------- L04 답이 예민한 문제 ---------- */
  F['l04-condition'] = {
    canvases: [{ h: 330 }],
    controls: [{ range: 'b', label: '둘째 식 오른쪽 수', min: 2.1, max: 2.2, step: 0.01, value: 2.1, fmt: (v) => v.toFixed(2) }],
    readout: (s) => { const y = (s.v.b - 2) / 0.1, x = 2 - y; return `교점 <b>(${x.toFixed(2)}, ${y.toFixed(2)})</b>`; },
    draw(st, [c]) {
      const bb = st.v.b, y = (bb - 2) / 0.1, x = 2 - y;
      const P = Plot(c.g, box(c, 50, 20, 20, 40), [-0.6, 2.8], [-0.4, 2.6], { equal: true });
      P.frame({ xt: [0, 1, 2], yt: [0, 1, 2] });
      P.fn((t) => 2 - t, COL.space, 3); P.fn((t) => (bb - t) / 1.1, COL.time, 3);
      P.dot(x, y, 9, COL.ink);
      P.text(x, y, `(${x.toFixed(2)}, ${y.toFixed(2)})`, { size: 19, bold: true, dx: 12, dy: -8, halo: true });
      text(c.g, c.w - 24, 40, `파랑: x + y = 2, 주황: x + 1.1y = ${bb.toFixed(2)}`, { size: 18, align: 'right', col: COL.muted });
    },
  };

  window.U5 = {
    tests(near) {
      let u = [0, 0, 0]; for (let k = 0; k < 10; k++) u = jac(u);
      near(+u[0].toFixed(4), 1.4531, 1e-4, 'L03 10번 뒤 u1'); near(+u[1].toFixed(4), 1.9375, 1e-4, 'L03 10번 뒤 u2');
      let r = [0, 0, 0], k = 0; for (; k < 10; k++) r = jac(r); near(resid(r), 0.03125, 1e-9, 'L03 10번 뒤 어긋남 1/32 (원고 0.03)');
      const G = ginv(3); near(G(0, 0), 0.75, 1e-12, 'L05 A⁻¹(1,1) = 3/4'); near(G(1, 1), 1, 1e-12, 'L05 A⁻¹(2,2) = 1');
      near(G(0, 0) + G(0, 1) + G(0, 2), 1.5, 1e-12, 'L05 A⁻¹(1,1,1) 첫 성분 1.5');
      const s = [0.5, Math.sqrt(3) / 2, 1, Math.sqrt(3) / 2, 0.5]; near(+A5(s)[2].toFixed(4), 0.2679, 1e-4, 'L04 고윳값 0.268');
      near(3 * 999 - 2, 2995, 0, 'L02 999 × 999의 0 아닌 칸');
    },
  };
})();
