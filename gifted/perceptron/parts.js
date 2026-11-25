/* 「퍼셉트론, 직선으로 판단하다」 — 그림 부품(SVG 문자열)과 평면 조작.
   제작 명세서 §3. 계산은 geom.js(window.PG)를 쓴다. */
'use strict';

const U = 160;                 // 평면 1의 길이(그림 단위)
const R_DOT = 13;              // 점 반지름(= PG.TOL × U 정도)
const PX = (a) => 40 + (a - PG.LO) * U;
const PY = (b) => 360 - (b - PG.LO) * U;
const f1 = (v) => Math.round(v * 10) / 10;
const ptStr = (poly) => poly.map((p) => `${f1(PX(p[0]))},${f1(PY(p[1]))}`).join(' ');
const COORD = ['(0, 0)', '(0, 1)', '(1, 0)', '(1, 1)'];

function svgText(x, y, s, cls = '', anchor = 'middle', size = 18) {
  return `<text class="t ${cls}" x="${f1(x)}" y="${f1(y)}" font-size="${size}" text-anchor="${anchor}" dominant-baseline="central">${s}</text>`;
}
const vA = '<tspan class="var">A</tspan>', vB = '<tspan class="var">B</tspan>';

function axesSvg(ticks = true, tickText = false) {
  const x0 = PX(0), y0 = PY(0), xr = PX(PG.HI), yt = PY(PG.HI);
  let s = `<g class="axes"><line x1="${PX(PG.LO)}" y1="${y0}" x2="${xr + 6}" y2="${y0}"/><polygon points="${xr + 16},${y0} ${xr + 4},${y0 - 6} ${xr + 4},${y0 + 6}"/>
    <line x1="${x0}" y1="${PY(PG.LO)}" x2="${x0}" y2="${yt - 6}"/><polygon points="${x0},${yt - 16} ${x0 - 6},${yt - 4} ${x0 + 6},${yt - 4}"/>`;
  if (ticks) s += `<line x1="${PX(1)}" y1="${y0 - 5}" x2="${PX(1)}" y2="${y0 + 5}"/><line x1="${x0 - 5}" y1="${PY(1)}" x2="${x0 + 5}" y2="${PY(1)}"/>`;
  s += '</g>';
  s += svgText(xr + 6, y0 + 22, vA, '', 'middle', 22) + svgText(x0 - 20, yt - 4, vB, '', 'middle', 22) + svgText(x0 - 16, y0 + 18, 'O', 'small');
  if (ticks && tickText) s += svgText(PX(1), y0 + 24, '1', 'small') + svgText(x0 - 14, PY(1), '1', 'small', 'end');
  return s;
}

/* 점: 1이면 ●(채움), 0이면 ○(빈 원), null이면 이름만 있는 회색 점 */
function dotSvg(i, label, extra = '') {
  const [a, b] = PG.POINTS[i];
  const cls = label === 1 ? 'dot on' : label === 0 ? 'dot off' : 'dot plain';
  return `<circle class="${cls}${extra}" data-point="${i}" cx="${PX(a)}" cy="${PY(b)}" r="${R_DOT}"/>`;
}
function coordLabels(which = [0, 1, 2, 3]) {
  const pos = { 0: [14, 22, 'start'], 1: [-16, -18, 'end'], 2: [16, 22, 'start'], 3: [16, -18, 'start'] };
  return which.map((i) => { const [a, b] = PG.POINTS[i]; const [dx, dy, an] = pos[i]; return svgText(PX(a) + dx, PY(b) + dy, COORD[i], 'coord', an, 15); }).join('');
}
function lineSeg(L, cls, poly) {
  if (!L) return '';
  const seg = PG.segmentIn(L, poly || PG.SQUARE);
  if (!seg) return '';
  return `<line class="${cls}" x1="${f1(PX(seg[0][0]))}" y1="${f1(PY(seg[0][1]))}" x2="${f1(PX(seg[1][0]))}" y2="${f1(PY(seg[1][1]))}"/>`;
}
function lineFromPts(line) { return line ? PG.lineThrough(line.p, line.q) : null; }

/* 좌표평면. o: { labels, line:{p,q}, ghosts:[{p,q}], fixed:[{L, cls, text, at}], shade, wrong:[i], segs:{black,white},
   star, coords, interactive, pending:[a,b], selected:[i], id, area:'square'|'upper', title } */
function planeSvg(o = {}) {
  const labels = o.labels || [null, null, null, null];
  const L = lineFromPts(o.line);
  let g = '';
  g += `<rect class="paper" x="${PX(PG.LO)}" y="${PY(PG.HI)}" width="${2 * U}" height="${2 * U}"/>`;
  if (L && o.shade !== false) {
    const area = o.area === 'upper' ? PG.UPPER : PG.SQUARE;
    g += `<polygon class="shade-a" points="${ptStr(PG.clip(area, L, 1))}"/><polygon class="shade-b" points="${ptStr(PG.clip(area, L, -1))}"/>`;
  }
  (o.polys || []).forEach((poly) => { if (poly.pts.length > 2) g += `<polygon class="${poly.cls}" points="${ptStr(poly.pts)}"/>`; });
  g += axesSvg(o.ticks !== false, o.coords === false);
  (o.ghosts || []).forEach((ln) => { g += lineSeg(lineFromPts(ln), 'ghost-line'); });
  (o.fixed || []).forEach((fx) => {
    g += lineSeg(fx.L, fx.cls || 'fixed-line');
    if (fx.text) g += svgText(PX(fx.at[0]), PY(fx.at[1]), fx.text, 'line-label', fx.anchor || 'middle', 16);
  });
  if (o.segs) {
    if (o.segs.black) g += `<line class="seg seg-black" x1="${PX(0)}" y1="${PY(1)}" x2="${PX(1)}" y2="${PY(0)}"/>`;
    if (o.segs.white) g += `<line class="seg seg-white" x1="${PX(0)}" y1="${PY(0)}" x2="${PX(1)}" y2="${PY(1)}"/>`;
  }
  if (L) g += lineSeg(L, 'user-line');
  const sideArr = L ? PG.sides(L) : null;
  for (let i = 0; i < 4; i++) {
    if (o.hide && o.hide.includes(i)) continue;
    let extra = '';
    if (sideArr && sideArr[i] === 0) extra += ' on-line';
    if (o.wrong && o.wrong.includes(i)) extra += ' wrong';
    if (o.selected && o.selected.includes(i)) extra += ' selected';
    g += dotSvg(i, labels[i], extra);
  }
  if (o.star) g += `<circle class="star" cx="${PX(0.5)}" cy="${PY(0.5)}" r="8"/>` + svgText(PX(0.5) + 12, PY(0.5) - 16, '(0.5, 0.5)', 'coord', 'start', 15);
  if (o.coords !== false) g += coordLabels((o.coordList) || [0, 1, 2, 3].filter((i) => !(o.hide || []).includes(i)));
  if (o.interactive && o.line) {
    g += `<circle class="handle" data-handle="p" cx="${f1(PX(o.line.p[0]))}" cy="${f1(PY(o.line.p[1]))}" r="9"/>`;
    g += `<circle class="handle" data-handle="q" cx="${f1(PX(o.line.q[0]))}" cy="${f1(PY(o.line.q[1]))}" r="9"/>`;
  }
  if (o.pending) g += `<circle class="pending" cx="${f1(PX(o.pending[0]))}" cy="${f1(PY(o.pending[1]))}" r="7"/>`;
  const label = o.title || '좌표평면';
  return `<svg viewBox="0 0 400 400" class="plane-svg" role="img" aria-label="${label}"${o.interactive ? ' tabindex="0"' : ''}>${g}</svg>`;
}

/* ------------------------------------------------------------ 접기 그림 */
function foldSvg(t, o = {}) {
  const flat = t < 0.01, back = Math.cos(t) < 0;
  let g = '';
  const L = lineFromPts(o.line);
  if (L && o.cut) {
    const su = PG.sideOf(L, [0, 1]);
    g += `<rect class="cut-bg" x="${PX(PG.LO)}" y="${PY(PG.HI)}" width="${2 * U}" height="${2 * U}"/><polygon class="cutaway" points="${ptStr(PG.clip(PG.UPPER, L, -su))}"/><polygon class="paper keep" points="${ptStr(PG.clip(PG.UPPER, L, su))}"/>`;
  } else g += `<polygon class="paper" points="${ptStr(PG.UPPER)}"/>`;
  if (L && !o.cut && o.shade !== false && t > Math.PI - 0.01) {
    g += `<polygon class="shade-a" points="${ptStr(PG.clip(PG.UPPER, L, 1))}"/><polygon class="shade-b" points="${ptStr(PG.clip(PG.UPPER, L, -1))}"/>`;
  }
  if (!flat) g += `<polygon class="fold-ghost" points="${ptStr(PG.LOWER)}"/>`;
  const flap = PG.LOWER.map((p) => PG.foldAt(p, t));
  if (t < Math.PI - 0.01 || o.showFlap) g += `<polygon class="paper flap${back ? ' back' : ''}" points="${ptStr(flap)}"/>`;
  if (flat) g = `<rect class="paper" x="${PX(PG.LO)}" y="${PY(PG.HI)}" width="${2 * U}" height="${2 * U}"/>` + axesSvg(true);
  g += `<line class="crease" x1="${PX(PG.LO)}" y1="${PY(PG.HI)}" x2="${PX(PG.HI)}" y2="${PY(PG.LO)}"/>`;
  if (L) g += lineSeg(L, o.cut ? 'cut-line' : 'user-line', PG.UPPER);
  /* 점 */
  g += dotSvg(1, 1) + dotSvg(2, 1);
  const m = PG.foldAt([0, 0], t);
  g += `<circle class="dot off" cx="${PX(1)}" cy="${PY(1)}" r="${R_DOT}"/>`;
  if (t < Math.PI - 0.01) g += `<circle class="dot off" cx="${f1(PX(m[0]))}" cy="${f1(PY(m[1]))}" r="${R_DOT}"/>`;
  if (L) {
    const j = PG.foldJudge(L);
    if (j.onPoints) j.onPoints.forEach((p) => { g += `<circle class="ring" cx="${PX(p[0])}" cy="${PY(p[1])}" r="${R_DOT + 5}"/>`; });
  }
  g += svgText(PX(0) - 16, PY(1) - 18, '(0, 1)', 'coord', 'end', 15) + svgText(PX(1) + 16, PY(0) + 22, '(1, 0)', 'coord', 'start', 15);
  if (t > Math.PI - 0.4) g += svgText(PX(1) + 4, PY(1) - 24, '(0, 0)과 (1, 1)', 'coord', 'middle', 15);
  else { g += svgText(PX(1) + 16, PY(1) - 18, '(1, 1)', 'coord', 'start', 15); if (flat) g += svgText(PX(0) + 14, PY(0) + 22, '(0, 0)', 'coord', 'start', 15); }
  if (o.interactive && o.line) {
    g += `<circle class="handle" data-handle="p" cx="${f1(PX(o.line.p[0]))}" cy="${f1(PY(o.line.p[1]))}" r="9"/>`;
    g += `<circle class="handle" data-handle="q" cx="${f1(PX(o.line.q[0]))}" cy="${f1(PY(o.line.q[1]))}" r="9"/>`;
  }
  if (o.pending) g += `<circle class="pending" cx="${f1(PX(o.pending[0]))}" cy="${f1(PY(o.pending[1]))}" r="7"/>`;
  return `<svg viewBox="0 0 400 400" class="plane-svg" role="img" aria-label="${o.title || '접은 평면'}"${o.interactive ? ' tabindex="0"' : ''}>${g}</svg>`;
}

/* 다 접은 종이를 돌려 본 모습(03 §3-5). 위쪽 반은 z = 0, 넘어온 반(원점 쪽)은 그 위에 조금 떠 있다(접힌 선에서 멀수록 FOLD_GAP까지).
   o: { yaw, pitch, line:{p,q} (칼날 면), cut, title }. yaw = pitch = 0이면 위에서 본 foldSvg와 좌표가 같다 */
const FOLD_GAP = 0.35;              // 그림에서 두 겹이 보이도록 일부러 띄운 거리(실제 종이 두께가 아님)
const U3 = 130;                     // 돌려 본 그림의 축척(라벨이 잘리지 않게 위에서 본 그림보다 조금 작게)
const creaseDist = (p) => Math.abs(p[0] + p[1] - 1) / Math.SQRT2;
const flapZ = (q) => FOLD_GAP * Math.min(1, creaseDist(q) / 0.3);
function fold3DSvg(o = {}) {
  const yaw = o.yaw || 0, pitch = o.pitch || 0;
  const k = (yaw || pitch) ? U3 : U;
  const oy = (yaw || pitch) ? 255 : 200;
  const S = (P) => { const v = PG.view3(P, yaw, pitch); return [200 + (v[0] - 0.5) * k, oy - (v[1] - 0.5) * k, v[2]]; };
  const poly = (pts, cls) => `<polygon class="${cls}" points="${pts.map((P) => S(P)).map((q) => `${f1(q[0])},${f1(q[1])}`).join(' ')}"/>`;
  const up = PG.UPPER.map((p) => [p[0], p[1], 0]);
  const flap = PG.UPPER.map((p) => [p[0], p[1], flapZ(p)]);      // 넘어온 반은 위에서 보면 위쪽 반과 같은 자리
  let g = poly(up, 'paper fold3-base');
  const L = lineFromPts(o.line);
  const seg = L ? PG.segmentIn(L, PG.UPPER) : null;
  const along = (z) => { if (!seg) return ''; const pts = []; for (let k = 0; k <= 12; k++) { const t = k / 12; const q = [seg[0][0] + (seg[1][0] - seg[0][0]) * t, seg[0][1] + (seg[1][1] - seg[0][1]) * t]; pts.push(S([q[0], q[1], z(q)])); } return pts.map((q) => `${f1(q[0])},${f1(q[1])}`).join(' '); };
  if (seg) g += `<polyline class="cut-line" points="${along(() => 0)}"/>`;
  g += poly(flap, 'paper flap back fold3-flap');
  g += `<line class="crease" x1="${f1(S([PG.LO, PG.HI, 0])[0])}" y1="${f1(S([PG.LO, PG.HI, 0])[1])}" x2="${f1(S([PG.HI, PG.LO, 0])[0])}" y2="${f1(S([PG.HI, PG.LO, 0])[1])}"/>`;
  if (seg) {
    const knife = [[seg[0][0], seg[0][1], -0.22], [seg[1][0], seg[1][1], -0.22], [seg[1][0], seg[1][1], FOLD_GAP + 0.22], [seg[0][0], seg[0][1], FOLD_GAP + 0.22]];
    g += poly(knife, 'knife');
    g += `<polyline class="cut-line" points="${along(flapZ)}"/>`;
  }
  /* 두 겹의 높이 차를 보이는 세로 점선: 종이 끝 모서리와 겹친 ○ 두 점 사이 */
  [[PG.HI, PG.HI], [1, 1]].forEach(([a, b]) => { const p0 = S([a, b, 0]), p1 = S([a, b, flapZ([a, b])]); g += `<line class="stack-guide" x1="${f1(p0[0])}" y1="${f1(p0[1])}" x2="${f1(p1[0])}" y2="${f1(p1[1])}"/>`; });
  /* 점: ● 두 점은 접힌 선 위, ○ (1, 1)은 아래 겹, ○ (0, 0)은 넘어와 위 겹에서 (1, 1) 바로 위 */
  const dots = [[[0, 1, 0], 'dot on'], [[1, 0, 0], 'dot on'], [[1, 1, 0], 'dot off under'], [[1, 1, flapZ([1, 1])], 'dot off']];
  dots.map(([P, cls]) => [S(P), cls]).sort((a, b) => a[0][2] - b[0][2]).forEach(([q, cls]) => { g += `<circle class="${cls}" cx="${f1(q[0])}" cy="${f1(q[1])}" r="${R_DOT}"/>`; });
  const lab = (P, t, an, dx, dy) => { const q = S(P); return svgText(q[0] + dx, q[1] + dy, t, 'coord', an, 15); };
  g += lab([0, 1, 0], '(0, 1)', 'end', -16, -18) + lab([1, 0, 0], '(1, 0)', 'start', 16, 22) + lab([1, 1, flapZ([1, 1])], '위 겹: (0, 0)', 'end', -18, -14) + lab([1, 1, 0], '아래 겹: (1, 1)', 'end', -18, 16);
  return `<svg viewBox="0 0 400 400" class="plane-svg fold3-svg" role="img" aria-label="${o.title || '접은 종이를 돌려 본 모습'}">${g}</svg>`;
}

/* 펼친 모습: 남은 종이 두 조각, 떨어져 나간 자리, 잘린 자리 두 개 */
function unfoldSvg(line, o = {}) {
  const L = lineFromPts(line);
  if (!L) return '';
  const u = PG.unfold(L);
  let g = `<rect class="cut-bg" x="${PX(PG.LO)}" y="${PY(PG.HI)}" width="${2 * U}" height="${2 * U}"/>`;
  g += `<polygon class="cutaway" points="${ptStr(u.upperCut)}"/><polygon class="cutaway" points="${ptStr(u.flapCut)}"/>`;
  g += `<polygon class="paper keep" points="${ptStr(u.upperKeep)}"/><polygon class="paper keep" points="${ptStr(u.flapKeep)}"/>`;
  g += axesSvg(true);
  g += `<line class="crease faint" x1="${PX(PG.LO)}" y1="${PY(PG.HI)}" x2="${PX(PG.HI)}" y2="${PY(PG.LO)}"/>`;
  u.cutSegments.forEach((s) => { g += `<line class="cut-line" x1="${f1(PX(s[0][0]))}" y1="${f1(PY(s[0][1]))}" x2="${f1(PX(s[1][0]))}" y2="${f1(PY(s[1][1]))}"/>`; });
  g += dotSvg(1, 1) + dotSvg(2, 1);
  g += `<circle class="dot ghost" cx="${PX(0)}" cy="${PY(0)}" r="${R_DOT}"/><circle class="dot ghost" cx="${PX(1)}" cy="${PY(1)}" r="${R_DOT}"/>`;
  g += coordLabels();
  if (o.labels !== false) {
    const k = PG.parallelK(L);
    if (k !== null) {
      /* 위쪽 직선은 위 끝(B=1.4) 오른쪽, 아래쪽 직선은 아래 끝(B=-0.38) 오른쪽 */
      g += svgText(PX(Math.max(-0.45, k - 1.4) + 0.08), PY(Math.min(1.4, k + 0.45)), `${vA} + ${vB} = ${fmtK(k)}`, 'line-label', 'start', 15);
      g += svgText(PX(Math.min(1.0, 2 - k + 0.38) + 0.08), PY(Math.max(-0.38, 2 - k - 1.0)), `${vA} + ${vB} = ${fmtK(2 - k)}`, 'line-label', 'start', 15);
    }
  }
  return `<svg viewBox="0 0 400 400" class="plane-svg" role="img" aria-label="${o.title || '펼친 평면'}">${g}</svg>`;
}
const fmtK = (k) => String(Math.round(k * 100) / 100);

/* ------------------------------------------------------------ 합으로 줄 세우기(합의 수직선) */
function sumlineSvg(o = {}) {
  const labels = o.labels || [null, null, null, null];
  const W = 420, H = 150;
  const SX = (s) => 40 + (s + 0.5) / 3 * 340;
  const y0 = 92;
  let g = '';
  const divs = (o.dividers || []).map((c10) => c10 / 10);
  if (divs.length === 1) g += `<rect class="sum-one" x="${f1(SX(divs[0]))}" y="18" width="${f1(SX(2.5) - SX(divs[0]))}" height="${y0 - 6}"/>`;
  if (divs.length === 2) g += `<rect class="sum-one" x="${f1(SX(divs[0]))}" y="18" width="${f1(SX(divs[1]) - SX(divs[0]))}" height="${y0 - 6}"/>`;
  g += `<line class="axis-line" x1="${SX(-0.5)}" y1="${y0}" x2="${SX(2.5) + 6}" y2="${y0}"/><polygon class="axis-head" points="${SX(2.5) + 16},${y0} ${SX(2.5) + 4},${y0 - 6} ${SX(2.5) + 4},${y0 + 6}"/>`;
  [0, 1, 2].forEach((s) => { g += `<line class="axis-line" x1="${SX(s)}" y1="${y0 - 5}" x2="${SX(s)}" y2="${y0 + 5}"/>` + svgText(SX(s), y0 + 20, String(s), 'small', 'middle', 16); });
  g += svgText(SX(2.5) + 8, y0 + 22, `${vA}+${vB}`, 'small', 'end', 14);
  const place = [[0, 58], [1, 40], [1, 70], [2, 58]];
  for (let i = 0; i < 4; i++) {
    const [s, y] = place[i];
    const lab = labels[i];
    const cls = lab === 1 ? 'dot on' : lab === 0 ? 'dot off' : 'dot plain';
    g += `<circle class="${cls}" cx="${SX(s)}" cy="${y}" r="11"/>` + svgText(SX(s) + 15, y, COORD[i], 'coord', 'start', 12);
  }
  divs.forEach((c) => {
    g += `<line class="divider" x1="${f1(SX(c))}" y1="14" x2="${f1(SX(c))}" y2="${y0 + 8}"/>` + svgText(SX(c), 8 + 0, `c = ${fmtK(c)}`, 'divider-label', 'middle', 14);
  });
  if (divs.length) g += svgText(SX(2.5) - 4, 26, divs.length === 1 ? '오른쪽: 1' : '사이: 1', 'tiny', 'end', 12);
  return `<svg viewBox="0 0 ${W} ${H}" class="sumline-svg" role="img" aria-label="합으로 줄 세우기">${g}</svg>`;
}

/* ------------------------------------------------------------ 회로 그림 */
function circuitLayout(circuit) {
  const depth = {};
  circuit.inputs.forEach((x) => { depth[x] = 0; });
  circuit.gates.forEach((gt) => {
    const need = gt.type === 'NOT' ? 1 : 2;
    const ds = gt.inputs.slice(0, need).map((x) => (depth[x] === undefined ? 0 : depth[x]));
    depth[gt.id] = 1 + Math.max(0, ...ds);
  });
  const maxD = Math.max(0, ...circuit.gates.map((gt) => depth[gt.id]));
  const cols = {};
  const push = (id, d) => { (cols[d] = cols[d] || []).push(id); };
  circuit.inputs.forEach((x) => push(x, 0));
  circuit.gates.forEach((gt) => push(gt.id, depth[gt.id]));
  push('OUT', maxD + 1);
  return { depth, cols, maxD };
}
function gateLabel(gt) { return gt.type === 'TH' ? `A+B > ${fmtK(gt.c10 / 10)}` : gt.type; }
function circuitSvg(circuit, vals = null, o = {}) {
  const { cols, maxD } = circuitLayout(circuit);
  const hasTH = circuit.gates.some((gt) => gt.type === 'TH');
  const colW = hasTH ? 128 : 108, rowH = 66;
  const nRows = Math.max(...Object.values(cols).map((c) => c.length));
  const W = 40 + (maxD + 2) * colW, H = Math.max(140, nRows * rowH + 24);
  const pos = {};
  Object.entries(cols).forEach(([d, ids]) => {
    const total = ids.length * rowH;
    ids.forEach((id, k) => { pos[id] = [30 + Number(d) * colW + 20, (H - total) / 2 + (k + 0.5) * rowH]; });
  });
  const width = (id) => (circuit.inputs.includes(id) ? 36 : id === 'OUT' ? 56 : (circuit.gates.find((gt) => gt.id === id) || {}).type === 'TH' ? 104 : 64);
  const gateById = Object.fromEntries(circuit.gates.map((gt) => [gt.id, gt]));
  let wires = '', nodes = '';
  const wire = (from, to, port, nPorts) => {
    if (!pos[from] || !pos[to]) return;
    const [sx0, sy] = pos[from], [tx0, ty0] = pos[to];
    const sx = sx0 + width(from) / 2, tx = tx0 - width(to) / 2;
    const ty = nPorts === 2 ? ty0 + (port === 0 ? -9 : 9) : ty0;
    const mx = f1(tx - 16 - port * 8);
    const v = vals ? vals[from] : null;
    wires += `<path class="wire${v === 1 ? ' hot' : ''}" d="M${f1(sx)} ${f1(sy)} H${mx} V${f1(ty)} H${f1(tx)}"/>`;
    if (vals) wires += svgText(sx + 9, sy - 10, String(v), `wire-val${v === 1 ? ' hot' : ''}`, 'start', 13);
  };
  circuit.gates.forEach((gt) => {
    const need = gt.type === 'NOT' ? 1 : 2;
    gt.inputs.slice(0, need).forEach((x, k) => { if (x) wire(x, gt.id, k, need); });
  });
  if (circuit.output) wire(circuit.output, 'OUT', 0, 1);
  circuit.inputs.forEach((x) => {
    const [cx, cy] = pos[x];
    const v = vals ? vals[x] : null;
    nodes += `<circle class="in-node${v === 1 ? ' hot' : ''}" cx="${cx}" cy="${cy}" r="18"/>` + svgText(cx, cy, `<tspan class="var">${x}</tspan>`, '', 'middle', 18);
  });
  circuit.gates.forEach((gt) => {
    const [cx, cy] = pos[gt.id], w = width(gt.id);
    const hl = o.highlight === gt.id || (o.marks || []).includes(gt.id);
    nodes += `<g${o.pick ? ` class="pick-gate" data-gate="${gt.id}" role="button" tabindex="0" aria-label="${gateLabel(gt)} 게이트 고르기"` : ''}><rect class="gate-node${hl ? ' selected' : ''}" x="${f1(cx - w / 2)}" y="${f1(cy - 19)}" width="${w}" height="38" rx="12"/>` + svgText(cx, cy, gateLabel(gt), 'gate-label', 'middle', gt.type === 'TH' ? 14 : 15) + '</g>';
    if (o.badges && o.badges[gt.id]) nodes += `<circle class="pair-badge" cx="${f1(cx + w / 2 - 2)}" cy="${f1(cy - 19)}" r="11"/>` + svgText(cx + w / 2 - 2, cy - 19, String(o.badges[gt.id]), 'pair-num', 'middle', 13);
    if (o.names) nodes += svgText(cx, cy - 27, gt.id.replace('G', '게이트 ').replace('T', '장치 '), 'tiny', 'middle', 11);
  });
  if (pos.OUT) {
    const [cx, cy] = pos.OUT, v = vals ? vals.OUT : null;
    nodes += `<rect class="out-node${v === 1 ? ' hot' : ''}" x="${cx - 28}" y="${cy - 19}" width="56" height="38" rx="12"/>` + svgText(cx, cy, vals ? `출력 ${v}` : '출력', 'gate-label', 'middle', 14);
  }
  return `<svg viewBox="0 0 ${W} ${H}" class="circuit-svg" style="max-width:${W}px" role="img" aria-label="${o.title || '회로'}">${wires}${nodes}</svg>`;
}

/* ------------------------------------------------------------ 작은 나눔 그림 */
function partMiniSvg(key, found = true) {
  const [a, b] = PG.partGroups(key);
  const pos = (i) => [16 + PG.POINTS[i][0] * 36, 52 - PG.POINTS[i][1] * 36];
  let g = `<rect class="mini-bg" x="2" y="2" width="64" height="64" rx="8"/>`;
  [0, 1, 2, 3].forEach((i) => {
    const [x, y] = pos(i);
    const inA = a.includes(i);
    g += `<circle class="mini-dot ${found ? (inA ? 'ga' : 'gb') : 'unknown'}" cx="${x}" cy="${y}" r="7"/>`;
  });
  return `<svg viewBox="0 0 68 68" class="mini-svg" aria-hidden="true">${g}</svg>`;
}
function partText(key) {
  const [a, b] = PG.partGroups(key);
  const name = (arr) => (arr.length ? arr.map((i) => COORD[i]).join(', ') : '없음');
  if (!a.length || !b.length) return '네 점이 모두 한쪽';
  return `${name(a)} │ ${name(b)}`;
}

/* ------------------------------------------------------------ 합격선 산점도(학습지 fig10 자료) */
const SCORES = [[95, 80], [88, 93], [68, 97], [97, 66], [81, 86], [76, 91], [90, 73], [60, 100], [98, 90],
  [40, 55], [54, 71], [62, 58], [73, 54], [86, 44], [46, 82], [33, 92], [92, 33], [62, 79], [70, 67], [50, 40]];
function scatterSvg(o = {}) {
  const L = 60, Bt = 300, span = 250;
  const sx = (s) => L + s / 100 * span, sy = (s) => Bt - s / 100 * span;
  let g = `<rect class="paper" x="${L}" y="${sy(100)}" width="${span}" height="${span}"/>`;
  [50, 100].forEach((s) => { g += `<line class="grid" x1="${sx(s)}" y1="${sy(0)}" x2="${sx(s)}" y2="${sy(100)}"/><line class="grid" x1="${sx(0)}" y1="${sy(s)}" x2="${sx(100)}" y2="${sy(s)}"/>`; });
  g += `<g class="axes"><line x1="${sx(0)}" y1="${sy(0)}" x2="${sx(100) + 10}" y2="${sy(0)}"/><line x1="${sx(0)}" y1="${sy(0)}" x2="${sx(0)}" y2="${sy(100) - 10}"/></g>`;
  [0, 50, 100].forEach((s) => { g += svgText(sx(s), sy(0) + 18, String(s), 'small', 'middle', 13) + (s ? svgText(sx(0) - 8, sy(s), String(s), 'small', 'end', 13) : ''); });
  g += svgText(sx(100), sy(0) + 36, '국어 점수', 'small', 'end', 13) + svgText(sx(0) - 4, sy(100) - 18, '수학 점수', 'small', 'start', 13);
  g += `<line class="fixed-line" x1="${sx(50)}" y1="${sy(100)}" x2="${sx(100)}" y2="${sy(50)}"/>` + svgText(sx(100) - 4, sy(50) + 18, '합 = 150', 'line-label', 'end', 14);
  SCORES.forEach(([x, y], i) => {
    const pass = x + y > 150;
    g += `<circle class="dot ${pass ? 'on' : 'off'}${o.selected === i ? ' selected' : ''}" data-score="${i}" cx="${sx(x)}" cy="${sy(y)}" r="${o.small ? 5 : 7}"/>`;
  });
  return `<svg viewBox="0 0 340 340" class="scatter-svg" role="img" aria-label="학생 20명의 국어·수학 점수와 합격선">${g}</svg>`;
}

/* ------------------------------------------------------------ 평면 조작 */
/* el 안의 svg에 누르기·끌기·키보드를 붙인다. cfg: { getLine(), setLine(line|null), getPending(), setPending(p|null),
   redraw(), commit(kind), onPoint(i) (점 누르기, 없으면 무시), lineOn } */
function svgToPlane(svg, ev) {
  const pt = svg.createSVGPoint();
  pt.x = ev.clientX; pt.y = ev.clientY;
  const m = svg.getScreenCTM();
  if (!m) return null;
  const p = pt.matrixTransform(m.inverse());
  return { sx: p.x, sy: p.y, a: PG.LO + (p.x - 40) / U, b: PG.LO + (360 - p.y) / U };
}
const clampP = (a, b) => [Math.round(Math.max(PG.LO, Math.min(PG.HI, a)) * 1000) / 1000, Math.round(Math.max(PG.LO, Math.min(PG.HI, b)) * 1000) / 1000];

function bindPlane(el, cfg) {
  const svg = el.querySelector('svg');
  if (!svg) return;
  let press = null;
  svg.addEventListener('pointerdown', (ev) => {
    if (ev.button > 0) return;
    const P = svgToPlane(svg, ev);
    if (!P) return;
    const line = cfg.getLine && cfg.getLine();
    const near = (a, b, r) => Math.hypot(PX(a) - P.sx, PY(b) - P.sy) <= r;
    let kind = null, which = null;
    if (cfg.lineOn && line) which = ['p', 'q'].find((k) => near(line[k][0], line[k][1], 24)) || null;
    if (which) kind = 'handle';
    else if (cfg.onPoint) { const i = PG.POINTS.findIndex((p) => near(p[0], p[1], 24)); if (i >= 0) { kind = 'point'; which = i; } }
    if (!kind && cfg.lineOn) kind = 'draw';
    if (!kind) return;
    ev.preventDefault();
    try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* 무시 */ }
    press = { kind, which, id: ev.pointerId, start: clampP(P.a, P.b), sx: P.sx, sy: P.sy, moved: false };
  });
  svg.addEventListener('pointermove', (ev) => {
    if (!press || press.id !== ev.pointerId) return;
    const P = svgToPlane(svg, ev);
    if (!P) return;
    if (Math.hypot(P.sx - press.sx, P.sy - press.sy) > 8) press.moved = true;
    if (!press.moved) return;
    const p = clampP(P.a, P.b);
    if (press.kind === 'handle') {
      const line = { ...cfg.getLine() };
      const other = line[press.which === 'p' ? 'q' : 'p'];
      if (Math.hypot(p[0] - other[0], p[1] - other[1]) > 0.05) { line[press.which] = p; cfg.setLine(line); cfg.redraw(); }
    } else if (press.kind === 'draw' && Math.hypot(p[0] - press.start[0], p[1] - press.start[1]) > 0.05) {
      cfg.setPending && cfg.setPending(null);
      cfg.setLine({ p: press.start, q: p }); press.drawing = true; cfg.redraw();
    }
  });
  const end = (ev, cancel) => {
    if (!press || press.id !== ev.pointerId) return;
    const pr = press; press = null;
    if (cancel) { cfg.redraw(); return; }
    if (pr.kind === 'point' && !pr.moved) { cfg.onPoint(pr.which); return; }
    if (pr.kind === 'handle' && pr.moved) { cfg.commit('drag'); return; }
    if (pr.kind === 'draw') {
      if (pr.drawing) { cfg.commit('draw'); return; }
      if (!pr.moved) {
        const pend = cfg.getPending && cfg.getPending();
        if (pend && Math.hypot(pend[0] - pr.start[0], pend[1] - pr.start[1]) > 0.05) {
          cfg.setPending(null); cfg.setLine({ p: pend, q: pr.start }); cfg.commit('tap');
        } else { cfg.setPending && cfg.setPending(pr.start); cfg.redraw(); }
      }
    }
  };
  svg.addEventListener('pointerup', (ev) => end(ev, false));
  svg.addEventListener('pointercancel', (ev) => end(ev, true));
  if (cfg.lineOn) {
    svg.addEventListener('keydown', (ev) => {
      const map = { ArrowLeft: ['rot', 1], ArrowRight: ['rot', -1], ArrowUp: ['shift', 1], ArrowDown: ['shift', -1] };
      const m = map[ev.key];
      if (!m) return;
      ev.preventDefault();
      adjustLine(cfg, m[0], m[1]);
    });
  }
}

/* 버튼·키보드로 직선 고치기. 직선이 없으면 가운데를 지나는 가로 직선을 먼저 만든다 */
let adjustTimer = null;
function adjustLine(cfg, kind, dir) {
  let line = cfg.getLine();
  if (!line) line = { p: [-0.3, 0.5], q: [1.3, 0.5] };
  else {
    const cx = (line.p[0] + line.q[0]) / 2, cy = (line.p[1] + line.q[1]) / 2;
    if (kind === 'rot') {
      const t = dir * 5 * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
      const rot = (p) => [cx + (p[0] - cx) * c - (p[1] - cy) * s, cy + (p[0] - cx) * s + (p[1] - cy) * c];
      line = { p: clampP(...rot(line.p)), q: clampP(...rot(line.q)) };
    } else {
      const dx = line.q[0] - line.p[0], dy = line.q[1] - line.p[1], n = Math.hypot(dx, dy) || 1;
      const nx = -dy / n * 0.05 * dir, ny = dx / n * 0.05 * dir;
      line = { p: clampP(line.p[0] + nx, line.p[1] + ny), q: clampP(line.q[0] + nx, line.q[1] + ny) };
    }
  }
  cfg.setLine(line);
  cfg.redraw();
  clearTimeout(adjustTimer);
  adjustTimer = setTimeout(() => cfg.commit('button'), 600);
}
/* compact: 좁은 옆 칸용(기호만, 뜻은 title·aria-label로) */
function planeControlsHtml(id, compact = false) {
  const b = (attrs, label, sym, word) => `<button type="button" class="tool-button" ${attrs} aria-label="${label}" title="${label}">${compact ? sym : `${sym} ${word}`}</button>`;
  return `<div class="plane-controls${compact ? ' vertical' : ''}" data-controls="${id}">
    ${b('data-adjust="rot" data-dir="1"', '직선을 시계 반대 방향으로 돌리기', '↺', '돌리기')}
    ${b('data-adjust="rot" data-dir="-1"', '직선을 시계 방향으로 돌리기', '↻', '돌리기')}
    ${b('data-adjust="shift" data-dir="1"', '직선을 한쪽으로 옮기기', '⇡', '옮기기')}
    ${b('data-adjust="shift" data-dir="-1"', '직선을 반대쪽으로 옮기기', '⇣', '옮기기')}
    <button type="button" class="tool-button" data-clear-line aria-label="직선 지우기">지우기</button>
  </div>`;
}
function bindPlaneControls(id, cfg) {
  const box = document.querySelector(`[data-controls="${id}"]`);
  if (!box) return;
  box.querySelectorAll('[data-adjust]').forEach((b) => b.addEventListener('click', () => adjustLine(cfg, b.dataset.adjust, Number(b.dataset.dir))));
  box.querySelector('[data-clear-line]')?.addEventListener('click', () => { cfg.setLine(null); cfg.setPending && cfg.setPending(null); cfg.redraw(); cfg.commit('clear'); });
}
