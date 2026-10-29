/* 캔버스 그리기 도우미: 2차원 좌표 상자(Plot)와 3차원 평행 투영(Cam).
   글자는 화면 크기 기준 18px 이상(명세 2-5). 색은 명세 2-4의 뜻을 따른다. */
(function (root) {
  const COL = {
    space: '#2f5d8a', time: '#d9822b', timeText: '#a85a0c', good: '#2e7d5b', bad: '#b03a2e',
    exact: '#8a96a3', vel: '#4b5563', axis: '#374151', grid: '#e3e9f0', muted: '#5b6b7d', ink: '#0f1a27',
    faint: '#c7d3e0', fill: '#eef3f8', white: '#ffffff', title: '#16325a',
  };
  const FONT = "'Pretendard Variable', Pretendard, 'Malgun Gothic', sans-serif";

  /* 캔버스를 보이는 크기의 2배 해상도로 맞추고 2D 문맥을 돌려준다 */
  function fit(c) {
    const w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return null;
    const k = 2;
    if (c.width !== Math.round(w * k) || c.height !== Math.round(h * k)) { c.width = Math.round(w * k); c.height = Math.round(h * k); }
    const g = c.getContext('2d');
    g.setTransform(k, 0, 0, k, 0, 0);
    g.clearRect(0, 0, w, h);
    g.lineJoin = 'round'; g.lineCap = 'round';
    return { g, w, h };
  }

  function text(g, x, y, s, o = {}) {
    g.save();
    g.font = `${o.bold ? 700 : 500} ${o.size || 18}px ${FONT}`;
    g.fillStyle = o.col || COL.ink;
    g.textAlign = o.align || 'left';
    g.textBaseline = o.base || 'alphabetic';
    if (o.halo) { g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,.9)'; g.strokeText(s, x, y); }
    g.fillText(s, x, y);
    g.restore();
  }

  function arrowPx(g, x1, y1, x2, y2, col, w = 2.6) {
    const dx = x2 - x1, dy = y2 - y1, n = Math.hypot(dx, dy);
    if (n < 1) return;
    const ux = dx / n, uy = dy / n, hl = Math.min(6 + 2.4 * w, n * 0.6), hw = 3 + 1.4 * w;
    g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2 - ux * hl * 0.8, y2 - uy * hl * 0.8); g.stroke();
    g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - ux * hl - uy * hw, y2 - uy * hl + ux * hw); g.lineTo(x2 - ux * hl + uy * hw, y2 - uy * hl - ux * hw); g.closePath(); g.fill();
    g.restore();
  }

  /* 좌표 상자: box = {x, y, w, h}(픽셀), xr = [x0, x1], yr = [y0, y1]. equal이면 두 축 단위를 같게 */
  function Plot(g, box, xr, yr, opt = {}) {
    let { x, y, w, h } = box;
    if (opt.equal) {
      const s = Math.min(w / (xr[1] - xr[0]), h / (yr[1] - yr[0]));
      const nw = s * (xr[1] - xr[0]), nh = s * (yr[1] - yr[0]);
      x += (w - nw) / 2; y += (h - nh) / 2; w = nw; h = nh;
    }
    const P = {
      g, x, y, w, h, xr, yr,
      X: (v) => x + (v - xr[0]) / (xr[1] - xr[0]) * w,
      Y: (v) => y + h - (v - yr[0]) / (yr[1] - yr[0]) * h,
      frame(o = {}) {
        g.save();
        if (o.bg !== false) { g.fillStyle = '#fff'; g.fillRect(x, y, w, h); }
        g.strokeStyle = COL.grid; g.lineWidth = 1;
        (o.xt || []).forEach((t) => { g.beginPath(); g.moveTo(P.X(t), y); g.lineTo(P.X(t), y + h); g.stroke(); });
        (o.yt || []).forEach((t) => { g.beginPath(); g.moveTo(x, P.Y(t)); g.lineTo(x + w, P.Y(t)); g.stroke(); });
        if (o.zero !== false && yr[0] < 0 && yr[1] > 0) { g.strokeStyle = '#9aa7b6'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x, P.Y(0)); g.lineTo(x + w, P.Y(0)); g.stroke(); }
        if (o.box !== false) { g.strokeStyle = '#b8c4d2'; g.lineWidth = 1; g.strokeRect(x, y, w, h); }
        const fs = o.fs || 17;
        (o.xt || []).forEach((t, i) => text(g, P.X(t), y + h + fs + 4, o.xtl ? o.xtl[i] : fmt(t), { size: fs, col: COL.muted, align: 'center' }));
        (o.yt || []).forEach((t, i) => text(g, x - 7, P.Y(t) + fs * 0.35, o.ytl ? o.ytl[i] : fmt(t), { size: fs, col: COL.muted, align: 'right' }));
        if (o.xl) text(g, x + w / 2, y + h + fs * 2 + 10, o.xl, { size: fs + 1, col: COL.axis, align: 'center' });
        if (o.yl) { g.translate(x - (o.ylo || 46), y + h / 2); g.rotate(-Math.PI / 2); text(g, 0, 0, o.yl, { size: fs + 1, col: COL.axis, align: 'center' }); }
        if (o.title) text(g, x + w / 2, y - 10, o.title, { size: o.tfs || 20, col: COL.axis, align: 'center', bold: true });
        g.restore();
      },
      path(xs, ys, col, lw = 3, dash) {
        g.save(); g.strokeStyle = col; g.lineWidth = lw; if (dash) g.setLineDash(dash);
        g.beginPath(); let on = false;
        for (let i = 0; i < xs.length; i++) {
          const yy = ys[i];
          if (!isFinite(yy) || yy < yr[0] - (yr[1] - yr[0]) || yy > yr[1] + (yr[1] - yr[0])) { on = false; continue; }
          on ? g.lineTo(P.X(xs[i]), P.Y(yy)) : g.moveTo(P.X(xs[i]), P.Y(yy)); on = true;
        }
        g.stroke(); g.restore();
      },
      fn(f, col, lw = 3, a = xr[0], b = xr[1], n = 300, dash) {
        const xs = [], ys = [];
        for (let i = 0; i <= n; i++) { const v = a + (b - a) * i / n; xs.push(v); ys.push(f(v)); }
        P.clip(() => P.path(xs, ys, col, lw, dash));
      },
      clip(fn) { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); fn(); g.restore(); },
      dot(px, py, r = 6, col = COL.space, stroke = '#fff', sw = 2) {
        g.save(); g.fillStyle = col; g.strokeStyle = stroke; g.lineWidth = sw;
        g.beginPath(); g.arc(P.X(px), P.Y(py), r, 0, 7); g.fill(); if (stroke) g.stroke(); g.restore();
      },
      ring(px, py, r = 7, col = COL.time, lw = 3) {
        g.save(); g.fillStyle = '#fff'; g.strokeStyle = col; g.lineWidth = lw;
        g.beginPath(); g.arc(P.X(px), P.Y(py), r, 0, 7); g.fill(); g.stroke(); g.restore();
      },
      seg(x1, y1, x2, y2, col, lw = 2, dash) {
        g.save(); g.strokeStyle = col; g.lineWidth = lw; if (dash) g.setLineDash(dash);
        g.beginPath(); g.moveTo(P.X(x1), P.Y(y1)); g.lineTo(P.X(x2), P.Y(y2)); g.stroke(); g.restore();
      },
      arrow(x1, y1, x2, y2, col, lw) { arrowPx(g, P.X(x1), P.Y(y1), P.X(x2), P.Y(y2), col, lw); },
      arrowPx(px, py, dx, dy, col, lw) { arrowPx(g, P.X(px), P.Y(py), P.X(px) + dx, P.Y(py) - dy, col, lw); },
      text(px, py, s, o = {}) { text(g, P.X(px) + (o.dx || 0), P.Y(py) + (o.dy || 0), s, o); },
      fillBetween(xs, ys, col, alpha = 0.25) {
        g.save(); g.globalAlpha = alpha; g.fillStyle = col; g.beginPath();
        xs.forEach((v, i) => (i ? g.lineTo(P.X(v), P.Y(ys[i])) : g.moveTo(P.X(v), P.Y(ys[i]))));
        g.lineTo(P.X(xs[xs.length - 1]), P.Y(0)); g.lineTo(P.X(xs[0]), P.Y(0)); g.closePath(); g.fill(); g.restore();
      },
      rect(x1, y1, x2, y2, fill, stroke, lw = 1.5, alpha = 1) {
        g.save(); g.globalAlpha = alpha;
        const a = P.X(Math.min(x1, x2)), b = P.Y(Math.max(y1, y2)), ww = Math.abs(P.X(x2) - P.X(x1)), hh = Math.abs(P.Y(y2) - P.Y(y1));
        if (fill) { g.fillStyle = fill; g.fillRect(a, b, ww, hh); }
        g.globalAlpha = 1;
        if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.strokeRect(a, b, ww, hh); }
        g.restore();
      },
    };
    return P;
  }

  function fmt(v) {
    if (Math.abs(v) < 1e-12) return '0';
    const s = (+v.toFixed(3)).toString();
    return s.replace('-', '−');
  }

  /* 3차원 평행 투영. 방위각 az, 앙각 el(도). z가 화면 위쪽. s = 픽셀/단위, sx·sy·sz = 축별 배율 */
  function Cam(ox, oy, s, az, el, sx = 1, sy = 1, sz = 1) {
    const A = az * Math.PI / 180, E = el * Math.PI / 180;
    const d = [Math.cos(E) * Math.cos(A), Math.cos(E) * Math.sin(A), Math.sin(E)];
    let u = [-d[2] * d[0], -d[2] * d[1], 1 - d[2] * d[2]];
    const nu = Math.hypot(...u); u = u.map((t) => t / nu);
    const r = [u[1] * d[2] - u[2] * d[1], u[2] * d[0] - u[0] * d[2], u[0] * d[1] - u[1] * d[0]];
    const P = (x, y, z) => { const q = [x * sx, y * sy, z * sz]; return [ox + s * (q[0] * r[0] + q[1] * r[1] + q[2] * r[2]), oy - s * (q[0] * u[0] + q[1] * u[1] + q[2] * u[2])]; };
    P.depth = (x, y, z) => x * sx * d[0] + y * sy * d[1] + z * sz * d[2];
    return P;
  }

  /* 격자 곡면: f(i, j) → [x, y, z], 색 함수 col(zMean). 멀리 있는 면부터 그린다 */
  function surface(g, P, n, m, f, col, stroke = '#6b7a8c', lw = 0.5) {
    const quads = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
      const c = [f(i, j), f(i + 1, j), f(i + 1, j + 1), f(i, j + 1)];
      const cx = (c[0][0] + c[2][0]) / 2, cy = (c[0][1] + c[2][1]) / 2, cz = (c[0][2] + c[1][2] + c[2][2] + c[3][2]) / 4;
      quads.push([P.depth(cx, cy, cz), c, cz, i, j]);
    }
    quads.sort((a, b) => a[0] - b[0]);
    g.save(); g.lineWidth = lw; g.strokeStyle = stroke;
    quads.forEach(([, c, cz, i, j]) => {
      g.fillStyle = col(cz, i, j);
      g.beginPath(); c.forEach((p, k) => { const [X, Y] = P(...p); k ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); g.fill(); g.stroke();
    });
    g.restore();
  }

  /* 높이에 따른 색: 위는 주황 쪽, 아래는 파랑 쪽(원고 그림과 같은 방식) */
  function heightColor(z, zmax = 1) {
    const t = Math.max(-1, Math.min(1, z / zmax));
    const base = t >= 0 ? [242, 196, 141] : [159, 184, 211];
    const k = Math.abs(t);
    return `rgb(${base.map((b) => Math.round(255 + (b - 255) * (0.18 + 0.82 * k))).join(',')})`;
  }

  function polyline3(g, P, pts, col, lw = 3, dash) {
    g.save(); g.strokeStyle = col; g.lineWidth = lw; if (dash) g.setLineDash(dash);
    g.beginPath(); pts.forEach((p, k) => { const [X, Y] = P(...p); k ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke(); g.restore();
  }

  const api = { COL, FONT, fit, text, arrowPx, Plot, Cam, surface, heightColor, polyline3, fmt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PLOT = api;
})(typeof window !== 'undefined' ? window : globalThis);
